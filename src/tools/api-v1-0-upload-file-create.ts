import { z } from "zod";
import { OtherToolDefinition } from "../openapi-mcp-server/mcp/proxy.js";
import fs from "fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import { Transform } from "stream";

const ALLOWED_EXTENSIONS = ['.apk', '.aab', '.ipa', '.zip'];

const isValidFileExtension = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

const isValidZipWithApp = async (filePath: string): Promise<boolean> => {
  if (path.extname(filePath).toLowerCase() !== '.zip') {
    return true; // Not a zip file, skip this validation
  }

  return new Promise((resolve) => {
    const fileStream = createReadStream(filePath);
    let buffer = Buffer.alloc(0);
    let hasAppDirectory = false;
    let bytesRead = 0;
    const MAX_BYTES_TO_READ = 10 * 1024 * 1024; // 10MB limit for safety
    const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

    const zipParser = new Transform({
      transform(chunk, _encoding, callback) {
        if (hasAppDirectory || bytesRead > MAX_BYTES_TO_READ) {
          callback();
          return;
        }

        bytesRead += chunk.length;
        buffer = Buffer.concat([buffer, chunk]);
        
        // Parse ZIP local file headers
        let offset = 0;
        while (offset < buffer.length - 30) { // Minimum header size is 30 bytes
          // Look for local file header signature
          const signature = buffer.readUInt32LE(offset);
          if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
            offset++;
            continue;
          }

          // Read filename length from header (at offset 26)
          if (offset + 30 > buffer.length) break;
          
          const filenameLength = buffer.readUInt16LE(offset + 26);
          const extraFieldLength = buffer.readUInt16LE(offset + 28);
          
          // Check if we have the complete entry
          if (offset + 30 + filenameLength > buffer.length) {
            break;
          }

          // Extract filename
          const filename = buffer.subarray(offset + 30, offset + 30 + filenameLength).toString('utf8');
          
          // Check if this is a .app directory (directories in ZIP end with /)
          if (filename.toLowerCase().endsWith('.app/')) {
            hasAppDirectory = true;
            callback();
            return;
          }

          // Move to next entry
          offset += 30 + filenameLength + extraFieldLength;
        }

        // Keep last 1KB of buffer for potential split headers
        if (buffer.length > 1024) {
          buffer = buffer.subarray(buffer.length - 1024);
        }
        
        callback();
      }
    });

    fileStream.pipe(zipParser);
    
    fileStream.on('end', () => {
      resolve(hasAppDirectory);
    });
    
    fileStream.on('error', () => {
      resolve(false);
    });
    
    zipParser.on('error', () => {
      resolve(false);
    });
  });
};

const validateFile = async (filePath: string): Promise<{ valid: boolean; error?: string }> => {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: "No such file exists. Note that an absolute path is required" };
  }

  if (!isValidFileExtension(filePath)) {
    return { 
      valid: false, 
      error: "Invalid file type. Only .apk, .aab, .ipa files, or zipped .app files are allowed" 
    };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.zip') {
    const hasValidApp = await isValidZipWithApp(filePath);
    if (!hasValidApp) {
      return { 
        valid: false, 
        error: "ZIP file must contain an .app directory to be valid" 
      };
    }
  }

  return { valid: true };
};

export const apiV1_0UploadFileCreate = (baseUrl: string, apiToken: string) => {
  return {
    name: "API-v1_0_upload-file_create",
    description:
      "Upload target app files (.ipa, .apk, .aab, or zipped .app) to MagicPod cloud",
    inputSchema: z.object({
      organizationName: z
        .string()
        .describe("The organization name to upload the file"),
      projectName: z.string().describe("The project name to upload the file"),
      localFilePath: z
        .string()
        .describe(
          "A local file path to upload to MagicPod. Note that an absolute path is required. Supported formats: .ipa, .apk, .aab files, or .zip files containing .app directories",
        ),
    }),
    handleRequest: async ({ organizationName, projectName, localFilePath }) => {
      try {
        const validation = await validateFile(localFilePath);
        if (!validation.valid) {
          return {
            content: [
              {
                type: "text",
                text: validation.error!,
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
