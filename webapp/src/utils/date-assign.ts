import type { Post } from "../types/post.ts";

function toDateParts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addOneDay(dateStr: string): string {
  const [y, m, d] = toDateParts(dateStr);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return formatDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

function todayStr(): string {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function assignDates(
  posts: Post[],
  existingScheduledDates: string[],
): Post[] {
  const occupied = new Set(existingScheduledDates);

  let latest = todayStr();
  for (const d of existingScheduledDates) {
    if (d > latest) latest = d;
  }

  let cursor = addOneDay(latest);

  return posts.map((post) => {
    while (occupied.has(cursor)) {
      cursor = addOneDay(cursor);
    }
    const assigned = cursor;
    occupied.add(assigned);
    cursor = addOneDay(cursor);
    return { ...post, assignedDate: assigned, status: "draft" as const };
  });
}
