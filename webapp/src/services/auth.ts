const GITHUB_CLIENT_ID =
  import.meta.env.VITE_GITHUB_CLIENT_ID || "REPLACE_ME";
const OAUTH_WORKER_URL =
  import.meta.env.VITE_OAUTH_WORKER_URL || "http://localhost:8787";
const REDIRECT_URI =
  import.meta.env.VITE_REDIRECT_URI ||
  window.location.origin + window.location.pathname;

const STATE_KEY = "babylonsocial:state";

export function getOAuthUrl(): string {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, nonce);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "repo read:org",
    state: nonce,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function getStoredState(): string | null {
  return sessionStorage.getItem(STATE_KEY);
}

export function clearStoredState(): void {
  sessionStorage.removeItem(STATE_KEY);
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(`${OAUTH_WORKER_URL}/api/auth/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function fetchUser(
  token: string,
): Promise<{ login: string; avatarUrl: string; name: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.status}`);
  }

  const data = (await res.json()) as {
    login: string;
    avatar_url: string;
    name: string | null;
  };

  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name ?? data.login,
  };
}

export async function checkTeamMembership(
  token: string,
  username: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/orgs/BabylonJS/teams/core-team-microsoft/memberships/${username}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return false;

    const data = (await res.json()) as { state: string };
    return data.state === "active";
  } catch {
    return false;
  }
}
