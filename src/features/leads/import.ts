import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import type { CustomFieldDefinition, CustomFieldValue, LeadSourceOption } from "@/features/customization/types";

import { leadTimelineLabels } from "./config";
import { LEAD_TIMELINES, type LeadTimeline } from "./types";

type LeadSource = string;

/** One spreadsheet row sent to `POST /leads/import`. */
export interface ImportLeadRow {
  row: number;
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  businessType?: string;
  city?: string;
  address?: string;
  source: LeadSource;
  sourceDetail?: string;
  requirement: string;
  budget?: number | null;
  timeline?: LeadTimeline | null;
  tags: string[];
  customFields?: Record<string, CustomFieldValue>;
  assignedTo?: string | null;
}

export interface ImportRowResult {
  row: number;
  /** "failed" is app-side only: the batch never reached the server */
  status: "created" | "duplicate" | "invalid" | "failed";
  message?: string;
  leadId?: string;
}

export interface ImportResult {
  created: number;
  duplicates: number;
  invalid: number;
  failed: number;
  results: ImportRowResult[];
}

/**
 * Spreadsheet import helpers, the same as the website's
 * (client/features/leads/import.ts): reading .xlsx/.xls/.csv files, matching
 * columns to lead fields and turning rows into API payloads. The server
 * re-validates every row, so these checks are for a helpful preview.
 */

export const MAX_IMPORT_ROWS = 5000;
export const DEFAULT_REQUIREMENT = "Not specified";

export const IMPORT_FIELDS = [
  { key: "name", label: "Contact name", aliases: ["contact", "contactname", "contactperson", "fullname", "person", "clientname", "ownername", "customername"] },
  { key: "businessName", label: "Business name", aliases: ["business", "company", "companyname", "organization", "organisation", "firm", "shop", "brand"] },
  { key: "phone", label: "Phone", aliases: ["phonenumber", "phoneno", "mobile", "mobileno", "mobilenumber", "contactno", "contactnumber", "cell", "cellno", "cellnumber", "whatsapp", "whatsappnumber", "number", "tel", "telephone"] },
  { key: "email", label: "Email", aliases: ["emailaddress", "mail", "emailid"] },
  { key: "businessType", label: "Business type", aliases: ["industry", "category", "type", "sector"] },
  { key: "city", label: "City", aliases: ["town", "location"] },
  { key: "address", label: "Address", aliases: ["fulladdress", "streetaddress"] },
  { key: "source", label: "Source", aliases: ["leadsource", "channel", "platform"] },
  { key: "sourceDetail", label: "Source detail", aliases: ["campaign", "referredby", "referrer"] },
  { key: "requirement", label: "Requirement", aliases: ["requirements", "need", "needs", "notes", "note", "description", "details", "comments", "remarks"] },
  { key: "budget", label: "Budget (PKR)", aliases: ["budgetpkr", "amount", "value", "dealvalue"] },
  { key: "timeline", label: "Timeline", aliases: ["timeframe", "when"] },
  { key: "tags", label: "Tags", aliases: ["tag", "labels", "label"] },
  { key: "assignedTo", label: "Assign to (agent name or email)", aliases: ["agent", "assignee", "assigned", "owner", "salesperson", "assignedagent"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Custom fields are mapped as `cf:<field key>`, next to the built-in fields. */
export type CustomFieldMappingKey = `cf:${string}`;
export const customMappingKey = (key: string): CustomFieldMappingKey => `cf:${key}`;

/** Field → column index in the sheet (`null` or missing = not in the file). */
export type ColumnMapping = Record<ImportFieldKey, number | null> &
  Partial<Record<CustomFieldMappingKey, number | null>>;

export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: { row: number; cells: string[] }[];
}

export interface DraftRow {
  /** Row number as shown in Excel */
  row: number;
  lead: Omit<ImportLeadRow, "assignedTo">;
  /** User id from the file's assignee column, or "" */
  assigneeId: string;
  errors: string[];
  warnings: string[];
}

const simplify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Reads the first sheet of a picked file. The first row with 2+ filled cells is the header row. */
export async function readSpreadsheet(file: { uri: string; name: string }): Promise<ParsedSheet> {
  const workbook = XLSX.read(await new File(file.uri).arrayBuffer(), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet || !sheet["!ref"]) throw new Error("The file has no data.");

  const firstRow = XLSX.utils.decode_range(sheet["!ref"]).s.r;
  const matrix = XLSX.utils
    .sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true })
    .map((cells) => cells.map(cellText));

  const headerIndex = matrix.findIndex((cells) => cells.filter(Boolean).length >= 2);
  if (headerIndex === -1) throw new Error("Couldn't find a header row in the file.");

  const headers = matrix[headerIndex]!.map((h, i) => h || `Column ${i + 1}`);
  const rows = matrix
    .slice(headerIndex + 1)
    .map((cells, i) => ({ row: firstRow + headerIndex + i + 2, cells }))
    .filter(({ cells }) => cells.some(Boolean));

  if (rows.length === 0) throw new Error("The file has a header row but no leads under it.");
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`The file has ${rows.length} rows. Import at most ${MAX_IMPORT_ROWS} at a time.`);
  }

  return { fileName: file.name, headers, rows };
}

