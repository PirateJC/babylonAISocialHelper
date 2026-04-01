# Task 1.3: Skill Validation Tooling

## Goal
Create a standalone Node.js/TypeScript validation script that checks a generated `posts.json` file against the JSON schema and all content rules defined in the requirements. This script is used after Phase 1 content generation to verify output correctness before importing into the web app.

## Requirements addressed
REQ-SCHEMA-1, REQ-SKILL-2, REQ-SKILL-3, REQ-SKILL-5, REQ-SKILL-7, REQ-SKILL-8, REQ-SKILL-9, REQ-SKILL-14, REQ-SKILL-15

## Background
The Babylon.js Social Media Helper's Phase 1 skill generates batches of social media posts as a JSON file plus screenshot PNGs. Before this output is imported into the Phase 2 review web app, it needs to be validated against both the JSON schema and the business rules (content mix percentages, de-duplication, grapheme limits, emoji rates, etc.).

This task creates a validation script at `scripts/validate-posts.ts` that can be run from the command line. It reads a `posts.json` file, validates it against `schemas/posts.schema.json`, and then runs all content rule checks. It outputs a report to stdout.

This task depends on Task 1.1 (repo scaffolding — for the scripts/ directory and TypeScript config) and Task 1.2 (schema finalization — for the corrected schema file).

The repository structure at this point:
```
babylonAISocialHelper/
├── schemas/posts.schema.json        # Corrected schema (from Task 1.2)
├── scripts/
│   ├── package.json                 # Has TypeScript, tsx as dev deps (from Task 1.1)
│   ├── tsconfig.json                # TypeScript config (from Task 1.1)
│   └── (no posting scripts yet)
└── ...
```

## Files to modify/create

- `scripts/validate-posts.ts` — Main validation script
- `scripts/package.json` — Add `ajv` dependency and a `"validate"` script entry

## Implementation details

### 1. Add dependency

Add `ajv` and `ajv-formats` as dependencies in `scripts/package.json`. These are used for JSON Schema draft-07 validation with format keywords (like `date-time` and `uri`).

### 2. Create `scripts/validate-posts.ts`

The script should:

**a) Accept a file path argument:**
Read the first CLI argument as the path to the posts.json file. If no argument is provided, default to `../output/posts.json` (the standard output location for the Phase 1 skill). Print usage instructions if the file does not exist.

**b) Load and parse the JSON file:**
Read the file, parse it as JSON. If parsing fails, print a clear error and exit with code 1.

**c) Validate against the JSON schema:**
Load `../schemas/posts.schema.json`. Use `ajv` with `ajv-formats` to compile the schema and validate the parsed JSON. If schema validation fails, print all validation errors (with JSON paths) and exit with code 1.

**d) Run content rule checks:**
After schema validation passes, run these additional checks on the posts array:

1. **Post count check:** Verify `totalPosts` matches the actual length of the `posts` array.

2. **Content mix check (REQ-SKILL-3):** Calculate the percentage of posts in each category (`feature-highlight`, `community-demo`, `docs-tutorial`). Verify the split is approximately 40/20/40 (±1 post for rounding). Report the actual counts and percentages.

3. **Emoji usage check (REQ-SKILL-5):** Count posts where `metadata.usesEmoji` is true. Verify the rate is approximately 25% (between 20% and 30% is acceptable). Report the actual count and percentage.

4. **Hashtag rules check (REQ-SKILL-7):** For every post, verify the `hashtags` array contains at least 8 items. For `community-demo` posts, verify `conditionalHashtags` includes `#BuiltWithBabylon`. For non-community-demo posts, verify `conditionalHashtags` does NOT include `#BuiltWithBabylon`.

5. **Grapheme limit check (REQ-SKILL-8):** For every post, count the graphemes of `text` + " " + `link.url` using `Intl.Segmenter`. Verify the count does not exceed 300. Report any posts that exceed the limit with their ID and grapheme count.

