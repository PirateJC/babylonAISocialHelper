import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { PostsProvider } from "./context/PostsContext.tsx";
import Navbar from "./components/Navbar.tsx";
import LoginScreen from "./components/LoginScreen.tsx";
import AccessDenied from "./components/AccessDenied.tsx";
import ImportPanel from "./components/ImportPanel.tsx";
import PostList from "./components/PostList.tsx";
import PostDetail from "./components/PostDetail.tsx";

function AuthenticatedApp() {
  const { token, isTeamMember, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
        Loading…
      </div>
    );
  }

  if (!token) return <LoginScreen />;
  if (!isTeamMember) return <AccessDenied />;

  return (
    <PostsProvider>
      <div style={{ minHeight: "100vh", background: "#fff" }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/import" element={<ImportPanel />} />
          <Route path="/posts" element={<PostList />} />
          <Route path="/posts/:id" element={<PostDetail />} />
        </Routes>
      </div>
    </PostsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthenticatedApp />
      </HashRouter>
    </AuthProvider>
  );
}
