# MCP Server

A FastMCP-based server for merging and serving multiple OpenAPI specifications, with support for proxying requests to an upstream REST API. Designed for API aggregation, rapid prototyping, and as a backend for API playgrounds or AI agents.

### Example command
```
python mcp_server/mcp_start.py -p mcp_server/openapi/weather.yaml --port 40123 --base-url http://localhost:4006
```



---

## Features

- **Merge multiple OpenAPI specs** (JSON) into a single API surface.
- **Flexible spec selection**: explicit paths, glob patterns, regex, or file lists.
- **Proxy requests** to an upstream REST API, with customizable headers and base URL.
- **SSE (Server-Sent Events) transport** for real-time API interaction.
- **Configurable via CLI and environment variables**.
- **Docker & Kubernetes ready**.

---

## Installation

### Local (Python)

1. Install Python 3.8+.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Docker

1. Build the image:
   ```bash
   docker build -t mcp-server .
   ```
2. Run the container:
   ```bash
   docker run -p 9000:9000 -e F5_TOKEN=your_token_here mcp-server
   ```
   - To mount custom OpenAPI specs:
     ```bash
     docker run -v $(pwd)/OpenApiSpecs:/app/OpenApiSpecs -p 9000:9000 mcp-server python mcp.py -p "OpenApiSpecs/*.json"
     ```

### Kubernetes

- Example deployment: see [`k8s/mcp.yaml`](k8s/mcp.yaml)
- Set secrets (e.g., `F5_TOKEN`) via Kubernetes Secret and reference as env in the Deployment.
- Mount OpenAPI specs via ConfigMap, Secret, or PVC.
- Override image/tag/port in the Deployment as needed.
- Expose via Service for in-cluster or external access.

---

## Usage

### Basic

```bash
python mcp.py OpenApiSpecs/*.json
```

### With glob/regex patterns

```bash
python mcp.py -p "OpenApiSpecs/*.json"
python mcp.py -p "re:OpenApiSpecs/.*flight.*"
```

### With file list

```bash
python mcp.py -f spec_list.txt
```
Where `spec_list.txt` contains one path or pattern per line or comma-separated.

### Proxying to an upstream API

```bash
python mcp.py -p "OpenApiSpecs/*.json" --base-url https://api.example.com --header "Authorization=Bearer123"
```

### Environment Variables

- `F5_TOKEN`: Used for Authorization header if not set via `--header`.
- `F5_BASE_URL`: Default upstream base URL if not set via `--base-url`.

---

## CLI Reference

```text
usage: mcp.py [-h] [--pattern PATTERN] [-f FILE_LIST] [--port PORT] [--base-url BASE_URL] [--header HEADER] [specs ...]

Start MCP with merged OpenAPI specs.
Supports merging multiple OpenAPI specs and proxying requests to a configurable upstream REST API.

positional arguments:
  specs                 Paths to OpenAPI spec JSON files (explicit paths)

options:
  --pattern, -p         Glob pattern(s) to include spec files (e.g. 'OpenApiSpecs/*.json')
  -f, --file-list       Path to text file whose entries (newline or comma-separated) are spec paths or patterns
  --port                Port for FastMCP server to listen on (default: 9000)
  --base-url            Upstream REST base URL for all proxied requests (overrides default or $F5_BASE_URL)
  --header              Extra HTTP header(s) in KEY=VALUE form; repeatable. Example: --header X-API-Key=foo --header Authorization=Bearer123
```

---

## Docker Details

- **Build**:  
  `docker build -t mcp-server .`
- **Run**:  
  `docker run -p 9000:9000 -e F5_TOKEN=your_token mcp-server`
- **Mount custom specs**:  
  `docker run -v $(pwd)/OpenApiSpecs:/app/OpenApiSpecs -p 9000:9000 mcp-server python mcp.py -p "OpenApiSpecs/*.json"`
- **Override port**:  
  `docker run -p 8080:9000 mcp-server python mcp.py --port 8080 ...`
- **Set headers/base URL**:  
  Use `-e` for env vars or `--header`/`--base-url` CLI flags.

---

## Kubernetes Details

- **Deployment**:  
  Use [`k8s/mcp.yaml`](k8s/mcp.yaml) as a template.
- **Set secrets**:  
  Create a Secret for `F5_TOKEN` and reference it in the Deployment's `env`.
- **Mount OpenAPI specs**:  
  - As a ConfigMap:
    ```yaml
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: openapi-specs
    data:
      flights.json: |
        { ... }
    ```
    Mount in Deployment:
    ```yaml
    volumeMounts:
      - name: specs
        mountPath: /app/OpenApiSpecs
    volumes:
      - name: specs
        configMap:
          name: openapi-specs
    ```
  - Or use a PVC for large/variable specs.
- **Override image/tag/port**:  
  Edit `k8s/mcp.yaml` as needed.
- **Service exposure**:  
  Expose via ClusterIP, NodePort, or Ingress as appropriate.
- **In-cluster usage**:  
  Other services can access via the Service DNS name (e.g., `http://mcp-server:9000`).
- **Troubleshooting**:  
  Check pod logs:  
  `kubectl logs deployment/mcp-server`
  Check health:  
  `kubectl get pods -l app=mcp-server`

---

## Development

- Add new OpenAPI specs to the `OpenApiSpecs/` directory or reference via CLI.
- Extend CLI options in [`mcp.py`](mcp.py) as needed.
- Regenerate this README if CLI flags or features change.

---

## License

[MIT] or your preferred license.
