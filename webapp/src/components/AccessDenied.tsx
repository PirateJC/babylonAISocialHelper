import { useAuth } from "../context/AuthContext.tsx";

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
          <svg
            width="28"
            height="28"
            viewBox="0 0 444 385"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#fff"
              d="M221.7,64.82l-110.92,64V256.93L221.7,321l110.92-64V128.85Z"
            />
            <polygon
              fill="#e0684b"
              points="332.62 128.85 297.9 108.81 264.5 128.09 299.22 148.14 332.62 128.85"
            />
            <polygon
              fill="#e0684b"
              points="144.18 148.14 255.09 84.1 221.7 64.81 110.78 128.85 144.18 148.14"
            />
            <polygon
              fill="#e0684b"
              points="186.98 212.94 221.7 232.98 256.41 212.94 221.7 192.89 186.98 212.94"
            />
            <polygon
              fill="#bb464b"
              points="299.22 148.14 299.22 237.65 221.7 282.41 144.18 237.65 144.18 148.14 110.78 128.85 110.78 256.93 221.7 320.97 332.62 256.93 332.62 128.85 299.22 148.14"
            />
            <polygon
              fill="#bb464b"
              points="221.7 152.81 186.98 172.85 186.98 212.94 221.7 192.89 256.41 212.94 256.41 172.85 221.7 152.81"
            />
            <polygon
              fill="#e0ded8"
              points="299.22 148.14 256.41 172.85 256.41 212.94 221.7 232.98 221.7 282.41 299.22 237.65 299.22 148.14"
            />
            <polygon
              fill="#d5d2ca"
              points="144.18 148.14 186.98 172.85 186.98 212.94 221.7 232.98 221.7 282.41 144.18 237.65 144.18 148.14"
            />
            <polygon
              fill="#fff"
              points="255.09 84.1 297.9 108.81 264.5 128.09 299.22 148.14 256.41 172.85 221.7 152.81 186.98 172.85 144.18 148.14 255.09 84.1"
            />
          </svg>
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