/**
 * Guesses which column holds each field from the header text. Exact matches
 * win; otherwise the header must contain a known name (4+ letters) and the
 * longest such match is taken, so "Mobile No." → phone, "Contact Person" → name.
 */
export function autoMapColumns(headers: string[], customFields: CustomFieldDefinition[] = []): ColumnMapping {
  const simplified = headers.map(simplify);
  const candidates: { field: keyof ColumnMapping; column: number; score: number }[] = [];
  const targets: { key: keyof ColumnMapping; names: string[] }[] = [
    ...IMPORT_FIELDS.map((f) => ({ key: f.key, names: [f.key, f.label, ...f.aliases] })),
    ...customFields.map((f) => ({ key: customMappingKey(f.key), names: [f.key, f.label] })),
  ];

  for (const field of targets) {
    const names = field.names.map(simplify);
    simplified.forEach((header, column) => {
      if (!header) return;
      const score = names.includes(header)
        ? 1000
        : Math.max(0, ...names.filter((n) => n.length >= 4 && header.includes(n)).map((n) => n.length));
      if (score > 0) candidates.push({ field: field.key, column, score });
    });
  }

  const mapping = Object.fromEntries(targets.map((t) => [t.key, null])) as ColumnMapping;
  const usedColumns = new Set<number>();
  for (const { field, column } of candidates.sort((a, b) => b.score - a.score)) {
    if ((mapping[field] ?? null) !== null || usedColumns.has(column)) continue;
    mapping[field] = column;
    usedColumns.add(column);
  }
  return mapping;
}

/** Same rules as the server's normalizePhone, for spotting duplicates within the file. */
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  else if (digits.startsWith("3") && digits.length === 10) digits = `92${digits}`;
  return digits;
}

/** Common shorthands for the default sources; only used when the company has that source. */
const SOURCE_ALIASES: Record<string, LeadSource> = {
  fb: "facebook",
  meta: "facebook",
  ig: "instagram",
  insta: "instagram",
  wa: "whatsapp",
  web: "website",
  site: "website",
  gmb: "google",
  googlemaps: "google",
  googleads: "google",
  ref: "referral",
  coldcalling: "cold_call",
  call: "cold_call",
  walkin: "walk_in",
  exhibition: "event",
  expo: "event",
};

function matchSource(value: string, sources: LeadSourceOption[]): LeadSource | null {
  const v = simplify(value);
  if (!v) return null;
  const exact = sources.find((s) => simplify(s.key) === v || simplify(s.label) === v);
  if (exact) return exact.key;
  const alias = SOURCE_ALIASES[v];
  if (alias && sources.some((s) => s.key === alias)) return alias;
  return (
    sources.find(
      (s) => s.key !== "other" && (v.includes(simplify(s.key)) || v.includes(simplify(s.label))),
    )?.key ?? null
  );
}

const TIMELINE_ALIASES: Record<string, LeadTimeline> = {
  asap: "immediately",
  urgent: "immediately",
  now: "immediately",
  "1month": "within_1_month",
  thismonth: "within_1_month",
  "13months": "1_3_months",
  "36months": "3_6_months",
  "6months": "6_plus_months",
  unknown: "not_sure",
  notsure: "not_sure",
};

function matchTimeline(value: string): LeadTimeline | null {
  const v = simplify(value);
  if (!v) return null;
  return (
    LEAD_TIMELINES.find((t) => simplify(t) === v || simplify(leadTimelineLabels[t]) === v) ??
    TIMELINE_ALIASES[v] ??
    null
  );
}

const BUDGET_UNITS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lac: 100_000,
  lacs: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
  m: 1_000_000,
  mn: 1_000_000,
  million: 1_000_000,
  cr: 10_000_000,
  crore: 10_000_000,
  crores: 10_000_000,
};

