import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import axios from "axios";

const testCaseCreateTaskSchema = z.object({
  testCaseName: z
    .string()
    .min(1)
    .describe("Test case name for the new test case to create"),
  testSettingsNumber: z
    .number()
    .int()
    .positive()
    .describe(
      "Test settings number that defines the test configuration (device type, browser version, screen size, etc.). " +
        "This parameter is mandatory. " +
        "If you do not have this value, you MUST stop and ask the user for it before calling this tool.",
    ),
  testSettingsPatternName: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional test pattern name to use for this test case. " +
        "If not provided, chooses the first test pattern. " +
        "You should prompt the user for this information, but make it clear that it is optional.",
    ),
  prompt: z
    .string()
    .min(1)
    .describe(
      "User prompt describing the test scenario. " +
        "For Browser platform projects, unless a URL is already specified in the test case, " +
        "Autopilot has no knowledge of page URLs and requires them to be included in the prompt when necessary.",
    ),
});

const testCaseEditTaskSchema = z.object({
  testCaseNumber: z
    .number()
    .int()
    .positive()
    .describe("Test case number to edit"),
  testSettingsNumber: z
    .number()
    .int()
    .positive()
    .describe(
      "Test settings number that defines the test configuration (device type, browser version, screen size, etc.). " +
        "This parameter is mandatory. " +
        "If you do not have this value, you MUST stop and ask the user for it before calling this tool.",
    ),
  testSettingsPatternName: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional test pattern name to use for this test case. " +
        "If not provided, chooses the first test pattern. " +
        "You should prompt the user for this information, but make it clear that it is optional.",
    ),
  prompt: z
    .string()
    .min(1)
    .describe(
      "User prompt describing the test scenario. " +
        "For Browser platform projects, unless a URL is already specified in the test case, " +
        "Autopilot has no knowledge of page URLs and requires them to be included in the prompt when necessary.",
    ),
});

export const apiV1_0CreateAutopilotTasks = (
  baseUrl: string,
  apiToken: string,
) => {
  return {
    name: "API-v1_0_create-autopilot-tasks",
    description:
      "Create Autopilot tasks for test case creation and/or editing. " +
      "Autopilot is an AI agent that can generate/edit E2E tests for mobile apps and web apps in MagicPod style. " +
      "Use the list projects tool first to check the project platform type. " +
      "Provide testCaseCreateTasks to create new test cases, and/or testCaseEditTasks to edit existing ones. " +
      "At least one of the task arrays must be provided.",
    inputSchema: z
      .object({
        organizationName: z
          .string()
          .describe(
            `The organization name. Can be extracted when the user provides MagicPod URLs, which typically follow the structure: ${baseUrl}/{organizationName}/{projectName}/{...}`,
          ),
        projectName: z
          .string()
          .describe(
            `The project name. Can be extracted when the user provides MagicPod URLs, which typically follow the structure: ${baseUrl}/{organizationName}/{projectName}/{...}`,
          ),
        testCaseCreateTasks: z
          .array(testCaseCreateTaskSchema)
          .optional()
          .describe("Array of test cases to create (optional)"),
        testCaseEditTasks: z
          .array(testCaseEditTaskSchema)
          .optional()
          .describe("Array of test cases to edit (optional)"),
      })
      .refine(
        (data) => {
          const hasCreateTasks =
            data.testCaseCreateTasks && data.testCaseCreateTasks.length > 0;
          const hasEditTasks =
            data.testCaseEditTasks && data.testCaseEditTasks.length > 0;
          return hasCreateTasks || hasEditTasks;
        },
        {
          message:
            "At least one of testCaseCreateTasks or testCaseEditTasks must be provided and non-empty",
          path: ["testCaseCreateTasks"],
        },
      ),
    handleRequest: async ({
      organizationName,
      projectName,
      testCaseCreateTasks,
      testCaseEditTasks,
    }) => {
      try {
        // Transform request data (camelCase to snake_case)
        const requestBody = {
          test_case_create_tasks:
            testCaseCreateTasks?.map(
              (task: z.infer<typeof testCaseCreateTaskSchema>) => ({
                test_case_name: task.testCaseName.trim(),
                test_settings_number: task.testSettingsNumber,
                ...(task.testSettingsPatternName && {
                  test_settings_pattern_name:
                    task.testSettingsPatternName.trim(),
                }),
                prompt: task.prompt.trim(),
              }),
            ) || [],
          test_case_edit_tasks:
            testCaseEditTasks?.map(
              (task: z.infer<typeof testCaseEditTaskSchema>) => ({
                test_case_number: task.testCaseNumber,
                test_settings_number: task.testSettingsNumber,
                ...(task.testSettingsPatternName && {
                  test_settings_pattern_name:
                    task.testSettingsPatternName.trim(),
                }),
                prompt: task.prompt.trim(),
              }),
            ) || [],
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
        if (response.status === 200) {
          const createTasksCount = testCaseCreateTasks?.length || 0;
          const editTasksCount = testCaseEditTasks?.length || 0;

          const result: any = {
            status: "success",
            message: `Successfully processed ${createTasksCount} create task(s) and ${editTasksCount} edit task(s)`,
          };

          // Include create tasks response if requested
          if (response.data.test_case_create_tasks) {
            result.testCaseCreateTasks = {
              url: response.data.test_case_create_tasks.url,
            };
          }

          // Include edit tasks response if requested
          if (response.data.test_case_edit_tasks?.test_cases) {
            result.testCaseEditTasks = {
              testCases: response.data.test_case_edit_tasks.test_cases.map(
                (tc: any) => ({
                  url: tc.url,
                  number: tc.number,
                }),
              ),
            };
          }

          result.note =
            "Autopilot starts running in a few minutes. You can view created/edited test cases at the provided URL(s).";

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result),
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
