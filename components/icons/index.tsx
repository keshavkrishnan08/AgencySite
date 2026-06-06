import type { ReactNode } from "react";

/* PrepPath custom icon set. A cohesive duotone line style (soft fill + crisp
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