/** "Rs 1,50,000", "150k", "1.5 lakh" → 150000. Returns undefined if unreadable. */
export function parseBudget(value: string): number | undefined {
  const text = value.toLowerCase().replace(/pkr|rs\.?|,|\s/g, "");
  const match = /^(\d+(?:\.\d+)?)([a-z]*)$/.exec(text);
  if (!match) return undefined;
  const unit = match[2] ? BUDGET_UNITS[match[2]] : 1;
  return unit ? Math.round(Number(match[1]) * unit) : undefined;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const YES = ["yes", "y", "true", "1", "haan", "ha", "✓", "✔", "x"];
const NO = ["no", "n", "false", "0", "nahi", "nahin"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Excel stores dates as days since 1899-12-30; text dates are read day-first (31/12/2026). */
function parseDate(text: string): string | null {
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial < 1 || serial > 2958465) return null;
    return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  const [y, m, d] = match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : (match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(text))
      ? [Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]), Number(match[2]), Number(match[1])]
      : [NaN, NaN, NaN];
  if (Number.isNaN(y)) {
    const parsed = Date.parse(text);
    if (Number.isNaN(parsed)) return null;
    const date = new Date(parsed);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * A spreadsheet cell as a custom field value, or `null` with a reason when it
 * can't be read. The server checks every value again.
 */
export function parseCustomFieldCell(
  field: CustomFieldDefinition,
  text: string,
): { value: CustomFieldValue } | { problem: string } {
  switch (field.type) {
    case "number": {
      const number = Number(text.replace(/,/g, "").trim());
      return Number.isFinite(number) ? { value: number } : { problem: `${field.label}: "${text}" isn't a number` };
    }
    case "date": {
      const date = parseDate(text.trim());
      return date ? { value: date } : { problem: `${field.label}: couldn't read the date "${text}"` };
    }
    case "select": {
      const option = field.options.find((o) => simplify(o) === simplify(text));
      return option ? { value: option } : { problem: `${field.label}: "${text}" isn't one of the choices` };
    }
    case "checkbox": {
      const v = text.trim().toLowerCase();
      if (YES.includes(v)) return { value: true };
      if (NO.includes(v)) return { value: false };
      return { problem: `${field.label}: use Yes or No, not "${text}"` };
    }
    case "textarea":
      return { value: text.slice(0, 2000) };
    default:
      return { value: text.slice(0, 300) };
  }
}

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

/** Turns sheet rows into lead payloads plus the problems found in each. */
export function buildDraftRows(
  sheet: ParsedSheet,
  mapping: ColumnMapping,
  {
    defaultSource,
    sources,
    users,
    customFields = [],
  }: {
    defaultSource: LeadSource;
    sources: LeadSourceOption[];
    users: AssignableUser[];
    customFields?: CustomFieldDefinition[];
  },
): DraftRow[] {
  const seenPhones = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  return sheet.rows.map(({ row, cells }) => {
    const get = (key: keyof ColumnMapping) => {
      const index = mapping[key] ?? null;
      return index === null ? "" : (cells[index] ?? "");
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    let name = get("name");
    let businessName = get("businessName");
    if (!name && businessName) name = businessName;
    if (!businessName && name) businessName = name;
    if (name.length < 2) errors.push("Name is missing");

    const phone = get("phone");
    const phoneNormalized = normalizePhone(phone);
    if (!phone) errors.push("Phone is missing");
    else if (phoneNormalized.length < 7) errors.push(`"${phone}" isn't a valid phone number`);

    let email = get("email").toLowerCase();
    if (email && !EMAIL_PATTERN.test(email)) {
      warnings.push(`Email "${email}" looks invalid and will be skipped`);
      email = "";
    }

    const earlier =
      (phoneNormalized.length >= 7 && seenPhones.get(phoneNormalized)) ||
      (email && seenEmails.get(email));
    if (earlier) errors.push(`Same phone or email as row ${earlier}`);
    else {
      if (phoneNormalized.length >= 7) seenPhones.set(phoneNormalized, row);
      if (email) seenEmails.set(email, row);
    }

    const sourceText = get("source");
    let source = matchSource(sourceText, sources);
    if (!source) {
      if (sourceText) warnings.push(`Unknown source "${sourceText}", using default`);
      source = defaultSource;
    }

    const budgetText = get("budget");
    const budget = budgetText ? parseBudget(budgetText) : undefined;
    if (budgetText && budget === undefined) warnings.push(`Couldn't read budget "${budgetText}"`);

    const timelineText = get("timeline");
    const timeline = matchTimeline(timelineText);
    if (timelineText && !timeline) warnings.push(`Unknown timeline "${timelineText}"`);

    const assigneeText = get("assignedTo");
    let assigneeId = "";
    if (assigneeText) {
      const needle = assigneeText.toLowerCase();
      const user = users.find(
        (u) => u.email.toLowerCase() === needle || u.name.toLowerCase() === needle,
      );
      if (user) assigneeId = user.id;
      else warnings.push(`No active user named "${assigneeText}", left unassigned`);
    }

    const requirement = get("requirement");
    const tags = get("tags")
      .split(/[,;|]/)
      .map((t) => t.trim().toLowerCase().slice(0, 30))
      .filter(Boolean)
      .slice(0, 20);

    // Unreadable values are skipped with a warning; the rest of the row still imports.
    const custom: Record<string, CustomFieldValue> = {};
    for (const field of customFields) {
      const key = customMappingKey(field.key);
      if ((mapping[key] ?? null) === null) continue;
      const text = get(key).trim();
      if (!text) {
        if (field.required && field.type !== "checkbox") warnings.push(`${field.label} is empty`);
        continue;
      }
      const parsed = parseCustomFieldCell(field, text);
      if ("value" in parsed) custom[field.key] = parsed.value;
      else warnings.push(`${parsed.problem}, left empty`);
    }

    return {
      row,
      assigneeId,
      errors,
      warnings,
      lead: {
        row,
        name: name.slice(0, 120),
        phone: phone.slice(0, 30),
        email: email || undefined,
        businessName: businessName.slice(0, 160),
        businessType: get("businessType").slice(0, 80) || undefined,
        city: get("city").slice(0, 80) || undefined,
        address: get("address").slice(0, 300) || undefined,
        source,
        sourceDetail: get("sourceDetail").slice(0, 160) || undefined,
        requirement: requirement.length >= 3 ? requirement.slice(0, 2000) : DEFAULT_REQUIREMENT,
        budget: budget ?? null,
        timeline,
        tags: [...new Set(tags)],
        ...(Object.keys(custom).length > 0 && { customFields: custom }),
      },
    };
  });
}

/** Writes the rows to an Excel file and opens the share sheet (save to Files, WhatsApp, email…). */
async function saveWorkbook(rows: Record<string, unknown>[], fileName: string) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Leads");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(bytes));
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
    dialogTitle: fileName,
  });
}

