const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function countGraphemes(text: string): number {
  return [...segmenter.segment(text)].length;
}

export function countPostGraphemes(bodyText: string, linkUrl: string): number {
  return countGraphemes(bodyText + " " + linkUrl);
}
