import { Course, ElectiveGroupSummary, FeasibilityResult, ScheduleResult, Semester } from "./types";

/**
 * For each elective pool ("pick N credits from this list"), automatically selects
 * the easiest subset of courses that satisfies the credit requirement.
 *
 * Mutates courses in-place by setting `electiveSelected` on each pooled course.
 * Returns a summary of what was selected/skipped per group.
 */
export function selectElectives(courses: Map<string, Course>): ElectiveGroupSummary[] {
  // Group courses by their electiveGroup
  const groups = new Map<string, Course[]>();
  for (const course of courses.values()) {
    if (!course.electiveGroup) continue;
    if (!groups.has(course.electiveGroup)) groups.set(course.electiveGroup, []);
    groups.get(course.electiveGroup)!.push(course);
  }

  const summaries: ElectiveGroupSummary[] = [];

  for (const [groupName, groupCourses] of groups) {
    // creditsNeeded = max value seen across all rows in the group
    const creditsNeeded = Math.max(
      ...groupCourses.map((c) => c.electiveGroupCredits ?? 0)
    );

    // Credits already satisfied by completed courses
    const completedInGroup = groupCourses.filter((c) => c.status === "complete");
    const creditsSatisfied = completedInGroup.reduce((s, c) => s + c.credits, 0);

    const stillNeeded = Math.max(0, creditsNeeded - creditsSatisfied);
    const notComplete = groupCourses.filter((c) => c.status !== "complete");

    // Ease score: lower = easier = prefer first
    // 0 = no prerequisites at all
    // 1 = all prerequisites already complete
    // 2 = prerequisites in the course list but not complete
    // 3+ = deep prerequisite chains
    const easeScore = (c: Course): number => {
      if (c.prerequisites.length === 0) return 0;
      const inList = c.prerequisites.filter((p) => courses.has(p));
      if (inList.length === 0) return 1; // all prereqs are external (assumed done)
      const allComplete = inList.every((p) => courses.get(p)?.status === "complete");
      if (allComplete) return 1;
      return 2 + inList.length; // rough proxy for chain depth
    };

    const sorted = [...notComplete].sort((a, b) => easeScore(a) - easeScore(b));

    const selected: Course[] = [];
    const skipped: Course[] = [];
    let filled = 0;

    for (const c of sorted) {
      if (filled < stillNeeded) {
        c.electiveSelected = true;
        selected.push(c);
        filled += c.credits;
      } else {
        c.electiveSelected = false;
        skipped.push(c);
      }
    }

    summaries.push({ name: groupName, creditsNeeded, creditsSatisfied, selected, skipped });
  }

  return summaries;
}

