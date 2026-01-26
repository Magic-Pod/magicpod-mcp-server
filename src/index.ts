#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { searchMagicpodArticles } from "./tools/search-magicpod-articles.js";
import { readMagicpodArticle } from "./tools/read-magicpod-article.js";
import { initMagicPodApiProxy } from "./tools/magicpod-web-api.js";
import { apiV1_0UploadFileCreate } from "./tools/api-v1-0-upload-file-create.js";
import { apiV1_0UploadDataPatterns } from "./tools/api-v1-0-upload-data-patterns.js";
import { featureFlags } from "./config/feature-flags.js";
import { apiV1_0CreateAutopilotTasks } from "./tools/api-v1-0-create-autopilot-tasks.js";
import { apiV1_0ListTestSettings } from "./tools/api-v1-0-list-test-settings.js";
import { parseMagicpodUrl } from "./tools/parse-magicpod-url.js";

const program = new Command();
program.option("--api-token <key>", "MagicPod API token to use");
program.option("--debug", "For internal debug use");
program.parse(process.argv);
const options: { apiToken: string; debug: boolean } = program.opts();

if (!options.apiToken) {
  console.error("--api-token must be provided");
  process.exit(1);
}

async function main() {
  const baseUrlEnvironmentVariable = options.debug
    ? process.env.BASE_URL?.replace(/\/$/, "")
    : undefined;
  const baseUrl = baseUrlEnvironmentVariable || "https://app.magicpod.com";
  // Disable axios's broken proxy handling and set the default config
  axios.defaults.proxy = false;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpsProxy) {
    axios.defaults.httpsAgent = new HttpsProxyAgent(httpsProxy);
  }
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  if (httpProxy) {
    axios.defaults.httpAgent = new HttpProxyAgent(httpProxy);
  }
  const proxy = await initMagicPodApiProxy(baseUrl, options.apiToken, [
    apiV1_0UploadFileCreate(baseUrl, options.apiToken),
    apiV1_0UploadDataPatterns(baseUrl, options.apiToken),
    apiV1_0ListTestSettings(baseUrl, options.apiToken),
    searchMagicpodArticles(),
    readMagicpodArticle(),
    parseMagicpodUrl(),
    ...(featureFlags.enableAutopilotTasks
      ? [apiV1_0CreateAutopilotTasks(baseUrl, options.apiToken)]
      : []),
  ]);
  await proxy.connect(new StdioServerTransport());
  console.error("MagicPod MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
