import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getOAuthUrl,
  getStoredState,
  clearStoredState,
  exchangeCodeForToken,
  fetchUser,
  checkTeamMembership,
} from "../services/auth.ts";

interface User {
  login: string;
  avatarUrl: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isTeamMember: boolean;
  isLoading: boolean;
  authError: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "babylonsocial:token";
const DEV_AUTH_BYPASS = import.meta.env.DEV;

async function loadProfile(accessToken: string) {
  const user = await fetchUser(accessToken);
  const isMember = await checkTeamMembership(accessToken, user.login);
  return { user, isMember };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      setToken("dev-token");
      setUser({
        login: "dev-user",
        avatarUrl: "https://avatars.githubusercontent.com/u/0?v=4",
        name: "Dev User",
      });
      setIsTeamMember(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // Check for OAuth callback code in the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");

        if (code) {
          const storedState = getStoredState();
          if (!storedState || storedState !== state) {
            throw new Error("Invalid OAuth state — possible CSRF attack");
          }
          clearStoredState();

          const accessToken = await exchangeCodeForToken(code);
          sessionStorage.setItem(TOKEN_KEY, accessToken);

          // Clean the URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.hash,
          );

          if (cancelled) return;
          const { user: profile, isMember } = await loadProfile(accessToken);
          if (cancelled) return;

          setToken(accessToken);
          setUser(profile);
          setIsTeamMember(isMember);
          setIsLoading(false);
          return;
        }

        // Check for an existing token in sessionStorage
        const stored = sessionStorage.getItem(TOKEN_KEY);
        if (stored) {
          if (cancelled) return;
          const { user: profile, isMember } = await loadProfile(stored);
          if (cancelled) return;

          setToken(stored);
          setUser(profile);
          setIsTeamMember(isMember);
        }
      } catch (err) {
        if (!cancelled) {
          setAuthError(
            err instanceof Error ? err.message : "Authentication failed",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = getOAuthUrl();
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    clearStoredState();
    setToken(null);
    setUser(null);
    setIsTeamMember(false);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isTeamMember, isLoading, authError, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
