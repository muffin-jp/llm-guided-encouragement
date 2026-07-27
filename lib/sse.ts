/**
 * Server-Sent Events framing for the /api/encourage stream.
 *
 * Wire format (identical for the encouragement and support paths, so the
 * Unity client and the web UI handle both the same way):
 *
 *   event: meta   data: {"type":"encouragement" | "support"}
 *   event: token  data: {"text":"..."}          (repeated)
 *   event: error  data: {"message":"..."}       (only on failure, friendly text)
 *   event: done   data: {}
 */

export type ResponseKind = "encouragement" | "support";

export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;
