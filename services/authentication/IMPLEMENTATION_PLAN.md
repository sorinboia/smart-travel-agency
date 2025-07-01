# Authentication Service Implementation Plan (JavaScript Version)

## High-level goals
1. Build a self-contained Node 20 + Fastify 4 micro-service that fulfils the design in [design/authentication.md](../../design/authentication.md).
2. Package it as a lightweight OCI image and ship Kubernetes manifests consistent with the existing Mongo & MinIO stacks.
3. Provide a comprehensive automated test suite (unit + integration + API) to guard the registration / login flows and JWT verification.

## Folder layout under `services/authentication`
```
services/authentication/
├── src/
│   ├── server.js               # Fastify init + plugin registration
│   ├── routes/
│   │   ├── register.js         # POST /auth/register
│   │   ├── login.js            # POST /auth/login
│   │   └── me.js               # GET  /auth/me  (JWT-protected)
│   ├── plugins/
│   │   ├── mongodb.js          # FastifyMongo plugin wrapper
│   │   └── jwt.js              # fastify-jwt config (HS256)
│   ├── models/user.js          # Zod schema + helper types
│   └── utils/password.js       # bcrypt-based hashing / compare
├── test/
│   ├── unit/                   # password, helpers
│   ├── integration/            # route handlers with mongodb-memory-server
│   └── api.e2e.spec.js         # supertest style end-to-end
├── .env.example
├── package.json
├── Dockerfile
└── k8s/
    ├── deployment.yaml
    └── service.yaml
```

## Technology & libraries
- **Fastify 4** – high-perf HTTP framework.
- **@fastify/jwt** – HS256 signing / verification.
- **@fastify/mongodb** – MongoDB connection lifecycle.
- **zod** – request/response validation tied to Fastify schema.
- **bcryptjs** – 12 round hashing.
- **pino** – structured JSON logs (same conventions as other services).
- **Jest + supertest** – tests.
- **mongodb-memory-server** – fast in-process Mongo for integration tests.
- **JavaScript (ESM or CommonJS)** for implementation (no TypeScript).

## Environment variables (.env.example)
```
PORT=4003
MONGODB_URI=mongodb://admin:admin@mongodb:27017/sta?authSource=admin
JWT_SECRET=changeme-32bytes-min
LOG_LEVEL=info
BCRYPT_ROUNDS=12
```

## Runtime behaviour
1. On start-up `src/server.js`
   - Connects to Mongo and ensures the **`users`** collection has index `{ email: 1, unique: true }`.
   - Registers JWT plugin with `secret = JWT_SECRET`, `sign: { expiresIn: '365d' }`.

2. Route flows
   **Registration – `POST /auth/register`**
   - Validate body ⇒ `email`, `password`, `fullName`.
   - Normalise e-mail to lowercase and check for existing user (`409 Conflict` on duplicate).
   - Hash password with **bcrypt** (`BCRYPT_ROUNDS`).
   - Insert new user `({ email, pwdHash, fullName, createdAt, status: 'active' })`.
   - Respond `201 Created` with the user profile (no password) *and* optionally return a freshly-signed JWT `{ token, expiresAt }` for immediate login.

   **Login – `POST /auth/login`**
   - Validate body ⇒ `email`, `password`.
   - Locate user by lowercase e-mail and compare hash with bcrypt.
   - On success issue JWT `fastify.jwt.sign({ sub, email })` → respond `{ token, expiresAt }`.
   - On failure respond `401 Unauthorized`.

   **Current user – `GET /auth/me`**
   - `await request.jwtVerify()` to ensure a valid token.
   - Fetch the user document by `sub` claim and return profile.

3. Health probe – `GET /healthz` returns `{ status: 'ok', uptime, mongo: 'reachable' }`.

## Testing matrix
| Layer | Tooling | Scope |
|-------|---------|-------|
| Unit  | Jest    | utils/password, JWT helper edge-cases |
| Integ | Jest + mongodb-memory-server | Route handlers (no network) |
| API   | supertest against in-process Fastify | Register → Login → Me happy-path & negative cases |

## Docker & K8s
- `services/authentication/Dockerfile` (multi-stage):
  1. `node:20-alpine` builder → `npm ci`.
  2. Thin runtime image (`node:20-alpine`) with `src/` and `prod` deps only.
  3. Health-check script `GET /healthz`.
- `services/authentication/k8s/deployment.yaml`:
  - `Deployment` (3 replicas) with resource limits, readiness `/healthz`, env via `secretRef` for `JWT_SECRET`.
  - `Service` ClusterIP on port 4003.
  - Future: helm chart aligning with Mongo & MinIO charts.

## CI/CD considerations
1. GitHub Actions (or similar) workflow:
   - `npm ci` → `npm run lint` → `npm test --coverage` ≥ 80%.
   - Build & push Docker image (`ghcr.io/…/auth-service:${{sha}}`).
   - `kubectl apply -f k8s/` (or Helm upgrade) to dev cluster.

## Security notes
- Enforce HTTPS / production proxy at ingress.
- Rate-limit failed logins (Fastify-RateLimit).
- Consider future refresh-tokens / email verification.

## Timeline / task breakdown
1. **Day 1** – Scaffold repo, configure ESLint/Prettier, set up base Fastify server & Mongo plugin.
2. **Day 2** – Implement `/auth/register`, `/auth/login`, `/auth/me` handlers + Zod schemas.
3. **Day 3** – Unit & integration tests, 80%+ coverage.
4. **Day 4** – Dockerfile, Kubernetes manifests, health checks; CI pipeline.
5. **Day 5** – Docs: README, OpenAPI 3.1 spec generation (via fastify-swagger).
6. **Buffer** – harden, peer review, pen-test basics.

## OpenAPI generation
Fastify route schemas will be auto-exported to `/openapi.json`; copy that into Layer 5 FastMCP façade pipeline later.

## Next steps
1. Scaffold the directory and base files as per this plan.
2. Implement the service in plain JavaScript (no TypeScript).