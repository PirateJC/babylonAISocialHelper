function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function verifyTeamMembership(token, org, teamSlug) {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "babylon-social-auth-worker",
    },
  });

  if (!userRes.ok) {
    return { authorized: false, error: "Failed to fetch GitHub user profile" };
  }

  const user = await userRes.json();
  const username = user.login;

  const teamRes = await fetch(
    `https://api.github.com/orgs/${org}/teams/${teamSlug}/memberships/${username}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "babylon-social-auth-worker",
      },
    },
  );

  if (!teamRes.ok) {
    return { authorized: false, error: `User @${username} is not a member of ${org}/${teamSlug}` };
  }

  const membership = await teamRes.json();
  if (membership.state !== "active") {
    return { authorized: false, error: `User @${username} membership in ${org}/${teamSlug} is not active` };
  }

  return { authorized: true, username };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // Preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // Validate Origin on non-GET requests
    if (method === "POST") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== env.ALLOWED_ORIGIN) {
        return Response.json(
          { error: "Origin not allowed" },
          { status: 403, headers: corsHeaders(env) }
        );
      }
    }

    // Health check
    if (method === "GET" && pathname === "/health") {
      return Response.json({ status: "ok" }, { headers: corsHeaders(env) });
    }

    // Token exchange with server-side team verification
    if (method === "POST" && pathname === "/api/auth/callback") {
      const body = await request.json().catch(() => ({}));
      const code = body.code;

      if (!code) {
        return Response.json(
          { error: "Missing authorization code" },
          { status: 400, headers: corsHeaders(env) }
        );
      }

      // Exchange code for token
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
          { error: tokenData.error },
          { status: 400, headers: corsHeaders(env) }
        );
      }

      const accessToken = tokenData.access_token;

      // Verify team membership before returning the token
      const org = env.REQUIRED_ORG || "BabylonJS";
      const team = env.REQUIRED_TEAM || "core-team-microsoft";
      const verification = await verifyTeamMembership(accessToken, org, team);

      if (!verification.authorized) {
        return Response.json(
          { error: "access_denied", error_description: verification.error },
          { status: 403, headers: corsHeaders(env) }
        );
      }

      return Response.json(
        { access_token: accessToken },
        { headers: corsHeaders(env) }
      );
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders(env) });
  },
};
