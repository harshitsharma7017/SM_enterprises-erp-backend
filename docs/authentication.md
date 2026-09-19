# Authentication Architecture

This document describes the Phase 0.5B Authentication implementation for the Garment Manufacturing ERP.

## Overview
The system uses a stateless JSON Web Token (JWT) architecture.
- **Backend**: Node.js + Express.js generating JWTs and verifying them via custom middleware.
- **Frontend**: Next.js (App Router) managing the JWT on the client side (`localStorage`) and intercepting API requests to append the `Authorization` header.

## Database & Models
Authentication relies on the `users` table:
\`\`\`sql
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
\`\`\`
Passwords are securely hashed using `bcryptjs` before insertion.

## API Endpoints

### `POST /api/auth/login`
- **Purpose**: Authenticate user and issue JWT.
- **Input**: `{ email, password }`
- **Flow**: Validates format → Fetches user → Checks `is_active` → Validates bcrypt hash → Signs JWT (excluding sensitive data) → Returns token + user info.

### `GET /api/auth/me`
- **Purpose**: Restore session on frontend reload.
- **Headers**: `Authorization: Bearer <token>`
- **Flow**: Middleware verifies signature & expiration → Verifies user exists and is active in DB → Attaches to `req.user` → Returns `req.user`.

### `POST /api/auth/logout`
- **Purpose**: Inform backend of logout. (Stateless; purely signaling for audit/clearing purposes).

## JWT Configuration
- **Payload**: Minimal `{ id, email }`.
- **Secret**: Stored in `JWT_SECRET` environment variable (never exposed).
- **Expiration**: Controlled via `JWT_EXPIRES_IN` (e.g., `24h`).

## Frontend Integration
1. **API Interceptor**: `lib/api-client.js` extracts `auth_token` from `localStorage` and appends `Authorization: Bearer <token>` to all protected calls.
2. **State Management**: `hooks/useAuth.js` is a custom React hook that validates the token upon hydration by calling `/api/auth/me`. 
3. **Route Protection**: Unauthenticated users trying to hit `/dashboard` are redirected to `/login` by the hook.

## Security Considerations
- **Password Security**: Plaintext passwords are never stored. Hashes are never returned in API payloads.
- **XSS Mitigations**: Because the token is stored in `localStorage`, the application is vulnerable to Cross-Site Scripting (XSS). Do NOT use `dangerouslySetInnerHTML` or execute untrusted third-party scripts.
- **Revocation**: Since JWTs are stateless, they cannot be natively revoked before expiration. We mitigate this by checking `user.is_active` on the database *during every protected request* inside the backend `auth.middleware.js`. If an admin deactivates a user, their JWT instantly becomes useless for subsequent requests.

## Separation of Concerns
This module strictly handles **Authentication** ("Who are you?").
It does NOT handle **Authorization** ("What can you do?"). RBAC (Roles and Permissions) will be implemented separately in the upcoming Phase.
