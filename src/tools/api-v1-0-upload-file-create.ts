import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import fs from "fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";

export const apiV1_0UploadFileCreate = (baseUrl: string, apiToken: string) => {
  return {
    name: "API-v1_0_upload-file_create",
    description:
      "Upload target app files (.app, .ipa, .apk or .aab) to MagicPod cloud",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name to upload the file"),
      projectName: z.string().describe("The project name to upload the file"),
      localFilePath: z
        .string()
        .describe(
          "A local file path to upload to MagicPod. Note that an absolute path is required. Its extension must be .app, .ipa, .apk or .aab",
        ),
    }),
    handleRequest: async ({ organizationName, projectName, localFilePath }) => {
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

        const formData = new FormData();
        const fileStream = fs.createReadStream(localFilePath);
        const fileName = path.basename(localFilePath);
        formData.append("file", fileStream, fileName);

        const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/upload-file/`;
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
                text: "an error happened in uploading the file",
              },
            ],
          };
        }
      } catch (error) {
        console.error(
          "Failed to upload the file: ",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ message: "succeeded to upload the file" }),
          },
        ],
      };
    },
  } satisfies OtherToolDefinition<any>;
};