/** An example value for a custom field in the template. */
function customFieldExample(field: CustomFieldDefinition) {
  switch (field.type) {
    case "number":
      return 10;
    case "date":
      return "15/11/2026";
    case "select":
      return field.options[0] ?? "";
    case "checkbox":
      return "Yes";
    default:
      return "";
  }
}

/** A ready-to-fill Excel file with every supported column (custom fields included) and two examples. */
export function downloadImportTemplate(customFields: CustomFieldDefinition[] = []) {
  const example = (values: Partial<Record<ImportFieldKey, string | number>>, withCustom = true) => ({
    ...Object.fromEntries(IMPORT_FIELDS.map((f) => [f.label, values[f.key] ?? ""])),
    ...Object.fromEntries(customFields.map((f) => [f.label, withCustom ? customFieldExample(f) : ""])),
  });

  return saveWorkbook(
    [
      example({
        name: "Ahmed Raza",
        businessName: "Raza Textiles",
        phone: "0300-1234567",
        email: "ahmed@razatextiles.pk",
        businessType: "Textile",
        city: "Lahore",
        source: "Facebook",
        requirement: "Inventory and billing system for 3 outlets",
        budget: "5 lakh",
        timeline: "1–3 months",
        tags: "textile, priority",
      }),
      example({
        name: "Sana Malik",
        businessName: "City Care Pharmacy",
        phone: "+92 321 7654321",
        city: "Lahore",
        source: "Walk-in",
        requirement: "POS with stock expiry alerts",
      }, false),
    ],
    "heapware-leads-template.xlsx",
  );
}

/** Exports rows that weren't imported, with the reason, so they can be fixed and re-uploaded. */
export function downloadSkippedRows(
  rows: { row: number; reason: string; lead?: DraftRow["lead"] }[],
  sourceLabel: (key: string) => string,
  customFields: CustomFieldDefinition[] = [],
) {
  return saveWorkbook(
    rows.map(({ row, reason, lead }) => ({
      "Row in original file": row,
      Reason: reason,
      "Contact name": lead?.name ?? "",
      "Business name": lead?.businessName ?? "",
      Phone: lead?.phone ?? "",
      Email: lead?.email ?? "",
      City: lead?.city ?? "",
      Source: lead ? sourceLabel(lead.source) : "",
      Requirement: lead?.requirement ?? "",
      Budget: lead?.budget ?? "",
      ...Object.fromEntries(
        customFields.map((f) => {
          const value = lead?.customFields?.[f.key];
          return [f.label, typeof value === "boolean" ? (value ? "Yes" : "No") : (value ?? "")];
        }),
      ),
    })),
    "leads-not-imported.xlsx",
  );
}
