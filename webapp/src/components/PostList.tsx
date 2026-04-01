import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePosts } from "../context/PostsContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import type { Post } from "../types/post.ts";
import StatusBadge from "./StatusBadge.tsx";
import CategoryBadge from "./CategoryBadge.tsx";
import ConfirmModal from "./ConfirmModal.tsx";
import { batchApprove, deleteScheduledPost, deleteFailedPost } from "../services/approve.ts";
import { countPostGraphemes } from "../utils/grapheme-count.ts";

/* ── styles ─────────────────────────────────────────────── */

const wrapper: React.CSSProperties = {
  padding: "24px 32px",
  fontFamily: "system-ui, sans-serif",
};

const filterBar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 16,
};

const select: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
};

const dateInput: React.CSSProperties = {
  ...select,
  width: 140,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "2px solid #e5e7eb",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 14,
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "middle",
};

const actionBtn: React.CSSProperties = {
  padding: "4px 12px",
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  cursor: "pointer",
  background: "#fff",
};

const batchBar: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 24px",
  background: "#1e293b",
  color: "#fff",
  borderRadius: "12px 12px 0 0",
  fontSize: 14,
};

const batchBtn: React.CSSProperties = {
  padding: "6px 16px",
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

/* ── helpers ────────────────────────────────────────────── */

function formatDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(y, m - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const EMOJI_MAP: Record<string, string> = {
  "feature-highlight": "⚡",
  "community-demo": "🎨",
  "docs-tutorial": "📚",
};

/* ── component ──────────────────────────────────────────── */

export default function PostList() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { drafts, scheduledPosts, failedPosts, isLoadingRepo, removeDrafts, refreshRepoPosts } = usePosts();

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── batch operation state ──────────────────────────────── */
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchLabel, setBatchLabel] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const allPosts: Post[] = useMemo(() => {
    const merged = [...drafts, ...scheduledPosts, ...failedPosts];
    merged.sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));
    return merged;
  }, [drafts, scheduledPosts, failedPosts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (dateStart && p.assignedDate < dateStart) return false;
      if (dateEnd && p.assignedDate > dateEnd) return false;
      return true;
    });
  }, [allPosts, statusFilter, categoryFilter, dateStart, dateEnd]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allVisible = filteredPosts.map((p) => p.id);
      const allSelected = allVisible.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allVisible);
    });
  }, [filteredPosts]);

  const allSelected =
    filteredPosts.length > 0 &&
    filteredPosts.every((p) => selectedIds.has(p.id));

  const handleAction = useCallback(
    (e: React.MouseEvent, post: Post) => {
      e.stopPropagation();
      navigate(`/posts/${post.id}`);
    },
    [navigate],
  );

  const actionLabel = (status: string) => {
    if (status === "draft") return "Edit";
    if (status === "scheduled") return "View";
    return "View";
  };

  /* ── selected posts helper ────────────────────────────── */

  const selectedPosts = useMemo(() => {
    const all = [...drafts, ...scheduledPosts, ...failedPosts];
    return all.filter((p) => selectedIds.has(p.id));
  }, [drafts, scheduledPosts, failedPosts, selectedIds]);

  /* ── batch approve ────────────────────────────────────── */

  const handleBatchApprove = useCallback(async () => {
    if (!token) return;

    const draftPosts = selectedPosts.filter((p) => p.status === "draft");
    if (draftPosts.length === 0) {
      setBatchError("No draft posts selected.");
      return;
    }
    if (draftPosts.length > 15) {
      setBatchError(`Please select 15 or fewer posts. You have ${draftPosts.length} selected.`);
      return;
    }

    // Pre-validate grapheme counts
    const overLimit = draftPosts.filter(
      (p) => countPostGraphemes(p.text, p.link?.url ?? "") > 300,
    );
    if (overLimit.length > 0) {
      setBatchError(
        `${overLimit.length} post(s) exceed 300 graphemes: ${overLimit.map((p) => p.id).join(", ")}. Fix before approving.`,
      );
      return;
    }

    setBatchRunning(true);
    setBatchLabel("Approving");
    setBatchError(null);

    const result = await batchApprove(token, draftPosts, (current, total) => {
      setBatchProgress({ current, total });
    });

    if (result.completedCount > 0) {
      const approvedIds = draftPosts.slice(0, result.completedCount).map((p) => p.id);
      removeDrafts(approvedIds);
      await refreshRepoPosts();
    }

    setBatchRunning(false);
    setBatchProgress(null);
    setSelectedIds(new Set());

    if (result.error) {
      setBatchError(
        `Batch stopped at ${result.failedPostId} (${result.completedCount}/${draftPosts.length}). ${result.error}`,
      );
    }
  }, [token, selectedPosts, removeDrafts, refreshRepoPosts]);

  /* ── batch delete ─────────────────────────────────────── */

  const handleBatchDelete = useCallback(async () => {
    if (!token) return;
    setShowDeleteModal(false);
    setBatchRunning(true);
    setBatchLabel("Deleting");
    setBatchError(null);

    const posts = selectedPosts;
    for (let i = 0; i < posts.length; i++) {
      setBatchProgress({ current: i + 1, total: posts.length });
      try {
        const p = posts[i];
        if (p.status === "draft") {
          removeDrafts([p.id]);
        } else if (p.status === "scheduled") {
          await deleteScheduledPost(token, p);
        } else if (p.status === "failed") {
          await deleteFailedPost(token, p);
        }
      } catch (err) {
        setBatchError(
          `Delete failed at post ${posts[i].id} (${i + 1}/${posts.length}): ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        break;
      }
    }

    await refreshRepoPosts();
    setBatchRunning(false);
    setBatchProgress(null);
    setSelectedIds(new Set());
  }, [token, selectedPosts, removeDrafts, refreshRepoPosts]);

  /* ── empty state ──────────────────────────────────────── */

  if (!isLoadingRepo && allPosts.length === 0) {
    return (
      <div style={wrapper}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Posts</h1>
        <p style={{ color: "#666", marginTop: 8 }}>
          No posts loaded yet.{" "}
          <a href="#/import" style={{ color: "#2563eb" }}>
            Import a JSON file
          </a>{" "}
          to get started.
        </p>
      </div>
    );
  }

  /* ── main view ────────────────────────────────────────── */

  return (
    <div style={wrapper}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Posts</h1>
        <span style={{ fontSize: 14, color: "#6b7280" }}>
          {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── filter bar ──────────────────────────────────── */}
      <div style={filterBar}>
        <select
          style={select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>

        <select
          style={select}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="feature-highlight">Feature</option>
          <option value="community-demo">Community</option>
          <option value="docs-tutorial">Docs</option>
        </select>

        <input
          type="date"
          style={dateInput}
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          placeholder="Start date"
        />
        <span style={{ color: "#9ca3af" }}>→</span>
        <input
          type="date"
          style={dateInput}
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          placeholder="End date"
        />
      </div>

      {isLoadingRepo && (
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          Loading posts from repository…
        </p>
      )}

      {/* ── table ───────────────────────────────────────── */}
      <table style={table}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 36 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
            </th>
            <th style={{ ...thStyle, width: 36 }}></th>
            <th style={thStyle}>Date</th>
            <th style={{ ...thStyle, width: "45%" }}>Content</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {filteredPosts.map((post) => (
            <tr
              key={post.id}
              style={{
                cursor: "pointer",
                background:
                  post.status === "failed"
                    ? "#fef2f2"
                    : selectedIds.has(post.id)
                      ? "#f0f9ff"
                      : "transparent",
                transition: "background 0.1s",
              }}
              onClick={() => navigate(`/posts/${post.id}`)}
              onMouseEnter={(e) => {
                if (post.status !== "failed" && !selectedIds.has(post.id))
                  e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (post.status === "failed") {
                  e.currentTarget.style.background = "#fef2f2";
                } else if (selectedIds.has(post.id)) {
                  e.currentTarget.style.background = "#f0f9ff";
                } else {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(post.id)}
                  onChange={() => toggleSelect(post.id)}
                />
              </td>
              <td style={{ ...tdStyle, fontSize: 20 }}>
                {EMOJI_MAP[post.category] ?? "📝"}
              </td>
              <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#374151" }}>
                {formatDate(post.assignedDate)}
              </td>
              <td style={{ ...tdStyle, color: "#111827" }}>
                {truncate(post.text, 80)}
              </td>
              <td style={tdStyle}>
                <CategoryBadge category={post.category} />
              </td>
              <td style={tdStyle}>
                <StatusBadge status={post.status} />
              </td>
              <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                <button
                  style={actionBtn}
                  onClick={(e) => handleAction(e, post)}
                >
                  {actionLabel(post.status)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── batch bar ───────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={batchBar}>
          <span style={{ fontWeight: 600 }}>
            {selectedIds.size} post{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            style={{ ...batchBtn, background: "#2563eb", color: "#fff" }}
            onClick={handleBatchApprove}
            disabled={batchRunning}
          >
            Approve Selected
          </button>
          <button
            style={{ ...batchBtn, background: "#dc2626", color: "#fff" }}
            onClick={() => setShowDeleteModal(true)}
            disabled={batchRunning}
          >
            Delete Selected
          </button>
          <button
            style={{
              ...batchBtn,
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
            onClick={() => setSelectedIds(new Set())}
            disabled={batchRunning}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* ── batch error ─────────────────────────────────── */}
      {batchError && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            margin: "12px 0",
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {batchError}
          <button
            style={{
              marginLeft: 12,
              background: "none",
              border: "none",
              color: "#991b1b",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: 13,
            }}
            onClick={() => setBatchError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── batch progress overlay ──────────────────────── */}
      {batchRunning && batchProgress && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 40px",
              textAlign: "center",
              minWidth: 300,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              {batchLabel}…
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              {batchLabel} {batchProgress.current} of {batchProgress.total}…
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "#e5e7eb",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                  height: "100%",
                  background: "#2563eb",
                  borderRadius: 4,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── delete confirmation modal ──────────────────── */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={`Delete ${selectedPosts.length} post${selectedPosts.length !== 1 ? "s" : ""}?`}
        message={
          selectedPosts.some((p) => p.status !== "draft")
            ? `This will remove ${selectedPosts.filter((p) => p.status !== "draft").length} post(s) from the repository and ${selectedPosts.filter((p) => p.status === "draft").length} draft(s) from your browser. This action cannot be undone.`
            : "This will remove the selected drafts from your browser. This action cannot be undone."
        }
        warning={
          selectedPosts.some((p) => p.status !== "draft")
            ? "Scheduled and failed posts will also be removed from the repository."
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
