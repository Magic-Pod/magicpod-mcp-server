import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";

const makeRequest = async (articleId: string) => {
    const headers = {
        Accept: "application/json",
    };
    try {
        const url = `https://trident-qa.zendesk.com/api/v2/help_center/articles/${articleId}.json`;
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

export const readMagicpodArticle = (server: McpServer) => {
    server.tool(
        "read-magicpod-article",
        "Read a specified article on MagicPod help center",
        {
            articleId: z.string().describe("An article ID of MagicPod Help Center, which can be retrieved by 'search-magicpod-articles' tool")
        },
        async ({articleId}) => {
            const response = await makeRequest(articleId);
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