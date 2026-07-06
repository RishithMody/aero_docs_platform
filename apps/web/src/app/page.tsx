"use client";

import { useState } from "react";
import { OllamaStatusPanel } from "@/components/OllamaStatusPanel";
import { ResultCard } from "@/components/ResultCard";
import {
  askQuestion,
  searchByBarcode,
  searchByImage,
  searchByPartNumber,
  semanticSearch,
  uploadDocument,
  type SearchResult,
} from "@/lib/api";

type Tab = "semantic" | "part" | "barcode" | "image" | "ask" | "upload";

export default function Home() {
  const [tab, setTab] = useState<Tab>("semantic");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState<string>("");
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "semantic", label: "Semantic Search" },
    { id: "part", label: "Part Number" },
    { id: "barcode", label: "Barcode" },
    { id: "image", label: "Image Recognition" },
    { id: "ask", label: "Ask LLaMA 3.2" },
    { id: "upload", label: "Upload Document" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-300">Honeywell VPC</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">AeroDocs Knowledge Base</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Secure RAG pipeline for aviation repair workflows. Search by text, part number,
            barcode, or image using LLaVA and YOLOv8, powered by Ollama LLaMA 3.2.
          </p>
        </header>

        <OllamaStatusPanel />

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {(tab === "upload") && (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
              <input
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Technician comments"
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
            </div>
          )}

          {(tab === "image" || tab === "upload") ? (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mb-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-white"
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
              className="mb-4 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
            />
          )}

          <button
            onClick={runSearch}
            disabled={loading}
            className="rounded-lg bg-blue-500 px-5 py-3 font-medium text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {loading ? "Processing..." : tab === "upload" ? "Upload" : "Search"}
          </button>

          {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
          {analysis && (
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-sm text-slate-300">
              <p className="mb-2 font-semibold text-white">LLaVA Analysis</p>
              <p>{analysis}</p>
            </div>
          )}
          {answer && (
            <div className="mt-4 rounded-lg bg-slate-950 p-4 text-sm text-slate-200">
              <p className="mb-2 font-semibold text-white">LLaMA 3.2 Answer</p>
              <p className="whitespace-pre-wrap">{answer}</p>
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