6. **De-duplication check (REQ-SKILL-9):** Slide a 30-day window across the posts (using `metadata.dayIndex` for ordering). Within each window, verify no `metadata.topic` appears more than once and no `link.url` appears more than once. Report any violations.

7. **Category interleaving check (REQ-SKILL-14):** Scan the ordered posts for consecutive runs of the same category. Flag any run longer than 3 posts of the same category as a warning (not an error — strict interleaving may not always be possible).

8. **No deprecated fields check (REQ-SCHEMA-8):** Verify no post contains a `fullText` field or a `characterCount` field.

9. **Screenshot file existence check (REQ-SKILL-11, partial):** For every post, check if the file at `media.filePath` exists on disk (relative to the repo root). Report any missing screenshot files as warnings.

10. **Post format distribution check (REQ-SKILL-6):** Count posts by `metadata.postFormat`. Report the distribution. Flag a warning if any format has 0 posts.

**e) Output a summary report:**
Print a structured report to stdout:
```
=== Schema Validation ===
✅ Passed (N posts validated)

=== Content Mix ===
Feature Highlights: 36 (40.0%) — target 40%
Community Demos:    18 (20.0%) — target 20%
Docs & Tutorials:   36 (40.0%) — target 40%
✅ Passed

=== Emoji Usage ===
Posts with emoji: 23 (25.6%) — target ~25%
✅ Passed

... (etc for each check)

=== Summary ===
Checks passed: 8/10
Warnings: 2
Errors: 0
```

**f) Exit codes:**
- Exit 0 if all checks pass (warnings are OK).
- Exit 1 if any check fails (errors).

### 3. Add npm script

In `scripts/package.json`, add:
```
"validate": "tsx validate-posts.ts"
```

This allows running `npm run validate -w scripts -- path/to/posts.json` from the repo root.

## Testing suggestions
- Create a minimal valid `posts.json` with 10 posts (4 feature, 2 community, 4 docs) that passes all checks. Run the script and verify it reports all checks passed.
- Create an invalid JSON file (malformed JSON) and verify the script reports a parse error.
- Create a JSON file that violates the schema (e.g., missing `id` field) and verify schema validation errors are reported.
- Create a JSON file where one post exceeds 300 graphemes (body + link) and verify the grapheme check fails.
- Create a JSON file with duplicate topics within a 30-day window and verify the de-dup check flags them.
- Create a JSON file with a non-community-demo post that has `#BuiltWithBabylon` in `conditionalHashtags` and verify it's flagged.

## Gotchas
- `Intl.Segmenter` requires Node.js 16+ (available from Node.js 16.0.0 as a global, fully stable from 18+). The project targets Node.js 18+.
- The grapheme count for the 300-limit includes body text AND the link URL but NOT hashtags. Make sure to concatenate `post.text + " " + post.link.url` before counting (the space represents the separator that would appear in the actual post).
- The de-duplication check uses `metadata.dayIndex` for ordering, not dates (since dates are assigned by the web app, not the skill). Within a 30-day window means dayIndex N through N+29.
- `ajv-formats` is needed because the schema uses `format: "date-time"` and `format: "uri"` keywords, which are not built into ajv by default.

## Verification checklist
- [ ] `scripts/validate-posts.ts` exists and is valid TypeScript
- [ ] `scripts/package.json` includes `ajv` and `ajv-formats` as dependencies
- [ ] `scripts/package.json` has a `"validate"` script entry
- [ ] Running with a valid posts.json produces a passing report
- [ ] Running with invalid JSON produces a clear parse error
- [ ] Running with schema violations produces specific error messages with field paths
- [ ] Grapheme limit check correctly counts multi-codepoint emoji as single graphemes
- [ ] De-duplication check catches duplicate topics within 30-day windows
- [ ] Hashtag rules check catches misplaced `#BuiltWithBabylon`
- [ ] Exit code is 0 for passing, 1 for failures
