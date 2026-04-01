/** A single post read from scheduled/*.json */
export interface PostData {
  id: string;
  assignedDate: string;
  category: "feature-highlight" | "community-demo" | "docs-tutorial";
  text: string;
  hashtags: string[];
  conditionalHashtags: string[];
  link: { url: string; type: string; title: string };
  media: {
    type: "screenshot";
    sourceUrl: string;
    description: string;
    filePath: string;
  };
  metadata: {
    topic: string;
    babylonFeatureArea: string;
    contentSource: string;
    usesEmoji: boolean;
    postFormat: string;
    dayIndex: number;
  };
  platformResults?: Record<string, PlatformResult>;
}

/** Standardized result from a posting attempt */
export interface PlatformResult {
  platform: "x" | "linkedin" | "bluesky";
  success: boolean;
  postId?: string;
  error?: string;
  retryCount: number;
}

/** A platform posting function signature */
export type PlatformPostingFn = (
  post: PostData,
  imagePath: string,
) => Promise<PlatformResult>;

/** Combined results from all three platforms */
export interface AggregatedResults {
  allSucceeded: boolean;
  results: {
    x: PlatformResult;
    linkedin: PlatformResult;
    bluesky: PlatformResult;
  };
}

/** Credentials from environment variables */
export interface PostingSecrets {
  X_USERNAME: string;
  X_PASSWORD: string;
  X_EMAIL: string;
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_REFRESH_TOKEN: string;
  LINKEDIN_ORGANIZATION_ID: string;
  BLUESKY_HANDLE: string;
  BLUESKY_APP_PASSWORD: string;
  GH_TOKEN_SECRETS_WRITE?: string;
}
