const wrapper: React.CSSProperties = {
  padding: 32,
  fontFamily: "system-ui, sans-serif",
};

const dropZone: React.CSSProperties = {
  marginTop: 24,
  padding: 48,
  border: "2px dashed #ccc",
  borderRadius: 12,
  textAlign: "center",
  color: "#999",
  fontSize: 15,
};

export default function ImportPanel() {
  return (
    <div style={wrapper}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Import Posts</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Drop a generated posts JSON file here to import.
      </p>
      <div style={dropZone}>
        Drag &amp; drop a <code>posts-*.json</code> file here, or click to
        browse
      </div>
    </div>
  );
}
