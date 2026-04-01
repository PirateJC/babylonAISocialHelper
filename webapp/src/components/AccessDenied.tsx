import { useAuth } from "../context/AuthContext.tsx";

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#f5f5f5",
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
};

const signOutBtn: React.CSSProperties = {
  marginTop: 24,
  padding: "10px 20px",
  fontSize: 14,
  color: "#fff",
  background: "#d32f2f",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

export default function AccessDenied() {
  const { logout } = useAuth();

  return (
    <div style={container}>
      <div style={{ fontSize: 64 }}>🔒</div>
      <h1 style={{ fontSize: 24, marginTop: 16 }}>Access Denied</h1>
      <p style={{ color: "#666", maxWidth: 400, marginTop: 8 }}>
        Your GitHub account is not a member of the BabylonJS team.
        Contact a team admin if you believe this is an error.
      </p>
      <button style={signOutBtn} onClick={logout}>
        Sign Out
      </button>
    </div>
  );
}
