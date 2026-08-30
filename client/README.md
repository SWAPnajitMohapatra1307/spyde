# SPYDE frontend reference UI

This workspace contains a responsive React and Vite reference interface for the SPYDE receiver-protection product. It follows the dark-first visual system and demonstrates the main F2-owned experiences with local demo state.

## Included flows

- Receiver-first dashboard with protection metrics
- Payment review with PASS, WARN, CHALLENGE and BLOCK scenarios
- Real browser liveness using getUserMedia, face-api.js TinyFaceDetector and FaceLandmark68Net
- EAR-based two-blink detection with face landmark overlay
- Browser anti-spoof signal based on live texture and face movement
- Per-session four-digit challenge code and SHA-256 landmark hash
- QR verification with VERIFIED, UNVERIFIED and TAMPERED states
- Safe Circle contacts and anomaly safety net
- Activity ledger and certificate viewer
- View-once face confirmation countdown
- Complaint filing and admin moderation console

The UI is self-contained for review. Payment, QR and admin data use local demo state. The liveness camera and face landmark models are real and run in the browser; camera permission and a secure preview origin are required. The current liveness result is verified locally because this workspace does not include the backend service. Replace the local result handler with the documented `/api/liveness/challenge` and `/api/liveness/verify` calls when the server is available.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite preview at `http://localhost:5173`. Camera access works on localhost or an HTTPS preview.

## Validate the production build

```bash
npm run build
```
