import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePosts } from "../context/PostsContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import type { Post } from "../types/post.ts";
import StatusBadge from "./StatusBadge.tsx";
import CategoryBadge from "./CategoryBadge.tsx";
import PostPreview from "./PostPreview.tsx";
import PostEditor from "./PostEditor.tsx";
import ConfirmModal from "./ConfirmModal.tsx";
import PlatformResults from "./PlatformResults.tsx";
import { approveSinglePost, deleteScheduledPost, deleteFailedPost, retryFailedPost } from "../services/approve.ts";

/* ── styles ─────────────────────────────────────────────── */

const wrapper: React.CSSProperties = {
  padding: "24px 32px",
  fontFamily: "system-ui, sans-serif",
  maxWidth: 1280,
  margin: "0 auto",
};

const twoCol: React.CSSProperties = {
  display: "flex",
  gap: 32,
  alignItems: "flex-start",
};

const leftCol: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const rightCol: React.CSSProperties = {
  width: 480,
  flexShrink: 0,
  position: "sticky",
  top: 24,
};

const breadcrumb: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const section: React.CSSProperties = {
  marginBottom: 24,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 12,
  background: "#f3f4f6",
  color: "#374151",
  marginRight: 6,
  marginBottom: 4,
};

const metaPill: React.CSSProperties = {
  ...pill,
  background: "#eff6ff",
  color: "#1e40af",
};

const actionBar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
};

const btn: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 280,
  objectFit: "cover",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};

/* ── read-only view for scheduled/failed ─────────────────── */

