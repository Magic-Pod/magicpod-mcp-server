import {OpenAPIV2, OpenAPIV3} from "openapi-types";
import {
  MCPProxy,
  OtherToolDefinition,
} from "../openapi-mcp-server/mcp/proxy.js";
import swagger2openapi from "swagger2openapi";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import axios, { AxiosRequestConfig } from "axios";

const getOpenApiSpec = async (schemaUrl: string): Promise<OpenAPIV3.Document> => {
  try {
    const config: AxiosRequestConfig = {
      proxy: false, // Disable axios's broken proxy handling
    };
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (httpsProxy && schemaUrl.startsWith('https://')) {
      config.httpsAgent = new HttpsProxyAgent(httpsProxy);
    }
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    if (httpProxy && schemaUrl.startsWith('http://')) {
      config.httpAgent = new HttpProxyAgent(httpProxy);
    }
    const response = await axios.get(schemaUrl, config);
    const openApiV2Spec = response.data as OpenAPIV2.Document;
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
    console.error(error);
    process.exit(1);
  }
};

const unsupportedPaths = [
  '/v1.0/{organization_name}/{project_name}/batch-runs/{batch_run_number}/screenshots/',
  '/v1.0/{organization_name}/{project_name}/screenshots/{batch_task_id}/',
  '/v1.0/magicpod-clients/api/{os}/{tag_or_version}/',
  '/v1.0/magicpod-clients/local/{os}/{version}/',
  '/v1.0/{organization_name}/{project_name}/upload-file/',
  '/v1.0/{organization_name}/{project_name}/test-cases/{test_case_number}/start-upload-data-patterns/'
];

export const initMagicPodApiProxy = async (
  baseUrl: string,
  apiToken: string,
  tools: OtherToolDefinition<any>[],
) => {
  const schemaUrl = `${baseUrl}/api/v1.0/doc/?format=openapi`;
  const openApiSpec = await getOpenApiSpec(schemaUrl);
  openApiSpec.servers = [{ url: `${baseUrl}/api` }];
  for (const path of Object.keys(openApiSpec.paths)) {
    if (unsupportedPaths.includes(path)) {
      delete openApiSpec.paths[path];
    }
  }
  const proxy = new MCPProxy(
    "magicpod-mcp-server",
    openApiSpec,
    apiToken,
    tools,
  );
  return proxy;
};
