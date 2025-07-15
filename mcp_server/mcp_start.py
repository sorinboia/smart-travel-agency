import requests
import json
import yaml
import asyncio
import httpx
from fastmcp import FastMCP
import uvicorn
import logging
import argparse
import sys
import glob
import re
import os





class LoggingAsyncClient(httpx.AsyncClient):
    async def request(self, method, url, *args, **kwargs):
        if method.upper() == "POST":
            body = None
            if "json" in kwargs:
                try:
                    body = json.dumps(kwargs["json"])
                except Exception:
                    body = str(kwargs["json"])
            elif "data" in kwargs:
                body = str(kwargs["data"])
            elif "content" in kwargs:
                body = str(kwargs["content"])
            else:
                body = None

        return await super().request(method, url, *args, **kwargs)




def expand_patterns(patterns):
    """Expand a list of patterns (glob or regex) into file paths.
    To force regex, prefix with 're:'. Example: 're:OpenApiSpecs/.*'
    """
    expanded = []
    for pat in patterns:
        if pat.startswith("re:"):
            # Treat as regex: match only files in the specified directory (not recursive)
            pat_body = pat[3:]
            dir_part = os.path.dirname(pat_body) or "."
            regex_pat = os.path.basename(pat_body)
            try:
                regex = re.compile(regex_pat)
            except re.error as e:
                logger.error(f"Invalid regex pattern '{pat}': {e}")
                continue
            found = False
            try:
                for fname in os.listdir(dir_part):
                    full_path = os.path.join(dir_part, fname)
                    if os.path.isfile(full_path) and regex.fullmatch(fname):
                        expanded.append(full_path)
                        found = True
            except FileNotFoundError:
                logger.warning(f"Directory not found for regex pattern: {pat}")
            if not found:
                logger.warning(f"No files matched regex pattern: {pat}")
        else:
            # Use glob for all other patterns
            matches = glob.glob(pat)
            if not matches:
                logger.warning(f"No files matched glob pattern: {pat}")
            expanded.extend(matches)
    return expanded

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default fallback spec list
DEFAULT_SPEC_PATHS = [
    # Example explicit files:
    # "f5xc_openapi/docs-cloud-f5-com.0072.public.ves.io.schema.views.http_loadbalancer.ves-swagger.json",
    # "OpenApiSpecs/docs-cloud-f5-com.0160.public.ves.io.schema.namespace.ves-swagger.json",
    # To use regex, prefix with 're:'
    #"re:OpenApiSpecs/.*"
]

def merge_openapi_specs(specs):
    """Merge multiple OpenAPI specs into one. Later specs override earlier on conflicts."""
    if not specs:
        raise ValueError("No OpenAPI specs provided for merging.")

    merged = {
        "openapi": "3.0.0",
        "info": {
            "title": "Merged F5XC APIs",
            "version": "1.0.0"
        },
        "paths": {},
        "components": {}
    }

    for spec in specs:
        # Merge paths
        for path, val in spec.get("paths", {}).items():
            if path in merged["paths"]:
                logger.warning(f"Path conflict on '{path}', overriding with later spec.")
            merged["paths"][path] = val
        # Merge components (schemas, parameters, etc.)
        for comp_key, comp_val in spec.get("components", {}).items():
            if comp_key not in merged["components"]:
                merged["components"][comp_key] = {}
            for k, v in comp_val.items():
                if k in merged["components"][comp_key]:
                    logger.warning(f"Component conflict on '{comp_key}.{k}', overriding with later spec.")
                merged["components"][comp_key][k] = v
        # Optionally merge tags, security, etc. as needed

    # Optionally merge tags, servers, etc. (not required for basic MCP)
    return merged

