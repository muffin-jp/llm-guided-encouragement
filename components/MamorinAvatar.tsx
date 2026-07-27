/**
 * Placeholder avatar for Mamorin, Bloom's sleep-loving mascot — a simple
 * original blob with closed eyes, deliberately not based on any existing
 * character art.
 */
export function MamorinAvatar({ calm = false }: { calm?: boolean }) {
  return (
    <div
      className={`h-14 w-14 shrink-0 rounded-full p-1 shadow-sm ${
        calm ? "bg-bloom-lavender" : "bg-bloom-green"
      } animate-bloom-breathe`}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="h-full w-full">
        {/* body */}
        <ellipse
          cx="24"
          cy="26"
          rx="18"
          ry="16"
          fill="#fdf8f2"
          stroke="#5c5450"
          strokeWidth="1.5"
        />
        {/* nightcap */}
        <path
          d="M10 16 Q22 2 38 12 L34 18 Q24 10 13 20 Z"
          fill={calm ? "#a99fd1" : "#e996ab"}
          stroke="#5c5450"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="39" cy="12" r="2.6" fill="#fdf8f2" stroke="#5c5450" strokeWidth="1.2" />
        {/* sleepy closed eyes */}
        <path d="M16 28 q3 3 6 0" fill="none" stroke="#5c5450" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M27 28 q3 3 6 0" fill="none" stroke="#5c5450" strokeWidth="1.6" strokeLinecap="round" />
        {/* small content mouth */}
        <path d="M22.5 34 q2 1.6 4 0" fill="none" stroke="#5c5450" strokeWidth="1.4" strokeLinecap="round" />
        {/* blush */}
        <circle cx="13.5" cy="32" r="2" fill="#f7c8d4" />
        <circle cx="35.5" cy="32" r="2" fill="#f7c8d4" />
      </svg>
    </div>
  );
}
