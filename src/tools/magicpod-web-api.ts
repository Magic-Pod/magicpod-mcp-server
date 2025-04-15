import {OpenAPIV2, OpenAPIV3} from "openapi-types";
import {
  MCPProxy,
  OtherToolDefinition,
} from "../openapi-mcp-server/mcp/proxy.js";
import swagger2openapi from "swagger2openapi";

const getOpenApiSpec = async (schemaUrl: string): Promise<OpenAPIV3.Document> => {
  try {
    const response = await fetch(schemaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const openApiV2Spec = await response.json() as OpenAPIV2.Document;
    return new Promise((resolve, reject) => {
      swagger2openapi.convertObj(openApiV2Spec, {}, (err, options) => {
        if (err) {
          reject(err);
        } else {
          resolve(options.openapi as OpenAPIV3.Document);
        }
      });
    });
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
