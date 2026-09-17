# Phase 7 Security Notes — Real AI Voice

## Authentication & ownership
- Both voice endpoints require a valid customer JWT (`auth("CUSTOMER")`), identical to every other Phase 6 customer route.
- `voice_sessions` rows are always written with the caller's `customer_id` taken from the verified token, never from the request body.
- `GET /v1/customer/voice/sessions/:id` filters by `id AND customer_id` in the same SQL statement, so a mismatched id/customer pair returns `404`, not `403` — this avoids confirming that a session id exists for someone else's account.

## Credential handling
- `AI_API_KEY` is read only inside `src/providers/voiceProvider.ts`, sent as an `Authorization: Bearer` header directly to the configured provider, and is never included in any API response, WebSocket event, or audit-log row.
- Audit metadata for `VOICE_PROVIDER_ERROR` stores only a short error `code`, never upstream response bodies or headers (which could echo back request data).
- The mobile app never receives `AI_API_KEY`, `AI_BASE_URL`, or any provider config — it only calls this backend.

## Payload limits & validation
- Global JSON body limit raised to 20 MB (from Phase 1-6's 2 MB) to admit base64-encoded audio; a dedicated error handler maps `entity.too.large` to a clean `AUDIO_SIZE_INVALID` JSON response instead of Express's default HTML error page.
- The authoritative limit is the **decoded** buffer size, checked explicitly against `MAX_AUDIO_BYTES` (12 MB) after `Buffer.from(base64)` — this is enforced regardless of base64 overhead or client miscalculation.
- `mimeType` is checked against an explicit allow-list; anything else is rejected with `AUDIO_FORMAT_UNSUPPORTED` before any bytes are sent to the provider.
- TTS input text is capped at 2000 characters to bound provider cost and response size.

## Rate limiting
- A per-customer, per-endpoint in-memory limiter (`VOICE_RATE_LIMIT_MAX` requests per `VOICE_RATE_LIMIT_WINDOW_MS`, default 20 / 10 minutes) guards both routes.
- **Known limitation**: this limiter is process-local. If the backend is deployed as more than one instance behind a load balancer, each instance enforces its own counter, so the effective limit multiplies by instance count. For a multi-instance deployment, replace `rateBuckets` with a shared store (Redis `INCR`+`EXPIRE`, or an API-gateway-level rate limit) before going to production at scale.

## Timeouts & failure handling
- Every provider call is wrapped in an `AbortController` timeout (`VOICE_PROVIDER_TIMEOUT_MS`, default 20s). A timeout returns `VOICE_TIMEOUT` (HTTP 504); any other provider failure returns `AI_STT_PROVIDER_ERROR` / `AI_TTS_PROVIDER_ERROR` (HTTP 502). Neither path fabricates a transcript or audio.
- Missing configuration is checked before any network call and returns `AI_PROVIDER_NOT_CONFIGURED` (HTTP 503) — the system never silently falls back to a mock response.

## Data retention
- Raw audio bytes exist only in process memory for the duration of the request; they are forwarded to the STT provider and discarded — never written to disk, object storage, or the database.
- `voice_sessions` stores metadata only: customer id, mode (`STT`/`TTS`), a credential-free provider label (host name), model name, MIME type, and timestamp. No transcript text and no audio.
- If a future phase adds persistent audio storage, it must gate on an explicit storage-configuration flag and a recorded consent timestamp, per the product requirement — this phase does not implement that path because it isn't needed for the STT/TTS round trip.

## Logging
- The global error handler and provider adapter log only `err` objects / short codes — never request bodies (which could contain base64 audio) and never `AI_API_KEY`.
- Do not add `console.log` of `req.body` on these routes; base64 audio in logs would defeat the "no raw audio in logs" requirement even if credentials are excluded.

## Admin visibility
- Admins are not notified of voice events (`emitTo("CUSTOMER", ...)` only) and have no endpoint that returns raw customer audio. Admin conversation views continue to show only the resulting text transcript/messages, per existing Phase 6 permissions.

## Transport
- As with Phase 1-6, this service assumes it sits behind HTTPS-terminating infrastructure in production (load balancer / reverse proxy). No plaintext HTTP should be exposed publicly.


## Phase 7 hardening applied
- Strict Base64 validation is performed before decoding customer audio.
- TTS provider responses are capped at 12 MB and streamed with a hard byte ceiling.
- CORS uses an explicit allowlist via `CORS_ALLOWED_ORIGINS`; credentials are enabled only for allowed origins.
- Voice rate limiting remains process-local; production multi-instance deployments must move the limiter to a shared store.
