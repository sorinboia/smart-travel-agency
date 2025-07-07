# Trips Service – Implementation Plan

```mermaid
flowchart TD
    subgraph Trips Service (Port 4003)
        S[[Fastify v4 Server]]
        PL1[@fastify/mongodb]
        PL2[@fastify/jwt]
        PL3[@fastify/sensible]
        PL4[authenticate plugin]
        R1[/trips]:::route
        R2[/trips/:id]:::route
    end
    classDef route fill:#f9f,stroke:#333,stroke-width:1px
    S --> PL1 --> PL2 --> PL3 --> PL4 --> R1 & R2
```

## 1 Project Skeleton
```
services/trips/
 ├─ Dockerfile
 ├─ jest.config.js
 ├─ package.json
 ├─ k8s/
 │   ├─ deployment.yaml
 │   └─ service.yaml
 ├─ src/
 │   ├─ server.js
 │   ├─ plugins/
 │   │   ├─ authenticate.js
 │   │   ├─ jwt.js
 │   │   └─ mongodb.js
 │   ├─ models/
 │   │   └─ tripPlan.js
 │   └─ routes/
 │       ├─ list.js
 │       ├─ create.js
 │       ├─ details.js
 │       └─ remove.js
 └─ test/
     ├─ api.e2e.spec.js
     └─ unit/
```

## 2 Key Files & Responsibilities
• `src/server.js`  
  – Fastify bootstrap; registers plugins, routes, error handler, health & metrics, listens on `PORT || 4003`.

• Plugins  
  – `src/plugins/mongodb.js` → same config object as Hotels but `database:'travel'` and `collection:'trip_plans'`.  
  – `src/plugins/jwt.js` → identical secret/expiry.  
  – `src/plugins/authenticate.js` → `fastify.decorate('authenticate', …)` wrapper calling `req.jwtVerify()` and 401 on failure.

• Model  
  – `src/models/tripPlan.js` exports helpers:
    `createTrip(fastify, data)`,  
    `listTrips(fastify, userId, page, limit)`,  
    `getTripById(fastify, userId, tripId)`,  
    `softDeleteTrip(fastify, userId, tripId)`.

• Routes (Fastify‐plugin style)  
  – `routes/create.js` POST /trips  
  – `routes/list.js` GET /trips  
  – `routes/details.js` GET /trips/:tripId  
  – `routes/remove.js` DELETE /trips/:tripId  
  Each route:
  1. `await fastify.authenticate` pre-handler.  
  2. Calls corresponding model fn.  
  3. Sends `{ data }` or 204.

• Error Handling  
  Centralised `fastify.setErrorHandler` identical to Hotels → `{ error, traceId? }`.

• Observability  
  Prometheus metrics via `prom-client` at `/metrics` (copy labels from Hotels).

## 3 Testing
1. **Unit** (`test/unit/`)  
   – Model functions with in-memory Fastify + `mongodb-memory-server`.

2. **E2E** (`test/api.e2e.spec.js`)  
   – Spin Fastify instance, hit routes with `supertest`, JWT signed by same secret.  
   – Coverage ≥ 80 %.

## 4 Docker & K8s
• Dockerfile copies `package*.json`, installs prod deps, then source; CMD `node src/server.js`.  
• `deployment.yaml` & `service.yaml` replicate Hotels (image, env MONGODB_URI/DB, resources, liveness `/healthz`, port 4003).

## 5 Implementation Steps
1. Scaffold folders & placeholder files.  
2. Copy Hotels’ package.json → adjust `name`, `version`, remove MinIO deps.  
3. Implement plugins, model, and routes as described.  
4. Add Jest config, write tests, ensure 80 % coverage.  
5. Add Dockerfile & K8s manifests.  
6. Manual sanity run: `node src/server.js`, hit endpoints with curl & JWT.  
7. PR review ⚙️.