import type { ReactNode } from "react";

/* Axon Careers custom icon set. A cohesive duotone line style (soft fill + crisp
   stroke) drawn for the brand, so the product doesn't wear a stock icon pack.
   They use currentColor, so they sit correctly white-on-teal inside the tiles. */

export type IconProps = { size?: number; className?: string };

function Base({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const soft = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" } as const;
const dot = { fill: "currentColor", stroke: "none" } as const;

/* Gap Story. A sprout: your gap becomes a chapter of growth */
export const GapStoryIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4.5 10c5 0 7.5 2 7.5 7.5C7 17.5 4.5 15.5 4.5 10Z" />
    <path {...soft} d="M19.5 5.5c0 6-3 9-7.5 9 0-6 3-9 7.5-9Z" />
    <path d="M4.5 10c5 0 7.5 2 7.5 7.5C7 17.5 4.5 15.5 4.5 10Z" />
    <path d="M19.5 5.5c0 6-3 9-7.5 9 0-6 3-9 7.5-9Z" />
    <path d="M12 21v-6.5" />
  </Base>
);

/* Company Briefing. A building */
export const CompanyIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4 20V6l9-2.5V20z" />
    <path d="M4 20.5V6l9-2.5v15" />
    <path d="M13 9h6.5v11.5" />
    <path d="M3 20.5h18" />
    <path d="M7 8.5v.01M7 12v.01M7 15.5v.01M16.2 12.5v.01M16.2 16v.01" />
  </Base>
);

/* Question Predictor. A bullseye: predict the exact questions */
export const PredictorIcon = (p: IconProps) => (
  <Base {...p}>
    <circle {...soft} cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle {...dot} cx="12" cy="12" r="1.5" />
  </Base>
);

/* Anxiety Detector. A speech waveform */
export const AnxietyIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M2.5 9.5h19v5h-19z" />
    <path strokeWidth={2.3} d="M4 10.5v3" />
    <path strokeWidth={2.3} d="M8 7v10" />
    <path strokeWidth={2.3} d="M12 9v6" />
    <path strokeWidth={2.3} d="M16 4.5v15" />
    <path strokeWidth={2.3} d="M20 11v2" />
  </Base>
);

/* Interview Day. A stopwatch under pressure */
export const StopwatchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle {...soft} cx="12" cy="14" r="7.5" />
    <circle cx="12" cy="14" r="7.5" />
    <path d="M12 14V9.8" />
    <path d="M9.8 3h4.4" />
    <path d="M12 3v3" />
    <path d="M18.5 7.2 19.8 6" />
  </Base>
);

/* Salary. A chat bubble with a dollar sign */
export const SalaryIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4 5h16v11H9.5L5.5 20v-4H4z" />
    <path d="M4 5.5h16v10.5H9.5L5.5 20v-4H4z" />
    <path d="M13.6 8.6c-.5-.5-1.3-.8-2.1-.7-1 .1-1.7.7-1.7 1.5 0 1.9 3.9 1 3.9 2.9 0 .8-.8 1.4-1.8 1.5-.9.1-1.7-.2-2.2-.7" />
    <path d="M11.8 6.7v1.1M11.8 13.9v1.1" />
  </Base>
);

/* Post-Interview Debrief. Clipboard with a check */
export const DebriefIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M5 5h14v16H5z" />
    <path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H15" />
    <path d="M9 3.6h6a.8.8 0 0 1 .8.8V6a.8.8 0 0 1-.8.8H9A.8.8 0 0 1 8.2 6V4.4A.8.8 0 0 1 9 3.6Z" />
    <path d="m8.6 13.2 2.3 2.3 4.5-4.6" />
  </Base>
);

/* Your Story. An open book */
export const StoryIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M12 6.5C10 5.2 7.5 4.5 5 4.5v13c2.5 0 5 .7 7 2 2-1.3 4.5-2 7-2v-13c-2.5 0-5 .7-7 2z" />
    <path d="M12 6.5C10 5.2 7.5 4.5 5 4.5v13c2.5 0 5 .7 7 2 2-1.3 4.5-2 7-2v-13c-2.5 0-5 .7-7 2z" />
    <path d="M12 6.5v13" />
  </Base>
);

/* Interview Tracker. A calendar with a check */
export const TrackerIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4 6.5h16V20H4z" />
    <rect x="4" y="5.5" width="16" height="15" rx="2.2" />
    <path d="M4 10h16" />
    <path d="M8.5 3v4M15.5 3v4" />
    <path d="m9 14.8 2 2 4-4.2" />
  </Base>
);

