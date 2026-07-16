const MAX_TITLE_LENGTH = 60;

export function deriveThreadTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();

  if (collapsed.length <= MAX_TITLE_LENGTH) {
    return collapsed;
  }

  return `${collapsed.slice(0, MAX_TITLE_LENGTH)}…`;
}
