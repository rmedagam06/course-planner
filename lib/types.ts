export interface Course {
  code: string;
  name: string;
  credits: number;
  prerequisites: string[];   // AND-required prereqs (one picked from each OR group)
  prereqRaw: string;         // original text for display
  majors: string[];
  isShared: boolean;
  status: "complete" | "not_complete" | "unknown";
  // Elective pool fields (optional — only set when the course belongs to a "pick N credits" group)
  electiveGroup?: string;        // name of the pool, e.g. "Society and Systems"
  electiveGroupCredits?: number; // total credits required from this pool
  electiveSelected?: boolean;    // set by selectElectives(): true = include, false = skip
}

export interface ElectiveGroupSummary {
  name: string;
  creditsNeeded: number;
  creditsSatisfied: number; // from completed courses
  selected: Course[];       // courses the scheduler auto-picked
  skipped: Course[];        // courses excluded because pool was already satisfied
}

export interface Semester {
  number: number;
  courses: Course[];
  totalCredits: number;
}

export interface FeasibilityResult {
  feasible: boolean;
  issues: string[];
  warnings: string[];
  cycles: string[][];
  missingPrereqs: { course: string; missing: string[] }[];
}

export interface ScheduleResult {
  semesters: Semester[];
  totalSemesters: number;
  totalCredits: number;
  criticalPath: string[];
  bottleneckSemesters: number[];
  warnings: string[];
  electiveGroups: ElectiveGroupSummary[];
}

export interface PlanState {
  courses: Map<string, Course>;
  feasibility: FeasibilityResult | null;
  schedule: ScheduleResult | null;
  maxCredits: number;
  uploadedFiles: { name: string; majorName: string }[];
}
