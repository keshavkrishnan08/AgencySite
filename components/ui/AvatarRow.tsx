import { cn } from "@/lib/utils";

const PEOPLE = [
  { initials: "RM", from: "#19a9b8", to: "#0c5660" },
  { initials: "LK", from: "#dd8b3d", to: "#a8631f" },
  { initials: "PA", from: "#3e9d6e", to: "#2a6e4d" },
  { initials: "CJ", from: "#b8893b", to: "#8a6526" },
  { initials: "DT", from: "#14808e", to: "#19a9b8" },
];

export function AvatarRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex -space-x-2.5", className)}>
      {PEOPLE.map((p) => (
        <span
          key={p.initials}
          className="grid h-9 w-9 place-items-center rounded-full text-2xs font-bold text-white ring-2 ring-bg"
          style={{ background: `linear-gradient(140deg, ${p.from}, ${p.to})` }}
        >
          {p.initials}
        </span>
      ))}
    </div>
  );
}
