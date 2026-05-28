import Papa from "papaparse";
import { Course } from "./types";

// Normalize a raw course code string: "CS  1301 " → "CS 1301"
function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/, " ");
}

// Extract all course-code-like tokens from a string, e.g. "CS 1332", "MATH1554"
function extractCodesFromText(text: string): string[] {
  const matches = text.match(/[A-Z]{2,5}\s*\d+[A-Z]?/gi) ?? [];
  return matches.map((m) => normalizeCode(m));
}

/**
 * Parse a prerequisite string into a flat list of required course codes.
 *
 * Logic:
 *   1. Strip "Coreq:" prefixes and parenthetical annotations like "(CC)"
 *   2. Truncate at a period that's followed by non-course text (catches trailing prose)
 *   3. Split on "&" or "and" → each part is an AND requirement
 *   4. Within each AND part, split on "or" or "/" → these are OR alternatives
 *   5. From each OR group, prefer a code that is already completed; else take the first
 */
function parsePrerequisites(
  raw: string,
  completedCodes: Set<string>
): string[] {
  if (!raw || /^none$/i.test(raw.trim())) return [];

  let s = raw;

  // Strip coreq prefix
  s = s.replace(/coreq:\s*/gi, "");

  // Strip parenthetical annotations: (CC), (min grade C), etc.
  s = s.replace(/\([^)]*\)/g, "");

  // Truncate at a period that's followed by a space + non-course text
  // e.g. "MATH 2550. Can you figure out..." → "MATH 2550"
  const dotIdx = s.indexOf(". ");
  if (dotIdx !== -1) s = s.slice(0, dotIdx);

  // Split on AND operators
  const andParts = s.split(/\s*&\s*|\s+and\s+/i);

  const result: string[] = [];
  for (const part of andParts) {
    // Split on OR operators
    const orOptions = part
      .split(/\s+or\s+|\s*\/\s*/i)
      .map((o) => o.trim())
      .filter(Boolean);

    // Extract course codes from each OR option (ignore loose prose)
    const codeLists: string[][] = orOptions.map(extractCodesFromText);
    const flatOptions = codeLists.flat();
    if (flatOptions.length === 0) continue;

    // Prefer an already-complete course, else take the first listed
    const preferred =
      flatOptions.find((c) => completedCodes.has(c)) ?? flatOptions[0];
    result.push(preferred);
  }

  // Deduplicate
  return [...new Set(result)];
}

