import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_AUTH_BYPASS = import.meta.env.DEV;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

    const stored = sessionStorage.getItem("gh_token");
    if (stored) {
      setToken(stored);
      // TODO: fetch user profile & team membership from API
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  function login() {
    // TODO: redirect to GitHub OAuth flow via oauth-worker
    window.location.href = "#/login";
  }

  function logout() {
    sessionStorage.removeItem("gh_token");
    setToken(null);
    setUser(null);
    setIsTeamMember(false);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, isTeamMember, isLoading, login, logout }}
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
