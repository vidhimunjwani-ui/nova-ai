/**
 * GET /api/health
 *
 * Diagnostic endpoint — safe to call on the live deployment to verify that
 * all required environment variables are visible to the SSR runtime.
 *
 * It NEVER returns the actual secret values, only whether each variable
 * is "set" or "MISSING", so this route is safe to leave deployed permanently.
 */
export async function GET() {
  const vars = {
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? "set" : "MISSING",
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? "set" : "MISSING",
    CLOUDFLARE_CHAT_MODEL: process.env.CLOUDFLARE_CHAT_MODEL
      ? `set (${process.env.CLOUDFLARE_CHAT_MODEL})`
      : "not set (will use default)",
    CLOUDFLARE_IMAGE_MODEL: process.env.CLOUDFLARE_IMAGE_MODEL
      ? `set (${process.env.CLOUDFLARE_IMAGE_MODEL})`
      : "not set (will use default)",
  };

  const allRequired =
    vars.CLOUDFLARE_API_TOKEN === "set" && vars.CLOUDFLARE_ACCOUNT_ID === "set";

  return Response.json(
    {
      status: allRequired ? "ok" : "misconfigured",
      environment: vars,
      message: allRequired
        ? "All required Cloudflare environment variables are present."
        : "One or more required Cloudflare environment variables are MISSING. " +
          "Set them in the Amplify console: App settings > Environment variables.",
    },
    { status: allRequired ? 200 : 500 },
  );
}
