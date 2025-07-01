# Smart Travel Agency

> Conversational travel-booking demo showcasing Google A2A agent patterns, domain micro-services and FastMCP façades.

## Key Features

- **End-to-end trip planning in natural language**  
  Book flights, reserve hotels and preview destination weather through a single chat interface.

- **Layered micro-service architecture**  
  Node.js domain services fronted by FastMCP façades feed specialist LLM agents coordinated by an A2A Orchestrator.

- **Clear contracts, easy swaps**  
  OpenAPI 3.1 specs and A2A prompts decouple layers so you can swap data sources, LLM models or deployment targets without rewrites.

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Layer6["Layer 6 — Data"]
        MINIO[(MinIO<br>Immutable Catalogs)]
        MONGO[(MongoDB<br>Users & Bookings)]
    end

    subgraph Layer5["Layer 5 — MCP Façades"]
        MCP_FLIGHTS[FastMCP<br>Flights]
        MCP_HOTELS[FastMCP<br>Hotels]
        MCP_WEATHER[FastMCP<br>Weather]
    end

    subgraph Layer4["Layer 4 — Domain Services (Node)"]
        SVC_FLIGHTS["Flight Service"]
        SVC_HOTELS["Hotel Service"]
        SVC_WEATHER["Weather Service"]
        SVC_AUTH["Auth Service"]
    end

    subgraph Layer3["Layer 3 — Specialist Agents"]
        AGENT_FLIGHTS[Flight Agent]
        AGENT_HOTELS[Hotel Agent]
        AGENT_WEATHER[Weather Agent]
    end

    subgraph Layer2["Layer 2 — Conversation & Orchestration"]
        ORCH[A2A Orchestrator]
    end

    subgraph Layer1["Layer 1 — Presentation / Consumer"]
        WEB[React Chat UI]
        PARTNER[A2A External Consumer]
    end

    WEB --> ORCH
    PARTNER --> ORCH
    ORCH --> AGENT_FLIGHTS
    ORCH --> AGENT_HOTELS
    ORCH --> AGENT_WEATHER
    AGENT_FLIGHTS --> MCP_FLIGHTS --> SVC_FLIGHTS --> MINIO
    AGENT_HOTELS --> MCP_HOTELS --> SVC_HOTELS --> MINIO
    AGENT_WEATHER --> MCP_WEATHER --> SVC_WEATHER --> MINIO
    SVC_FLIGHTS --> MONGO
    SVC_HOTELS --> MONGO
    SVC_AUTH --> MONGO
```

### Layer Breakdown

| # | Layer | Purpose |
|---|-------|---------|
| **1** | Presentation / Consumer | Browser chat UI and REST endpoint for partners. |
| **2** | Conversation & Orchestration | Maintains conversation state, decomposes goals and invokes specialist agents. |
| **3** | Specialist Agent Layer | Domain-aware LLM agents (Flights, Hotels, Weather) that call MCP APIs. |
| **4** | Domain Service Layer | Node.js micro-services implementing business logic and reading datasets. |
| **5** | MCP Server Layer | Auto-generated FastMCP façades enforcing auth, quotas and logging. |
| **6** | Data Layer | MinIO object storage for immutable catalogs and MongoDB for users/bookings. |
