import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import axios from "axios";

const testCaseTaskSchema = z.object({
  testCaseNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Test case number. If not provided, testCaseName must be provided",
    ),
  testCaseName: z
    .string()
    .optional()
    .describe("Test case name. Required if testCaseNumber is not provided"),
  testSettingNumber: z
    .number()
    .int()
    .positive()
    .describe("Test setting number"),
  prompt: z
    .string()
    .min(1)
    .describe("User prompt describing the test scenario"),
});

export const apiV1_0CreateAutopilotTasks = (
  baseUrl: string,
  apiToken: string,
) => {
  return {
    name: "API-v1_0_create-autopilot-tasks",
    description:
      "Create autopilot tasks for test case editing/creation. Each task instructs Autopilot to edit an existing test case or create a new one based on the provided prompt.",
    inputSchema: z.object({
      organizationName: z.string().describe("The organization name"),
      projectName: z.string().describe("The project name"),
      testCaseTasks: z
        .array(testCaseTaskSchema)
        .nonempty()
        .describe("Array of test case tasks to create"),
    }),
    handleRequest: async ({ organizationName, projectName, testCaseTasks }) => {
      try {
        // Validate conditional requirements
        for (let i = 0; i < testCaseTasks.length; i++) {
          const task = testCaseTasks[i];

          // Exactly one of testCaseNumber or testCaseName must be provided, not both
          if (task.testCaseNumber && task.testCaseName) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Task ${i + 1}: Cannot specify both testCaseNumber and testCaseName. Provide only one.`,
                    status: "validation_error",
                  }),
                },
              ],
            };
          }

          if (!task.testCaseNumber && !task.testCaseName) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Task ${i + 1}: Either testCaseNumber or testCaseName must be provided`,
                    status: "validation_error",
                  }),
                },
              ],
            };
          }

          if (!task.testCaseNumber && task.testCaseName?.trim().length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: `Task ${i + 1}: Provided testCaseName is empty. Either testCaseNumber or testCaseName must be provided and non-empty.`,
                    status: "validation_error",
                  }),
                },
              ],
            };
          }
        }

        // Transform request data (camelCase to snake_case)
        const requestBody = {
          test_case_tasks: testCaseTasks.map(
            (task: z.infer<typeof testCaseTaskSchema>) => ({
              ...(task.testCaseNumber !== undefined && {
                test_case_number: task.testCaseNumber,
              }),
              ...(task.testCaseName !== undefined && {
                test_case_name: task.testCaseName.trim(),
              }),
              test_setting_number: task.testSettingNumber,
              prompt: task.prompt.trim(),
            }),
          ),
        };

        // Make HTTP POST request
        const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/autopilot-tasks/`;

        let response;
        try {
          response = await axios.post(url, requestBody, {
            headers: {
              Authorization: `Token ${apiToken}`,
              "Content-Type": "application/json",
            },
          });
        } catch (error: any) {
          if (error.response) {
            // HTTP error response from server
            const status = error.response.status;
            const errorData = error.response.data;

            let errorMessage =
              "An error occurred while creating autopilot tasks";

            if (status === 400) {
              if (errorData && typeof errorData === "object") {
                errorMessage = `Invalid request: ${JSON.stringify(errorData)}`;
              } else {
                errorMessage = `Invalid request with status ${status}: ${errorData}`;
              }
            } else if (status === 401) {
              errorMessage =
                "Authentication failed. Please check your API token.";
            } else if (status === 403) {
              errorMessage = `Access denied. You don't have permission to create autopilot tasks in ${organizationName}/${projectName}.`;
            } else if (status === 404) {
              errorMessage = `Project ${organizationName}/${projectName} not found.`;
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
              error.message || "Network error while creating autopilot tasks";
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
        if (
          response.status === 200 &&
          response.data.results &&
          response.data.url
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  message: `Created ${response.data.results.length} autopilot task(s)`,
                  task_ids: response.data.results,
                  progress_url: `${baseUrl}${response.data.url}`,
                  note: "Monitor task progress at the provided URL",
                }),
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
          "Failed to create autopilot tasks: ",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  } satisfies OtherToolDefinition<any>;
};
