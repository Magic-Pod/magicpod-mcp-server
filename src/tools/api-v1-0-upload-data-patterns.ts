import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import fs from "fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";

interface BatchTaskResponse {
  status: string;
}

const checkBatchTaskStatus = async (
  baseUrl: string,
  apiToken: string,
  organizationName: string,
  projectName: string,
  batchTaskId: number
): Promise<BatchTaskResponse> => {
  const url = `${baseUrl}/api/v1.0/${organizationName}/${projectName}/batch-task/${batchTaskId}/`;
  
  try {
    console.error("[proxy-1217] About to check batch task status:", url);
    console.error("[proxy-1217] axios.defaults.proxy:", axios.defaults.proxy);
    console.error("[proxy-1217] axios.defaults.httpsAgent:", axios.defaults.httpsAgent ? "configured" : "not configured");
    console.error("[proxy-1217] axios.defaults.httpAgent:", axios.defaults.httpAgent ? "configured" : "not configured");
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${apiToken}`,
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to check batch task status: ${response.status}`);
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // HTTP error response from server
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error("Authentication failed while checking batch task status. Please check your API token.");
      } else if (status === 403) {
        throw new Error("Access denied while checking batch task status.");
      } else if (status === 404) {
        throw new Error(`Batch task ${batchTaskId} not found.`);
      } else if (status === 400) {
        const errorMsg = typeof errorData === 'object' && errorData.detail 
          ? errorData.detail 
          : errorData;
        throw new Error(`Invalid batch task request: ${errorMsg}`);
      } else {
        throw new Error(`Failed to check batch task status: HTTP ${status} - ${errorData}`);
      }
    } else {
      // Network or other error
      throw new Error(`Network error while checking batch task status: ${error.message || error}`);
    }
  }
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const waitForBatchTaskCompletion = async (
  baseUrl: string,
  apiToken: string,
  organizationName: string,
  projectName: string,
  batchTaskId: number,
  timeoutMs: number = 5 * 60 * 1000, // 5 minutes default
  pollIntervalMs: number = 3000 // 3 seconds default
): Promise<{ success: boolean; status: string; message: string }> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const taskResponse = await checkBatchTaskStatus(
        baseUrl,
        apiToken,
        organizationName,
        projectName,
        batchTaskId
      );
      
      if (taskResponse.status === "succeeded") {
        return {
          success: true,
          status: taskResponse.status,
          message: "Data pattern upload completed successfully"
        };
      } else if (taskResponse.status === "failed") {
        return {
          success: false,
          status: taskResponse.status,
          message: "Data pattern upload failed"
        };
      }
      
      // Task is still in progress, wait before checking again
      await sleep(pollIntervalMs);
    } catch (error) {
      console.error("Error checking batch task status:", error);
      // For critical errors (auth, not found, etc.), stop polling and return error
      if (error instanceof Error && 
          (error.message.includes('Authentication failed') ||
           error.message.includes('not found') ||
           error.message.includes('Access denied'))) {
        return {
          success: false,
          status: "error",
          message: error.message
        };
      }
      // For network errors, continue polling with backoff
      await sleep(pollIntervalMs);
    }
  }
  
  // Timeout reached
  return {
    success: false,
    status: "timeout",
    message: `Data pattern upload timed out after ${timeoutMs / 1000} seconds`
  };
};

export const apiV1_0UploadDataPatterns = (baseUrl: string, apiToken: string) => {
  return {
    name: "API-v1_0_upload-data-patterns_create",
    description:
      "Upload data pattern CSV to test case and wait for completion. This operation runs synchronously and will wait for the upload to finish before returning.",
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
                text: JSON.stringify({
                  error: "No such file exists. Note that an absolute path is required",
                  status: "file_not_found",
                }),
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
                text: JSON.stringify({
                  error: "Invalid file extension. The file must be a CSV file (.csv)",
                  status: "invalid_file_type",
                }),
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
        let response;
        
        try {
          console.error("[proxy-1217] About to upload CSV to:", url);
          console.error("[proxy-1217] axios.defaults.proxy:", axios.defaults.proxy);
          console.error("[proxy-1217] axios.defaults.httpsAgent:", axios.defaults.httpsAgent ? "configured" : "not configured");
          console.error("[proxy-1217] axios.defaults.httpAgent:", axios.defaults.httpAgent ? "configured" : "not configured");
          response = await axios.post(url, formData, {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Token ${apiToken}`,
            },
          });
        } catch (error: any) {
          if (error.response) {
            // HTTP error response from server
            const status = error.response.status;
            const errorData = error.response.data;
            
            let errorMessage = "An error occurred during upload";
            
            if (status === 400) {
              if (errorData && typeof errorData === 'object') {
                errorMessage = `Upload failed: ${JSON.stringify(errorData)}`;
              } else {
                errorMessage = `Upload failed with status ${status}: ${errorData}`;
              }
            } else if (status === 401) {
              errorMessage = "Authentication failed. Please check your API token.";
            } else if (status === 403) {
              errorMessage = "Access denied. You don't have permission to upload data patterns to this test case.";
            } else if (status === 404) {
              errorMessage = `Test case ${testCaseNumber} not found in project ${organizationName}/${projectName}.`;
            } else {
              errorMessage = `Upload failed with status ${status}: ${errorData}`;
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: errorMessage,
                    status: status,
                  }),
                },
              ],
            };
          } else {
            // Network or other error
            const errorMessage = error.message || "Network error during upload";
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: errorMessage,
                    status: "network_error",
                  }),
                },
              ],
            };
          }
        }
        
        if (response.status !== 200) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Unexpected response status from upload API",
                  status: response.status,
                }),
              },
            ],
          };
        }

        const batchTaskId = response.data.batch_task_id;
        if (!batchTaskId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "Upload started but no batch task ID was returned",
                  status: "invalid_response",
                }),
              },
            ],
          };
        }

        // Wait for the batch task to complete
        const result = await waitForBatchTaskCompletion(
          baseUrl,
          apiToken,
          organizationName,
          projectName,
          batchTaskId
        );

        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  message: result.message,
                  batch_task_id: batchTaskId,
                  status: result.status,
                }),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: result.message,
                  batch_task_id: batchTaskId,
                  status: result.status,
                }),
              },
            ],
          };
        }
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
