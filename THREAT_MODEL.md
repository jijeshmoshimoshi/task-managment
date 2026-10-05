# TaskMaster Threat Model & Security Architecture

This document details the security posture, threat mitigation strategies, OWASP Top 10 countermeasures, and ASVS Level 2 alignment for the TaskMaster Platform.

---

## 1. Authentication & Token Management

### Password Security
- **Hashing**: Argon2id with salt generation.
- **Complexity**: Enforces min 8 characters, uppercase, lowercase, numbers, and special characters.
- **Breached Passwords**: Integration hook with HaveIBeenPwned (HIBP) k-Anonymity API to prevent use of compromised passwords.

### Token Lifecycle & Session Management
- **Short-Lived Access Tokens**: JWT (15-minute expiration) containing only subject ID, organization ID, and role.
- **Rotating Refresh Tokens**: Stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies.
- **Refresh Token Family & Reuse Detection**: Each refresh rotates the token. If an old refresh token is reused, the entire token family is immediately revoked, and all active sessions for the user are invalidated in Redis.
- **Instant Revocation**: Redis token blocklist / session registry ensures immediate termination on logout, password change, account suspension, or role change.

### Multi-Factor Authentication (2FA)
- Time-Based One-Time Password (TOTP) algorithm (RFC 6238) via Authenticator apps (Google Authenticator, 1Password, Authy).
- Pre-generated hashed recovery codes for account recovery.
- Enforceable per role by Super Admin via organization security policies.

---

## 2. Authorization & Multi-Tenancy

### IDOR / BOLA Prevention
- All database queries are explicitly partitioned by `organizationId`.
- Primary keys and resource IDs supplied in URLs/bodies are never trusted blindly; the repository layer enforces tenant boundaries on every single query.

### Mass Assignment Defense
- All incoming payloads are strictly validated and filtered through Zod schemas before reaching business logic or Mongoose models.
- Never spread unvalidated `req.body` into model constructors or update queries.

---

## 3. Data Protection & Encryption

### Sensitive Fields at Rest
- 2FA TOTP secrets, recovery codes, and third-party API keys are encrypted at rest using AES-256-GCM envelope encryption.
- Encryption keys are loaded strictly from environment variables/secrets manager and are rotation-ready.

### Sanitization & Injection Defense
- **NoSQL Injection**: `express-mongo-sanitize` strips `$` and `.` prefixes. Zod enforces type and format constraints on all query parameters and JSON payloads.
- **XSS Prevention**: Rich text HTML descriptions are sanitized server-side using strict HTML tag and attribute allow-lists before persistence.
- **HTTP Parameter Pollution**: `hpp` middleware eliminates repeated query parameters.

---

## 4. File Upload & Storage Security

- **Private Buckets**: Direct file execution is disabled. Uploads and downloads occur exclusively via short-lived, pre-signed AWS S3 / Cloudflare R2 URLs.
- **MIME Sniffing & Magic Bytes**: File metadata is verified against allowed file types (PDF, PNG, JPEG, WEBP, ZIP, DOCX, XLSX).
- **Randomized Storage Keys**: Storage paths use UUIDs rather than user-supplied filenames to prevent directory traversal or file overwrite attacks.

---

## 5. Network, Rate Limiting & Abuse Prevention

- **Security Headers**: `helmet` enforces Content-Security-Policy (CSP), Strict-Transport-Security (HSTS, 1 year preload), X-Content-Type-Options (nosniff), and X-Frame-Options (DENY).
- **CORS**: Strict allow-list restricted to known client origins with credentials support.
- **Redis Rate Limiting**:
  - Global API rate limiter (e.g. 100 req / 15 min per IP).
  - Strict authentication rate limiter (10 attempts / 15 min) with progressive lockout.
