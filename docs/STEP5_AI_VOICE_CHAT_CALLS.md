# Step 5 — Real AI + Voice + Chat/Calls

Implemented a provider-backed AI boundary for customer and admin assistants.

## Customer AI
- `POST /v1/customer/conversation/ai-reply`
- Grounded against live catalog, customer orders, pickup asset and payment modes.
- Conversation text is treated as untrusted data.
- AI cannot mark payments verified or invent unavailable facts.
- Provider failure is returned explicitly; no fake response is generated.

## Admin AI
- `POST /v1/admin/assistant`
- Grounded against current operational order/product/conversation snapshot.
- Uses the same server-only AI provider credentials.

## Conversation summaries
- `POST /v1/admin/conversations/:conversationId/ai-summary`
- Stores a concise AI summary for authorised admin use.
- Transcript is treated as untrusted data and credential-like content is excluded by instruction.

## Voice
Existing Step 7 STT/TTS endpoints remain in place and now use the same provider configuration boundary. A voice ask flows STT -> customer message -> grounded AI reply -> TTS.

## Calls
Existing authenticated WebRTC signaling, recording consent, recording storage and transcript/admin-history routes remain intact.

## Required production configuration
`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_STT_MODEL`, `AI_TTS_MODEL` and provider-specific storage/FCM settings must be configured in the server environment. Never place `AI_API_KEY` in either mobile app.

## Live certification
Source integration is validated locally. Live provider, Firebase, PostgreSQL, WebRTC and physical-device certification still requires real credentials/devices.
