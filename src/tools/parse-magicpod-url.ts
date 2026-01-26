import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";

export const parseMagicpodUrl = () => {
  return {
    name: "parse-magicpod-url",
    description:
      "Parses a MagicPod URL and extracts the organization name, project name, and test case number. " +
      "Accepts URLs in the format: https://app.magicpod.com/{organization}/{project}/{testNumber}/...",
    inputSchema: z.object({
      url: z
        .string()
        .describe(
          "The MagicPod URL to parse (e.g., https://app.magicpod.com/MyOrg/MyTest/11/...)",
        ),
    }),
    handleRequest: async ({ url }) => {
      try {
        const urlObj = new URL(url);

        // Parse the pathname: /{organization}/{project}/{testNumber}/...
        const pathParts = urlObj.pathname.split("/").filter(part => part.length > 0);

        const result: Record<string, string | number> = {};

        if (pathParts.length >= 1) {
          result.organization = pathParts[0];
        }

        if (pathParts.length >= 2) {
          result.project = pathParts[1];
        }

        if (pathParts.length >= 3) {
          const parsedTestNumber = parseInt(pathParts[2], 10);
          if (!isNaN(parsedTestNumber)) {
            result.testNumber = parsedTestNumber;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Failed to parse URL: ${(error as Error).message}`,
              }),
            },
          ],
        };
      }
    },
  } satisfies OtherToolDefinition<any>;
};
