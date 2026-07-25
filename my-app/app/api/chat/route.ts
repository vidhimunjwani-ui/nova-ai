import { streamCloudflareChat } from "@/lib/cloudflare";
import type { UIMessage } from "ai";

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { messages, system, tools } = payload as {
    messages?: unknown;
    system?: string;
    tools?: unknown;
  };

  if (!Array.isArray(messages)) {
    return Response.json({ error: "The messages field is required." }, { status: 400 });
  }

  try {
    return await streamCloudflareChat({
      messages: messages as UIMessage[],
      system,
      tools:
        tools && typeof tools === "object"
          ? (tools as Record<string, { description?: string; parameters: unknown }>)
          : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Cloudflare chat request failed.",
      },
      { status: 502 },
    );
  }
}
