import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText, type JSONSchema7, type UIMessage } from "ai";

/**
 * Returns Cloudflare credentials read lazily at request time.
 *
 * IMPORTANT: Do NOT cache this as a module-level `const` object.
 * AWS Amplify SSR Lambdas inject environment variables at server startup;
 * if the config object were evaluated once at module-load time (cold start),
 * the captured values could be `undefined` before the env is fully propagated.
 * Reading from `process.env` inside each request handler function is the
 * safe, idiomatic Next.js SSR pattern.
 */
function getCloudflareEnv() {
  return {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    chatModel:
      process.env.CLOUDFLARE_CHAT_MODEL ?? "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    imageModel:
      process.env.CLOUDFLARE_IMAGE_MODEL ?? "@cf/black-forest-labs/flux-1-schnell",
  };
}

export type CloudflareChatPayload = {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
};

export function getCloudflareChatClient() {
  const { apiToken, accountId } = getCloudflareEnv();

  // Diagnostic log — shows which variable is missing without leaking the value.
  if (!apiToken || !accountId) {
    console.error(
      "[cloudflare] Missing env vars — " +
        `CLOUDFLARE_API_TOKEN: ${apiToken ? "set" : "MISSING"}, ` +
        `CLOUDFLARE_ACCOUNT_ID: ${accountId ? "set" : "MISSING"}`,
    );
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
    throw new Error(
      "Missing Cloudflare API token and Cloudflare Account ID in environment. " +
        "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the Amplify console " +
        "under App settings > Environment variables.",
    );
  }

  const { messages, system, tools = {} } = payload;
  const { chatModel } = getCloudflareEnv();

  const normalizedMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatClient.chat(chatModel),
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
  const { accountId, imageModel } = getCloudflareEnv();

  if (!accountId) {
    console.error("[cloudflare] Missing env var — CLOUDFLARE_ACCOUNT_ID: MISSING");
    return null;
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageModel}`;
}

/** Exposed only for the image API route — read lazily at request time. */
export function getCloudflareApiToken(): string | undefined {
  return process.env.CLOUDFLARE_API_TOKEN;
}
