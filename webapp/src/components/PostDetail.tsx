import { useParams } from "react-router-dom";

const wrapper: React.CSSProperties = {
  padding: 32,
  fontFamily: "system-ui, sans-serif",
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={wrapper}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Post Detail</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Viewing post: <strong>{id}</strong>
      </p>
    </div>
  );
}
