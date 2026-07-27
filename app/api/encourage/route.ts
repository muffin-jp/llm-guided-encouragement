import { getAnthropicClient } from "@/lib/anthropic";
import { createEncourageStream } from "@/lib/encourage";
import { clientIpFrom, isRateLimited } from "@/lib/rateLimit";
import { SSE_HEADERS } from "@/lib/sse";
import { encourageRequestSchema } from "@/lib/validation";

/**
 * POST /api/encourage
 *
 * The production-shaped service Bloom's Unity client calls after a stage
 * clear. Responds with a Server-Sent Events stream (see lib/sse.ts for the
 * wire format). The web UI in this repo is just a stand-in client.
 */
export async function POST(request: Request): Promise<Response> {
  if (isRateLimited(clientIpFrom(request.headers))) {
    return Response.json(
      { error: "Too many requests. Please take a short breather and retry." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = encourageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let client;
  try {
    client = getAnthropicClient();
  } catch {
    // Missing server configuration — friendly message, no internals.
    return Response.json(
      { error: "The encouragement service is not configured yet." },
      { status: 503 },
    );
  }

  return new Response(createEncourageStream(parsed.data, client), {
    headers: SSE_HEADERS,
  });
}
