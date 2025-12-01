import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios, { AxiosRequestConfig } from "axios";

const makeRequest = async (query: string, locale: "ja" | "en-us") => {
  try {
    const url = `https://trident-qa.zendesk.com/api/v2/help_center/articles/search.json?query=${query}&locale=${locale}`;
    const config: AxiosRequestConfig = {
      proxy: false, // Disable axios's broken proxy handling
      headers: {
        Accept: "application/json",
      },
    };
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    if (httpsProxy) {
      config.httpsAgent = new HttpsProxyAgent(httpsProxy);
    }
    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    console.error("Error making request:", error);
    return null;
  }
};

export const searchMagicpodArticles = () => {
  return {
    name: "search-magicpod-articles",
    description:
      "This tool searches the list of articles on MagicPod help center by specified keywords. " +
      "You must use this tool whenever you mention MagicPod's specification since it has always been updated.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Queries to search MagicPod Help Center's articles, split by whitespaces",
        ),
      locale: z
        .union([z.literal("ja"), z.literal("en-us")])
        .describe("Query's and search target's locale"),
    }),
    handleRequest: async ({ query, locale }) => {
      query += ' -label:release';
      const response = await makeRequest(query, locale);
      // The response has "body" field, but it is too large for LLM
      // So, such large or insignificant fields are filtered here
      response.results = response.results.map((r: any) => ({
          id: r.id,
          title: r.title,
          content_tag_ids: r.content_tag_ids,
          label_names: r.label_names,
        }));
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
