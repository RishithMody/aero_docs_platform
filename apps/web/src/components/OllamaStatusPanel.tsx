"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ensureOllamaModels, getOllamaStatus, type OllamaStatus } from "@/lib/ollama";
import { cn } from "@/lib/utils";

export function OllamaStatusPanel() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStatus(await getOllamaStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach API");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handlePull() {
    setPulling(true);
    setError("");
    try {
      await ensureOllamaModels();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model pull failed");
    } finally {
      setPulling(false);
    }
  }

  const dotColor = status?.ready
    ? "bg-emerald-400"
    : status?.reachable
      ? "bg-amber-400"
      : "bg-red-400";

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn("h-3 w-3 rounded-full", dotColor)} />
          <div>
            <h2 className="font-semibold text-foreground">Ollama</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Checking connection..."
                : status?.reachable
                  ? status.base_url
                  : "Not reachable — start Ollama on port 11434"}
            </p>
          </div>
        </div>
        <button
          onClick={handlePull}
          disabled={pulling || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/50 px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", pulling && "animate-spin")} />
          {pulling ? "Pulling models..." : "Pull / refresh models"}
        </button>
      </div>

      {status && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(status.required).map(([role, model]) => {
            const ready = status.required_status[model];
            return (
              <div
                key={role}
                className="rounded-lg border border-border bg-background/40 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{role}</p>
                <p className="mt-1 font-medium text-foreground">{model}</p>
                <p className={cn("mt-1 text-xs", ready ? "text-emerald-400" : "text-amber-400")}>
                  {ready ? "Ready" : "Missing — click Pull models"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
