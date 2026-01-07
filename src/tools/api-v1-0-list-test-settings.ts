import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import axios from "axios";

// Type definitions matching the API specification
type WindowSize = {
  maximize: boolean;
  width?: number;
  height?: number;
};

type TestPattern = {
  name: string;
  environment: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  browser_window_size?: WindowSize;
  os?: string;
  version?: string;
  model?: string;
};

type TestSetting = {
  test_settings_name: string;
  test_settings_number: number;
  test_patterns: TestPattern[];
};

type GetProjectTestSettingsResponse = {
  test_settings: TestSetting[];
};

export const apiV1_0ListTestSettings = (
  baseUrl: string,
  apiToken: string,
) => {
  return {
    name: "API-v1_0_list-test-settings",
    description:
      "Retrieve available test settings for a project. " +
      "Test settings define test configurations (device type, browser version, screen size, etc.) " +
      "and are needed when creating Autopilot tasks. " +
      "Returns test settings with their names, numbers, and associated test patterns.",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name (organization identifier)"),
      projectName: z.string().describe("The project name (project identifier)"),
      includePrivate: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Whether to include private test settings. By default, returns only shared settings.",
        ),
    }),
    handleRequest: async ({
      organizationName,
      projectName,
      includePrivate,
    }) => {
      try {
        // Construct the API URL with query parameter if needed
        const queryParam = includePrivate ? "?include_private=true" : "";
        const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/test-settings/${queryParam}`;

        let response;
        try {
          response = await axios.get(url, {
            headers: {
              Authorization: `Token ${apiToken}`,
            },
          });
        } catch (error: any) {
          if (error.response) {
            // HTTP error response from server
            const status = error.response.status;
            const errorData = error.response.data;

            let errorMessage = "An error occurred while fetching test settings";

            if (status === 401) {
              errorMessage =
                "Authentication failed. Please check your API token.";
            } else if (status === 403) {
              errorMessage = `Access denied. You don't have permission to view test settings for ${organizationName}/${projectName}.`;
            } else if (status === 404) {
              errorMessage = `Project ${organizationName}/${projectName} not found.`;
            } else if (status === 400) {
              if (errorData && typeof errorData === "object") {
                errorMessage = `Invalid request: ${JSON.stringify(errorData)}`;
              } else {
                errorMessage = `Invalid request with status ${status}: ${errorData}`;
              }
            } else {
              errorMessage = `Request failed with status ${status}: ${errorData}`;
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: errorMessage,
                    status: status,
                  }),
                },
              ],
            };
          } else {
            // Network or other error
            const errorMessage =
              error.message || "Network error while fetching test settings";
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: errorMessage,
                    status: "network_error",
                  }),
                },
              ],
            };
          }
        }

        // Handle success response
        if (response.status === 200) {
          const data: GetProjectTestSettingsResponse = response.data;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Unexpected response format from API",
                  status: response.status,
                  response_data: response.data,
                }),
              },
            ],
          };
        }
      } catch (error) {
        console.error(
          "Failed to fetch test settings: ",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  } satisfies OtherToolDefinition<any>;
};
