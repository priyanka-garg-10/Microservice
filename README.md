* Built a full-stack email delivery platform using React 19, Node.js/Express, and Go (Gin), featuring multi-user auth, async background processing with a retry queue, and a MySQL-backed email history log
* Designed an asynchronous email pipeline with fire-and-forget HTTP 202 responses, a background worker with 4-attempt retry logic, and automatic failure notifications to senders on permanent SMTP failure
* Implemented AES-256-GCM encryption for all sensitive data at rest (passwords, SMTP credentials, session tokens), with a dual-authentication system supporting both session tokens and per-user API keys
* Integrated OpenAI API (gpt-4o-mini) for real-time AI email suggestions, with debounced keyboard input, Tab-to-accept UX, and graceful fallback when the API is unavailable
* Built a responsive React dashboard with a multi-sender SMTP credential manager, paginated/filterable email history, HTML email toggle, dynamic CC/BCC fields, and an embedded API documentation page with copy-ready cURL examples
* Architecting upcoming microservices for OTP verification, signed URL generation, and SMS delivery — extending the platform into a self-hosted notification and secure-link infrastructure
