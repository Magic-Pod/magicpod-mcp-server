import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
    name: "magic-pod-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});