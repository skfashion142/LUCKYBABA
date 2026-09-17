# Phase 8 API

## Customer
- `POST /v1/customer/devices` — register/update FCM token.
- `DELETE /v1/customer/devices/:token` — unregister own token.
- `POST /v1/customer/calls` — create an in-app call (`IN_APP` or `AI_VOICE`).
- `POST /v1/customer/calls/:callId/consent` — record explicit recording consent.
- `POST /v1/customer/calls/:callId/answer` — answer own incoming call.
- `POST /v1/customer/calls/:callId/end` — end own call.
- `POST /v1/customer/calls/:callId/recording` — upload an already-recorded audio blob after consent; object storage is required.
- `POST /v1/customer/calls/:callId/transcribe` — provider-backed transcription of the stored recording.
- `GET /v1/customer/calls` — own call history.

## Admin
- `POST /v1/admin/calls` — initiate a call to a customer.
- `POST /v1/admin/calls/:callId/status` — accept/end/reject/miss/fail a call.
- `GET /v1/admin/calls` — call history for the authorized admin.
- `GET /v1/admin/calls/:callId` — call details/transcript metadata.
- `GET /v1/admin/calls/:callId/transcript` — transcript.
- `GET /v1/admin/calls/:callId/recording-url` — 5-minute signed recording URL.
- `POST /v1/admin/notifications/test` — send a test push to a customer's eligible device(s).
- `POST /v1/admin/notifications/broadcast` — send a broadcast to eligible registered devices; marketing broadcasts require marketing opt-in.

## WebSocket `/realtime`
Authenticated connections may exchange `call.signal`, `call.accept`, `call.reject`, and `call.end`. The server validates call ownership/role before forwarding signaling data.
