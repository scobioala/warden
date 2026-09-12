# Architecture

```text
Phone browser                         Laptop browser
─────────────                         ──────────────
microphone + camera ──┐          ┌── shared build surface
                      │          │   source → connector → target
                      ▼          ▼
                 React + TypeScript
                      │
          HTTPS tunnel / local Vite proxy
                      │
                      ▼
                FastAPI Pi bridge
          ┌───────────┼────────────┐
          ▼           ▼            ▼
  ElevenLabs token  vision/OCR   companion-plan JSON
          │           │            │
          └───────────┴────────────┘
                      │
                      ▼
          mock state or Raspberry Pi I²C adapter
```

## Runtime loop

1. The phone establishes a private ElevenLabs signed session through the bridge; API keys never enter the browser.
2. With the camera open, Warden samples low-rate frames only while it is not speaking.
3. Vision returns calibrated evidence: a clear identification, a visible correction, or a useful guess. Legible labels and codes are preserved when possible.
4. The voice turn and latest observation become a structured companion plan: `source`, `connector`, `target`, `actions`, `verification`, and `confidence`.
5. The laptop reads that shared plan and renders only the current architecture and active physical action steps.
6. Bridge/device state is the source of truth for verification. Mock mode mirrors the same events for reliable demos.

## Trust model

- **Confirmed**: evidence supports a component or verification claim.
- **Tentative**: Warden has a useful visual hypothesis and asks the learner to confirm it.
- **Waiting**: no sufficient evidence; the laptop plan stays empty rather than inventing steps.
