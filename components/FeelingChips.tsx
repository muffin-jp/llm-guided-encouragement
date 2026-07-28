import { PRESET_FEELINGS, type PresetFeeling } from "@/lib/feelings";

const FEELING_LABELS: Record<PresetFeeling, { label: string; emoji: string }> = {
  proud: { label: "Proud", emoji: "🌸" },
  relieved: { label: "Relieved", emoji: "🍃" },
  frustrated: { label: "Frustrated", emoji: "🌧️" },
  disappointed: { label: "Disappointed", emoji: "🥀" },
  anxious: { label: "Anxious", emoji: "🌫️" },
  tired: { label: "Tired", emoji: "🌙" },
};

export function FeelingChips({
  selected,
  onSelect,
  disabled,
}: {
  selected: PresetFeeling | null;
  onSelect: (feeling: PresetFeeling | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="How do you feel?">
      {PRESET_FEELINGS.map((feeling) => {
        const active = selected === feeling;
        return (
          <button
            key={feeling}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : feeling)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
              active
                ? "border-bloom-pink-deep bg-bloom-pink text-bloom-ink shadow-md scale-105"
                : "border-bloom-ink/15 bg-white/70 text-bloom-ink/80 hover:border-bloom-pink-deep/50 hover:bg-bloom-pink/40"
            }`}
          >
            <span className="mr-1" aria-hidden>
              {FEELING_LABELS[feeling].emoji}
            </span>
            {FEELING_LABELS[feeling].label}
          </button>
        );
      })}
    </div>
  );
}
