import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Post {
  id: string;
  category: "feature-highlight" | "community-demo" | "docs-tutorial";
  text: string;
  hashtags: string[];
  conditionalHashtags: string[];
  link: { url: string; type: string; title: string };
  media: { type: string; sourceUrl: string; description: string; filePath: string };
  metadata: {
    topic: string;
    babylonFeatureArea: string;
    contentSource: string;
    usesEmoji: boolean;
    postFormat: string;
    dayIndex: number;
  };
  // deprecated fields that should NOT appear
  fullText?: unknown;
  characterCount?: unknown;
}

interface PostsFile {
  generatedAt: string;
  generatedBy: string;
  totalPosts: number;
  config: {
    daysRequested: number;
    contentMix: {
      featureHighlights: number;
      communityDemos: number;
      docsTutorials: number;
    };
    emojiRate: number;
    postingTime: string;
    platforms: string[];
  };
  posts: Post[];
}

interface CheckResult {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

function countGraphemes(text: string): number {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  let count = 0;
  for (const _ of segmenter.segment(text)) {
    void _;
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

function checkPostCount(data: PostsFile): CheckResult {
  const ok = data.totalPosts === data.posts.length;
  return {
    name: "Post count",
    status: ok ? "PASS" : "FAIL",
    detail: ok
      ? `totalPosts (${data.totalPosts}) matches posts.length (${data.posts.length})`
      : `totalPosts (${data.totalPosts}) ≠ posts.length (${data.posts.length})`,
  };
}

function checkContentMix(data: PostsFile): CheckResult {
  const total = data.posts.length;
  const counts = {
    "feature-highlight": 0,
    "community-demo": 0,
    "docs-tutorial": 0,
  };
  for (const p of data.posts) counts[p.category]++;

  const expectedFH = Math.round(total * 0.4);
  const expectedCD = Math.round(total * 0.2);
  const expectedDT = Math.round(total * 0.4);

  const fhOk = Math.abs(counts["feature-highlight"] - expectedFH) <= 1;
  const cdOk = Math.abs(counts["community-demo"] - expectedCD) <= 1;
  const dtOk = Math.abs(counts["docs-tutorial"] - expectedDT) <= 1;

  const ok = fhOk && cdOk && dtOk;
  const detail =
    `feature-highlight: ${counts["feature-highlight"]}/${expectedFH}, ` +
    `community-demo: ${counts["community-demo"]}/${expectedCD}, ` +
    `docs-tutorial: ${counts["docs-tutorial"]}/${expectedDT}`;

  return { name: "Content mix (~40/20/40)", status: ok ? "PASS" : "FAIL", detail };
}

function checkEmojiUsage(data: PostsFile): CheckResult {
  const total = data.posts.length;
  const emojiCount = data.posts.filter((p) => p.metadata.usesEmoji).length;
  const rate = total > 0 ? emojiCount / total : 0;
  const pct = (rate * 100).toFixed(1);
  const ok = rate >= 0.2 && rate <= 0.3;
  return {
    name: "Emoji usage (20-30%)",
    status: ok ? "PASS" : "FAIL",
    detail: `${emojiCount}/${total} posts use emoji (${pct}%)`,
  };
}

function checkHashtagRules(data: PostsFile): CheckResult {
  const errors: string[] = [];
  for (const p of data.posts) {
    if (p.hashtags.length < 8) {
      errors.push(`${p.id}: only ${p.hashtags.length} hashtags (need ≥8)`);
    }
    const hasBuiltWith = p.hashtags.includes("#BuiltWithBabylon");
    if (hasBuiltWith && p.category !== "community-demo") {
      errors.push(`${p.id}: #BuiltWithBabylon on non-community-demo post`);
    }
    if (!hasBuiltWith && p.category === "community-demo") {
      errors.push(`${p.id}: community-demo missing #BuiltWithBabylon`);
    }
  }
  return {
    name: "Hashtag rules",
    status: errors.length === 0 ? "PASS" : "FAIL",
    detail: errors.length === 0 ? "All posts pass hashtag checks" : errors.join("; "),
  };
}

function checkGraphemeLimit(data: PostsFile): CheckResult {
  const errors: string[] = [];
  for (const p of data.posts) {
    const combined = p.text + " " + p.link.url;
    const len = countGraphemes(combined);
    if (len > 300) {
      errors.push(`${p.id}: ${len} graphemes (limit 300)`);
    }
  }
  return {
    name: "Grapheme limit (≤300)",
    status: errors.length === 0 ? "PASS" : "FAIL",
    detail:
      errors.length === 0
        ? "All posts within 300 grapheme limit"
        : errors.join("; "),
  };
}

function checkDeduplication(data: PostsFile): CheckResult {
  const errors: string[] = [];

  // Sort posts by dayIndex for window check
  const sorted = [...data.posts].sort(
    (a, b) => a.metadata.dayIndex - b.metadata.dayIndex,
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const dayDiff = sorted[j].metadata.dayIndex - sorted[i].metadata.dayIndex;
      if (dayDiff > 30) break;
      if (sorted[i].metadata.topic === sorted[j].metadata.topic) {
        errors.push(
          `Duplicate topic "${sorted[i].metadata.topic}" in posts ${sorted[i].id} & ${sorted[j].id} (within 30-day window)`,
        );
      }
      if (sorted[i].link.url === sorted[j].link.url) {
        errors.push(
          `Duplicate link.url "${sorted[i].link.url}" in posts ${sorted[i].id} & ${sorted[j].id} (within 30-day window)`,
        );
      }
    }
  }

  return {
    name: "De-duplication (30-day window)",
    status: errors.length === 0 ? "PASS" : "FAIL",
    detail:
      errors.length === 0
        ? "No duplicate topics or URLs within any 30-day window"
        : errors.join("; "),
  };
}

function checkCategoryInterleaving(data: PostsFile): CheckResult {
  const warnings: string[] = [];
  let runLen = 1;
  for (let i = 1; i < data.posts.length; i++) {
    if (data.posts[i].category === data.posts[i - 1].category) {
      runLen++;
      if (runLen > 3) {
        warnings.push(
          `Posts ${data.posts[i - 3]?.id ?? "?"}..${data.posts[i].id}: ${runLen}+ consecutive ${data.posts[i].category}`,
        );
      }
    } else {
      runLen = 1;
    }
  }
  return {
    name: "Category interleaving",
    status: warnings.length === 0 ? "PASS" : "WARN",
    detail:
      warnings.length === 0
        ? "No more than 3 consecutive same-category posts"
        : warnings.join("; "),
  };
}

function checkNoDeprecatedFields(data: PostsFile): CheckResult {
  const errors: string[] = [];
  for (const p of data.posts) {
    if ("fullText" in p) errors.push(`${p.id}: has deprecated field "fullText"`);
    if ("characterCount" in p)
      errors.push(`${p.id}: has deprecated field "characterCount"`);
  }
  return {
    name: "No deprecated fields",
    status: errors.length === 0 ? "PASS" : "FAIL",
    detail:
      errors.length === 0
        ? "No deprecated fields found"
        : errors.join("; "),
  };
}

function checkScreenshotExistence(data: PostsFile, basePath: string): CheckResult {
  const warnings: string[] = [];
  for (const p of data.posts) {
    const fullPath = resolve(basePath, p.media.filePath);
    if (!existsSync(fullPath)) {
      warnings.push(`${p.id}: missing ${p.media.filePath}`);
    }
  }
  return {
    name: "Screenshot existence",
    status: warnings.length === 0 ? "PASS" : "WARN",
    detail:
      warnings.length === 0
        ? "All media files exist"
        : `${warnings.length} missing: ${warnings.join("; ")}`,
  };
}

function checkFormatDistribution(data: PostsFile): CheckResult {
  const formatCounts = new Map<string, number>();
  const knownFormats = [
    "feature-statement",
    "question",
    "check-out",
    "demo-showcase",
    "community-pride",
    "call-to-action",
  ];
  for (const f of knownFormats) formatCounts.set(f, 0);

  for (const p of data.posts) {
    formatCounts.set(
      p.metadata.postFormat,
      (formatCounts.get(p.metadata.postFormat) ?? 0) + 1,
    );
  }

  const zeroFormats = knownFormats.filter((f) => formatCounts.get(f) === 0);
  const parts = [...formatCounts.entries()].map(([f, c]) => `${f}: ${c}`);

  return {
    name: "Post format distribution",
    status: zeroFormats.length === 0 ? "PASS" : "WARN",
    detail:
      parts.join(", ") +
      (zeroFormats.length > 0
        ? ` — missing formats: ${zeroFormats.join(", ")}`
        : ""),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const inputArg = process.argv[2];
  const inputPath = resolve(
    inputArg ?? resolve(__dirname, "..", "..", "output", "posts.json"),
  );
  const schemaPath = resolve(__dirname, "..", "..", "schemas", "posts.schema.json");

  console.log(`\n📄 Validating: ${inputPath}`);
  console.log(`📐 Schema:     ${schemaPath}\n`);

  // Load files
  if (!existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }
  if (!existsSync(schemaPath)) {
    console.error(`❌ Schema not found: ${schemaPath}`);
    process.exit(1);
  }

  const rawData: unknown = JSON.parse(readFileSync(inputPath, "utf-8"));
  const schema: unknown = JSON.parse(readFileSync(schemaPath, "utf-8"));

  // JSON Schema validation
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema as Record<string, unknown>);
  const schemaValid = validate(rawData);

  const results: CheckResult[] = [];

  if (!schemaValid) {
    const errMessages = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "/"}: ${e.message}`)
      .join("; ");
    results.push({
      name: "JSON Schema",
      status: "FAIL",
      detail: errMessages,
    });
  } else {
    results.push({
      name: "JSON Schema",
      status: "PASS",
      detail: "Valid against posts.schema.json",
    });
  }

  const data = rawData as PostsFile;

  // Determine base path for relative file checks (relative to the posts.json location)
  const basePath = dirname(inputPath);

  // Run all content checks
  results.push(checkPostCount(data));
  results.push(checkContentMix(data));
  results.push(checkEmojiUsage(data));
  results.push(checkHashtagRules(data));
  results.push(checkGraphemeLimit(data));
  results.push(checkDeduplication(data));
  results.push(checkCategoryInterleaving(data));
  results.push(checkNoDeprecatedFields(data));
  results.push(checkScreenshotExistence(data, basePath));
  results.push(checkFormatDistribution(data));

  // Print report
  console.log("═".repeat(60));
  console.log("  VALIDATION REPORT");
  console.log("═".repeat(60));

  for (const r of results) {
    const icon =
      r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} [${r.status}] ${r.name}`);
    console.log(`   ${r.detail}`);
  }

  console.log("═".repeat(60));

  const fails = results.filter((r) => r.status === "FAIL").length;
  const warns = results.filter((r) => r.status === "WARN").length;
  const passes = results.filter((r) => r.status === "PASS").length;

  console.log(`\n  ${passes} passed, ${warns} warnings, ${fails} failed\n`);

  if (fails > 0) {
    process.exit(1);
  }
}

main();
