import type { HudState } from "@/lib/types";
const EMPTY_VALUE = "—";

export function KeyboardHud({ dots, letter, typed, isShiftActive }: HudState) {
  const dotsLabel = dots.length > 0 ? dots.join(", ") : EMPTY_VALUE;

  return (
    <section className="keyboard-hud" aria-live="polite" aria-label="Braille input status">
      <HudCard label="Dots" value={dotsLabel} />
      <HudCard
        label="Letter"
        badge={isShiftActive ? "Shift" : undefined}
        value={letter || EMPTY_VALUE}
      />
      {/* A non-breaking space keeps the typed card's height stable when empty. */}
      <HudCard label="Typed" value={typed || "\u00A0"} className="hud-card--typed" />
    </section>
  );
}

function HudCard({
  label,
  value,
  badge,
  className = "",
}: {
  label: string;
  value: string;
  badge?: string;
  className?: string;
}) {
  return (
    <div className={"hud-card " + className}>
      <span className="hud-card__label">
        {label}
        {badge ? <span className="hud-card__badge">{badge}</span> : null}
      </span>
      <strong className="hud-card__value">{value}</strong>
    </div>
  );
}
