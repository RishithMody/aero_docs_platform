"use client";

import { useState } from "react";
import {
  Barcode,
  Brain,
  Camera,
  FileUp,
  Hash,
  Search,
} from "lucide-react";
import RetroGrid from "@/components/ui/retro-grid";
import { OllamaStatusPanel } from "@/components/OllamaStatusPanel";
import { ResultCard, TabButton } from "@/components/ResultCard";
import {
  askQuestion,
  searchByBarcode,
  searchByImage,
  searchByPartNumber,
  semanticSearch,
  uploadDocument,
  type SearchResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "semantic" | "part" | "barcode" | "image" | "ask" | "upload";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "semantic", label: "Semantic Search", icon: <Search className="h-4 w-4" /> },
  { id: "part", label: "Part Number", icon: <Hash className="h-4 w-4" /> },
  { id: "barcode", label: "Barcode", icon: <Barcode className="h-4 w-4" /> },
  { id: "image", label: "Image Recognition", icon: <Camera className="h-4 w-4" /> },
  { id: "ask", label: "Ask LLaMA 3.2", icon: <Brain className="h-4 w-4" /> },
  { id: "upload", label: "Upload Document", icon: <FileUp className="h-4 w-4" /> },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("semantic");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runSearch() {
    if (!query.trim() && tab !== "image" && tab !== "upload") return;
    setLoading(true);
    setMessage("");
    setAnswer("");
    setAnalysis("");
    try {
      if (tab === "semantic") setResults(await semanticSearch(query));
      if (tab === "part") setResults(await searchByPartNumber(query));
      if (tab === "barcode") setResults(await searchByBarcode(query));
      if (tab === "ask") {
        const response = await askQuestion(query);
        setAnswer(response.answer);
        setResults(response.sources);
      }
      if (tab === "image" && file) {
        const response = await searchByImage(file);
        setResults(response.results);
        setAnalysis(response.analysis.llava_description);
      }
      if (tab === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("comments", comments);
        const uploaded = await uploadDocument(formData);
        setMessage(
          `Uploaded ${uploaded.filename}. Part numbers: ${uploaded.part_numbers.join(", ") || "none"}`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <RetroGrid />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Honeywell VPC</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            AeroDocs Knowledge Base
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Secure RAG pipeline for aviation repair workflows. Search by text, part number,
            barcode, or image using LLaVA and YOLOv8, powered by Ollama LLaMA 3.2.
          </p>
        </header>

        <OllamaStatusPanel />

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <TabButton key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
              {item.icon}
              {item.label}
            </TabButton>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md">
          {tab === "upload" && (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="rounded-lg border border-input bg-background/60 px-4 py-3 text-foreground placeholder:text-muted-foreground"
              />
              <input
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Technician comments"
                className="rounded-lg border border-input bg-background/60 px-4 py-3 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          {tab === "image" || tab === "upload" ? (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mb-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            />
          ) : (
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "part"
                  ? "Enter part number, e.g. PN-12345-A"
                  : tab === "barcode"
                    ? "Enter barcode value"
                    : tab === "ask"
                      ? "Ask a maintenance question..."
                      : "Search technical documents..."
              }
              className="mb-4 min-h-28 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-foreground placeholder:text-muted-foreground"
            />
          )}

          <button
            onClick={runSearch}
            disabled={loading}
            className={cn(
              "rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground",
              "hover:opacity-90 disabled:opacity-60",
            )}
          >
            {loading ? "Processing..." : tab === "upload" ? "Upload" : "Search"}
          </button>

          {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}
          {analysis && (
            <div className="mt-4 rounded-lg border border-border bg-background/50 p-4 text-sm">
              <p className="mb-2 font-semibold text-foreground">LLaVA Analysis</p>
              <p className="text-muted-foreground">{analysis}</p>
            </div>
          )}
          {answer && (
            <div className="mt-4 rounded-lg border border-border bg-background/50 p-4 text-sm">
              <p className="mb-2 font-semibold text-foreground">LLaMA 3.2 Answer</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{answer}</p>
            </div>
          )}
        </section>

        {results.length > 0 && (
          <section className="mt-8 grid gap-4">
            {results.map((result, index) => (
              <ResultCard key={`${result.metadata.document_id}-${index}`} result={result} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
