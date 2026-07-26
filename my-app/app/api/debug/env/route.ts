/**
 * GET /api/debug/env
 *
 * Lightweight diagnostic endpoint that confirms whether the two required
 * Cloudflare environment variables are visible to the SSR Lambda at runtime.
 *
 * SAFETY: Only returns "SET" or "MISSING" — never the actual secret values.
 * Safe to leave deployed permanently.
 *
 * Usage after deployment:
 *   curl https://<your-amplify-domain>/api/debug/env
 *
 * Expected healthy response:
 *   { "CLOUDFLARE_API_TOKEN": "SET", "CLOUDFLARE_ACCOUNT_ID": "SET" }
 */
export async function GET() {
  return Response.json({
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? "SET" : "MISSING",
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? "SET" : "MISSING",
  });
}
