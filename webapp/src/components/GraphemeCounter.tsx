import { countPostGraphemes } from "../utils/grapheme-count.ts";

interface GraphemeCounterProps {
  bodyText: string;
  linkUrl: string;
}

const LIMIT = 300;
const WARNING_THRESHOLD = 280;

export default function GraphemeCounter({
  bodyText,
  linkUrl,
}: GraphemeCounterProps) {
  const current = countPostGraphemes(bodyText, linkUrl);

  let color = "#374151";
  let fontWeight: number = 400;

  if (current > LIMIT) {
    color = "#dc2626";
    fontWeight = 700;
  } else if (current >= WARNING_THRESHOLD) {
    color = "#d97706";
    fontWeight = 600;
  }

  return (
    <span style={{ fontSize: 13, color, fontWeight }}>
      {current} / {LIMIT} graphemes
    </span>
  );
}
