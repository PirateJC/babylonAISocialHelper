import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { usePosts } from "../context/PostsContext.tsx";
import type { PostsImport } from "../types/post.ts";

/* ── styles ─────────────────────────────────────────────── */

const wrapper: React.CSSProperties = {
  padding: 32,
  maxWidth: 720,
  margin: "0 auto",
  fontFamily: "system-ui, sans-serif",
};

const dropZoneBase: React.CSSProperties = {
  marginTop: 24,
  padding: 56,
  border: "2px dashed #ccc",
  borderRadius: 12,
  textAlign: "center",
  color: "#999",
  fontSize: 15,
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
};

const dropZoneActive: React.CSSProperties = {
  ...dropZoneBase,
  borderColor: "#3b82f6",
  background: "#eff6ff",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  background: "#2563eb",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "#2563eb",
  border: "1px solid #2563eb",
};

const errorBox: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  color: "#991b1b",
  fontSize: 13,
};

const summaryCard: React.CSSProperties = {
  marginTop: 24,
  padding: 24,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
};

const statRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  fontSize: 14,
};

/* ── component ──────────────────────────────────────────── */

interface ImportSummary {
  count: number;
  startDate: string;
  endDate: string;
  categories: Record<string, number>;
  imagesLoaded: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  "feature-highlight": "Feature Highlights",
  "community-demo": "Community Demos",
  "docs-tutorial": "Docs & Tutorials",
};

export default function ImportPanel() {
  const navigate = useNavigate();
  const { importPosts, validateImportJson } = usePosts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setErrors([]);
      setSummary(null);

      if (!file.name.endsWith(".zip")) {
        setErrors(["Please select a .zip file containing posts.json and screenshots."]);
        return;
      }

      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(file);
      } catch {
        setErrors(["Could not read the ZIP file. It may be corrupted."]);
        return;
      }

      // Find posts.json inside the zip (may be at root or in a subfolder)
      let jsonEntry: JSZip.JSZipObject | null = null;
      zip.forEach((path, entry) => {
        if (!entry.dir && path.endsWith("posts.json")) {
          jsonEntry = entry;
        }
      });

      if (!jsonEntry) {
        setErrors(["No posts.json found inside the ZIP file."]);
        return;
      }

      let parsed: unknown;
      try {
        const text = await (jsonEntry as JSZip.JSZipObject).async("text");
        parsed = JSON.parse(text);
      } catch {
        setErrors(["posts.json inside the ZIP is not valid JSON."]);
        return;
      }

      const validation = validateImportJson(parsed);
      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      // Extract images from the zip and build a filename → dataURL map
      const imageMap = new Map<string, string>();
      const imageEntries: [string, JSZip.JSZipObject][] = [];
      zip.forEach((path, entry) => {
        if (!entry.dir && /\.(png|jpe?g|webp|gif)$/i.test(path)) {
          imageEntries.push([path, entry]);
        }
      });

      await Promise.all(
        imageEntries.map(async ([path, entry]) => {
          const blob = await entry.async("blob");
          const ext = path.split(".").pop()?.toLowerCase() ?? "png";
          const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
            : ext === "webp" ? "image/webp"
            : ext === "gif" ? "image/gif"
            : "image/png";
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(new Blob([blob], { type: mime }));
          });
          const filename = path.split("/").pop()!;
          imageMap.set(filename, dataUrl);
        }),
      );

      setIsImporting(true);
      try {
        const result = await importPosts(parsed as PostsImport, imageMap);
        setSummary({
          ...result,
          imagesLoaded: imageMap.size,
        });
      } catch (err) {
        setErrors([
          err instanceof Error ? err.message : "Import failed.",
        ]);
      } finally {
        setIsImporting(false);
      }
    },
    [importPosts, validateImportJson],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const resetImport = () => {
    setSummary(null);
    setErrors([]);
  };

  /* ── summary view ─────────────────────────────────────── */

  if (summary) {
    return (
      <div style={wrapper}>
        <h1 style={{ fontSize: 24, margin: 0 }}>✅ Import Successful</h1>
        <div style={summaryCard}>
          <div style={statRow}>
            <span style={{ fontWeight: 600 }}>Total posts</span>
            <span>{summary.count}</span>
          </div>
          <div style={statRow}>
            <span style={{ fontWeight: 600 }}>Screenshots loaded</span>
            <span>{summary.imagesLoaded} / {summary.count}</span>
          </div>
          <div style={statRow}>
            <span style={{ fontWeight: 600 }}>Date range</span>
            <span>
              {summary.startDate} → {summary.endDate}
            </span>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>
            Category breakdown
          </p>
          {Object.entries(summary.categories).map(([cat, count]) => (
            <div key={cat} style={statRow}>
              <span>{CATEGORY_LABELS[cat] ?? cat}</span>
              <span>
                {count} ({Math.round((count / summary.count) * 100)}%)
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <button style={btnPrimary} onClick={() => navigate("/posts")}>
            Review Posts
          </button>
          <button style={btnSecondary} onClick={resetImport}>
            Re-import
          </button>
        </div>
      </div>
    );
  }

  /* ── upload view ──────────────────────────────────────── */

  return (
    <div style={wrapper}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Import Posts</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Upload the generated <code>.zip</code> bundle containing posts.json and
        screenshot images.
      </p>

      <div
        style={isDragging ? dropZoneActive : dropZoneBase}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isImporting ? (
          <span>Importing…</span>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 16 }}>
              📦 Drag &amp; drop your generated <strong>.zip</strong> bundle here
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa" }}>
              or click to browse
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {errors.length > 0 && (
        <div style={errorBox}>
          <strong>Import errors:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {errors.map((err, i) => (
              <li key={i} style={{ marginTop: 4 }}>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
