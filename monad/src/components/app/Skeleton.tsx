/**
 * Loading bars for content being computed.
 *
 * Deliberately irregular widths — a stack of equal bars reads as a graphic,
 * uneven ones read as a paragraph that has not arrived yet.
 */
export function SkeletonLines({
  lines = 4,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ['62%', '96%', '88%', '74%', '91%', '55%'];
  return (
    <div className={`space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-[9px]"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
