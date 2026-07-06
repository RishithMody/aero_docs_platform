import type { SearchResult } from "@/lib/api";

export function ResultCard({ result }: { result: SearchResult }) {
  const title = String(result.metadata.title ?? "Untitled document");
  const partNumbers = String(result.metadata.part_numbers ?? "");
  const barcodes = String(result.metadata.barcodes ?? "");

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Score {result.score.toFixed(2)}
        </span>
      </div>
      <p className="line-clamp-4 text-sm leading-6 text-slate-600">{result.text}</p>
      {(partNumbers || barcodes) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {partNumbers &&
            partNumbers.split(",").filter(Boolean).map((pn) => (
              <span key={pn} className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                P/N {pn}
              </span>
            ))}
          {barcodes &&
            barcodes.split(",").filter(Boolean).map((bc) => (
              <span key={bc} className="rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                Barcode {bc}
              </span>
            ))}
        </div>
      )}
    </article>
  );
}
