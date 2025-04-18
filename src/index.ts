#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import { searchMagicpodArticles } from "./tools/search-magicpod-articles.js";
import { readMagicpodArticle } from "./tools/read-magicpod-article.js";
import { initMagicPodApiProxy } from "./tools/magicpod-web-api.js";
import { apiV1_0UploadFileCreate } from "./tools/api-v1-0-upload-file-create.js";

const program = new Command();
program.option("--api-token <key>", "MagicPod API token to use");
program.parse(process.argv);
const options: { apiToken: string } = program.opts();

if (!options.apiToken) {
  console.error("--api-token must be provided");
  process.exit(1);
}

async function main() {
  const baseUrl = process.env.BASE_URL || "https://app.magicpod.com";
  const proxy = await initMagicPodApiProxy(baseUrl, options.apiToken, [
    apiV1_0UploadFileCreate(baseUrl, options.apiToken),
    searchMagicpodArticles(),
    readMagicpodArticle(),
  ]);
  await proxy.connect(new StdioServerTransport());
  console.error("MagicPod MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
