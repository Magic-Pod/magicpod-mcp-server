import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";

const makeRequest = async (articleId: string, locale: "ja" | "en-us") => {
  const headers = {
    Accept: "application/json",
  };
  try {
    const url = `https://trident-qa.zendesk.com/api/v2/help_center/${locale}/articles/${articleId}.json`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error making request:", error);
    return null;
  }
};

export const readMagicpodArticle = () => {
  return {
    name: "read-magicpod-article",
    description: "Read a specified article on MagicPod help center",
    inputSchema: z.object({
      articleId: z
        .string()
        .describe(
          "An article ID of MagicPod Help Center, which can be retrieved by 'search-magicpod-articles' tool",
        ),
      locale: z
        .union([z.literal("ja"), z.literal("en-us")])
        .describe("Article's language"),
    }),
    handleRequest: async ({ articleId, locale }) => {
      const response = await makeRequest(articleId, locale);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    },
  } satisfies OtherToolDefinition<any>;
};
