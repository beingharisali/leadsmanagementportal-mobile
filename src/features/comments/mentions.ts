/**
 * Mentions travel as `@[Display Name](userId)` tokens inside the comment text
 * (the API checks them; see server/src/modules/comments/comment.mentions.ts).
 * While typing, the editor shows plain `@Name` and keeps the picked people
 * aside; `toTokens` swaps them back in before sending.
 */
const MENTION_TOKEN = /@\[([^\]\n]{1,80})\]\(([a-f0-9]{24})\)/gi;

export type CommentPart = { kind: "text"; text: string } | { kind: "mention"; name: string; userId: string };

/** Splits a stored comment into text and mention chips. */
export function parseComment(body: string): CommentPart[] {
  const parts: CommentPart[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: body.slice(last, index) });
    parts.push({ kind: "mention", name: match[1]!, userId: match[2]! });
    last = index + match[0].length;
  }
  if (last < body.length) parts.push({ kind: "text", text: body.slice(last) });
  return parts;
}

/** Stored comment → what the editor shows ("@Name"), plus who was mentioned. */
export function fromTokens(body: string) {
  const mentions = new Map<string, string>();
  const text = body.replace(MENTION_TOKEN, (_t, name: string, id: string) => {
    mentions.set(name, id);
    return `@${name}`;
  });
  return { text, mentions };
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Editor text → text to send: every "@Name" of someone picked from the list
 * becomes a token. Longer names first, so "@Ali Khan" wins over "@Ali".
 */
export function toTokens(text: string, mentions: Map<string, string>) {
  const names = [...mentions.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const pattern = new RegExp(`@(${names.map(escape).join("|")})(?![\\w])`, "g");
  return text.replace(pattern, (_m, name: string) => `@[${name}](${mentions.get(name)})`);
}

/** The "@query" being typed just before the cursor, if any. */
export function activeMentionQuery(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = /(?:^|\s)@([^\s@]{0,30})$/.exec(before);
  if (!match) return null;
  return { query: match[1]!, start: cursor - match[1]!.length - 1 };
}
