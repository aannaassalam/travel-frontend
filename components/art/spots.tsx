/**
 * Spot illustrations — the UI-state art system.
 *
 * The site already has an illustration language: the full-bleed scene art in
 * `public/img` (skies, cities, vehicles) built from gradients, grain and bloom
 * filters. That language depicts PLACES, and it is doing its job.
 *
 * This is the deliberate opposite, for the moments the scene art cannot serve:
 * an empty result, a confirmed booking, an account with nothing in it yet.
 * Those are not places, they are states — and painting them atmospherically
 * would be both dishonest and a collision of two art sets.
 *
 * So the grammar here is flat and constructed:
 *
 *   - no gradient, no filter, no texture — scene art owns atmosphere
 *   - one stroke weight (2.5) and one linecap, so the whole set is one hand
 *   - flat fills from the brand tokens only, amber reserved for the single
 *     point of emphasis exactly as it is reserved for CTAs everywhere else
 *   - every drawing stands on the same soft disc, so a row of them reads as a
 *     family rather than six unrelated doodles
 *   - 160×120 viewBox, geometry on the 8pt grid
 *
 * What binds the two systems is the palette, the radii and the restraint. What
 * separates them is dimension: scene art is weather, spot art is diagram. Put
 * one beside the other and they read as the same brand in two registers.
 *
 * These are components rather than files in `public/` on purpose: they inherit
 * the live design tokens (so a palette change moves them too), cost no extra
 * request, and can take a real accessible name per usage.
 *
 * Each drawing also echoes the control it belongs to — "nothing saved" is a
 * heart because the save button is a heart. An empty state that draws a
 * different symbol from the button the customer just pressed is a small lie.
 */

/**
 * Structural lines use `currentColor`, not a fixed navy.
 *
 * The 404 puts a spot on a brand-900 section, and a brand-900 stroke on a
 * brand-900 ground is an invisible drawing — the signpost lost its post
 * entirely. Inheriting the text colour means one component works on paper and
 * on navy, exactly as the ground disc does.
 *
 * `ON_ACCENT` is the exception: marks sitting ON the amber seal must stay dark
 * whatever the surrounding text colour, or a white tick lands on a light amber
 * disc and fails contrast.
 */
const LINE = "currentColor";
const ON_ACCENT = "var(--color-brand-900)";
const B500 = "var(--color-brand-500)";
const B100 = "var(--color-brand-100)";
const ACCENT = "var(--color-accent-500)";
const INK200 = "var(--color-ink-200)";
const PAPER = "var(--color-paper)";

type SpotProps = {
  /**
   * The accessible name. Omit it for decoration sitting beside a heading that
   * already says the same thing — a screen reader announcing "empty wallet
   * illustration" right before "No bookings yet" is noise, not access.
   */
  title?: string;
  className?: string;
};

function Frame({
  title,
  className,
  children
}: SpotProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/*
        The shared ground. `currentColor` rather than a fixed tint so the same
        component works on paper, on a brand-50 panel and on the navy sections
        without turning into a bright white blob — set a text colour on the
        element to tint it.
      */}
      <ellipse cx="80" cy="98" rx="56" ry="12" fill="currentColor" opacity="0.08" />
      {children}
    </svg>
  );
}

/**
 * Zero results.
 *
 * The brief calls the empty state the most-used screen on the platform, so it
 * gets the most considered drawing: the lens is genuinely empty — the ground
 * shows straight through it — while three place markers stand outside the
 * glass. Nothing here, something nearby. That is precisely what the screen
 * goes on to say, and the picture says it first.
 *
 * Markers rather than abstract bars: this is a travel product, and "we have
 * stock in these other places" is the actual message.
 */
export function NoResultsSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <path d="M24 84h124" stroke={INK200} strokeWidth="2.5" />
      {[102, 122, 142].map((x) => (
        <g key={x} transform={`translate(${x} 84)`}>
          <path
            d="M0 0c-4-5-7-8-7-12a7 7 0 1 1 14 0c0 4-3 7-7 12Z"
            fill={B100}
            stroke={B500}
            strokeWidth="2.5"
          />
          {/* the eye, without which a small teardrop reads as a raindrop */}
          <circle cy="-12" r="2.5" fill={PAPER} />
        </g>
      ))}
      {/* the glass, and nothing inside it */}
      <circle cx="58" cy="50" r="24" fill={PAPER} stroke={LINE} strokeWidth="2.5" />
      <circle cx="58" cy="50" r="18" stroke={B100} strokeWidth="2.5" />
      {/* one rod, amber only at the grip, so it reads as a handle not a splinter */}
      <path d="M75 67 88 80" stroke={LINE} strokeWidth="5" />
      <path d="M88 80 96 88" stroke={ACCENT} strokeWidth="5" />
    </Frame>
  );
}

/**
 * A confirmed booking.
 *
 * A ticket and a seal, not a tick in a circle. The reference number is what the
 * customer actually leaves with, so the drawing is of the object they now hold,
 * and the amber seal is the moment of it being stamped.
 */
