import type { PlatformResult } from "../types/post.ts";

/* ── styles ─────────────────────────────────────────────── */

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 13,
};

const successRow: React.CSSProperties = {
  ...row,
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
};

const failedRow: React.CSSProperties = {
  ...row,
  background: "#fee2e2",
  border: "1px solid #fecaca",
};

const icon: React.CSSProperties = {
  fontSize: 18,
  flexShrink: 0,
};

const platformName: React.CSSProperties = {
  fontWeight: 600,
  minWidth: 80,
};

const detail: React.CSSProperties = {
  flex: 1,
  fontSize: 12,
  color: "#374151",
};

const retryBadge: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  background: "#f3f4f6",
  padding: "2px 8px",
  borderRadius: 8,
  flexShrink: 0,
};

/* ── platform display names ─────────────────────────────── */

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
};

function buildPostUrl(platform: string, postId: string): string | null {
  if (platform === "x" && /^\d+$/.test(postId)) {
    return `https://x.com/i/status/${postId}`;
  }
  if (platform === "bluesky" && postId.startsWith("at://")) {
    // at://did:plc:abc/app.bsky.feed.post/xyz → extract handle & rkey
    const parts = postId.split("/");
    if (parts.length >= 5) {
      const did = parts[2];
      const rkey = parts[4];
      return `https://bsky.app/profile/${did}/post/${rkey}`;
    }
  }
  return null;
}

/* ── single result row ──────────────────────────────────── */

function PlatformResultRow({ result }: { result: PlatformResult }) {
  const label = PLATFORM_LABELS[result.platform] ?? result.platform;
  const rowStyle = result.success ? successRow : failedRow;
  const url = result.success && result.postId ? buildPostUrl(result.platform, result.postId) : null;

  return (
    <div style={rowStyle}>
      <span style={icon}>{result.success ? "✅" : "❌"}</span>
      <span style={platformName}>{label}</span>
      <span style={detail}>
        {result.success ? (
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              {result.postId}
            </a>
          ) : (
            <span>{result.postId ?? "Posted"}</span>
          )
        ) : (
          <span style={{ color: "#991b1b" }}>{result.error ?? "Failed"}</span>
        )}
      </span>
      {result.retryCount > 0 && (
        <span style={retryBadge}>
          {result.retryCount} {result.retryCount === 1 ? "retry" : "retries"}
        </span>
      )}
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */

export default function PlatformResults({
  results,
}: {
  results: PlatformResult[];
}) {
  if (results.length === 0) return null;

  return (
    <div style={container}>
      {results.map((r) => (
        <PlatformResultRow key={r.platform} result={r} />
      ))}
    </div>
  );
}
