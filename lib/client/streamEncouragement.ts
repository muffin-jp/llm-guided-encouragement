import type { ResponseKind } from "../sse";
import type { EncourageRequest } from "../validation";

export interface StreamHandlers {
  onMeta: (kind: ResponseKind) => void;
  onToken: (text: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

const GENERIC_ERROR =
  "Something went wrong while reaching Mamorin. Please try again.";

/**
 * Client-side consumer of the /api/encourage SSE stream. Mirrors what the
 * Unity client does with UnityWebRequest + DownloadHandlerScript: read the
 * response body incrementally and parse SSE frames as they arrive.
 */
export async function streamEncouragement(
  body: EncourageRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/encourage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    handlers.onError(GENERIC_ERROR);
    return;
  }

  if (!response.ok || !response.body) {
    let message = GENERIC_ERROR;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // keep the generic message
    }
    handlers.onError(message);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleFrame = (frame: string) => {
    let event = "message";
    let data = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data += line.slice(6);
    }
    switch (event) {
      case "meta": {
        const meta = JSON.parse(data) as { type: ResponseKind };
        handlers.onMeta(meta.type);
        break;
      }
      case "token": {
        const token = JSON.parse(data) as { text: string };
        handlers.onToken(token.text);
        break;
      }
      case "error": {
        const err = JSON.parse(data) as { message: string };
        handlers.onError(err.message);
        break;
      }
      case "done":
        handlers.onDone();
        break;
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (frame.trim()) handleFrame(frame);
      }
    }
  } catch {
    if (!signal?.aborted) handlers.onError(GENERIC_ERROR);
  }
}
