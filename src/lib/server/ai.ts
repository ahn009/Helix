import { qualityScore, spamScore } from "@/lib/email-quality";
import type { PainPoint } from "@/lib/types";

const MODEL = "grok-4.5";

export function aiAvailable(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

async function chat(system: string, user: string, maxTokens = 700): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? null;
}

function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export type ResearchResult = {
  description: string;
  industry: string;
  services: string[];
  painPoints: PainPoint[];
  signals: string[];
  tech: string[];
};

export async function researchCompany(input: {
  companyName: string;
  website?: string | null;
  industry?: string | null;
}): Promise<ResearchResult> {
  const system = `You are an expert B2B analyst. Output ONLY valid JSON. Do not invent clients, revenue, or named people. If uncertain, say so in the description. Schema:
{"description":"string under 80 words","industry":"string","services":["string"],"painPoints":[{"hypothesis":"string","evidence":"string","severity":"low|medium|high","category":"marketing|revenue|operations|technology"}],"signals":["string"],"tech":["string"]}`;
  const user = `Company: ${input.companyName}
Website: ${input.website ?? "unknown"}
Stated industry: ${input.industry ?? "unknown"}
Identify 2-3 likely pain points a specialist agency could credibly mention in a cold email. Be specific, not generic.`;
  const text = await chat(system, user, 600);
  const parsed = text ? extractJson<ResearchResult>(text) : null;
  if (parsed?.description) {
    return {
      description: parsed.description,
      industry: parsed.industry || input.industry || "B2B",
      services: parsed.services ?? [],
      painPoints: parsed.painPoints ?? [],
      signals: parsed.signals ?? [],
      tech: parsed.tech ?? [],
    };
  }
  return {
    description: `${input.companyName} is a ${input.industry ?? "B2B"} company. Public pages describe the category more clearly than a specific buyer outcome.`,
    industry: input.industry || "B2B",
    services: input.industry ? [input.industry] : [],
    painPoints: [
      {
        hypothesis: "The website explains the category, not a 90-day outcome a buyer can hold.",
        evidence: "Homepage copy is generic for the industry.",
        severity: "medium",
        category: "marketing",
      },
    ],
    signals: [],
    tech: [],
  };
}

export type GeneratedEmail = {
  subject: string;
  bodyHtml: string;
  personalization: string[];
  qualityScore: number;
  spamScore: number;
};

export async function writeEmail(input: {
  senderName: string;
  senderCompany: string;
  valueProp: string;
  tone: string;
  forbidden: string[];
  bookingUrl: string;
  prospectFirst: string;
  prospectCompany: string;
  prospectTitle: string;
  research: ResearchResult;
  goal: string;
}): Promise<GeneratedEmail> {
  const system = `You are a world-class B2B cold email copywriter. Output ONLY JSON:
{"subject":"string under 50 chars, no ending punctuation, sentence case","bodyHtml":"string of <p> tags only, under 150 words","personalization":["what you used"]}
Rules:
- No mail merge ("I saw your company does X").
- First line must be a specific observation.
- Do not start with hope-this-finds-you.
- No spam words: free, guaranteed, urgent, limited time, buy, click here.
- One ask, low friction. Mention the booking link only as plain text if needed.
- Forbidden words: ${input.forbidden.join(", ") || "none"}
- Tone: ${input.tone}`;
  const user = `Sender: ${input.senderName} at ${input.senderCompany}
Value: ${input.valueProp}
Goal: ${input.goal}
Prospect: ${input.prospectFirst}, ${input.prospectTitle} at ${input.prospectCompany}
Research: ${JSON.stringify(input.research)}`;
  const text = await chat(system, user, 500);
  const parsed = text
    ? extractJson<{ subject: string; bodyHtml: string; personalization: string[] }>(text)
    : null;
  if (parsed?.subject && parsed.bodyHtml) {
    const spam = spamScore(parsed.subject, parsed.bodyHtml);
    return {
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      personalization: parsed.personalization ?? [],
      spamScore: spam,
      qualityScore: qualityScore({
        subject: parsed.subject,
        body: parsed.bodyHtml,
        personalization: parsed.personalization ?? [],
        spam,
      }),
    };
  }
  return fallbackEmail(input);
}

function fallbackEmail(input: {
  prospectFirst: string;
  prospectCompany: string;
  prospectTitle: string;
  valueProp: string;
  research: ResearchResult;
  senderCompany: string;
}): GeneratedEmail {
  const pain = input.research.painPoints[0]?.hypothesis ??
    "the site explains the category more clearly than the outcome a buyer actually wants";
  const signal = input.research.signals[0];
  const subject = signal
    ? `${input.prospectCompany}'s latest launch`
    : `${input.prospectCompany}'s first screen`;
  const bodyHtml = `<p>${input.prospectFirst} — ${pain.charAt(0).toLowerCase() + pain.slice(1)}</p><p>${input.valueProp}</p><p>Open to a 15-minute look this week, no deck?</p>`;
  const personalization = [input.prospectCompany, input.prospectTitle, ...(signal ? [signal] : [])];
  const spam = spamScore(subject, bodyHtml);
  return {
    subject,
    bodyHtml,
    personalization,
    spamScore: spam,
    qualityScore: qualityScore({ subject, body: bodyHtml, personalization, spam }),
  };
}

export async function writeFollowUp(input: {
  previousSubject: string;
  previousBody: string;
  angle: string;
  prospectFirst: string;
}): Promise<GeneratedEmail> {
  const system = `Write a follow-up cold email. JSON only:
{"subject":"string","bodyHtml":"<p> tags, under 90 words","personalization":["string"]}
Do not repeat the previous value prop. Acknowledge the prior note in one clause. New value: ${input.angle}`;
  const user = `Previous subject: ${input.previousSubject}\nPrevious body: ${input.previousBody}\nProspect first name: ${input.prospectFirst}`;
  const text = await chat(system, user, 400);
  const parsed = text
    ? extractJson<{ subject: string; bodyHtml: string; personalization: string[] }>(text)
    : null;
  if (parsed?.subject && parsed.bodyHtml) {
    const spam = spamScore(parsed.subject, parsed.bodyHtml);
    return {
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      personalization: parsed.personalization ?? ["follow-up"],
      spamScore: spam,
      qualityScore: qualityScore({
        subject: parsed.subject,
        body: parsed.bodyHtml,
        personalization: parsed.personalization ?? [],
        spam,
      }),
    };
  }
  const subject = `re: ${input.previousSubject}`;
  const bodyHtml = `<p>${input.prospectFirst} — floating this up. ${input.angle}.</p><p>If the timing is wrong, a one-line "not now" is plenty.</p>`;
  const spam = spamScore(subject, bodyHtml);
  return {
    subject,
    bodyHtml,
    personalization: ["follow-up", input.angle],
    spamScore: spam,
    qualityScore: qualityScore({ subject, body: bodyHtml, personalization: ["follow-up"], spam }),
  };
}
