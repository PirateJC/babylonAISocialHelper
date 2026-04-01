const colors: Record<string, { bg: string; text: string; label: string }> = {
  "feature-highlight": { bg: "#dbeafe", text: "#1e40af", label: "Feature" },
  "community-demo": { bg: "#ffedd5", text: "#c2410c", label: "Community" },
  "docs-tutorial": { bg: "#dcfce7", text: "#166534", label: "Docs" },
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export default function CategoryBadge({ category }: { category: string }) {
  const c = colors[category] ?? { bg: "#f3f4f6", text: "#374151", label: category };
  return (
    <span style={{ ...badge, background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}
