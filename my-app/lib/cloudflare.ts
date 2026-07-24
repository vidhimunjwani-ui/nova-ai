import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText, type JSONSchema7, type UIMessage } from "ai";

export const cloudflareConfig = {
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  chatModel: process.env.CLOUDFLARE_CHAT_MODEL ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  imageModel: process.env.CLOUDFLARE_IMAGE_MODEL ?? "@cf/black-forest-labs/flux-1-schnell",
} as const;

export type CloudflareChatPayload = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
};

export function getCloudflareChatClient() {
  const { apiToken, accountId } = cloudflareConfig;

  if (!apiToken || !accountId) {
    return null;
  }

  return createOpenAI({
    apiKey: apiToken,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    name: "cloudflare",
  });
}

export async function streamCloudflareChat(payload: CloudflareChatPayload) {
  const chatClient = getCloudflareChatClient();

  if (!chatClient) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in environment.");
  }

  const { messages, system, tools = {} } = payload;

  const normalizedMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatClient.chat(cloudflareConfig.chatModel),
    messages: normalizedMessages,
    system,
    maxRetries: 0,
    maxOutputTokens: 256,
    temperature: 0,
    topP: 0.9,
    ...(Object.keys(tools).length > 0
      ? {
          tools: {
            ...frontendTools(tools),
          },
        }
      : {}),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}

export function getCloudflareImageEndpoint() {
  const { accountId, imageModel } = cloudflareConfig;

  if (!accountId) {
    return null;
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageModel}`;
}
