const SPAM_WORDS = [
  "free",
  "guaranteed",
  "miracle",
  "urgent",
  "limited time",
  "act now",
  "buy now",
  "click here",
  "winner",
  "congratulations",
  "risk-free",
  "no obligation",
  "double your",
  "cash",
  "$$$",
];

const FORMAL_OPENERS = [
  "i hope this email finds you well",
  "i hope you're doing well",
  "my name is",
  "i wanted to reach out",
];

export function spamScore(subject: string, body: string): number {
  const text = `${subject}\n${body}`.toLowerCase();
  let score = 0;
  for (const w of SPAM_WORDS) {
    if (text.includes(w)) score += 1.4;
  }
  if ((subject.match(/!/g) ?? []).length > 1) score += 1.5;
  if (subject === subject.toUpperCase() && subject.length > 8) score += 2;
  if ((body.match(/https?:\/\//g) ?? []).length > 3) score += 1.2;
  return Math.min(10, Math.round(score * 10) / 10);
}

export function qualityScore(input: {
  subject: string;
  body: string;
  personalization: string[];
  spam: number;
}): number {
  const words = input.body.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean);
  let score = 6.2;
  score += Math.min(2.4, input.personalization.length * 0.55);
  if (words.length >= 60 && words.length <= 180) score += 1.1;
  else if (words.length > 220) score -= 1.2;
  else if (words.length < 40) score -= 0.8;
  score -= input.spam * 0.45;
  const lower = input.body.toLowerCase();
  if (FORMAL_OPENERS.some((o) => lower.includes(o))) score -= 0.8;
  if (input.subject.length > 8 && input.subject.length < 55) score += 0.4;
  if (/\?/.test(input.body)) score += 0.3;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
]);

export function validateEmail(email: string): { ok: boolean; score: number } {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, score: 10 };
  const domain = e.split("@")[1] ?? "";
  let score = 40;
  if (domain.includes(".")) score += 30;
  if (!DISPOSABLE.has(domain)) score += 30;
  else score -= 20;
  return { ok: score >= 70, score };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .trim();
}
