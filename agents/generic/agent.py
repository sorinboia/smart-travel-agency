import os
import json
from google.adk.agents import Agent, LlmAgent

from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset
from google.adk.tools.openapi_tool.auth.auth_helpers import token_to_scheme_credential
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters, SseServerParams
from google.adk.models.lite_llm import LiteLlm

AGENT_NAME = os.environ.get("AGENT_NAME", "agent")
DESCRIPTION = os.environ.get("AGENT_DESCRIPTION", "Default agent description")
INSTRUCTIONS = os.environ.get("AGENT_INSTRUCTIONS", "Default agent instructions")


model = LiteLlm(
    model=os.environ.get("LITELLM_MODEL"),
    api_base=os.environ.get("LITELLM_API_BASE"),
    api_key=os.environ.get("LITELLM_API_KEY")
)

# Build MCPToolset list from MCP_SERVER_URLS env var (comma-separated), or use default
mcp_server_urls = os.environ.get("MCP_SERVER_URLS", "http://127.0.0.1:40123/sse")
url_list = [url.strip() for url in mcp_server_urls.split(",") if url.strip()]

root_agent = LlmAgent(
    name=AGENT_NAME,
    model=model,
    description=DESCRIPTION,
    instruction=INSTRUCTIONS,
       
    tools=[
        MCPToolset(
            connection_params=SseServerParams(
                url=url
            )
        ) for url in url_list
    ]
)
