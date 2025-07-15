# syntax=docker/dockerfile:1

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Environment variables (can be overridden at runtime)
ENV MCP_PORT=9000
ENV MCP_BASE_URL=
ENV MCP_HEADERS=

# Expose the MCP port (default 9000)
EXPOSE ${MCP_PORT}

# Start the MCP server using OpenAPI specs from /specs (ConfigMap mount)
# Supports optional MCP_BASE_URL and MCP_HEADERS (KEY=VAL;KEY2=VAL)
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["python mcp.py /specs/* --port ${MCP_PORT} $( [ -n \"$MCP_BASE_URL\" ] && printf -- \"--base-url %s \" \"$MCP_BASE_URL\" ) $( IFS=';'; for h in ${MCP_HEADERS}; do [ -n \"$h\" ] && printf -- \"--header %s \" \"$h\"; done )"]