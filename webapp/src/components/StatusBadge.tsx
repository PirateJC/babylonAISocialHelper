const colors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "#f3f4f6", text: "#374151", label: "Draft" },
  scheduled: { bg: "#dcfce7", text: "#166534", label: "Scheduled" },
  failed: { bg: "#fee2e2", text: "#991b1b", label: "Failed" },
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export default function StatusBadge({
  status,
}: {
  status: "draft" | "scheduled" | "failed";
}) {
  const c = colors[status] ?? colors.draft;
  return (
    <span style={{ ...badge, background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}
