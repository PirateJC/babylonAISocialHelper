import { useState, useCallback } from "react";
import type { Post, LinkType } from "../types/post.ts";
import GraphemeCounter from "./GraphemeCounter.tsx";

/* ── styles ─────────────────────────────────────────────── */

const fieldGroup: React.CSSProperties = {
  marginBottom: 20,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  padding: "10px 12px",
  fontSize: 14,
  lineHeight: 1.6,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  resize: "vertical",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  boxSizing: "border-box",
};

const select: React.CSSProperties = {
  ...input,
  width: "auto",
  minWidth: 180,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 12,
  background: "#f3f4f6",
  color: "#374151",
  marginRight: 6,
  marginBottom: 4,
};

const metaPill: React.CSSProperties = {
  ...pill,
  background: "#eff6ff",
  color: "#1e40af",
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 24,
};

const btn: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const imagePreview: React.CSSProperties = {
  width: "100%",
  maxHeight: 200,
  objectFit: "cover",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  marginTop: 8,
};

/* ── link type options ───────────────────────────────────── */

const LINK_TYPES: LinkType[] = [
  "playground",
  "demo",
  "docs",
  "forum",
  "blog",
  "community-project",
  "youtube",
];

/* ── component ───────────────────────────────────────────── */

interface PostEditorProps {
  post: Post;
  onSave: (updated: Post) => void;
  onCancel: () => void;
}

export default function PostEditor({ post, onSave, onCancel }: PostEditorProps) {
  const [text, setText] = useState(post.text);
  const [linkUrl, setLinkUrl] = useState(post.link?.url ?? "");
  const [linkType, setLinkType] = useState<LinkType>(
    post.link?.type ?? "playground",
  );
  const [assignedDate, setAssignedDate] = useState(post.assignedDate);
  const [localImageData, setLocalImageData] = useState(
    post.localImageData ?? "",
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLocalImageData(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleSave = useCallback(() => {
    const updated: Post = {
      ...post,
      text,
      link: { ...post.link, url: linkUrl, type: linkType },
      assignedDate,
      localImageData: localImageData || undefined,
    };
    onSave(updated);
  }, [post, text, linkUrl, linkType, assignedDate, localImageData, onSave]);

  return (
    <div>
      {/* Text */}
      <div style={fieldGroup}>
        <label style={label}>Post Text</label>
        <textarea
          style={textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your post text here..."
        />
        <div style={{ marginTop: 6 }}>
          <GraphemeCounter bodyText={text} linkUrl={linkUrl} />
        </div>
      </div>

      {/* Link URL */}
      <div style={fieldGroup}>
        <label style={label}>Link URL</label>
        <input
          style={input}
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Link Type */}
      <div style={fieldGroup}>
        <label style={label}>Link Type</label>
        <select
          style={select}
          value={linkType}
          onChange={(e) => setLinkType(e.target.value as LinkType)}
        >
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Scheduled Date */}
      <div style={fieldGroup}>
        <label style={label}>Scheduled Date</label>
        <input
          style={input}
          type="date"
          value={assignedDate}
          onChange={(e) => setAssignedDate(e.target.value)}
        />
      </div>

      {/* Image Upload */}
      <div style={fieldGroup}>
        <label style={label}>Screenshot Image</label>
        <input
          type="file"
          accept="image/png"
          onChange={handleImageUpload}
          style={{ fontSize: 13 }}
        />
        {localImageData && (
          <img src={localImageData} alt="Preview" style={imagePreview} />
        )}
      </div>

      {/* Hashtags (read-only) */}
      <div style={fieldGroup}>
        <label style={label}>Hashtags (read-only)</label>
        <div>
          {post.hashtags.map((h) => (
            <span key={h} style={pill}>
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
        {post.conditionalHashtags.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Conditional: </span>
            {post.conditionalHashtags.map((h) => (
              <span key={h} style={{ ...pill, background: "#fef3c7" }}>
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>
          Hashtags are managed by the system and appended per-platform at
          post-time.
        </p>
      </div>

      {/* Metadata (read-only) */}
      <div style={fieldGroup}>
        <label style={label}>Metadata (read-only)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <span style={metaPill}>Topic: {post.metadata.topic}</span>
          <span style={metaPill}>
            Area: {post.metadata.babylonFeatureArea}
          </span>
          <span style={metaPill}>
            Format: {post.metadata.postFormat}
          </span>
          <span style={metaPill}>
            Emoji: {post.metadata.usesEmoji ? "Yes" : "No"}
          </span>
          <span style={metaPill}>Day: {post.metadata.dayIndex}</span>
        </div>
      </div>

      {/* Buttons */}
      <div style={btnRow}>
        <button
          style={{ ...btn, background: "#2563eb", color: "#fff" }}
          onClick={handleSave}
        >
          Save Changes
        </button>
        <button
          style={{ ...btn, background: "#f3f4f6", color: "#374151" }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