def main():
    parser = argparse.ArgumentParser(
        description="Start MCP with merged OpenAPI specs.\n"
                    "Supports merging multiple OpenAPI specs and proxying requests to a configurable upstream REST API.\n"
                    "New options:\n"
                    "  --base-url   Set the upstream REST base URL for all proxied requests (overrides default or $F5_BASE_URL)\n"
                    "  --header     Add extra HTTP header(s) in KEY=VALUE form; repeatable. Example: --header X-API-Key=foo --header Authorization=Bearer123\n"
    )
    parser.add_argument("specs", nargs="*", help="Paths to OpenAPI spec JSON files (explicit paths)")
    parser.add_argument("--pattern", "-p", action="append", help="Glob pattern(s) to include spec files (e.g. 'OpenApiSpecs/*.json')")
    parser.add_argument("-f", "--file-list", help="Path to text file whose entries (newline or comma-separated) are spec paths or patterns")
    # REMOVED: parser.add_argument("-o", "--output", ...)
    parser.add_argument("--port", type=int, default=9000, help="Port for FastMCP server to listen on (default: 9000)")
    parser.add_argument("--base-url", help="Upstream REST base URL for all proxied requests (overrides default or $F5_BASE_URL)")
    parser.add_argument("--header", action="append", help="Extra HTTP header(s) in KEY=VALUE form; repeatable. Example: --header X-API-Key=foo --header Authorization=Bearer123")
    args = parser.parse_args()

    # Helper to parse file-list (newline or comma separated)
    def parse_file_list(file_path):
        import re
        entries = []
        try:
            with open(file_path, "r", encoding="utf-8") as fl:
                content = fl.read()
                # Split on newlines or commas, strip whitespace, ignore empty
                for entry in re.split(r'[,\n]+', content):
                    entry = entry.strip()
                    if entry:
                        entries.append(entry)
        except Exception as e:
            logger.error(f"Failed to read file-list '{file_path}': {e}")
            sys.exit(1)
        return entries

    # Expand glob patterns if provided
    pattern_paths = []
    if args.pattern:
        pattern_paths = expand_patterns(args.pattern)

    # Expand file-list if provided
    file_list_paths = []
    if args.file_list:
        file_list_entries = parse_file_list(args.file_list)
        if file_list_entries:
            file_list_paths = expand_patterns(file_list_entries)

    # Combine explicit paths, pattern-expanded paths, and file-list paths, deduplicate, fallback to default if empty
    combined_paths = []
    if args.specs or pattern_paths or file_list_paths:
        combined_paths = args.specs + pattern_paths + file_list_paths
        spec_paths = list(dict.fromkeys(combined_paths))
    else:
        # Expand any patterns (glob or regex) in DEFAULT_SPEC_PATHS
        spec_paths = expand_patterns(DEFAULT_SPEC_PATHS)

    logger.info(f"Using OpenAPI spec files: {spec_paths}")

    specs = []
    for path in spec_paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                if path.lower().endswith((".yaml", ".yml")):
                    try:
                        spec = yaml.safe_load(f)
                    except Exception as e:
                        logger.error(f"Failed to parse YAML spec '{path}': {e}")
                        raise
                else:
                    try:
                        spec = json.load(f)
                    except Exception as e:
                        logger.error(f"Failed to parse JSON spec '{path}': {e}")
                        raise
                specs.append(spec)
                logger.info(f"Loaded spec: {path} ({len(spec.get('paths', {}))} paths)")
        except Exception as e:
            logger.error(f"Failed to load spec '{path}': {e}")
            sys.exit(1)

    if not specs:
        logger.error("No valid OpenAPI specs loaded. Exiting.")
        sys.exit(1)

    merged_spec = merge_openapi_specs(specs)

    logger.info("Merged %d OpenAPI specs in-memory", len(specs))
    logger.info("Creating FastMCP server from merged OpenAPI spec")
    
    
    mcp = FastMCP(
        name="F5 Distributed Cloud (Merged)",
        instructions="MCP server for F5 Distributed Cloud (multi-spec merged)"        
    )

    # Build headers from --header, fallback to env, then default
    headers = {}
    if args.header:
        for h in args.header:
            if "=" not in h:
                logger.error(f"Invalid --header '{h}'. Use KEY=VALUE.")
                sys.exit(1)
            k, v = h.split("=", 1)
            headers[k.strip()] = v.strip()
    # Default Authorization token from env if present and not already set
    token = os.getenv("F5_TOKEN")
    if token and "Authorization" not in headers:
        headers["Authorization"] = f"APIToken {token}"
    # Use base_url from CLI, then env, then default
    base_url = args.base_url or os.getenv("F5_BASE_URL")
    http_client = LoggingAsyncClient(
        base_url=base_url,
        headers=headers
    )
    fastmcp_api = FastMCP.from_openapi(
        openapi_spec=merged_spec,
        client=http_client
    )
        
    # fastmcp_api.run(transport="streamable-http",host="0.0.0.0",port=9000)
    # fastmcp_api.run()
    fastmcp_api.run(transport="sse", host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()

  
