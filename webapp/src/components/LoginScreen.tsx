import { useAuth } from "../context/AuthContext.tsx";
import BabylonLogo from "./BabylonLogo.tsx";

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  color: "#fff",
  textAlign: "center",
  padding: 40,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const btnGithub: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: "#fff",
  color: "#1a1a1a",
  padding: "14px 32px",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 20px",
  background: "rgba(231, 76, 60, 0.2)",
  border: "1px solid rgba(231, 76, 60, 0.5)",
  borderRadius: 8,
  color: "#ff8a80",
  fontSize: 14,
  maxWidth: 400,
};

export default function LoginScreen() {
  const { login, authError } = useAuth();

  return (
    <div style={container}>
      {/* Babylon.js Logo */}
      <div style={{ marginBottom: 8 }}>
        <BabylonLogo size={80} />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Babylon.js Social Helper
      </h1>
      <p
        style={{
          fontSize: 16,
          opacity: 0.7,
          marginBottom: 32,
          maxWidth: 400,
        }}
      >
        Review, edit, and approve social media posts for the Babylon.js
        community
      </p>

      <button style={btnGithub} onClick={login}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Sign in with GitHub
      </button>

      <div style={{ fontSize: 13, opacity: 0.5, marginTop: 16 }}>
        Requires membership in BabylonJS/core-team-microsoft
      </div>

      {authError && <div style={errorBox}>{authError}</div>}
    </div>
  );
}