/* Sparkle. Brand accent */
export const SparkIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M12 3.5 14 9l5.5 2L14 13l-2 5.5L10 13 4.5 11 10 9z" />
    <path d="M12 3.5 14 9l5.5 2L14 13l-2 5.5L10 13 4.5 11 10 9z" />
    <path {...dot} d="m19 3 .8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z" />
  </Base>
);

/* Journey: custom axon-path glyphs for the landing flow. These are intentionally
   more brand-specific than stock symbols: connected nodes, arcs, and score paths. */
export const JourneySituationIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M5 12.2c0-4 3-7.1 7-7.1s7 3.1 7 7.1c0 4.5-4.9 7.1-7 9.2-2.1-2.1-7-4.7-7-9.2Z" />
    <path d="M5 12.2c0-4 3-7.1 7-7.1s7 3.1 7 7.1c0 4.5-4.9 7.1-7 9.2-2.1-2.1-7-4.7-7-9.2Z" />
    <path d="M8.2 12.5c1.4-2.1 2.7-3.1 3.8-3.1s2.4 1 3.8 3.1" />
    <path d="M9 15.6c2.1 1.3 3.9 1.3 6 0" />
    <circle {...dot} cx="8.5" cy="8.7" r="1" />
    <circle {...dot} cx="15.5" cy="8.7" r="1" />
  </Base>
);

export const JourneyPracticeIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M5 8.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5v4c0 2-1.5 3.5-3.5 3.5S5 14.5 5 12.5z" />
    <path d="M5 8.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5v4c0 2-1.5 3.5-3.5 3.5S5 14.5 5 12.5z" />
    <path d="M3.5 11.5v1c0 3 2.2 5.4 5 5.4s5-2.4 5-5.4v-1" />
    <path d="M8.5 18v3" />
    <path d="M5.8 21h5.4" />
    <path d="M16 8.4c1.1.6 1.8 1.7 1.8 3.1s-.7 2.5-1.8 3.1" />
    <path d="M18.9 6.2c1.7 1.3 2.8 3.1 2.8 5.3s-1.1 4-2.8 5.3" />
  </Base>
);

export const JourneyScoreIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4.5 5.5h15v12h-15z" />
    <path d="M4.5 5.5h15v12h-15z" />
    <path d="M7.2 14.2c1.9-4 4.3-5.7 7.2-5.1" />
    <path d="M12.4 14.4c1.1-2.4 2.9-3.7 5.4-3.8" />
    <circle {...dot} cx="14.4" cy="9.1" r="1.15" />
    <path d="M7.3 20.5h9.4" />
    <path d="M12 17.5v3" />
  </Base>
);

export const JourneyClimbIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M4.2 18.5 9 14l3.1 2.6 7.7-8.9v10.8z" />
    <path d="M4.2 18.5 9 14l3.1 2.6 7.7-8.9" />
    <path d="M15.4 7.7h4.4v4.4" />
    <circle {...dot} cx="9" cy="14" r="1.2" />
    <circle {...dot} cx="12.1" cy="16.6" r="1.2" />
    <circle {...dot} cx="19.8" cy="7.7" r="1.2" />
  </Base>
);

export const JourneyHiredIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M6 9.2h12v9.3H6z" />
    <path d="M6 9.2h12v9.3H6z" />
    <path d="M9.2 9.2V7.6c0-1 .8-1.8 1.8-1.8h2c1 0 1.8.8 1.8 1.8v1.6" />
    <path d="M6 12.2c3.9 2 8.1 2 12 0" />
    <path d="m9.1 16 1.8 1.7 4-4.3" />
    <path {...dot} d="M19.2 4.2 20 6.4l2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </Base>
);

export const JourneyLoopIcon = (p: IconProps) => (
  <Base {...p}>
    <path {...soft} d="M5.8 7.2h12v10.6h-12z" />
    <path d="M7.2 7.2h10.9v5.3" />
    <path d="m15.6 10.1 2.5 2.4 2.5-2.4" />
    <path d="M16.8 17.8H5.9v-5.3" />
    <path d="m8.4 14.9-2.5-2.4-2.5 2.4" />
    <circle {...dot} cx="12" cy="12.5" r="1.35" />
  </Base>
);
