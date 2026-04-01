# Task 1.2: Schema Finalization

## Goal
Update `schemas/posts.schema.json` to remove the `fullText` and `characterCount` fields, and align the schema with the final requirements. Also update `skills/content-generation/SKILL.md` to remove references to these deprecated fields and align its output schema with the corrected JSON Schema.

## Requirements addressed
REQ-SCHEMA-1, REQ-SCHEMA-2, REQ-SCHEMA-3, REQ-SCHEMA-4, REQ-SCHEMA-5, REQ-SCHEMA-6, REQ-SCHEMA-7, REQ-SCHEMA-8, REQ-SKILL-2, REQ-SKILL-8

## Background
The Babylon.js Social Media Helper generates batches of social media posts as structured JSON. The JSON schema (`schemas/posts.schema.json`) validates the output of the Phase 1 content generation skill and the input to the Phase 2 review web app.

The current schema (already in the repo at `schemas/posts.schema.json`) includes two fields that must be removed per the project's architectural decisions:

1. **`fullText`** (string, required on each post) — Originally intended to store the fully assembled post text (body + hashtags). However, Decision #13 in the goals document states that hashtags are appended per-platform at post-time by the posting scripts, and the JSON should not contain a pre-assembled full text. The Bluesky platform skips hashtags entirely, so a single `fullText` cannot represent all platforms.

2. **`characterCount`** (object with `fullText`, `bodyOnly`, `withHashtags` sub-fields, required on each post) — Originally intended for character validation. However, REQ-SCHEMA-8 explicitly states the JSON must NOT include a `characterCount` block. Validation is done at 300 graphemes for body text + link URL only (not including hashtags), and this validation happens in the web app and posting scripts, not in the schema.

The SKILL.md file (at `skills/content-generation/SKILL.md`) also references these deprecated fields in its output schema, field reference table, example posts, and validation steps. It must be updated to match.

## Files to modify/create

- `schemas/posts.schema.json` — Remove `fullText` and `characterCount` from the post object's required array and properties; verify all other fields are correct per REQ-SCHEMA-2 through REQ-SCHEMA-6.
- `skills/content-generation/SKILL.md` — Remove `fullText` and `characterCount` from the output schema section, field reference table, example posts, and validation steps. Update the character limit guidance to say "body text + link URL ≤ 300 graphemes" (no mention of fullText field).

## Implementation details

### 1. Update `schemas/posts.schema.json`

Open the file at `schemas/posts.schema.json`. Make these specific changes:

**a) Remove `fullText` from the post item's `required` array:**
The current required array is:
```
["id", "category", "text", "hashtags", "conditionalHashtags", "fullText", "characterCount", "link", "media", "metadata"]
```
Change it to:
```
["id", "category", "text", "hashtags", "conditionalHashtags", "link", "media", "metadata"]
```

**b) Remove the `fullText` property definition** from the post item's `properties` object. Delete the entire `"fullText": { "type": "string", "minLength": 1 }` block.

**c) Remove the `characterCount` property definition** from the post item's `properties` object. Delete the entire `"characterCount": { ... }` block including its sub-properties (`fullText`, `bodyOnly`, `withHashtags`).

**d) Verify remaining fields match REQ-SCHEMA-2:**
Confirm all of these required fields are present with correct types and constraints:
- `id`: string, pattern `^post-\\d{3,}$`
- `category`: string, enum `["feature-highlight", "community-demo", "docs-tutorial"]`
- `text`: string, minLength 1
- `hashtags`: array of strings, minItems 8
- `conditionalHashtags`: array of strings
- `link`: object with required `url`, `type`, `title`
- `link.type`: enum `["playground", "demo", "docs", "forum", "blog", "community-project", "youtube"]`
- `media`: object with required `type`, `sourceUrl`, `description`, `filePath`
- `media.type`: const `"screenshot"`
- `media.filePath`: pattern `^media/post-\\d{3,}\\.png$`
- `metadata`: object with required `topic`, `babylonFeatureArea`, `contentSource`, `usesEmoji`, `postFormat`, `dayIndex`
- `metadata.postFormat`: enum `["feature-statement", "question", "check-out", "demo-showcase", "community-pride", "call-to-action"]`
- `metadata.dayIndex`: integer, minimum 1

