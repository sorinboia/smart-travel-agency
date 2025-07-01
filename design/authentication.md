# Authentication / Login Service Design

## 1&nbsp;&nbsp;Purpose & Scope
The Authentication Service (“Auth Service”) provides **user registration, login and token-based authentication** for the Smart Travel Agency demo.  
It issues **long-lived (1 year) JSON Web Tokens (JWT, HS256)** that encode the user’s e-mail and identifier, allowing every backend tier to perform **local verification** without a network round-trip.  
All **user credentials and profiles are stored in MongoDB**, the same cluster that persists bookings.

---

## 2&nbsp;&nbsp;Position in the Layered Architecture
```mermaid
flowchart LR
    subgraph Presentation / Consumer
        A[React Chat UI]
    end

    subgraph New Auth Service<br>(Layer 4 – Domain Service)
        C[Auth Service<br>Node 20 + Fastify 4]
    end

    subgraph Backend Tiers
        B[A2A Orchestrator]
        D[Domain Services<br>(Flights / Hotels / Weather)]
        E[FastMCP Façades]
    end

    A -- Bearer JWT --> B
    A -- /login / register --> C
    B & D & E -- verifyJWT() --> F[[JWT Validation Library]]
    F -. uses .-> G[(ENV `JWT_SECRET`)]
```
* The Auth Service is an **additional Domain Service** (Layer 4) alongside Flights, Hotels, Weather.  
* Each backend component links a tiny **JWT validation helper** (Node & Python) to authenticate inbound requests locally.

---

## 3&nbsp;&nbsp;API Contract (OpenAPI 3.1)


```yaml
paths:
  /auth/register:
    post:
      summary: Create a new user account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, fullName]
              properties:
                email:     { type: string, format: email }
                password:  { type: string, minLength: 8 }
                fullName:  { type: string, minLength: 1 }
      responses:
        "201":
          description: Created
          content: { application/json: { schema: { $ref: "#/components/schemas/User" } } }
        "409": { $ref: "#/components/responses/Conflict" }

  /auth/login:
    post:
      summary: Authenticate and receive a JWT
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:    { type: string, format: email }
                password: { type: string }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:     { type: string }
                  expiresAt: { type: string, format: date-time }
        "401": { $ref: "#/components/responses/Unauthorized" }

  /auth/me:
    get:
      summary: Return current user profile
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          description: OK
          content: { application/json: { schema: { $ref: "#/components/schemas/User" } } }
        "401": { $ref: "#/components/responses/Unauthorized" }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        userId:    { type: string }
        email:     { type: string, format: email }
        fullName:  { type: string }
        createdAt: { type: string, format: date-time }
```

---

## 4&nbsp;&nbsp;MongoDB Data Model
Collection `users`

| Field        | Type      | Description / Notes              |
|--------------|-----------|----------------------------------|
| `_id`        | ObjectId  | Primary key                      |
| `email`      | string    | **Unique**, lower-cased          |
| `pwdHash`    | string    | `bcrypt` hash (12–14 rounds)     |
| `fullName`   | string    | Display name                     |
| `createdAt`  | ISODate   | Set at registration              |
| `lastLoginAt`| ISODate   | Updated on successful login      |
| `status`     | enum      | `active` / `disabled`            |

Indexes:

1. `{ email: 1 }` — unique  
2. `{ status: 1 }`

---

## 5&nbsp;&nbsp;JWT Strategy
* **Algorithm** `HS256` (`jsonwebtoken` in Node, `pyjwt` in Python).  
* **Secret** 32-byte random string in env var `JWT_SECRET`.  
* **Claims**  
  * `sub` — user `_id`  
  * `email` — user email  
  * `iat`, `exp` — issued / expires (365 days)  

Long validity avoids refresh complexity; secret rotation (manual/CI) invalidates prior tokens.

