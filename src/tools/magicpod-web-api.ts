import { OpenAPIV3 } from "openapi-types";
import {
  MCPProxy,
  OtherToolDefinition,
} from "../openapi-mcp-server/mcp/proxy.js";

const getOpenApiSpec = async (schemaUrl: string) => {
  try {
    const response = await fetch(schemaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as OpenAPIV3.Document;
  } catch (error) {
    console.error("Failed to parse OpenAPI spec:", (error as Error).message);
    process.exit(1);
  }
};

export const initMagicPodApiProxy = async (
  baseUrl: string,
  apiToken: string,
  tools: OtherToolDefinition<any>[],
) => {
  const schemaUrl = `${baseUrl}/api/v1.0/doc/?format=openapi`;
  const openApiSpec = await getOpenApiSpec(schemaUrl);
  openApiSpec.servers = [{ url: `${baseUrl}/api` }];
  const proxy = new MCPProxy(
    "magicpod-mcp-server",
    openApiSpec,
    apiToken,
    tools,
  );
  return proxy;
};
