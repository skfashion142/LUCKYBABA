# Phase 8 — In-app voice calls, recordings, transcripts and push notifications

Phase 8 adds provider-backed in-app voice call lifecycle and signaling, explicit recording consent, encrypted/object-storage recording upload, STT transcription metadata, admin call history, and FCM push notification delivery.

## Important production requirements
- Configure PostgreSQL and JWT as before.
- Configure S3-compatible object storage (`OBJECT_STORAGE_*`) before recording upload.
- Configure Firebase Admin (`FCM_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`) before push delivery.
- Client media must use WebRTC/MediaRecorder; the backend only handles authenticated signaling and recording upload/metadata. It does not silently capture a microphone.
- Recording/transcription consent must be explicitly recorded before a recording is accepted.
- Call audio/transcript access is role-scoped; customers can access only their own call metadata, while the authorized admin can access call metadata and short-lived recording URLs.
- This is in-app calling, not PSTN/phone-network calling. A carrier telephony provider is required if ordinary phone-number calls are later needed.
