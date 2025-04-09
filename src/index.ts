import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {getBatchRuns} from "./tools/getBatchRuns.js";
import {Command} from "commander";

const program = new Command();
program.option('--api-token <key>', 'MagicPod API token to use');
program.parse(process.argv);
const options: { apiToken: string } = program.opts();

if (!options.apiToken) {
    console.error("--api-token must be provided");
    process.exit(1);
}

const server = new McpServer({
    name: "magic-pod-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Tools
getBatchRuns(server, options.apiToken);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MagicPod MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
