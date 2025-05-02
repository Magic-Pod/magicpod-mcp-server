import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import axios from "axios";

export const apiV1_0GenerateTestCaseCreate = (
  baseUrl: string,
  apiToken: string,
) => {
  return {
    name: "API-v1_0_generate-test-case_create",
    description:
      "Generate a new test case in accord with the provided prompt. " +
      "When you are asked by a user to create a new test case, you don't have to compose the test steps because this tool can do it. " +
      "Just immediately share the original user's input without any modifications.",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name where a test case will be created"),
      projectName: z
        .string()
        .describe("The project name where a test case will be created"),
      prompt: z
        .string()
        .describe("A prompt that describes the specification of a test case"),
    }),
    handleRequest: async ({ organizationName, projectName, prompt }) => {
      try {
        const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/generate-test-case/`;
        const response = await axios.post(
          url,
          { prompt },
          {
            headers: {
              "User-Agent": "magicpod-mcp-server",
              Authorization: `Token ${apiToken}`,
            },
          },
        );
        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text",
                text: "Failed to generate a test case",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Succeeded to generate a test case",
                ...response.data,
              }),
            },
          ],
        };
      } catch (error) {
        console.error(
          "Failed to generate a test case: ",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  } satisfies OtherToolDefinition<any>;
};
