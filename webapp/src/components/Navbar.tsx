import { useAuth } from "../context/AuthContext.tsx";
import BabylonLogo from "./BabylonLogo.tsx";

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
        <BabylonLogo size={28} />
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
