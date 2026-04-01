# Task 4.2: Content Generation Skill Testing

## Goal
Test the Phase 1 content generation skill by generating a small batch of posts, validating the output against all schema and content rules, and verifying the screenshots are captured correctly.

## Requirements addressed
REQ-SKILL-1, REQ-SKILL-2, REQ-SKILL-3, REQ-SKILL-4, REQ-SKILL-5, REQ-SKILL-6, REQ-SKILL-7, REQ-SKILL-8, REQ-SKILL-9, REQ-SKILL-10, REQ-SKILL-11, REQ-SKILL-12, REQ-SKILL-13, REQ-SKILL-14, REQ-SKILL-15

## Background
The Babylon.js Social Media Helper's Phase 1 skill (`skills/content-generation/SKILL.md`) instructs an AI agent to generate batches of social media posts for Babylon.js. The skill produces a `posts.json` file and screenshot PNGs in a `media/` directory.

This task verifies that the skill produces correct output by:
1. Invoking the skill to generate a small batch (7–10 posts).
2. Running the validation script (Task 1.3) against the output.
3. Manually inspecting screenshots for quality.
4. Verifying the skill's summary report.

This task depends on:
- Task 1.2 (schema finalization — the updated SKILL.md)
- Task 1.3 (validation tooling — the validate-posts script)

Note: The SKILL.md was updated in Task 1.2 to remove `fullText` and `characterCount` references. The skill must be tested with the corrected version.

## Files to modify/create

No new files. This task is a testing exercise using the content generation skill and validation tooling.

## Implementation details

### 1. Invoke the content generation skill

Use the Copilot CLI (or the relevant AI agent interface) to invoke the skill:
1. Ensure `skills/content-generation/SKILL.md` has been updated per Task 1.2 (no `fullText` or `characterCount`).
2. Start a new agent session with the content generation skill active.
3. When prompted for the number of posts, specify 7 (a manageable test batch: 3 feature, 1 community, 3 docs — matching the 40/20/40 split).
4. Let the agent execute: research content sources, plan the batch, write posts, capture screenshots.

### 2. Verify output structure

After the skill completes, check:
- `output/posts.json` exists and is valid JSON.
- `media/post-001.png` through `media/post-007.png` exist.
- The JSON file has the correct top-level structure: `generatedAt`, `generatedBy`, `totalPosts`, `config`, `posts[]`.

### 3. Run the validation script

From the repo root:
```bash
npm run validate -w scripts -- ../output/posts.json
```

Verify all checks pass:
- Schema validation ✅
- Content mix (3/1/3 ≈ 43%/14%/43% — within tolerance for 7 posts) ✅
- Emoji usage (~25%) ✅
- Hashtag rules (8 standard on every post, `#BuiltWithBabylon` only on community-demo) ✅
- Grapheme limits (all posts ≤ 300 graphemes for body + link) ✅
- De-duplication (no repeated topics in the 7-post window) ✅
- Category interleaving (no long runs of the same category) ✅
- No `fullText` or `characterCount` fields ✅
- All screenshots exist on disk ✅
- Post format distribution (mix of formats) ✅

### 4. Manually inspect screenshots

Open each screenshot PNG and verify:
- The image is visually inviting (shows 3D scenes, visual editors, or interactive demos).
- No screenshots of walls of text (REQ-SKILL-12).
- The image is at approximately 1280×720 resolution (check file properties).
- The image content matches the post's `media.sourceUrl` (the page it was captured from).
- No AI-generated images or stock photos.

### 5. Manually inspect post content

Review a few posts for voice and quality:
- Does the text match the Babylon.js voice? (Enthusiastic, short, punchy, community-centric)
- Are the links valid and relevant?
- Do the metadata fields make sense (topic, feature area, post format)?
- Is the text free of hallucinated features or incorrect information?

### 6. Verify the summary report

The skill should output a summary report (REQ-SKILL-15) that includes:
- Total posts generated
- Category breakdown
- Post format distribution
- Emoji usage rate
- Topics covered
- Any validation warnings

Verify the summary matches the validation script's output.

### 7. Test with the web app

As a final check, import the generated `posts.json` into the web app:
1. Start the web app locally.
2. Import the posts.json file.
3. Verify all posts import successfully and dates are assigned.
4. Browse a few posts in the detail view — verify images and text display correctly.

## Testing suggestions
- Generate 7 posts as described above.
- If the AI agent is not available, create the test data manually using the SKILL.md examples as templates. The key is to verify the validation tooling works against realistic data.
- Test the validation script with both valid and intentionally invalid data to confirm it catches issues.

## Gotchas
- **AI agent availability:** The content generation skill requires an AI agent (Copilot CLI) to execute. If the agent is not available, this task can be done with manually crafted test data.
- **Playwright screenshots:** The skill captures screenshots via Playwright. This requires Playwright to be installed (`npx playwright install chromium`). If running in an environment without a display (headless), ensure Playwright uses headless mode.
- **Content quality:** AI-generated content may contain inaccuracies or hallucinated features. Manual review is essential — the validation script checks structure, not factual accuracy.
- **Small batch rounding:** With only 7 posts, the 40/20/40 content mix and 25% emoji rate will have rounding effects. The validation script should accept ±1 post tolerance for small batches.
- **Network access:** The skill needs network access to crawl Babylon.js sources and navigate to pages for screenshots. Ensure the test environment has internet access.

## Verification checklist
- [ ] Content generation skill produces `output/posts.json` and `media/*.png` files
- [ ] Validation script passes all checks on the generated output
- [ ] No `fullText` or `characterCount` fields in the output
- [ ] All screenshots exist and are visually inviting (not text-heavy)
- [ ] Screenshots are approximately 1280×720 resolution
- [ ] Post text matches the Babylon.js voice
- [ ] Links are valid and point to real Babylon.js resources
- [ ] Content mix is approximately 40/20/40
- [ ] Emoji usage is approximately 25%
- [ ] Hashtag rules are correct (`#BuiltWithBabylon` only on community-demo)
- [ ] All posts fit within 300 graphemes (body + link)
- [ ] Summary report matches validation script output
- [ ] Posts import successfully into the web app
