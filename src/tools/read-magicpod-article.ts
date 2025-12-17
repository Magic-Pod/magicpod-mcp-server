import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import axios from "axios";

const makeRequest = async (articleId: string, locale: "ja" | "en-us") => {
  try {
    const url = `https://trident-qa.zendesk.com/api/v2/help_center/${locale}/articles/${articleId}.json`;
    console.error("[proxy-1217] About to read article:", url);
    console.error("[proxy-1217] axios.defaults.proxy:", axios.defaults.proxy);
    console.error("[proxy-1217] axios.defaults.httpsAgent:", axios.defaults.httpsAgent ? "configured" : "not configured");
    console.error("[proxy-1217] axios.defaults.httpAgent:", axios.defaults.httpAgent ? "configured" : "not configured");
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
      },
    });
    return response.data;
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