**e) Verify top-level fields match REQ-SCHEMA-6:**
- `generatedAt`: string, format date-time
- `generatedBy`: string, const "Babylon.js Social Media Agent"
- `totalPosts`: integer, minimum 1
- `config`: object with required `daysRequested`, `contentMix`, `emojiRate`, `postingTime`, `platforms`
- `posts`: array of post objects

### 2. Update `skills/content-generation/SKILL.md`

**a) Output Schema section (~line 150-208):** Remove the `fullText` field and `characterCount` field from the JSON example. The example post should show `id`, `category`, `text`, `hashtags`, `conditionalHashtags`, `link`, `media`, `metadata` — no `fullText` or `characterCount`.

**b) Field Reference table (~line 210-234):** Remove the rows for `fullText` and `characterCount` (and its sub-fields `characterCount.fullText`, `characterCount.bodyOnly`, `characterCount.withHashtags`).

**c) Step 3: Write Posts (~line 252-259):** Remove the instruction "Provide accurate `characterCount` values" (step 6 in that list). Update the character limit step to say "Ensure the body text + link URL fits within 300 graphemes (hashtags are excluded from this budget)".

**d) Step 5: Validate (~line 270-279):** Change "Verify all `fullText` values fit within 300 graphemes" to "Verify all posts' body text + link URL fit within 300 graphemes".

**e) Example Posts (~line 296-387):** Remove the `fullText` and `characterCount` fields from all three example posts (Feature Highlight at ~line 297, Community Demo at ~line 327, Docs & Tutorials at ~line 359).

**f) Character Limits section (~line 117-129):** Update the target description. Currently says "Body text + hashtags + link must fit within 300 graphemes". Change to "Body text + link URL must fit within 300 graphemes. Hashtags are metadata — they are appended per-platform at post-time and are NOT included in the 300-grapheme budget."

## Testing suggestions
- Open the updated `schemas/posts.schema.json` and manually verify it is valid JSON (paste into a JSON validator).
- Create a minimal test JSON file with a single post that conforms to the updated schema (without `fullText` or `characterCount`). Validate it against the schema using a tool like `ajv-cli` or an online JSON Schema validator.
- Create a test JSON file that includes `fullText` — confirm the schema does NOT reject it (since `fullText` is simply not required, it should be silently accepted as an additional property if present; this is fine).
- Review the updated SKILL.md to ensure no remaining references to `fullText` or `characterCount` exist. Search for both terms.

## Gotchas
- JSON Schema draft-07 allows additional properties by default. Removing `fullText` and `characterCount` from the `required` array and `properties` means they are no longer validated, but old JSON files that still have them will not fail validation. This is intentional — backward compatibility during the transition.
- The `characterCount` removal affects the SKILL.md's generation instructions. Make sure the AI agent is no longer instructed to compute `characterCount` values.
- The `metadata.dayIndex` field is already present in the current schema and should remain — it is the sequence number for ordering.

## Verification checklist
- [ ] `schemas/posts.schema.json` no longer lists `fullText` in the required array
- [ ] `schemas/posts.schema.json` no longer lists `characterCount` in the required array
- [ ] `schemas/posts.schema.json` no longer has `fullText` property definition
- [ ] `schemas/posts.schema.json` no longer has `characterCount` property definition
- [ ] `schemas/posts.schema.json` is valid JSON (parseable without errors)
- [ ] All required fields per REQ-SCHEMA-2 are present: id, category, text, hashtags, conditionalHashtags, link, media, metadata
- [ ] `skills/content-generation/SKILL.md` has no references to `fullText` as an output field
- [ ] `skills/content-generation/SKILL.md` has no references to `characterCount` as an output field
- [ ] SKILL.md example posts do not contain `fullText` or `characterCount`
- [ ] SKILL.md validation step says "body text + link URL ≤ 300 graphemes"
