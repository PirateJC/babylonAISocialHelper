interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { method, pathname } = { method: request.method, pathname: url.pathname };

    // Preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // Health check
    if (method === "GET" && pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: corsHeaders(env) });
    }

    // Token exchange
    if (method === "POST" && pathname === "/api/auth/callback") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const code = body.code as string | undefined;

      if (!code) {
        return Response.json(
          { error: "Missing authorization code" },
          { status: 400, headers: corsHeaders(env) },
        );
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenResponse.json()) as Record<string, unknown>;

      if (tokenData.error) {
        return Response.json(
          { error: tokenData.error, error_description: tokenData.error_description },
          { status: 400, headers: corsHeaders(env) },
        );
      }

      return Response.json(
        { access_token: tokenData.access_token },
        { headers: corsHeaders(env) },
      );
    }

    // Not found
    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders(env) });
  },
};
