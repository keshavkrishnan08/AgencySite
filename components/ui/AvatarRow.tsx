import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

/* Real photos via randomuser.me (free, keyless), with graceful fallback. */
const PEOPLE = [
  { src: "https://randomuser.me/api/portraits/thumb/women/68.jpg", name: "Rachel M" },
  { src: "https://randomuser.me/api/portraits/thumb/men/32.jpg", name: "David K" },
  { src: "https://randomuser.me/api/portraits/thumb/women/44.jpg", name: "Priya N" },
  { src: "https://randomuser.me/api/portraits/thumb/men/51.jpg", name: "Marcus T" },
  { src: "https://randomuser.me/api/portraits/thumb/women/65.jpg", name: "Janet R" },
];

export function AvatarRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex -space-x-2.5", className)}>
      {PEOPLE.map((p) => (
        <Avatar key={p.name} src={p.src} name={p.name} size={36} className="ring-2 ring-bg" />
      ))}
    </div>
  );
}
