## Smart Travel Agency – Demo Overview

**Smart Travel Agency** is a reference application that demonstrates how to combine **Google A2A (Agent-to-Agent)** patterns with **MCP (Model-Centric Platform)** services to deliver an end-to-end conversational travel-booking experience.  
Through a single chat interface, a user—or an external partner—can plan and confirm an entire trip (ﬂights, hotels and a weather snapshot) using only natural language.  
Behind the scenes an **Orchestrator Agent** delegates sub-tasks to domain-speciﬁc agents, each backed by:

1. A **domain micro-service** (Node.js) that reads JSON data from object storage.  
2. An **MCP server** (separate container) generated from the micro-service’s **OpenAPI spec**, exposing a uniform contract to the agent layer.

Because every tier follows clear contracts (A2A for agents, OpenAPI for services), you can swap data sources, LLM providers, or deployment targets without rewriting upstream layers.


### Layered Architecture 

| # | Layer | Purpose & Scope | Key Components | Tech & Frameworks | Notes |
|---|-------|-----------------|----------------|-------------------|-------|
| **1** | **Presentation / Consumer** | Drive all user-facing interaction—human **and** machine. | • **React Web App** (chat UI)  <br>• **A2A External Consumer** endpoint (monetisation gateway) | React 18, Tailwind CSS / Material UI | Browser chat for humans; REST/JSON A2A endpoint for partners. |
| **2** | **Conversation & Orchestration** | Translate user intent into a coherent multi-step workflow. | • **A2A Orchestrator**  <br>• **Core LLM** (OpenAI GPT or equivalent)  <br>• Optional **RAG** module for policy / FAQ retrieval | Python 3.11, Google ADK | Maintains conversation state, plans calls to domain agents, merges their results. |
| **3** | **Specialist Agent Layer** | Encapsulate business logic for a single domain. | • **Flight Agent**  <br>• **Hotel Agent**  <br>• **Weather Agent**  <br>Each embeds an **MCP Client** | Python, Google ADK | Stateless **template**; runtime config points to a chosen MCP endpoint and injects domain-specific system prompts. |
| **4** | **Domain Service Layer (Node.js)** | Business logic + data access for each domain **and authentication**. | **Per domain (plus auth):**  <br>• **Auth Service** (LOGIN/JWT)  <br>• **Flight Service** (GET/BOOK)  <br>• **Hotel Service** (GET/BOOK)  <br>• **Weather Service** (GET) | Node.js 20, Express | Reads JSON catalogues from object storage; handles booking and user side-effects; **publishes an OpenAPI 3.1 spec** consumed by the façade. |
| **5** | **MCP Server Layer (Contract Façade)** | Standardised, OpenAPI-driven façade in its **own container**; enforces auth, quotas, logging. | • **FastMCP** instance per domain, auto-generated from the service’s OpenAPI 3.1 spec | FastMCP (FastAPI), Python | **Generic FastMCP container** that ingests the domain’s OpenAPI spec at start-up. Same image reused for every domain; enforces auth/quotas/logging while shielding agents from Node internals. |
| **6** | **Data Layer** | Persist catalogues, bookings & user accounts. | • **S3-compatible object store** (MinIO) for immutable JSON datasets  <br>• **MongoDB** for bookings and users | MinIO **and** MongoDB | Immutable catalogue → object storage; mutable data → MongoDB |

---

#### Happy-Path Booking Flow (unchanged)

1. **User** opens the React app and requests: “I’d like a week in Tokyo in May.”  
2. **Orchestrator** decomposes the goal (ﬂights, hotels, weather).  
3. Invokes **Flight Agent** → **Flight MCP Server** (Layer 5) → **Flight Service (Node.js, Layer 4)** → S3 flight data.  
4. Invokes **Hotel Agent** → **Hotel MCP Server** → **Hotel Service** → S3 hotel data; provisional booking stored in DB.  
5. Invokes **Weather Agent** → **Weather MCP Server** → **Weather Service** → S3 weather snapshot.  
6. Orchestrator stitches the results, enriches via **RAG**, and returns a consolidated itinerary.  
7. On user confirmation, the orchestrator finalises bookings through MCP servers; confirmation numbers are returned.


