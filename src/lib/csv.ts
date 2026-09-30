export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const raw = text.replace(/^\uFEFF/, "");
  const delim = detectDelim(raw);
  const lines = splitLines(raw);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitRow(lines[0]!, delim).map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitRow(line, delim);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function detectDelim(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [
    [",", (first.match(/,/g) ?? []).length],
    [";", (first.match(/;/g) ?? []).length],
    ["\t", (first.match(/\t/g) ?? []).length],
  ];
  return counts.sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",";
}

function splitLines(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      inQ = !inQ;
      cur += c;
    } else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function splitRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const HEADER_MAP: Record<string, string> = {
  email: "email",
  "email address": "email",
  "e-mail": "email",
  "first name": "firstName",
  firstname: "firstName",
  first: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  last: "lastName",
  name: "fullName",
  "full name": "fullName",
  company: "companyName",
  "company name": "companyName",
  organization: "companyName",
  website: "websiteUrl",
  url: "websiteUrl",
  domain: "websiteUrl",
  title: "jobTitle",
  "job title": "jobTitle",
  position: "jobTitle",
  phone: "phone",
  "phone number": "phone",
  industry: "industry",
  location: "location",
  city: "location",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
};

export type MappedContact = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  websiteUrl: string;
  jobTitle: string;
  phone: string;
  industry: string;
  location: string;
  linkedinUrl: string;
};

export function mapCsvRow(row: CsvRow): MappedContact {
  const mapped: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = HEADER_MAP[k.trim().toLowerCase()];
    if (key) mapped[key] = v;
  }
  let first = mapped.firstName ?? "";
  let last = mapped.lastName ?? "";
  if (!first && mapped.fullName) {
    const parts = mapped.fullName.trim().split(/\s+/);
    first = parts[0] ?? "";
    last = parts.slice(1).join(" ");
  }
  return {
    firstName: first,
    lastName: last,
    email: (mapped.email ?? "").trim(),
    companyName: mapped.companyName ?? "",
    websiteUrl: mapped.websiteUrl ?? "",
    jobTitle: mapped.jobTitle ?? "",
    phone: mapped.phone ?? "",
    industry: mapped.industry ?? "",
    location: mapped.location ?? "",
    linkedinUrl: mapped.linkedinUrl ?? "",
  };
}
