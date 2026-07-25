import { NextResponse } from "next/server";
import { getCloudflareApiToken, getCloudflareImageEndpoint } from "@/lib/cloudflare";

export async function POST(req: Request) {
  // Read credentials lazily at request time — never at module load time.
  // This ensures AWS Amplify SSR Lambdas always see the runtime env values.
  const apiToken = getCloudflareApiToken();
  const endpoint = getCloudflareImageEndpoint();

  if (!apiToken || !endpoint) {
    // getCloudflareImageEndpoint() already logs which variable is missing.
    console.error(
      "[/api/image] Aborting — " +
        `CLOUDFLARE_API_TOKEN: ${apiToken ? "set" : "MISSING"}, ` +
        `endpoint resolved: ${endpoint ? "yes" : "no (CLOUDFLARE_ACCOUNT_ID missing)"}`,
    );
    return NextResponse.json(
      {
        error:
          "Missing Cloudflare credentials in environment. " +
          "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the Amplify console " +
          "under App settings > Environment variables.",
      },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const prompt =
    typeof body === "object" &&
    body !== null &&
    "prompt" in body &&
    typeof (body as { prompt?: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt.trim()
      : "";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ prompt }),
  }).catch((error) => {
    return new Response(
      JSON.stringify({ error: `Cloudflare image request failed: ${String(error)}` }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const message =
      json?.errors?.[0]?.message ??
      json?.error ??
      json?.message ??
      `Cloudflare AI image error (status ${res.status})`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const json = await res.json().catch(() => null);
  const result = json?.result;
  const imageBase64 =
    result?.image ?? result?.[0]?.image ?? result?.[0]?.b64_json ?? result?.b64_json ?? null;
  const imageUrl = result?.url ?? result?.[0]?.url ?? json?.image_url ?? null;

  if (!imageBase64 && !imageUrl) {
    return NextResponse.json(
      { error: "No image data returned by Cloudflare AI." },
      { status: 502 },
    );
  }

  if (imageBase64 && !imageBase64.startsWith("data:")) {
    return NextResponse.json({ imageUrl: `data:image/png;base64,${imageBase64}` });
  }

  return NextResponse.json({ imageUrl: imageUrl ?? imageBase64 });
}
