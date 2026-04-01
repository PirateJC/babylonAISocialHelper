import { useAuth } from "../context/AuthContext.tsx";

const nav: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 20px",
  height: 56,
  background: "#1a1a2e",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
};

const brand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  fontSize: 18,
  textDecoration: "none",
  color: "#fff",
};

const navBtn: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  cursor: "pointer",
  textDecoration: "none",
};

const rightSection: React.CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const avatar: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
};

const signOutBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  color: "#ccc",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 4,
  cursor: "pointer",
};

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav style={nav}>
      <a href="#/posts" style={brand}>
        {/* Babylon.js logo — simplified SVG mark */}
        <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#e0684b" strokeWidth="6" />
          <polygon
            points="50,18 78,68 22,68"
            fill="none"
            stroke="#e0684b"
            strokeWidth="5"
          />
        </svg>
        Social Helper
      </a>

      <a href="#/import" style={{ ...navBtn, marginLeft: 24 }}>
        Import Posts
      </a>

      <div style={rightSection}>
        {user && (
          <>
            <img src={user.avatarUrl} alt={user.login} style={avatar} />
            <span style={{ fontSize: 14 }}>{user.login}</span>
          </>
        )}
        <button style={signOutBtn} onClick={logout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
