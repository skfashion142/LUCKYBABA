# Payment Evidence Native Module

Android-only sensitive evidence flow. The app requests explicit SMS read permission and Android notification-listener access. Payment-like records are filtered locally; raw unrelated notifications/SMS are not sent to the backend.

The module generates an RSA keypair in Android Keystore. Its public key is registered with the backend and a server nonce challenge is signed for each evidence submission.

iOS returns unavailable/empty evidence because iOS does not provide equivalent arbitrary access to other apps' notifications or SMS inbox.
