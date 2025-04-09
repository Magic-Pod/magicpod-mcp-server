import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";

const MAGIC_POD_BASE_URL = "https://app.magicpod.com/api";

const makeRequest = async (organizationName: string, projectName: string, apiToken: string) => {
    const headers = {
        Accept: "application/json",
        Authorization: `Token ${apiToken}`,
    };
    try {
        const url = MAGIC_POD_BASE_URL + `/v1.0/${organizationName}/${projectName}/batch-runs/`;
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

export const getBatchRuns = (server: McpServer, apiToken: string) => {
    server.tool(
        "get-batch-runs",
        "Get the list of recent batch runs in specified organization/project",
        {
            organizationName: z.string().describe("A name of user's organization"),
            projectName: z.string().describe("A name of user's project"),
        },
        async ({organizationName, projectName}) => {
            const response = await makeRequest(organizationName, projectName, apiToken);
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