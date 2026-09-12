"""Pi-only typed hardware daemon. No mock mode or arbitrary execution."""
import argparse
import asyncio
import json
import os
import re
import socket
import subprocess
import time
from pathlib import Path
from fastapi import FastAPI
import uvicorn
import websockets

app = FastAPI(title="Warden device")
BUS = int(os.getenv("WARDEN_I2C_BUS") or "1")
lock = asyncio.Lock()
sensors = {}

def system_state():
    try:
        temperature = round(int(Path('/sys/class/thermal/thermal_zone0/temp').read_text()) / 1000, 1)
    except (OSError, ValueError):
        temperature = None
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('192.0.2.1', 80))
            ip = s.getsockname()[0]
    except OSError:
        ip = socket.gethostbyname(socket.gethostname())
    return {'hostname': socket.gethostname(), 'ip': ip, 'temperature': temperature, 'bus': f'i2c-{BUS}'}

@app.get('/health')
def health():
    return system_state()

def scan():
    # Fixed executable and arguments only; user/model text never enters a shell.
    result = subprocess.run(['i2cdetect', '-y', str(BUS)], capture_output=True, text=True, timeout=5, check=True)
    addresses = []
    for line in result.stdout.splitlines()[1:]:
        for value in line.split()[1:]:
            if re.fullmatch(r'[0-9a-f]{2}', value):
                addresses.append('0x' + value)
    return {'addresses': addresses, 'grid': result.stdout}

def address(value, button=False):
    allowed = ['0x6e', '0x6f'] if button else ['0x39', '0x36', '0x6e', '0x6f']
    if value not in allowed:
        raise ValueError('Unsupported address; only known 3.3V kit devices are allowed')
    return int(value, 16)

def button_read(addr):
    from smbus2 import SMBus
    with SMBus(BUS) as bus:
        if bus.read_byte_data(addr, 0x00) != 0x5D:
            raise ValueError('Device ID does not match a Qwiic Button')
        return {'pressed': bool(bus.read_byte_data(addr, 0x03) & 0x04)}

def read_device(value):
    addr = address(value)
    if value in ('0x6e', '0x6f'):
        return button_read(addr)
    import board
    if value not in sensors:
        if value == '0x39':
            from adafruit_apds9960.apds9960 import APDS9960
            sensor = APDS9960(board.I2C())
            sensor.enable_proximity = True
        else:
            from adafruit_seesaw.seesaw import Seesaw
            from adafruit_seesaw.rotaryio import IncrementalEncoder
            sensor = IncrementalEncoder(Seesaw(board.I2C(), addr=addr))
        sensors[value] = sensor
    try:
        sensor = sensors[value]
        return {'proximity': sensor.proximity} if value == '0x39' else {'position': sensor.position}
    except Exception:
        sensors.pop(value, None)
        raise

async def operation(name, args):
    if not isinstance(args, dict):
        raise ValueError('Arguments must be an object')
    schemas = {'system_state': set(), 'i2c_scan': set(), 'read_device': {'address'}, 'set_led': {'address', 'brightness'}, 'readdress_button': {'address', 'new_address'}, 'wait_for_event': {'address', 'instruction', 'timeout_ms'}}
    if name not in schemas or set(args) != schemas[name]:
        raise ValueError('Unknown operation or invalid arguments')
    if name == 'system_state':
        return system_state()
    if name == 'i2c_scan':
        async with lock:
            return await asyncio.to_thread(scan)
    if name == 'read_device':
        async with lock:
            return await asyncio.to_thread(read_device, args['address'])
    addr = address(args['address'], button=True)
    if name == 'wait_for_event':
        timeout = args['timeout_ms']
        if type(timeout) is not int or not 1000 <= timeout <= 60000 or not isinstance(args['instruction'], str):
            raise ValueError('Invalid timeout or instruction')
        start = time.monotonic()
        # A held button is not a new event: require release, then a rising edge.
        released = False
        try:
            while (time.monotonic() - start) * 1000 < timeout:
                async with lock:
                    pressed = (await asyncio.to_thread(button_read, addr))['pressed']
                if not pressed:
                    released = True
                if pressed and released:
                    return {'fired': True, 'elapsed_ms': round((time.monotonic() - start) * 1000)}
                await asyncio.sleep(.05)
            return {'fired': False, 'elapsed_ms': round((time.monotonic() - start) * 1000)}
        finally:
            try:
                async with lock:
                    await asyncio.to_thread(write_button, addr, 0x19, 0)
            except Exception:
                pass
    async with lock:
        if name == 'set_led':
            brightness = args['brightness']
            if type(brightness) is not int or not 0 <= brightness <= 255:
                raise ValueError('Brightness must be an integer from 0 to 255')
            return await asyncio.to_thread(write_button, addr, 0x19, brightness)
        new = address(args['new_address'], button=True)
        if new == addr:
            raise ValueError('New address must differ')
        found = await asyncio.to_thread(scan)
        if args['new_address'] in found['addresses']:
            raise ValueError('Target address is already occupied')
        return await asyncio.to_thread(write_button, addr, 0x1F, new)

def write_button(addr, register, value):
    from smbus2 import SMBus
    button_read(addr)
    with SMBus(BUS) as bus:
        bus.write_byte_data(addr, register, value)
        time.sleep(.1)
        readback = bus.read_byte_data(value if register == 0x1F else addr, register)
        if readback != value:
            raise ValueError(f'Write readback mismatch: {readback}')
        return {'register': hex(register), 'readback': readback}

async def pair(code, agent):
    url = agent.rstrip('/').replace('https://', 'wss://').replace('http://', 'ws://') + '/api/device'
    async with websockets.connect(url, max_size=1_500_000) as ws:
        await ws.send(json.dumps({'code': code.replace('-', '').upper(), 'info': system_state()}))
        tasks = set()
        async def handle(message):
            try:
                result = await operation(message.get('name'), message.get('args', {}))
            except Exception as exc:
                result = {'error': str(exc)}
            await ws.send(json.dumps({'id': message['id'], 'result': result}))
        try:
            async for raw in ws:
                message = json.loads(raw)
                if message.get('type') == 'paired':
                    print('Paired. Real I2C operations enabled.', flush=True)
                    continue
                task = asyncio.create_task(handle(message))
                tasks.add(task)
                task.add_done_callback(tasks.discard)
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['pair'])
    parser.add_argument('code')
    parser.add_argument('--agent', default=os.getenv('WARDEN_AGENT_URL'), required=not os.getenv('WARDEN_AGENT_URL'))
    args = parser.parse_args()
    server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=8787, log_level='warning'))
    service = asyncio.create_task(server.serve())
    try:
        await pair(args.code, args.agent)
    finally:
        server.should_exit = True
        await service

if __name__ == '__main__':
    asyncio.run(main())
