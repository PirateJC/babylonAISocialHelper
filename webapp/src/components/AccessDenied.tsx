import { useAuth } from "../context/AuthContext.tsx";
import BabylonLogo from "./BabylonLogo.tsx";

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const innerContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 400,
  textAlign: "center",
  padding: 40,
};

const signOutBtn: React.CSSProperties = {
  marginTop: 16,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 500,
  color: "#333",
  background: "#f0f0f0",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const navBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 24px",
  background: "#1a1a2e",
  color: "#fff",
  width: "100%",
};

const navBrand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
  fontSize: 18,
};

const navRight: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#e74c3c",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 600,
  overflow: "hidden",
};

export default function AccessDenied() {
  const { user, logout } = useAuth();

  return (
    <div style={container}>
      {/* Minimal navbar showing user identity */}
      <div style={navBar}>
        <div style={navBrand}>
          <BabylonLogo size={28} />
          Babylon.js Social Helper
        </div>
        <div style={navRight}>
          {user && (
            <>
              <span style={{ fontSize: 14, opacity: 0.8 }}>
                @{user.login}
              </span>
              <div style={avatarStyle}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.login}
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                  />
                ) : (
                  user.login.charAt(0).toUpperCase()
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Access denied content */}
      <div style={innerContainer}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: "#666", maxWidth: 400 }}>
          Your GitHub account
          {user && (
            <>
              {" "}
              (<strong>@{user.login}</strong>)
            </>
          )}{" "}
          is not a member of the{" "}
          <strong>BabylonJS/core-team-microsoft</strong> team. Contact a team
          admin for access.
        </p>
        <button style={signOutBtn} onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
