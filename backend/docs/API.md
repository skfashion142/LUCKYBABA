# Core API Contract

## Customer
- `POST /v1/auth/customer/request-otp`
- `POST /v1/auth/customer/verify`
- `GET /v1/products`
- `POST /v1/orders/payment-submission`
- `POST /v1/orders/:orderId/location`

## Admin
- `POST /v1/auth/admin/signin`
- `GET /v1/admin/orders`
- `POST /v1/admin/payments/:orderId/verify`
- `GET /v1/admin/customers/:customerId/presence`

Realtime chat/presence and FCM/object-storage adapters are the next integration layer; the database already contains the required durable fields for these features.


## Phase 5 — Pickup

### Customer: pickup information
`GET /v1/orders/:orderId/pickup`
Returns pickup location/video only after `pickup_location_released_at` is set.

### Customer: start location session
`POST /v1/orders/:orderId/location/session/start`
Allowed only for `READY_FOR_PICKUP` or `PICKUP_VERIFICATION`.

### Customer: location heartbeat
`POST /v1/orders/:orderId/location`
Body: `{ latitude, longitude, accuracyM? }`. The server rejects updates outside an active pickup session.

### Admin: latest location
`GET /v1/admin/orders/:orderId/location/latest`
Returns the newest recorded point for an order. Requires admin authentication.

### Customer: pickup verification
`POST /v1/orders/:orderId/pickup/verify`
Body: `{ code: "123456" }`. The server compares a SHA-256 hash and expiry.

### Customer: complete
`POST /v1/orders/:orderId/complete`
Allowed only after `PICKED_UP`; closes the location session and records completion.

### Admin: release pickup
`POST /v1/admin/orders/:orderId/release-pickup`
Moves a confirmed order to `READY_FOR_PICKUP` and timestamps release.

## Phase 7 — Real AI Voice (STT/TTS)

All voice endpoints require a customer bearer token and never expose provider
credentials to the client.

### Customer: transcribe voice
`POST /v1/customer/voice/transcribe`

Body:
```json
{ "audioBase64": "...", "mimeType": "audio/webm" }
```
- Allowed `mimeType` (base type, params ignored): `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/mpeg`, `audio/wav`, `audio/wave`, `audio/x-wav`.
- Maximum decoded audio size: 12 MB.
- Response: `{ "transcript": "...", "voiceSessionId": "..." }`
- Never returns a fake transcript — provider or configuration failures return one of the explicit error codes below.

### Customer: synthesize speech
`POST /v1/customer/voice/synthesize`

Body:
```json
{ "text": "AI response text" }
```
- Maximum text length: 2000 characters.
- Response: `{ "audioBase64": "...", "mimeType": "audio/mpeg", "voiceSessionId": "..." }`

### Customer: read own voice session metadata
`GET /v1/customer/voice/sessions/:id`
Returns session metadata only (mode, provider, model, mime type, timestamps) — never raw audio, which is not retained. Scoped strictly to the requesting customer; another customer's session id returns `404 VOICE_SESSION_NOT_FOUND`.

### Recommended client flow (reuses the Phase 6 AI engine, not a second one)
1. `POST /v1/customer/voice/transcribe` → transcript
2. `POST /v1/customer/conversation/message` (Phase 6) with that transcript
3. `POST /v1/customer/conversation/ai-reply` (Phase 6) → AI text, grounded in real catalog/order data
4. `POST /v1/customer/voice/synthesize` with the AI text → spoken reply

### Voice error codes
| Code | Meaning |
|---|---|
| `MIC_PERMISSION_DENIED` | Client-side: OS microphone permission was denied. |
| `AUDIO_SIZE_INVALID` | Audio missing, empty, or over 12 MB. |
| `AUDIO_FORMAT_UNSUPPORTED` | `mimeType` not in the allowed list. |
| `AI_PROVIDER_NOT_CONFIGURED` | `AI_BASE_URL` / `AI_API_KEY` / `AI_STT_MODEL` or `AI_TTS_MODEL` missing. |
| `AI_STT_PROVIDER_ERROR` | Speech-to-text provider unreachable or returned a non-2xx status. |
| `AI_STT_EMPTY_RESPONSE` | Provider responded but returned no transcript text. |
| `AI_TTS_PROVIDER_ERROR` | Text-to-speech provider unreachable or returned a non-2xx status. |
| `AI_TTS_EMPTY_RESPONSE` | Provider responded but returned no audio bytes. |
| `VOICE_TIMEOUT` | Provider call exceeded `VOICE_PROVIDER_TIMEOUT_MS`. |
| `VOICE_RATE_LIMITED` | Per-customer voice request rate limit exceeded. |

### Realtime voice events (`/realtime` WebSocket, Phase 6 channel)
Emitted to the authenticated customer only (never broadcast to admins):
`voice.transcription.started`, `voice.transcription.completed`, `voice.tts.started`, `voice.tts.completed`, `voice.failed`.
`voice.recording.started` / `voice.recording.stopped` are local mic UI states owned by the client — the backend has no request to key them off, so it does not emit them.
