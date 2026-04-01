import type { Post } from "../types/post.ts";
import BabylonLogo from "./BabylonLogo.tsx";

/* ── styles ─────────────────────────────────────────────── */

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  background: "#fff",
  maxWidth: 480,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const avatar: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#1a1a2e",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  objectFit: "cover",
  maxHeight: 280,
};

const imagePlaceholder: React.CSSProperties = {
  width: "100%",
  height: 180,
  borderRadius: 12,
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9ca3af",
  fontSize: 14,
  border: "1px solid #e5e7eb",
};

/* ── helpers ─────────────────────────────────────────────── */

/* ── component ───────────────────────────────────────────── */

interface PostPreviewProps {
  post: Post;
}

export default function PostPreview({ post }: PostPreviewProps) {
  return (
    <div style={card}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={avatar}>
          <BabylonLogo size={26} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Babylon.js</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>@babylonjs</div>
        </div>
      </div>

      {/* Body text */}
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.5,
          margin: "12px 0",
          whiteSpace: "pre-wrap",
        }}
      >
        {post.text}
      </p>

      {/* Link */}
      {post.link?.url && (
        <div style={{ marginTop: 8 }}>
          <a
            href={post.link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 14, color: "#2563eb", textDecoration: "none" }}
          >
            {post.link.url}
          </a>
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div
          style={{
            fontSize: 13,
            color: "#2563eb",
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          {post.hashtags
            .map((h) => (h.startsWith("#") ? h : `#${h}`))
            .join(" ")}
        </div>
      )}

      {/* Image */}
      {post.localImageData ? (
        <img
          src={post.localImageData}
          alt="Post screenshot"
          style={{ ...imageStyle, marginTop: 12 }}
        />
      ) : (
        <div style={{ ...imagePlaceholder, marginTop: 12 }}>📷 Screenshot preview</div>
      )}
    </div>
  );
}