export function BookingConfirmedSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <path
        d="M26 34h108v22a8 8 0 0 0 0 16v22H26V72a8 8 0 0 0 0-16V34Z"
        fill={PAPER}
        stroke={LINE}
        strokeWidth="2.5"
      />
      {/* the tear line the stub would follow */}
      <path d="M100 38v10M100 56v10M100 74v10" stroke={INK200} strokeWidth="2.5" />
      {/* detail: a ticket, not a blank card */}
      <path d="M40 50h44" stroke={B500} strokeWidth="2.5" />
      <path d="M40 62h30" stroke={B100} strokeWidth="2.5" />
      <path d="M40 74h38" stroke={B100} strokeWidth="2.5" />
      {/* the seal, overlapping the stub exactly as a real stamp would */}
      <circle cx="117" cy="62" r="16" fill={ACCENT} />
      <path d="m110 62 5 5 10-11" stroke={ON_ACCENT} strokeWidth="3" />
    </Frame>
  );
}

/**
 * An account with no bookings yet.
 *
 * The shape of the thing that is missing, drawn as a slot waiting to be filled
 * rather than an absence. An empty state should describe the future, not scold
 * the present.
 */
export function NoBookingsSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      {/*
        The same ticket silhouette as BookingConfirmedSpot, dashed and empty.
        One object in two states — outline for "none yet", stamped for "done" —
        so the account and the confirmation screen are visibly the same story.
      */}
      <path
        d="M26 40h108v22a8 8 0 0 0 0 16v22H26V78a8 8 0 0 0 0-16V40Z"
        fill={PAPER}
        stroke={B500}
        strokeWidth="2.5"
        strokeDasharray="7 6"
      />
      <path d="M46 62h44" stroke={B100} strokeWidth="2.5" />
      <path d="M46 76h30" stroke={B100} strokeWidth="2.5" />
    </Frame>
  );
}

/**
 * Nothing saved yet.
 *
 * A heart, because the save control is a heart (`SaveButton`). The dashed one
 * is the empty slot; the small solid one is the action that fills it.
 */
export function NoSavedSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <rect
        x="34"
        y="30"
        width="80"
        height="60"
        rx="8"
        fill={PAPER}
        stroke={LINE}
        strokeWidth="2.5"
      />
      <path
        d="M74 78c-14-9-22-16-22-25a11 11 0 0 1 22-6 11 11 0 0 1 22 6c0 9-8 16-22 25Z"
        fill="none"
        stroke={B500}
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {/* the action, arriving at the corner */}
      <path
        d="M122 44c-7-4-11-8-11-12a5 5 0 0 1 11-3 5 5 0 0 1 11 3c0 4-4 8-11 12Z"
        fill={ACCENT}
        stroke={LINE}
        strokeWidth="2.5"
      />
    </Frame>
  );
}

/**
 * 404.
 *
 * A signpost with one arm blank — the page that is not there — and one arm
 * pointing firmly at something that is. The 404 screen already offers search
 * and routes instead of an apology; this says the same thing in one image.
 */
export function LostWaySpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <path d="M80 26v70" stroke={LINE} strokeWidth="4" />
      <circle cx="80" cy="24" r="5" fill={LINE} />
      {/* the way that leads somewhere */}
      <path
        d="M80 38h40l10 9-10 9H80z"
        fill={ACCENT}
        stroke={LINE}
        strokeWidth="2.5"
      />
      {/* and the way that does not */}
      <path
        d="M80 64H44l-10 9 10 9h36z"
        fill={PAPER}
        stroke={B500}
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
    </Frame>
  );
}

/**
 * The image that failed to load.
 *
 * Deliberately drawn rather than left blank. An empty grey rectangle reads as
 * broken software; a small brand-drawn mark reads as "no photo for this one",
 * which is the truth and is not the customer's problem to decode.
 */
export function NoImageSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <rect
        x="34"
        y="30"
        width="92"
        height="62"
        rx="8"
        fill={PAPER}
        stroke={B500}
        strokeWidth="2.5"
      />
      <path d="M34 76l24-20 16 13 14-12 38 27" stroke={B500} strokeWidth="2.5" />
      <circle cx="60" cy="48" r="6" fill={ACCENT} />
    </Frame>
  );
}

/** Something went wrong — a broken line, mid-repair rather than mid-collapse. */
export function ErrorSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <path d="M24 62h34" stroke={LINE} strokeWidth="2.5" />
      <path d="M102 62h34" stroke={LINE} strokeWidth="2.5" />
      <path d="M58 62l10-8M58 62l10 8" stroke={B500} strokeWidth="2.5" />
      <path d="M102 62L92 54M102 62l-10 8" stroke={B500} strokeWidth="2.5" />
      <circle cx="80" cy="62" r="12" fill={ACCENT} />
      <path d="M80 56v7" stroke={ON_ACCENT} strokeWidth="3" />
      <circle cx="80" cy="69" r="1.75" fill={ON_ACCENT} />
    </Frame>
  );
}

/** No account on this number yet — a key, for the sign-in and claim prompts. */
export function ClaimAccountSpot(props: SpotProps) {
  return (
    <Frame {...props}>
      <circle cx="52" cy="60" r="22" fill={PAPER} stroke={LINE} strokeWidth="2.5" />
      <circle cx="52" cy="60" r="9" fill={B100} />
      <path d="M74 60h48" stroke={LINE} strokeWidth="5" />
      <path d="M104 60v13" stroke={LINE} strokeWidth="5" />
      <path d="M118 60v9" stroke={ACCENT} strokeWidth="5" />
    </Frame>
  );
}
