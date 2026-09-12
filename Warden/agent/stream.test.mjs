import test from 'node:test';
import assert from 'node:assert/strict';
import {readMessage} from './stream.mjs';
test('provider stream assembles fragmented tool JSON and delivers complete sentences',async()=>{
 const events=[
 {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
 {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'Check the '}},
 {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'bus. Then wait.'}},
 {type:'content_block_stop',index:0},
 {type:'content_block_start',index:1,content_block:{type:'tool_use',id:'test',name:'i2c_scan',input:{}}},
 {type:'content_block_delta',index:1,delta:{type:'input_json_delta',partial_json:'{'}},
 {type:'content_block_delta',index:1,delta:{type:'input_json_delta',partial_json:'}'}},
 {type:'content_block_stop',index:1}];
 const wire=events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join('');
 const bytes=new TextEncoder().encode(wire);
 const response=new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close();}}));
 const sentences=[];const result=await readMessage(response,s=>sentences.push(s));
 assert.deepEqual(sentences,['Check the bus.','Then wait.']);
 assert.equal(result.content[0].text,'Check the bus. Then wait.');
 assert.deepEqual(result.content[1].input,{});
});
