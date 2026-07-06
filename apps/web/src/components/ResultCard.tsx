import type { SearchResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ResultCard({ result }: { result: SearchResult }) {
  const title = String(result.metadata.title ?? "Untitled document");
  const partNumbers = String(result.metadata.part_numbers ?? "");
  const barcodes = String(result.metadata.barcodes ?? "");

  return (
    <article className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-card-foreground">{title}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          Score {result.score.toFixed(2)}
        </span>
      </div>
      <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{result.text}</p>
      {(partNumbers || barcodes) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {partNumbers
            .split(",")
            .filter(Boolean)
            .map((pn) => (
              <span
                key={pn}
                className="rounded bg-amber-500/10 px-2 py-1 text-amber-200 ring-1 ring-amber-500/20"
              >
                P/N {pn}
              </span>
            ))}
          {barcodes
            .split(",")
            .filter(Boolean)
            .map((bc) => (
              <span
                key={bc}
                className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-200 ring-1 ring-emerald-500/20"
              >
                Barcode {bc}
              </span>
            ))}
        </div>
      )}
    </article>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
