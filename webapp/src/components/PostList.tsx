const wrapper: React.CSSProperties = {
  padding: 32,
  fontFamily: "system-ui, sans-serif",
};

export default function PostList() {
  return (
    <div style={wrapper}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Posts</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        No posts loaded yet. Import a JSON file to get started.
      </p>
    </div>
  );
}