function ReadOnlyFields({ post }: { post: Post }) {
  return (
    <>
      {/* Text */}
      <div style={section}>
        <div style={sectionLabel}>Post Text</div>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
          {post.text}
        </p>
      </div>

      {/* Link */}
      <div style={section}>
        <div style={sectionLabel}>Link</div>
        <a
          href={post.link?.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", fontSize: 14, wordBreak: "break-all" }}
        >
          {post.link?.url}
        </a>
        <span style={{ ...pill, marginLeft: 8 }}>{post.link?.type}</span>
      </div>

      {/* Image */}
      <div style={section}>
        <div style={sectionLabel}>Screenshot</div>
        {post.localImageData ? (
          <img src={post.localImageData} alt="Screenshot" style={imgStyle} />
        ) : (
          <div
            style={{
              width: "100%",
              height: 160,
              background: "#f3f4f6",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 14,
            }}
          >
            📷 No screenshot available
          </div>
        )}
      </div>

      {/* Date */}
      <div style={section}>
        <div style={sectionLabel}>Scheduled Date</div>
        <span style={{ fontSize: 14 }}>{post.assignedDate}</span>
      </div>

      {/* Hashtags */}
      <div style={section}>
        <div style={sectionLabel}>Hashtags</div>
        <div>
          {post.hashtags.map((h) => (
            <span key={h} style={pill}>
              {h.startsWith("#") ? h : `#${h}`}
            </span>
          ))}
        </div>
        {post.conditionalHashtags.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Conditional: </span>
            {post.conditionalHashtags.map((h) => (
              <span key={h} style={{ ...pill, background: "#fef3c7" }}>
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>
          Hashtags are auto-appended on X &amp; LinkedIn and skipped on Bluesky.
        </p>
      </div>

      {/* Metadata */}
      <div style={section}>
        <div style={sectionLabel}>Metadata</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <span style={metaPill}>Topic: {post.metadata.topic}</span>
          <span style={metaPill}>Area: {post.metadata.babylonFeatureArea}</span>
          <span style={metaPill}>Format: {post.metadata.postFormat}</span>
          <span style={metaPill}>Emoji: {post.metadata.usesEmoji ? "Yes" : "No"}</span>
          <span style={metaPill}>Day: {post.metadata.dayIndex}</span>
        </div>
      </div>

      {/* Platform results (failed posts) */}
      {post.status === "failed" && post.platformResults && post.platformResults.length > 0 && (
        <div style={section}>
          <div style={sectionLabel}>Platform Results</div>
          <PlatformResults results={post.platformResults} />
        </div>
      )}
    </>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { drafts, scheduledPosts, failedPosts, updateDraft, removeDrafts, refreshRepoPosts } =
    usePosts();

  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(
    null,
  );

  const post = useMemo(() => {
    const all = [...drafts, ...scheduledPosts, ...failedPosts];
    return all.find((p) => p.id === id) ?? null;
  }, [id, drafts, scheduledPosts, failedPosts]);

  /* ── live post for preview (reflects editor changes) ───── */
  const [livePost, setLivePost] = useState<Post | null>(null);
  const previewPost = livePost ?? post;

  const handleSave = useCallback(
    (updated: Post) => {
      updateDraft(updated.id, updated);
      setLivePost(updated);
      setFeedback({ type: "success", msg: "Changes saved." });
    },
    [updateDraft],
  );

  const handleCancel = useCallback(() => {
    setLivePost(null);
  }, []);

  /* ── approve ───────────────────────────────────────────── */

  const handleApprove = useCallback(async () => {
    if (!token || !post) return;
    setIsApproving(true);
    setFeedback(null);
    try {
      await approveSinglePost(token, livePost ?? post);
      removeDrafts([post.id]);
      await refreshRepoPosts();
      setFeedback({ type: "success", msg: "Post approved and scheduled!" });
      setTimeout(() => navigate("/posts"), 1200);
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Approval failed",
      });
    } finally {
      setIsApproving(false);
    }
  }, [token, post, livePost, removeDrafts, refreshRepoPosts, navigate]);

  /* ── retry ──────────────────────────────────────────────── */

  const handleRetry = useCallback(async () => {
    if (!token || !post) return;
    setIsRetrying(true);
    setFeedback(null);
    try {
      const newDate = await retryFailedPost(token, post);
      await refreshRepoPosts();
      setFeedback({ type: "success", msg: `Post rescheduled for ${newDate}.` });
      setTimeout(() => navigate("/posts"), 1200);
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Retry failed",
      });
    } finally {
      setIsRetrying(false);
    }
  }, [token, post, refreshRepoPosts, navigate]);

  /* ── delete ────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    if (!token || !post) return;
    setShowDeleteModal(false);
    setIsDeleting(true);
    setFeedback(null);
    try {
      if (post.status === "draft") {
        removeDrafts([post.id]);
      } else if (post.status === "scheduled") {
        await deleteScheduledPost(token, post);
        await refreshRepoPosts();
      } else if (post.status === "failed") {
        await deleteFailedPost(token, post);
        await refreshRepoPosts();
      }
      setFeedback({ type: "success", msg: "Post deleted." });
      setTimeout(() => navigate("/posts"), 800);
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [token, post, removeDrafts, refreshRepoPosts, navigate]);

  /* ── not found ─────────────────────────────────────────── */

  if (!post) {
    return (
      <div style={wrapper}>
        <a
          href="#/posts"
          style={{ color: "#2563eb", fontSize: 14, textDecoration: "none" }}
        >
          ← Back to Posts
        </a>
        <p style={{ color: "#666", marginTop: 16 }}>
          Post <strong>{id}</strong> not found.
        </p>
      </div>
    );
  }

  /* ── render ────────────────────────────────────────────── */

  const hasRepoPosts =
    post.status === "scheduled" || post.status === "failed";

  return (
    <div style={wrapper}>
      {/* Breadcrumb */}
      <div style={breadcrumb}>
        <a
          href="#/posts"
          style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
        >
          Posts
        </a>
        <span>›</span>
        <span style={{ color: "#111827", fontWeight: 600 }}>{post.id}</span>
        <CategoryBadge category={post.category} />
        <StatusBadge status={post.status} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 600,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Two-column layout */}
      <div style={twoCol}>
        {/* Left column — content */}
        <div style={leftCol}>
          {post.status === "draft" ? (
            <PostEditor
              post={livePost ?? post}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <ReadOnlyFields post={post} />
          )}

          {/* Action buttons */}
          <div style={actionBar}>
            {post.status === "draft" && (
              <button
                style={{
                  ...btn,
                  background: isApproving ? "#93c5fd" : "#2563eb",
                  color: "#fff",
                }}
                onClick={handleApprove}
                disabled={isApproving || isDeleting}
              >
                {isApproving ? "Approving…" : "✓ Approve"}
              </button>
            )}

            {post.status === "failed" && (
              <button
                style={{
                  ...btn,
                  background: isRetrying ? "#fcd34d" : "#f59e0b",
                  color: "#fff",
                }}
                onClick={handleRetry}
                disabled={isRetrying || isDeleting}
              >
                {isRetrying ? "Retrying…" : "🔄 Retry"}
              </button>
            )}

            <button
              style={{
                ...btn,
                background: isDeleting ? "#fca5a5" : "#dc2626",
                color: "#fff",
              }}
              onClick={() => setShowDeleteModal(true)}
              disabled={isApproving || isDeleting || isRetrying}
            >
              {isDeleting ? "Deleting…" : "🗑 Delete"}
            </button>
          </div>
        </div>

        {/* Right column — preview */}
        <div style={rightCol}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Preview
          </div>
          {previewPost && <PostPreview post={previewPost} />}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete this post?"
        message={
          hasRepoPosts
            ? "This will remove the post from the repository. This action cannot be undone."
            : "This will remove the draft from your browser. This action cannot be undone."
        }
        warning={hasRepoPosts ? "The scheduled/failed file and screenshot will be deleted from the repo." : undefined}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