// Topological sort using Kahn's algorithm.
// Cycle-safe: if cycles exist, remaining nodes are appended in arbitrary order.
// Missing prerequisites (not in the map) are simply ignored.
function topoSort(courses: Map<string, Course>): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // prereq → dependents

  for (const code of courses.keys()) {
    inDegree.set(code, 0);
    adj.set(code, []);
  }

  for (const [code, course] of courses) {
    for (const prereq of course.prerequisites) {
      if (!courses.has(prereq)) continue; // missing prereq = ignore
      adj.get(prereq)!.push(code);
      inDegree.set(code, (inDegree.get(code) ?? 0) + 1);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([c]) => c);

  const order: string[] = [];
  while (queue.length > 0) {
    queue.sort((a, b) => (adj.get(a)?.length ?? 0) - (adj.get(b)?.length ?? 0));
    const node = queue.shift()!;
    order.push(node);
    for (const dep of adj.get(node) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  // Append any remaining nodes (caught in cycles) — break cycles gracefully
  for (const code of courses.keys()) {
    if (!order.includes(code)) order.push(code);
  }

  return order;
}

// Compute longest dependency chain length per node (for critical path)
function computeChainLengths(courses: Map<string, Course>): Map<string, number> {
  const memo = new Map<string, number>();
  const visiting = new Set<string>(); // cycle guard

  function chain(code: string): number {
    if (memo.has(code)) return memo.get(code)!;
    if (visiting.has(code)) { memo.set(code, 1); return 1; } // break cycle
    visiting.add(code);
    const course = courses.get(code);
    const prereqs = (course?.prerequisites ?? []).filter((p) => courses.has(p));
    const val = prereqs.length === 0 ? 1 : Math.max(...prereqs.map(chain)) + 1;
    memo.set(code, val);
    visiting.delete(code);
    return val;
  }

  for (const code of courses.keys()) chain(code);
  return memo;
}

// Walk back the longest prereq chain to find critical path courses
function findCriticalPathCourses(courses: Map<string, Course>): string[] {
  const chainLen = computeChainLengths(courses);
  if (chainLen.size === 0) return [];

  const maxLen = Math.max(...chainLen.values());
  let endNode = "";
  for (const [code, len] of chainLen) {
    if (len === maxLen) { endNode = code; break; }
  }

  const path: string[] = [];
  const visited = new Set<string>(); // cycle guard
  let current = endNode;
  while (current && !visited.has(current)) {
    path.unshift(current);
    visited.add(current);
    const course = courses.get(current);
    const validPrereqs = (course?.prerequisites ?? []).filter((p) => courses.has(p));
    if (validPrereqs.length === 0) break;
    current = validPrereqs.reduce((best, p) =>
      (chainLen.get(p) ?? 0) > (chainLen.get(best) ?? 0) ? p : best
    );
  }

  return path;
}

// Feasibility: always returns feasible=true.
// Missing prereqs and cycles are treated as warnings, not hard blocks.
export function checkFeasibility(courses: Map<string, Course>): FeasibilityResult {
  const warnings: string[] = [];

  // Note shared courses
  for (const course of courses.values()) {
    if (course.isShared) {
      warnings.push(
        `${course.code} (${course.name}) is shared between: ${course.majors.join(" & ")}`
      );
    }
  }

  // Note missing prereqs (assumed satisfied — user just hasn't listed them)
  for (const [code, course] of courses) {
    if (course.status === "complete") continue;
    const missing = course.prerequisites.filter((p) => !courses.has(p));
    if (missing.length > 0) {
      warnings.push(
        `${code} lists prereqs not in your CSV (${missing.join(", ")}) — assumed satisfied`
      );
    }
  }

  return { feasible: true, issues: [], warnings, cycles: [], missingPrereqs: [] };
}

export function buildSchedule(
  courses: Map<string, Course>,
  maxCredits: number
): ScheduleResult {
  const chainLen = computeChainLengths(courses);

  // placed: code → semester the course is "done" (0 = already complete, −1 = skipped elective)
  const placed = new Map<string, number>();
  for (const [code, course] of courses) {
    if (course.status === "complete") placed.set(code, 0);
    // Skipped electives are removed from scheduling and treated as non-blocking
    if (course.electiveGroup !== undefined && course.electiveSelected === false) placed.set(code, 0);
  }

  // pending: codes still needing a semester slot
  const pending = new Set<string>(
    [...courses.keys()].filter((c) => !placed.has(c))
  );

  const semesters: Map<number, Course[]> = new Map();
  let sem = 1;
  const MAX_ITER = 500; // safety cap
  let iter = 0;

  while (pending.size > 0 && iter++ < MAX_ITER) {
    // A course is "ready" for semester `sem` when every prerequisite that exists in the
    // course map has been placed in a STRICTLY EARLIER semester.
    const ready = [...pending].filter((code) => {
      const course = courses.get(code)!;
      return course.prerequisites
        .filter((p) => courses.has(p))
        .every((p) => {
          const ps = placed.get(p);
          return ps !== undefined && ps < sem;
        });
    });

    if (ready.length === 0) {
      // No course is ready yet — advance to the next semester and try again.
      sem++;
      continue;
    }

    // Sort ready courses to fill this semester optimally:
    //   1. Chain length DESC — critical path courses go first so their dependents
    //      can be unlocked as early as possible.
    //   2. Credits DESC — among same-priority courses, larger ones first (avoids
    //      wasting space that only small courses could fill).
    ready.sort((a, b) => {
      const cd = (chainLen.get(b) ?? 0) - (chainLen.get(a) ?? 0);
      if (cd !== 0) return cd;
      return (courses.get(b)?.credits ?? 0) - (courses.get(a)?.credits ?? 0);
    });

    // Greedy fill: take courses in priority order until the semester is full.
    semesters.set(sem, []);
    let used = 0;

    for (const code of ready) {
      const course = courses.get(code)!;
      if (used + course.credits <= maxCredits) {
        semesters.get(sem)!.push(course);
        placed.set(code, sem);
        pending.delete(code);
        used += course.credits;
      }
    }

    // Safety: if nothing fit (all ready courses individually exceed maxCredits),
    // force-place the smallest one to guarantee forward progress.
    if (semesters.get(sem)!.length === 0) {
      const smallest = [...ready].sort(
        (a, b) => (courses.get(a)?.credits ?? 0) - (courses.get(b)?.credits ?? 0)
      )[0];
      const course = courses.get(smallest)!;
      semesters.get(sem)!.push(course);
      placed.set(smallest, sem);
      pending.delete(smallest);
    }

    sem++;
  }

  const toSchedule = [...courses.keys()].filter((c) => {
    const course = courses.get(c);
    if (!course || course.status === "complete") return false;
    if (course.electiveGroup !== undefined && course.electiveSelected === false) return false;
    return true;
  });

  const semesterList: Semester[] = [...semesters.keys()]
    .sort((a, b) => a - b)
    .map((num) => {
      const cs = semesters.get(num)!;
      return { number: num, courses: cs, totalCredits: cs.reduce((s, c) => s + c.credits, 0) };
    });

  const remainingCredits = toSchedule.reduce(
    (s, c) => s + (courses.get(c)?.credits ?? 0), 0
  );

  const avgCredits = semesterList.length > 0
    ? semesterList.reduce((s, sem) => s + sem.totalCredits, 0) / semesterList.length
    : 0;

  const bottleneckSemesters = semesterList
    .filter((s) => s.totalCredits >= maxCredits * 0.9)
    .map((s) => s.number);

  const warnings: string[] = [];
  if (bottleneckSemesters.length > 0) {
    warnings.push(
      `Heavy semesters (≥90% of limit): ${bottleneckSemesters.map((n) => `Semester ${n}`).join(", ")}`
    );
  }
  if (semesterList.length > 2) {
    const imbalanced = semesterList.filter(
      (s) => Math.abs(s.totalCredits - avgCredits) > avgCredits * 0.4
    );
    if (imbalanced.length > 0) {
      warnings.push("Workload varies across semesters — consider manual rebalancing.");
    }
  }

  // Collect elective group summaries from course metadata (set by selectElectives)
  const electiveGroups = (() => {
    const groups = new Map<string, { creditsNeeded: number; creditsSatisfied: number; selected: Course[]; skipped: Course[] }>();
    for (const course of courses.values()) {
      if (!course.electiveGroup) continue;
      if (!groups.has(course.electiveGroup)) {
        groups.set(course.electiveGroup, { creditsNeeded: course.electiveGroupCredits ?? 0, creditsSatisfied: 0, selected: [], skipped: [] });
      }
      const g = groups.get(course.electiveGroup)!;
      if (course.status === "complete") {
        g.creditsSatisfied += course.credits;
      } else if (course.electiveSelected === false) {
        g.skipped.push(course);
      } else {
        g.selected.push(course);
      }
    }
    return [...groups.entries()].map(([name, g]) => ({ name, ...g }));
  })();

  return {
    semesters: semesterList,
    totalSemesters: semesterList.length,
    totalCredits: remainingCredits,
    criticalPath: findCriticalPathCourses(courses),
    bottleneckSemesters,
    warnings,
    electiveGroups,
  };
}
