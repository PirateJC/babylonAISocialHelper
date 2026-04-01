function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (method === "GET" && pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: corsHeaders(env) });
    }

    if (method === "POST" && pathname === "/api/auth/callback") {
      const body = await request.json().catch(() => ({}));
      const code = body.code;

      if (!code) {
        return Response.json(
          { error: "Missing authorization code" },
          { status: 400, headers: corsHeaders(env) }
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

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return Response.json(
          { error: tokenData.error, error_description: tokenData.error_description },
          { status: 400, headers: corsHeaders(env) }
        );
      }

      return Response.json(
        { access_token: tokenData.access_token },
        { headers: corsHeaders(env) }
      );
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders(env) });
  },
};
