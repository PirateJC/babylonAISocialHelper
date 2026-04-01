import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Post, PostsImport } from "../types/post.ts";
import { useAuth } from "./AuthContext.tsx";
import { listScheduledDates, fetchScheduledPosts, fetchFailedPosts } from "../services/github.ts";
import { saveDrafts, loadDrafts, clearDrafts as clearStorage, removeDrafts as removeDraftsFromStorage } from "../services/storage.ts";
import { assignDates } from "../utils/date-assign.ts";
import { validatePostsJson } from "../utils/schema-validate.ts";

interface ImportResult {
  count: number;
  startDate: string;
  endDate: string;
  categories: Record<string, number>;
}

interface PostsContextValue {
  drafts: Post[];
  scheduledPosts: Post[];
  failedPosts: Post[];
  isLoadingRepo: boolean;
  importPosts: (json: PostsImport, imageFiles?: Map<string, string>) => Promise<ImportResult>;
  updateDraft: (id: string, changes: Partial<Post>) => void;
  removeDrafts: (ids: string[]) => void;
  clearDrafts: () => void;
  refreshRepoPosts: () => Promise<void>;
  validateImportJson: (data: unknown) => { valid: boolean; errors: string[] };
}

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [drafts, setDrafts] = useState<Post[]>(() => loadDrafts());
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [failedPosts, setFailedPosts] = useState<Post[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);

  const refreshRepoPosts = useCallback(async () => {
    if (!token) return;
    setIsLoadingRepo(true);
    try {
      const [scheduled, failed] = await Promise.all([
        fetchScheduledPosts(token),
        fetchFailedPosts(token),
      ]);
      setScheduledPosts(scheduled);
      setFailedPosts(failed);
    } catch {
      // silently fail — user can retry
    } finally {
      setIsLoadingRepo(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshRepoPosts();
  }, [refreshRepoPosts]);

  const importPosts = useCallback(
    async (json: PostsImport, imageFiles?: Map<string, string>): Promise<ImportResult> => {
      const authToken = token ?? "";
      let scheduledDates: string[] = [];
      try {
        scheduledDates = await listScheduledDates(authToken);
      } catch {
        // if fetch fails, start from tomorrow
      }

      const dated = assignDates(json.posts, scheduledDates);

      // Attach image data from uploaded files
      if (imageFiles) {
        for (const post of dated) {
          const filename = post.media?.filePath?.split("/").pop();
          if (filename && imageFiles.has(filename)) {
            post.localImageData = imageFiles.get(filename)!;
          }
        }
      }

      clearStorage();
      saveDrafts(dated);
      setDrafts(dated);

      const categories: Record<string, number> = {};
      for (const p of dated) {
        categories[p.category] = (categories[p.category] ?? 0) + 1;
      }

      return {
        count: dated.length,
        startDate: dated[0]?.assignedDate ?? "",
        endDate: dated[dated.length - 1]?.assignedDate ?? "",
        categories,
      };
    },
    [token],
  );

  const updateDraft = useCallback((id: string, changes: Partial<Post>) => {
    setDrafts((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, ...changes } : p,
      );
      saveDrafts(updated);
      return updated;
    });
  }, []);

  const removeDraftsHandler = useCallback((ids: string[]) => {
    removeDraftsFromStorage(ids);
    setDrafts((prev) => {
      const idSet = new Set(ids);
      return prev.filter((p) => !idSet.has(p.id));
    });
  }, []);

  const clearDrafts = useCallback(() => {
    clearStorage();
    setDrafts([]);
  }, []);

  const validateImportJson = useCallback(
    (data: unknown) => validatePostsJson(data),
    [],
  );

  return (
    <PostsContext.Provider
      value={{
        drafts,
        scheduledPosts,
        failedPosts,
        isLoadingRepo,
        importPosts,
        updateDraft,
        removeDrafts: removeDraftsHandler,
        clearDrafts,
        refreshRepoPosts,
        validateImportJson,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
}
