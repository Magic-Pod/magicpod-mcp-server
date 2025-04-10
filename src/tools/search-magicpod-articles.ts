import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";

const makeRequest = async (query: string, locale: 'ja' | 'en-us') => {
    const headers = {
        Accept: "application/json",
    };
    try {
        const url = `https://trident-qa.zendesk.com/api/v2/help_center/articles/search.json?query=${query}&locale=${locale}`;
        const response = await fetch(url, {headers});
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error making request:", error);
        return null;
    }
}

export const searchMagicpodArticles = (server: McpServer) => {
    server.tool(
        "search-magicpod-articles",
        "Search the list of articles on MagicPod help center by specified keywords",
        {
            query: z.string().describe("Queries to search MagicPod Help Center's articles, split by whitespaces"),
            locale: z.union([z.literal('ja'), z.literal('en-us')]).describe("Query's and search target's locale")
        },
        async ({query, locale}) => {
            const response = await makeRequest(query, locale);
            // The response has "body" field, but it is too large for LLM
            // So, such large or insignificant fields are filtered here
            response.results = response.results.map((r: any) => ({
                id: r.id,
                title: r.title,
                content_tag_ids: r.content_tag_ids,
                label_names: r.label_names
            }));
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response),
                    },
                ],
            };
        }
    );
}