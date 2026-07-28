"use client";

import { useCallback, useRef, useState } from "react";
import { FeelingChips } from "@/components/FeelingChips";
import { SpeechBubble } from "@/components/SpeechBubble";
import { CUSTOM_FEELING, type PresetFeeling } from "@/lib/feelings";
import { streamEncouragement } from "@/lib/client/streamEncouragement";
import type { ResponseKind } from "@/lib/sse";
import { MAX_FREE_TEXT_LENGTH } from "@/lib/validation";

const STAGE_ID = "stage-3-2";

type Phase = "select" | "streaming" | "done";

export default function PostStageScreen() {
  const [phase, setPhase] = useState<Phase>("select");
  const [feeling, setFeeling] = useState<PresetFeeling | null>(null);
  const [freeText, setFreeText] = useState("");
  const [kind, setKind] = useState<ResponseKind>("encouragement");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit =
    phase === "select" && (feeling !== null || freeText.trim().length > 0);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setPhase("streaming");
    setReply("");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    await streamEncouragement(
      {
        stageId: STAGE_ID,
        feeling: feeling ?? CUSTOM_FEELING,
        freeText: freeText.trim() || undefined,
        locale: "en",
      },
      {
        onMeta: setKind,
        onToken: (text) => setReply((prev) => prev + text),
        onError: (message) => {
          setError(message);
          setPhase("done");
        },
        onDone: () => setPhase("done"),
      },
      controller.signal,
    );
  }, [canSubmit, feeling, freeText]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("select");
    setFeeling(null);
    setFreeText("");
    setReply("");
    setError(null);
    setKind("encouragement");
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center p-0 sm:p-8">
      {/* Drifting petals behind the phone frame (desktop) */}
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block" aria-hidden>
        <span className="animate-bloom-float absolute left-[12%] top-[18%] text-3xl opacity-40">🌸</span>
        <span className="animate-bloom-float absolute right-[15%] top-[30%] text-2xl opacity-30 [animation-delay:-2s]">🌷</span>
        <span className="animate-bloom-float absolute left-[20%] bottom-[20%] text-2xl opacity-30 [animation-delay:-4s]">🍃</span>
        <span className="animate-bloom-float absolute right-[22%] bottom-[14%] text-3xl opacity-40 [animation-delay:-1s]">🌼</span>
      </div>

      {/* Phone-sized frame: full-bleed on mobile, framed on desktop */}
      <div className="relative flex min-h-dvh w-full flex-col bg-bloom-cream sm:min-h-[720px] sm:max-h-[820px] sm:w-[390px] sm:rounded-[2.75rem] sm:border-8 sm:border-bloom-ink/80 sm:shadow-2xl sm:overflow-hidden">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-8">
          {/* Stage-clear header */}
          <header className="animate-bloom-fade-up rounded-3xl bg-gradient-to-br from-bloom-pink via-bloom-cream to-bloom-green p-5 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bloom-ink/50">
              Bloom
            </p>
            <h1 className="mt-1 text-2xl font-bold text-bloom-ink">
              Stage 3-2 cleared! 🌸
            </h1>
            <p className="mt-1 text-sm text-bloom-ink/60">
              A little more colour returns to the world.
            </p>
          </header>

          {phase === "select" && (
            <section className="animate-bloom-fade-up flex flex-col gap-4 [animation-delay:0.1s]">
              <h2 className="text-center text-base font-semibold">
                How do you feel right now?
              </h2>
              <FeelingChips
                selected={feeling}
                onSelect={setFeeling}
                disabled={false}
              />
              <div className="flex flex-col gap-1">
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  maxLength={MAX_FREE_TEXT_LENGTH}
                  rows={2}
                  placeholder="Anything else on your mind? (optional)"
                  className="w-full resize-none rounded-2xl border border-bloom-ink/15 bg-white/80 p-3 text-sm outline-none transition-colors placeholder:text-bloom-ink/35 focus:border-bloom-green-deep"
                />
                <p className="self-end text-[11px] text-bloom-ink/40">
                  {freeText.length}/{MAX_FREE_TEXT_LENGTH}
                </p>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="rounded-full bg-bloom-green-deep px-6 py-3 font-semibold text-white shadow-md transition-all hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:shadow-none"
              >
                Tell Mamorin
              </button>
            </section>
          )}

          {phase !== "select" && (
            <section className="flex flex-col gap-4">
              {error ? (
                <div className="animate-bloom-fade-up rounded-3xl border border-bloom-pink-deep/30 bg-white/85 p-4 text-sm text-bloom-ink/80">
                  {error}
                </div>
              ) : (
                <SpeechBubble
                  kind={kind}
                  text={reply}
                  streaming={phase === "streaming"}
                />
              )}
              {phase === "done" && (
                <button
                  type="button"
                  onClick={reset}
                  className="animate-bloom-fade-up self-center rounded-full border border-bloom-ink/15 bg-white/80 px-6 py-2.5 text-sm font-semibold text-bloom-ink/80 transition-all hover:bg-bloom-pink/40 active:scale-95"
                >
                  Try another feeling 🌷
                </button>
              )}
            </section>
          )}
        </div>

        <footer className="px-5 pb-6 text-center text-[10px] text-bloom-ink/35">
          Portfolio prototype — the web UI stands in for Bloom&apos;s Unity client.
        </footer>
      </div>
    </main>
  );
}
