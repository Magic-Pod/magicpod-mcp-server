import {OpenAPIV3} from "openapi-types";
import {MCPProxy, OtherToolDefinition} from "../openapi-mcp-server/mcp/proxy.js";

const schemaUrl = "https://app.magicpod.com/api/v1.0/doc/?format=openapi";

const getOpenApiSpec = async () => {
    try {
        const response = await fetch(schemaUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json() as OpenAPIV3.Document;
    } catch (error) {
        console.error('Failed to parse OpenAPI spec:', (error as Error).message);
        process.exit(1);
    }
}

export const initMagicPodApiProxy = async (apiToken: string, tools: OtherToolDefinition<any>[]) => {
    const openApiSpec = await getOpenApiSpec();
    openApiSpec.servers = [{ url: "https://app.magicpod.com/api"}];
    const proxy = new MCPProxy('magic-pod-mcp-server', openApiSpec, apiToken, tools);
    return proxy;
}