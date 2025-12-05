import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";

export const apiV1_0CreateAutopilotTasks = (baseUrl: string, apiToken: string) => {
  return {
    name: "API-v1_0_create-autopilot-tasks",
    description:
      "Create autopilot tasks for test case editing. This feature is currently under development.",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name"),
      projectName: z
        .string()
        .describe("The project name"),
    }),
    handleRequest: async ({ organizationName, projectName }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "under_development",
              message: "The autopilot tasks feature is currently under development and not yet available.",
              organization: organizationName,
              project: projectName,
            }),
          },
        ],
      };
    },
  } satisfies OtherToolDefinition<any>;
};
