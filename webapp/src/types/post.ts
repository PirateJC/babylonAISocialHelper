export type LinkType =
  | "playground"
  | "demo"
  | "docs"
  | "forum"
  | "blog"
  | "community-project"
  | "youtube";

export type PostFormat =
  | "feature-statement"
  | "question"
  | "check-out"
  | "demo-showcase"
  | "community-pride"
  | "call-to-action";

export interface PlatformResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
  retryCount: number;
}

export interface Post {
  id: string;
  assignedDate: string;
  category: string;
  text: string;
  hashtags: string[];
  conditionalHashtags: string[];
  link: string;
  media: string;
  metadata: {
    format: PostFormat;
    linkType: LinkType;
    charCount: number;
  };
  status: "draft" | "scheduled" | "failed";
  platformResults?: PlatformResult[];
  localImageData?: string;
}

export interface PostsImport {
  generatedAt: string;
  generatedBy: string;
  totalPosts: number;
  config: Record<string, unknown>;
  posts: Post[];
}
