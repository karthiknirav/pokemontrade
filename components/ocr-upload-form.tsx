"use client";

import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";

export function OcrUploadForm() {
  const [result, setResult] = useState<string | null>(null);
  const [entries, setEntries] = useState<Array<{ label: string; priceAud: number | null }>>([]);
  const [showModeLines, setShowModeLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function sendToShowMode() {
    if (showModeLines.length === 0) return;
    localStorage.setItem("showModeDraftEntries", showModeLines.join("\n"));
    window.dispatchEvent(new CustomEvent("showModeDraftUpdated"));
    setResult("Detected rows sent to Show Mode input.");
  }

  async function analyzeFile(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    setIsPending(true);
    setError(null);
    setResult(null);
    setEntries([]);
    setShowModeLines([]);

    try {
      const response = await fetch("/api/ocr/analyze", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "OCR failed");
      setResult(data.summary ?? "OCR completed.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setShowModeLines(Array.isArray(data.showModeLines) ? data.showModeLines : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setIsPending(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) analyzeFile(file);
  }

  return (
    <div className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-ink">Scan a Card</h3>
      <p className="mt-1 text-sm text-slate-500">
        Point your camera at a price tag or binder. Claude will extract card names and prices.
      </p>

      {/* Camera + upload buttons — large touch targets for show floor */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-ember px-4 py-5 text-sm font-semibold text-white shadow transition active:scale-95 disabled:opacity-60"
        >
          <Camera className="h-8 w-8" />
          Take Photo
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-ink px-4 py-5 text-sm font-semibold text-ink transition active:scale-95 disabled:opacity-60"
        >
          <Upload className="h-8 w-8" />
          Upload
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />
      <input
        ref={fileRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        type="file"
      />

      {isPending ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ember border-t-transparent" />
          Analyzing image…
        </div>
      ) : null}

      {result ? <div className="mt-3 text-sm font-medium text-pine">{result}</div> : null}

      {entries.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <div className="text-sm font-semibold text-ink">Detected cards</div>
          <div className="mt-2 space-y-2">
            {entries.map((entry, index) => (
              <div
                key={`${entry.label}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              >
                <span className="font-medium text-ink">{entry.label}</span>
                {entry.priceAud !== null ? (
                  <span className="font-semibold text-pine">A${entry.priceAud.toFixed(2)}</span>
                ) : null}
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-ink py-3 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
            disabled={showModeLines.length === 0}
            onClick={sendToShowMode}
            type="button"
          >
            Send to Show Mode
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
    </div>
  );
}
