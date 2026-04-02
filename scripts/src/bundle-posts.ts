import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const postsPath = path.resolve(repoRoot, "output", "posts.json");
const outputZip = path.resolve(repoRoot, "output", "social-posts.zip");

function main(): void {
  if (!fs.existsSync(postsPath)) {
    console.error(`❌ No posts.json found at ${postsPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(postsPath, "utf-8")) as {
    posts: { id: string; media: { filePath: string } }[];
  };

  // Collect referenced images
  const images: { absPath: string; zipPath: string }[] = [];
  const missing: string[] = [];

  for (const post of data.posts) {
    const absPath = path.resolve(repoRoot, post.media.filePath);
    if (fs.existsSync(absPath)) {
      images.push({ absPath, zipPath: post.media.filePath });
    } else {
      missing.push(`${post.id}: ${post.media.filePath}`);
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Missing ${missing.length} image(s):`);
    for (const m of missing) console.warn(`   ${m}`);
  }

  // Create ZIP
  const output = fs.createWriteStream(outputZip);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Created ${outputZip}`);
    console.log(`   ${data.posts.length} posts, ${images.length} images, ${sizeMb} MB`);
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add posts.json at the root of the ZIP
  archive.file(postsPath, { name: "posts.json" });

  // Add images preserving their relative paths (media/post-001.png)
  for (const img of images) {
    archive.file(img.absPath, { name: img.zipPath });
  }

  void archive.finalize();
}

main();
