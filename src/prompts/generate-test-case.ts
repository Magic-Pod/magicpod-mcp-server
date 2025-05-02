import { PromptDefinition } from "../openapi-mcp-server/mcp/proxy.js";

export const generateTestCase = () => {
  return {
    name: "generate-test-case",
    description: "Generate a new test case on MagicPod",
    arguments: [
      {
        name: "organizationName",
        description: "An organization name",
        required: true,
      },
      {
        name: "projectName",
        description: "A project name",
        required: true,
      },
      {
        name: "prompt",
        description: "A prompt to generate a test case",
        required: true,
      },
    ],
    handleRequest: async (request) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `
Your role is to ask the MagicPod MCP server to create a new test case, bypassing the prompt below. You can use API-v1_0_generate-test-case_create tool for this purpose. 
You don't have to compose the test steps because this tool can do it. Just immediately share the original prompt with the tool without any modifications. 
Create a test case under organization: ${request.params.arguments?.organizationName}, project: ${request.params.arguments?.projectName}

<prompt>
${request.params.arguments?.prompt}
</prompt>
              `,
            },
          },
        ],
      };
    },
  } satisfies PromptDefinition<any>;
};
