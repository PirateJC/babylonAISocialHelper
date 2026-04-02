import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { PostData, PlatformResult } from "./utils/types.js";

/* ── CLI args ─────────────────────────────────────────────── */
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateArgIdx = args.indexOf("--date");
const dateOverride = dateArgIdx !== -1 ? args[dateArgIdx + 1] : undefined;

/* ── Repo root (two levels up from scripts/src/) ──────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

/* ── Pacific-timezone helpers ─────────────────────────────── */
function getPacificDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

function getPacificTime(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  return {
    hour: Number(parts.find((p) => p.type === "hour")!.value),
    minute: Number(parts.find((p) => p.type === "minute")!.value),
  };
}

/* ── Dry-run mock ─────────────────────────────────────────── */
function mockResult(platform: "x" | "linkedin" | "bluesky"): PlatformResult {
  return { platform, success: true, postId: `dry-run-${platform}`, retryCount: 0 };
}

/* ── History tracking ──────────────────────────────────────── */
interface HistoryEntry {
  id: string;
  date: string;
  topic: string;
  linkUrl: string;
  category: string;
  babylonFeatureArea: string;
  success: boolean;
}

function updateHistory(post: PostData, date: string, allSucceeded: boolean): void {
  const historyPath = path.join(repoRoot, "history.json");
  let history: HistoryEntry[] = [];

  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    } catch {
      history = [];
    }
  }

  // Add new entry
  history.push({
    id: post.id,
    date,
    topic: post.metadata.topic,
    linkUrl: post.link.url,
    category: post.category,
    babylonFeatureArea: post.metadata.babylonFeatureArea,
    success: allSucceeded,
  });

  // Prune entries older than 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  history = history.filter((entry) => entry.date >= cutoffStr);

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");
  console.log(`[Orchestrator] Updated history.json (${history.length} entries, 30-day window).`);
}

/* ── Main orchestrator ────────────────────────────────────── */
async function main(): Promise<void> {
  const date = dateOverride ?? getPacificDate();
  console.log(`[Orchestrator] Date: ${date} | Dry-run: ${dryRun}`);

  // DST self-gating: only allow 09:30–10:30 PT unless overridden
  if (!dryRun && !dateOverride) {
    const { hour, minute } = getPacificTime();
    const totalMinutes = hour * 60 + minute;
    const windowStart = 9 * 60 + 30; // 09:30
    const windowEnd = 10 * 60 + 30; // 10:30

    if (totalMinutes < windowStart || totalMinutes > windowEnd) {
      console.log(
        `[Orchestrator] Outside posting window (09:30–10:30 PT). ` +
          `Current: ${hour}:${String(minute).padStart(2, "0")}. Exiting.`,
      );
      process.exit(0);
    }
  }

  // Find scheduled post
  const scheduledPath = path.join(repoRoot, "scheduled", `${date}.json`);
  if (!fs.existsSync(scheduledPath)) {
    console.log(`[Orchestrator] No post scheduled for ${date}. Exiting.`);
    process.exit(0);
  }

  // Read and parse post
  const post: PostData = JSON.parse(fs.readFileSync(scheduledPath, "utf-8"));
  const imagePath = path.resolve(repoRoot, post.media.filePath);
  console.log(`[Orchestrator] Post: ${post.id} | Image: ${post.media.filePath}`);

  // Post to each platform sequentially (dynamic imports keep heavy deps out of dry-run)
  let xResult: PlatformResult;
  let liResult: PlatformResult;
  let bsResult: PlatformResult;

  if (dryRun) {
    xResult = mockResult("x");
    liResult = mockResult("linkedin");
    bsResult = mockResult("bluesky");
  } else {
    const { postToX } = await import("./post-to-x.js");
    const { postToLinkedIn } = await import("./post-to-linkedin.js");
    const { postToBluesky } = await import("./post-to-bluesky.js");

    xResult = await postToX(post, imagePath);
    liResult = await postToLinkedIn(post, imagePath);
    bsResult = await postToBluesky(post, imagePath);
  }

  // Aggregate — only count configured platforms
  const results = [xResult, liResult, bsResult];
  const configuredResults = results.filter(
    (r) => !r.error?.startsWith("Missing env vars:"),
  );
  const skippedPlatforms = results.filter(
    (r) => r.error?.startsWith("Missing env vars:"),
  );
  for (const r of skippedPlatforms) {
    console.log(`[Orchestrator] ⏭️  Skipping ${r.platform} (not configured)`);
  }
  const allSucceeded =
    configuredResults.length > 0 &&
    configuredResults.every((r) => r.success);
  const status = allSucceeded ? "all-succeeded" : "partial-failure";

  // Cleanup
  if (allSucceeded) {
    fs.unlinkSync(scheduledPath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    console.log(
      "[Orchestrator] ✅ All platforms succeeded. Cleaned up scheduled file and media.",
    );
  } else {
    // Stamp results onto post and move to failed/
    post.platformResults = {
      x: xResult,
      linkedin: liResult,
      bluesky: bsResult,
    };
    const failedPath = path.join(repoRoot, "failed", `${date}.json`);
    fs.writeFileSync(failedPath, JSON.stringify(post, null, 2));
    fs.unlinkSync(scheduledPath);
    console.log(
      `[Orchestrator] ⚠️ Some platforms failed. Moved to failed/${date}.json.`,
    );
  }

  // Record in rolling 30-day history
  updateHistory(post, date, allSucceeded);

  // Git commit & push (skip in dry-run)
  if (!dryRun) {
    try {
      execSync("git add -A", { cwd: repoRoot, stdio: "inherit" });
      execSync(`git commit -m "chore: post ${date} — ${status}"`, {
        cwd: repoRoot,
        stdio: "inherit",
      });
      execSync("git push", { cwd: repoRoot, stdio: "inherit" });
      console.log("[Orchestrator] Git commit and push complete.");
    } catch (err) {
      console.log(
        `[Orchestrator] Git operation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Summary
  console.log("\n=== Posting Summary ===");
  console.log(`Date:     ${date}`);
  console.log(`Post ID:  ${post.id}`);
  console.log(`Status:   ${status}`);
  console.log("─────────────────────────");
  for (const r of [xResult, liResult, bsResult]) {
    const icon = r.success ? "✅" : "❌";
    const detail = r.success ? `ID: ${r.postId}` : `Error: ${r.error}`;
    console.log(
      `  ${icon} ${r.platform.padEnd(10)} ${detail} (retries: ${r.retryCount})`,
    );
  }
  console.log("═══════════════════════════\n");
}

main().catch((err) => {
  console.error("[Orchestrator] Unexpected error:", err);
  process.exit(1);
});
