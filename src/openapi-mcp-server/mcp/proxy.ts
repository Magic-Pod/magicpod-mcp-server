import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  JSONRPCResponse,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { JSONSchema7 as IJsonSchema } from "json-schema";
import { OpenAPIToMCPConverter } from "../openapi/parser.js";
import { HttpClient, HttpClientError } from "../client/http-client.js";
import { OpenAPIV3 } from "openapi-types";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { zodToJsonSchema } from "openai/_vendor/zod-to-json-schema/index";
import { ZodRawShape } from "zod";
import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

type PathItemObject = OpenAPIV3.PathItemObject & {
  get?: OpenAPIV3.OperationObject;
  put?: OpenAPIV3.OperationObject;
  post?: OpenAPIV3.OperationObject;
  delete?: OpenAPIV3.OperationObject;
  patch?: OpenAPIV3.OperationObject;
};

type NewToolDefinition = {
  methods: Array<{
    name: string;
    description: string;
    inputSchema: IJsonSchema & { type: "object" };
    returnSchema?: IJsonSchema;
  }>;
};

export type OtherToolDefinition<Args extends ZodRawShape> = {
  name: string;
  description: string;
  inputSchema: Args;
  handleRequest: (args: Args) => ReturnType<ToolCallback<Args>>;
};

// import this class, extend and return server
export class MCPProxy {
  private server: Server;
  private httpClient: HttpClient;
  private tools: Record<string, NewToolDefinition>;
  private openApiLookup: Record<
    string,
    OpenAPIV3.OperationObject & { method: string; path: string }
  >;

  constructor(
    name: string,
    openApiSpec: OpenAPIV3.Document,
    apiToken: string,
    private otherTools: OtherToolDefinition<any>[],
  ) {
    this.server = new Server(
      { name, version: "0.1.5" },
      { capabilities: { tools: {} } },
    );
    const baseUrl = openApiSpec.servers?.[0].url;
    if (!baseUrl) {
      throw new Error("No base URL found in OpenAPI spec");
    }
    this.httpClient = new HttpClient(
      {
        baseUrl,
        headers: {
          ...this.parseHeadersFromEnv(),
          Authorization: `Token ${apiToken}`,
        },
      },
      openApiSpec,
    );

    // Convert OpenAPI spec to MCP tools
    const converter = new OpenAPIToMCPConverter(openApiSpec);
    const { tools, openApiLookup } = converter.convertToMCPTools();
    this.tools = tools;
    this.openApiLookup = openApiLookup;

    this.setupHandlers();
  }

  private removeDescriptions(obj: object) {
    if (Array.isArray(obj)) {
      obj.forEach(this.removeDescriptions);
    } else if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (key === "description") {
          // @ts-ignore
          delete obj[key];
        } else {
          // @ts-ignore
          this.removeDescriptions(obj[key]);
        }
      }
    }
  }

  private collectRefs(obj: object): string[] {
    const refs: string[] = [];
    if (Array.isArray(obj)) {
      for (const childRefs of obj.map(this.collectRefs)) {
        for (const childRef of childRefs) {
          refs.push(childRef);
        }
      }
    } else if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (key === "$ref") {
          // @ts-ignore
          const ref = obj[key] as string;
          refs.push(ref.replaceAll("#/$defs/", ""));
        } else {
          // @ts-ignore
          this.collectRefs(obj[key]).forEach(refs.push);
        }
      }
    }
    return refs;
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [];

      // Add methods as separate tools to match the MCP format
      Object.entries(this.tools).forEach(([toolName, def]) => {
        def.methods.forEach((method) => {
          const toolNameWithMethod = `${toolName}-${method.name}`;
          const truncatedToolName = this.truncateToolName(toolNameWithMethod);

          // to reduce the tool list response size
          // TODO description is actually required
          const inputSchema: typeof method.inputSchema = JSON.parse(JSON.stringify(method.inputSchema));
          this.removeDescriptions(inputSchema);

          // 95% of the response size is consumed by $defs
          const body = method.inputSchema.properties?.body;
          if (body == null || typeof body === "boolean") {
            delete inputSchema["$defs"];
          } else {
            const refs = this.collectRefs(body);
            if (refs.length === 0) {
              delete inputSchema["$defs"];
            } else if (inputSchema["$defs"]) {
              for (const def of Object.keys(inputSchema["$defs"])) {
                if (!refs.includes(def)) {
                  delete inputSchema["$defs"][def];
                }
              }
            }
          }

          tools.push({
            name: truncatedToolName,
            description: method.description,
            inputSchema: inputSchema as Tool["inputSchema"],
          });
        });
      });

      for (const tool of this.otherTools) {
        tools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: zodToJsonSchema(tool.inputSchema, "input").definitions
            ?.input as Tool["inputSchema"],
        });
      }

      return { tools };
    });

    // Handle tool calling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error("calling tool", request.params);
      const { name, arguments: params } = request.params;

      const tool = this.otherTools.find((t) => t.name === name);
      if (tool) {
        return tool.handleRequest(params);
      }

      // Find the operation in OpenAPI spec
      const operation = this.findOperation(name);
      console.error("operations", this.openApiLookup);
      if (!operation) {
        throw new Error(`Method ${name} not found`);
      }

      try {
        // Execute the operation
        const response = await this.httpClient.executeOperation(
          operation,
          params,
        );

        // Convert response to MCP format
        return {
          content: [
            {
              type: "text", // currently this is the only type that seems to be used by mcp server
              text: JSON.stringify(response.data), // TODO: pass through the http status code text?
            },
          ],
        };
      } catch (error) {
        console.error("Error in tool call", error);
        if (error instanceof HttpClientError) {
          console.error(
            "HttpClientError encountered, returning structured error",
            error,
          );
          const data = error.data?.response?.data ?? error.data ?? {};
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "error", // TODO: get this from http status code?
                  ...(typeof data === "object" ? data : { data: data }),
                }),
              },
            ],
          };
        }
        throw error;
      }
    });
  }

  private findOperation(
    operationId: string,
  ): (OpenAPIV3.OperationObject & { method: string; path: string }) | null {
    return this.openApiLookup[operationId] ?? null;
  }

  private parseHeadersFromEnv(): Record<string, string> {
    const headersJson = process.env.OPENAPI_MCP_HEADERS;
    if (!headersJson) {
      return {};
    }

    try {
      const headers = JSON.parse(headersJson);
      if (typeof headers !== "object" || headers === null) {
        console.warn(
          "OPENAPI_MCP_HEADERS environment variable must be a JSON object, got:",
          typeof headers,
        );
        return {};
      }
      return headers;
    } catch (error) {
      console.warn(
        "Failed to parse OPENAPI_MCP_HEADERS environment variable:",
        error,
      );
      return {};
    }
  }

  private getContentType(headers: Headers): "text" | "image" | "binary" {
    const contentType = headers.get("content-type");
    if (!contentType) return "binary";

    if (contentType.includes("text") || contentType.includes("json")) {
      return "text";
    } else if (contentType.includes("image")) {
      return "image";
    }
    return "binary";
  }

  private truncateToolName(name: string): string {
    if (name.length <= 64) {
      return name;
    }
    return name.slice(0, 64);
  }

  async connect(transport: Transport) {
    // The SDK will handle stdio communication
    await this.server.connect(transport);
  }

  getServer() {
    return this.server;
  }
}
