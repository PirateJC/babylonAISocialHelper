import sodium from "libsodium-wrappers";

/**
 * Refresh a LinkedIn OAuth access token using a refresh token.
 */
export async function refreshLinkedInToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET env vars",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `LinkedIn token refresh failed (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Update a GitHub Actions secret via the GitHub REST API.
 * Encrypts the value using libsodium sealed-box with the repo's public key.
 */
export async function updateGitHubSecret(
  secretName: string,
  secretValue: string,
): Promise<void> {
  const ghToken = process.env.GH_TOKEN_SECRETS_WRITE;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!ghToken || !repo) {
    throw new Error(
      "Missing GH_TOKEN_SECRETS_WRITE or GITHUB_REPOSITORY env vars",
    );
  }

  const apiBase = `https://api.github.com/repos/${repo}/actions/secrets`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Get the repo public key for secret encryption
  const keyResponse = await fetch(`${apiBase}/public-key`, { headers });
  if (!keyResponse.ok) {
    const text = await keyResponse.text();
    throw new Error(
      `Failed to get GitHub public key (${keyResponse.status}): ${text}`,
    );
  }
  const { key, key_id } = (await keyResponse.json()) as {
    key: string;
    key_id: string;
  };

  // Encrypt the secret value with libsodium sealed box
  await sodium.ready;
  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binValue = sodium.from_string(secretValue);
  const encrypted = sodium.crypto_box_seal(binValue, binKey);
  const encryptedB64 = sodium.to_base64(
    encrypted,
    sodium.base64_variants.ORIGINAL,
  );

  // PUT the encrypted secret
  const putResponse = await fetch(`${apiBase}/${secretName}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value: encryptedB64, key_id }),
  });

  if (!putResponse.ok) {
    const text = await putResponse.text();
    throw new Error(
      `Failed to update GitHub secret ${secretName} (${putResponse.status}): ${text}`,
    );
  }

  console.log(`[LinkedIn] Updated GitHub secret: ${secretName}`);
}

/**
 * Refresh the LinkedIn token and persist both new tokens as GitHub secrets.
 * Returns the new access token for immediate use.
 */
export async function refreshAndUpdateSecrets(
  currentRefreshToken: string,
): Promise<string> {
  console.log("[LinkedIn] Refreshing OAuth tokens...");

  const { accessToken, refreshToken } =
    await refreshLinkedInToken(currentRefreshToken);

  await updateGitHubSecret("LINKEDIN_ACCESS_TOKEN", accessToken);
  await updateGitHubSecret("LINKEDIN_REFRESH_TOKEN", refreshToken);

  console.log("[LinkedIn] Tokens refreshed and secrets updated.");
  return accessToken;
}
