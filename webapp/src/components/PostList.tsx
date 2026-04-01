import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePosts } from "../context/PostsContext.tsx";
import type { Post } from "../types/post.ts";
import StatusBadge from "./StatusBadge.tsx";
import CategoryBadge from "./CategoryBadge.tsx";

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
  const { drafts, scheduledPosts, failedPosts, isLoadingRepo } = usePosts();

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      if (post.status === "draft") {
        alert("Approve functionality coming in Task 3.8");
      } else if (post.status === "scheduled") {
        navigate(`/posts/${post.id}`);
      } else {
        alert("Retry functionality coming in Task 3.12");
      }
    },
    [navigate],
  );

  const actionLabel = (status: string) => {
    if (status === "draft") return "Approve";
    if (status === "scheduled") return "View";
    return "Retry";
  };

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
            onClick={() => alert("Approve Selected — coming in Task 3.9")}
          >
            Approve Selected
          </button>
          <button
            style={{ ...batchBtn, background: "#dc2626", color: "#fff" }}
            onClick={() => alert("Delete Selected — coming in Task 3.10")}
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
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}
