import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {getBatchRuns} from "./tools/get-batch-runs.js";
import {Command} from "commander";
import {searchMagicpodArticles} from "./tools/search-magicpod-articles.js";
import {readMagicpodArticle} from "./tools/read-magicpod-article.js";
import {initMagicPodApiProxy} from "./tools/magicpod-web-api.js";

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



async function main() {
    const proxy = await initMagicPodApiProxy(options.apiToken);
    const server = proxy.getServer();

    // Tools
    // getBatchRuns(server, options.apiToken);
    // searchMagicpodArticles(server);
    // readMagicpodArticle(server);

    await proxy.connect(new StdioServerTransport());

    // const transport = new StdioServerTransport();
    // await server.connect(transport);
    console.error("MagicPod MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