// ────────────────────────────────────────────────────────────────────────────
// GT-style format:  Status | Course Code | Course Name | Credits | Prerequisite(s)
//   - Has empty rows used as dividers
//   - Has section-header rows (first col = label, rest empty)
//   - Header row may repeat multiple times
// ────────────────────────────────────────────────────────────────────────────
function parseGTFormat(
  rows: string[][],
  majorName: string,
  existing: Map<string, Course>,
  errors: string[]
): Map<string, Course> {
  const result = new Map(existing);

  // First pass: collect all completed codes so OR-prereq picking can be informed
  const completedCodes = new Set<string>();
  for (const row of rows) {
    const status = row[0]?.trim().toLowerCase();
    const code = row[1]?.trim();
    if (status === "complete" && code) completedCodes.add(normalizeCode(code));
  }
  // Also include codes from existing map that are complete
  for (const [code, c] of existing) {
    if (c.status === "complete") completedCodes.add(code);
  }

  for (const row of rows) {
    const statusRaw = row[0]?.trim() ?? "";
    const codeRaw = row[1]?.trim() ?? "";
    const name = row[2]?.trim() ?? "";
    const creditsRaw = row[3]?.trim() ?? "";
    const prereqRaw = row[4]?.trim() ?? "";
    const electiveGroupRaw = row[5]?.trim() ?? "";
    const electiveCreditsRaw = row[6]?.trim() ?? "";

    // Skip blank rows
    if (!codeRaw) continue;

    // Skip header rows (repeated)
    if (
      statusRaw.toLowerCase() === "status" &&
      codeRaw.toLowerCase() === "course code"
    )
      continue;

    // Skip section-title rows (codeRaw looks like prose, not a course code)
    if (!/^[A-Z]{2,5}\s+\d+/.test(codeRaw.toUpperCase())) continue;

    const code = normalizeCode(codeRaw);

    const credits = parseInt(creditsRaw, 10);
    if (isNaN(credits) || credits < 0) {
      errors.push(`${code}: invalid credits "${creditsRaw}"`);
      continue;
    }

    const status: Course["status"] =
      statusRaw.toLowerCase() === "complete"
        ? "complete"
        : statusRaw.toLowerCase().includes("not")
        ? "not_complete"
        : "unknown";

    const prerequisites = parsePrerequisites(prereqRaw, completedCodes);

    const electiveGroup = electiveGroupRaw || undefined;
    const electiveGroupCredits = electiveCreditsRaw
      ? parseInt(electiveCreditsRaw, 10) || undefined
      : undefined;

    if (result.has(code)) {
      const existing = result.get(code)!;
      if (!existing.majors.includes(majorName)) {
        existing.majors.push(majorName);
        existing.isShared = true;
      }
      // Merge elective group info if newly provided
      if (electiveGroup && !existing.electiveGroup) {
        existing.electiveGroup = electiveGroup;
        existing.electiveGroupCredits = electiveGroupCredits;
      }
    } else {
      result.set(code, {
        code,
        name,
        credits,
        prerequisites,
        prereqRaw,
        majors: [majorName],
        isShared: false,
        status,
        electiveGroup,
        electiveGroupCredits,
      });
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Simple format:  course_code | course_name | credits | prerequisites
// ────────────────────────────────────────────────────────────────────────────
function parseSimpleFormat(
  rows: string[][],
  majorName: string,
  existing: Map<string, Course>,
  errors: string[]
): Map<string, Course> {
  const result = new Map(existing);

  for (const row of rows) {
    const codeRaw = row[0]?.trim() ?? "";
    const name = row[1]?.trim() ?? "";
    const creditsRaw = row[2]?.trim() ?? "";
    const prereqRaw = row[3]?.trim() ?? "";

    if (!codeRaw || codeRaw.toLowerCase() === "course_code") continue;

    const code = normalizeCode(codeRaw);
    const credits = parseInt(creditsRaw, 10);
    if (isNaN(credits) || credits < 0) {
      errors.push(`${code}: invalid credits "${creditsRaw}"`);
      continue;
    }

    const prerequisites = prereqRaw
      ? prereqRaw
          .split(/[;,|]/)
          .map((p) => normalizeCode(p))
          .filter(Boolean)
      : [];

    if (result.has(code)) {
      const ex = result.get(code)!;
      if (!ex.majors.includes(majorName)) {
        ex.majors.push(majorName);
        ex.isShared = true;
      }
    } else {
      result.set(code, {
        code,
        name,
        credits,
        prerequisites,
        prereqRaw,
        majors: [majorName],
        isShared: false,
        status: "unknown",
      });
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────
export function parseCSV(
  fileContent: string,
  majorName: string,
  existing: Map<string, Course>
): { courses: Map<string, Course>; errors: string[] } {
  const errors: string[] = [];

  const parsed = Papa.parse<string[]>(fileContent, {
    skipEmptyLines: false, // keep blank rows so we can detect format
  });

  const allRows: string[][] = parsed.data as string[][];

  // Detect format: look for a row where col[0]=Status and col[1] looks like "Course Code"
  const isGTFormat = allRows.some(
    (r) =>
      r[0]?.trim().toLowerCase() === "status" &&
      r[1]?.trim().toLowerCase().includes("course")
  );

  let courses: Map<string, Course>;
  if (isGTFormat) {
    courses = parseGTFormat(allRows, majorName, existing, errors);
  } else {
    // Strip header row (first non-empty row) and parse simple format
    const dataRows = allRows.filter((r) => r.some((c) => c?.trim()));
    // Remove leading header if present
    const header = dataRows[0]?.map((h) => h?.trim().toLowerCase()) ?? [];
    const start = header[0] === "course_code" ? 1 : 0;
    courses = parseSimpleFormat(dataRows.slice(start), majorName, existing, errors);
  }

  return { courses, errors };
}
