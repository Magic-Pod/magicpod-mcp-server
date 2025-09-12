import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import fs from "fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";

export const apiV1_0UploadDataPatterns = (baseUrl: string, apiToken: string) => {
  return {
    name: "API-v1_0_upload-data-patterns_create",
    description:
      "Upload data pattern CSV to test case. The progress can be checked by BatchTask API.",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name"),
      projectName: z.string().describe("The project name"),
      testCaseNumber: z
        .number()
        .int()
        .describe("The test case number"),
      localFilePath: z
        .string()
        .describe(
          "A local file path to upload CSV data pattern to MagicPod. Note that an absolute path is required. Its extension must be .csv",
        ),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, overwrite the existing data pattern by the uploaded CSV file. If false, an error is raised if the data pattern already exists.",
        ),
    }),
    handleRequest: async ({ 
      organizationName, 
      projectName, 
      testCaseNumber, 
      localFilePath, 
      overwrite = false 
    }) => {
      try {
        if (!fs.existsSync(localFilePath)) {
          return {
            content: [
              {
                type: "text",
                text: "No such file exists. Note that an absolute path is required",
              },
            ],
          };
        }

        const fileExtension = path.extname(localFilePath).toLowerCase();
        if (fileExtension !== ".csv") {
          return {
            content: [
              {
                type: "text",
                text: "Invalid file extension. The file must be a CSV file (.csv)",
              },
            ],
          };
        }

        const formData = new FormData();
        const fileStream = fs.createReadStream(localFilePath);
        const fileName = path.basename(localFilePath);
        formData.append("file", fileStream, fileName);
        formData.append("overwrite", overwrite.toString());

        const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/test-cases/${testCaseNumber}/start-upload-data-patterns/`;
        const response = await axios.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Token ${apiToken}`,
          },
        });
        
        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text",
                text: "An error happened in uploading the data pattern CSV file",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Successfully started uploading data pattern CSV file",
                batch_task_id: response.data.batch_task_id,
              }),
            },
          ],
        };
      } catch (error) {
        console.error(
          "Failed to upload the data pattern CSV file: ",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  } satisfies OtherToolDefinition<any>;
};