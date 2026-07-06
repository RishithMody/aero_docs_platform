export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type SearchResult = {
  text: string;
  metadata: Record<string, string | number>;
  score: number;
};

export type UploadResponse = {
  document_id: string;
  filename: string;
  title: string;
  part_numbers: string[];
  barcodes: string[];
};

export type ImageAnalysis = {
  filename: string;
  barcodes: string[];
  part_numbers: string[];
  yolo_detections: { label: string; confidence: number }[];
  llava_description: string;
};

export async function uploadDocument(formData: FormData): Promise<UploadResponse> {
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function semanticSearch(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search/?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

export async function searchByPartNumber(partNumber: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${API_BASE}/search/part-number?part_number=${encodeURIComponent(partNumber)}`,
  );
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

export async function searchByBarcode(barcode: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search/barcode?barcode=${encodeURIComponent(barcode)}`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

export async function searchByImage(file: File): Promise<{
  analysis: ImageAnalysis;
  results: SearchResult[];
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/search/image`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function askQuestion(q: string): Promise<{ answer: string; sources: SearchResult[] }> {
  const res = await fetch(`${API_BASE}/search/ask?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
