import fs from "node:fs";
import type { PostData, PlatformResult } from "./utils/types.js";
import { retryWithBackoff, assembleFullText } from "./utils/retry.js";
import { refreshAndUpdateSecrets } from "./utils/linkedin-token-refresh.js";

const LINKEDIN_API = "https://api.linkedin.com/rest";
const LINKEDIN_VERSION = "202401";

/**
 * Post to LinkedIn with an image and commentary text.
 * Automatically refreshes the OAuth token on 401 and retries.
 */
export async function postToLinkedIn(
  post: PostData,
  imagePath: string,
): Promise<PlatformResult> {
  let accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!accessToken || !refreshToken || !orgId) {
    const missing = [
      !accessToken && "LINKEDIN_ACCESS_TOKEN",
      !refreshToken && "LINKEDIN_REFRESH_TOKEN",
      !orgId && "LINKEDIN_ORGANIZATION_ID",
    ].filter(Boolean);
    console.log(
      `[LinkedIn] ❌ Failed: Missing env vars: ${missing.join(", ")}`,
    );
    return {
      platform: "linkedin",
      success: false,
      error: `Missing env vars: ${missing.join(", ")}`,
      retryCount: 0,
    };
  }

  const author = `urn:li:organization:${orgId}`;

  const { result, error, retryCount } = await retryWithBackoff(
    async () => {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      };

      // 1. Register image upload
      console.log("[LinkedIn] Initializing image upload...");
      const initResponse = await fetch(
        `${LINKEDIN_API}/images?action=initializeUpload`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            initializeUploadRequest: { owner: author },
          }),
        },
      );

      if (initResponse.status === 401) {
        console.log("[LinkedIn] Token expired, refreshing...");
        accessToken = await refreshAndUpdateSecrets(refreshToken);
        throw new Error("Token refreshed — retrying");
      }

      if (!initResponse.ok) {
        const text = await initResponse.text();
        throw new Error(
          `Image upload init failed (${initResponse.status}): ${text}`,
        );
      }

      const initData = (await initResponse.json()) as {
        value: { uploadUrl: string; image: string };
      };
      const { uploadUrl, image: imageUrn } = initData.value;

      // 2. Upload image binary
      console.log("[LinkedIn] Uploading image...");
      const imageBuffer = fs.readFileSync(imagePath);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        throw new Error(
          `Image upload failed (${uploadResponse.status}): ${text}`,
        );
      }

      // 3. Assemble text (includes hashtags for LinkedIn)
      const commentary = assembleFullText(post, "linkedin");

      // 4. Create LinkedIn post
      console.log("[LinkedIn] Creating post...");
      const postBody = {
        author,
        commentary,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: {
            title: post.media.description,
            id: imageUrn,
          },
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      const postResponse = await fetch(`${LINKEDIN_API}/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify(postBody),
      });

      if (postResponse.status === 401) {
        console.log("[LinkedIn] Token expired, refreshing...");
        accessToken = await refreshAndUpdateSecrets(refreshToken);
        throw new Error("Token refreshed — retrying");
      }

      if (!postResponse.ok) {
        const text = await postResponse.text();
        throw new Error(
          `Post creation failed (${postResponse.status}): ${text}`,
        );
      }

      // Extract post URN from response header
      const postUrn = postResponse.headers.get("x-restli-id") ?? "unknown";
      return postUrn;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, err) => {
        console.log(
          `[LinkedIn] Retry ${attempt}/3 after error: ${err.message}`,
        );
      },
    },
  );

  if (result) {
    console.log(`[LinkedIn] ✅ Posted: ${result}`);
    return {
      platform: "linkedin",
      success: true,
      postId: result,
      retryCount,
    };
  }

  const errorMsg = error?.message ?? "Unknown error";
  console.log(`[LinkedIn] ❌ Failed: ${errorMsg}`);
  return {
    platform: "linkedin",
    success: false,
    error: errorMsg,
    retryCount,
  };
}
