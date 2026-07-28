import { MamorinAvatar } from "./MamorinAvatar";
import type { ResponseKind } from "@/lib/sse";

/**
 * Mamorin's reply, streamed token by token. The support path renders in a
 * calmer, lavender style so it reads as a different register than the usual
 * cheerful post-stage encouragement.
 */
export function SpeechBubble({
  kind,
  text,
  streaming,
}: {
  kind: ResponseKind;
  text: string;
  streaming: boolean;
}) {
  const calm = kind === "support";
  return (
    <div className="animate-bloom-fade-up flex items-end gap-3">
      <MamorinAvatar calm={calm} />
      <div
        className={`relative flex-1 rounded-3xl rounded-bl-md border p-4 text-[15px] leading-relaxed shadow-sm ${
          calm
            ? "border-bloom-lavender-deep/40 bg-bloom-lavender/60 text-bloom-ink"
            : "border-bloom-pink-deep/30 bg-white/85 text-bloom-ink"
        }`}
        aria-live="polite"
      >
        {calm && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-bloom-lavender-deep">
            A gentle note from Mamorin
          </p>
        )}
        <p className={streaming ? "bloom-caret" : undefined}>
          {text || (streaming ? "…" : "")}
        </p>
      </div>
    </div>
  );
}
