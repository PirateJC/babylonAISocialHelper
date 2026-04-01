import type { Post } from "../types/post.ts";

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
  background: "linear-gradient(135deg, #e44d26, #bb381a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 18,
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

const linkCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 14px",
  marginTop: 8,
  background: "#f9fafb",
};

const engagementBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-around",
  marginTop: 14,
  paddingTop: 10,
  borderTop: "1px solid #f3f4f6",
  fontSize: 13,
  color: "#6b7280",
};

/* ── helpers ─────────────────────────────────────────────── */

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/* ── component ───────────────────────────────────────────── */

interface PostPreviewProps {
  post: Post;
}

export default function PostPreview({ post }: PostPreviewProps) {
  return (
    <div style={card}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={avatar}>B</div>
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

      {/* Image */}
      {post.localImageData ? (
        <img
          src={post.localImageData}
          alt="Post screenshot"
          style={imageStyle}
        />
      ) : (
        <div style={imagePlaceholder}>📷 Screenshot preview</div>
      )}

      {/* Link card */}
      {post.link?.url && (
        <div style={linkCardStyle}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {extractDomain(post.link.url)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {post.link.title || post.link.url}
          </div>
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

      {/* Engagement bar */}
      <div style={engagementBar}>
        <span>💬 0</span>
        <span>🔁 0</span>
        <span>❤️ 0</span>
        <span>📊 0</span>
      </div>

      {/* Note */}
      <p
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginTop: 12,
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        Generic preview. Platform-specific previews (X, LinkedIn, Bluesky)
        planned for a future release.
      </p>
    </div>
  );
}
