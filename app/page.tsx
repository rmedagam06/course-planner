"use client";
import { useState } from "react";
import {
  GraduationCap, Moon, Sun, Zap, AlertTriangle, CheckCircle2,
  XCircle, ChevronRight, Download, RotateCcw, BookOpen, Clock,
} from "lucide-react";
import FileUpload, { UploadedFile } from "@/components/FileUpload";
import SemesterCard from "@/components/SemesterCard";
import Legend from "@/components/Legend";
import { parseCSV } from "@/lib/csvParser";
import { checkFeasibility, selectElectives, buildSchedule } from "@/lib/graph";
import { Course, ElectiveGroupSummary, FeasibilityResult, ScheduleResult } from "@/lib/types";

function rebuildCourses(files: UploadedFile[]): { courses: Map<string, Course>; errors: string[] } {
  let merged = new Map<string, Course>();
  const allErrors: string[] = [];
  for (const f of files) {
    const { courses, errors } = parseCSV(f.content, f.majorName, merged);
    merged = courses;
    allErrors.push(...errors);
  }
  return { courses: merged, errors: allErrors };
}

export default function Home() {
  const [dark, setDark] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [courses, setCourses] = useState<Map<string, Course>>(new Map());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [maxCredits, setMaxCredits] = useState(18);
  const [semestersLeft, setSemestersLeft] = useState<number | "">(8);
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [generated, setGenerated] = useState(false);

  const applyFiles = (nextFiles: UploadedFile[]) => {
    setFiles(nextFiles);
    setGenerated(false);
    setFeasibility(null);
    setSchedule(null);
    const { courses: parsed, errors } = rebuildCourses(nextFiles);
    setCourses(parsed);
    setParseErrors(errors);
  };

  const handleAdd = (fresh: UploadedFile[]) => applyFiles([...files, ...fresh]);
  const handleRemove = (name: string) => applyFiles(files.filter((f) => f.name !== name));
  const handleRename = (name: string, majorName: string) =>
    applyFiles(files.map((f) => (f.name === name ? { ...f, majorName } : f)));

  const generate = () => {
    if (courses.size === 0) return;
    const feas = checkFeasibility(courses);
    setFeasibility(feas);
    // selectElectives mutates courses in-place to mark electiveSelected before scheduling
    selectElectives(courses);
    setSchedule(buildSchedule(courses, maxCredits));
    setGenerated(true);
  };

  const reset = () => {
    setFiles([]);
    setCourses(new Map());
    setParseErrors([]);
    setFeasibility(null);
    setSchedule(null);
    setGenerated(false);
  };

  const exportJSON = () => {
    if (!schedule) return;
    const data = {
      totalSemesters: schedule.totalSemesters,
      totalCredits: schedule.totalCredits,
      criticalPath: schedule.criticalPath,
      semesters: schedule.semesters.map((s) => ({
        semester: s.number,
        credits: s.totalCredits,
        courses: s.courses.map((c) => ({
          code: c.code, name: c.name, credits: c.credits, prerequisites: c.prerequisites,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "degree-plan.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const allCourses = [...courses.values()];
  const majors = [...new Set(allCourses.flatMap((c) => c.majors))];
  const completedCourses = allCourses.filter((c) => c.status === "complete");
  const remainingCourses = allCourses.filter((c) => c.status !== "complete");
  const completedCredits = completedCourses.reduce((s, c) => s + c.credits, 0);
  const totalAllCredits = allCourses.reduce((s, c) => s + c.credits, 0);

  const semLimit = typeof semestersLeft === "number" && semestersLeft > 0 ? semestersLeft : null;
  const overLimit = semLimit !== null && schedule !== null && schedule.totalSemesters > semLimit;
  const fitsExactly = semLimit !== null && schedule !== null && schedule.totalSemesters <= semLimit;

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">

        {/* Nav */}
        <nav className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-100 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <GraduationCap size={24} className="text-violet-500" />
              <span className="font-bold text-lg tracking-tight">Degree Planner</span>
            </div>
            <div className="flex items-center gap-3">
              {generated && schedule && (
                <button onClick={exportJSON} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <Download size={14} /> Export JSON
                </button>
              )}
              {generated && (
                <button onClick={reset} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              )}
              <button onClick={() => setDark((d) => !d)} className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">

          {!generated && (
            <div className="text-center space-y-3 py-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Plan your degree,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
                  stress-free
                </span>
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
                Upload your course CSV files, set your limits, and get an optimized semester-by-semester plan.
              </p>
            </div>
          )}

          {!generated && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Upload panel */}
              <div className="bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <BookOpen size={16} className="text-violet-500" /> Upload Course CSVs
                </h2>
                <FileUpload files={files} onAdd={handleAdd} onRemove={handleRemove} onRename={handleRename} />
                {/* Status-column explanation */}
                <div className="text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-700/40 rounded-xl p-3 space-y-1">
                  <p className="font-medium text-neutral-500 dark:text-neutral-300">CSV Status column</p>
                  <p>Each row should have a <strong>Status</strong> column with <em>Complete</em> or <em>Not Complete</em>. Completed courses are excluded from the plan but count as satisfied prerequisites.</p>
                </div>
                {parseErrors.length > 0 && (
                  <div className="text-xs text-red-500 space-y-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                    {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>

              {/* Settings + summary */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-6 shadow-sm space-y-6">
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    <Zap size={16} className="text-violet-500" /> Settings
                  </h2>

                  {/* Max credits slider */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-600 dark:text-neutral-300">Max credits / semester</span>
                      <span className="font-bold text-violet-500">{maxCredits} cr</span>
                    </div>
                    <input
                      type="range" min={9} max={24} value={maxCredits}
                      onChange={(e) => setMaxCredits(+e.target.value)}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                      <span>9 (light)</span><span>24 (heavy)</span>
                    </div>
                  </div>

                  {/* Semesters remaining */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                        <Clock size={13} className="text-violet-400" />
                        Semesters I have left
                      </span>
                      <span className="font-bold text-violet-500">
                        {semestersLeft === "" ? "—" : semestersLeft}
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={16} value={semestersLeft === "" ? 8 : semestersLeft}
                      onChange={(e) => setSemestersLeft(+e.target.value)}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                      <span>1</span><span>16</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Used to check whether your plan fits your timeline.
                    </p>
                  </div>
                </div>

                {/* Parsed course summary */}
                {courses.size > 0 && (
                  <div className="bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                      Courses loaded
                    </h3>

                    {/* Status breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCourses.length}</p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Complete</p>
                      </div>
                      <div className="bg-violet-50 dark:bg-violet-900/30 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{remainingCourses.length}</p>
                        <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">Not Complete</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {completedCourses.length > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Degree progress</span>
                          <span>{completedCredits} / {totalAllCredits} cr ({Math.round(completedCredits / totalAllCredits * 100)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                            style={{ width: `${(completedCredits / totalAllCredits) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {majors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {majors.map((m) => (
                          <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!generated && (
            <div className="flex justify-center">
              <button
                onClick={generate}
                disabled={courses.size === 0}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white
                  bg-gradient-to-r from-violet-500 to-fuchsia-500
                  hover:from-violet-600 hover:to-fuchsia-600
                  disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg shadow-violet-200 dark:shadow-violet-900/40
                  transition-all duration-200 active:scale-95"
              >
                <Zap size={18} /> Generate Plan
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {generated && feasibility && schedule && (
            <div className="space-y-8">

              {/* Timeline fit banner */}
              {overLimit ? (
                <div className="rounded-2xl p-5 border flex items-start gap-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                  <XCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-lg text-red-700 dark:text-red-300">
                      Doesn&apos;t fit in your timeline
                    </h2>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
                      Your plan needs <strong>{schedule.totalSemesters} semesters</strong> but you said you have <strong>{semLimit}</strong>.
                      Try raising the credit limit or reducing courses.
                    </p>
                  </div>
                </div>
              ) : fitsExactly ? (
                <div className="rounded-2xl p-5 border flex items-start gap-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                  <CheckCircle2 size={24} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
                      Fits your timeline ✓
                    </h2>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      {schedule.totalSemesters} semesters needed out of {semLimit} available
                      {completedCourses.length > 0 && ` · ${completedCourses.length} already done`}
                      {majors.length > 1 && ` · ${majors.length} majors merged`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 border flex items-start gap-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700">
                  <CheckCircle2 size={24} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
                      Plan is Feasible
                    </h2>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      {remainingCourses.length} courses to go across {schedule.totalSemesters} semesters
                      {completedCourses.length > 0 && ` · ${completedCourses.length} already completed`}
                      {majors.length > 1 && ` · ${majors.length} majors merged`}
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {([...feasibility.warnings, ...schedule.warnings].length > 0) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {[...feasibility.warnings, ...schedule.warnings].map((w, i) => (
                      <p key={i} className="text-sm text-amber-700 dark:text-amber-300">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Already completed */}
              {completedCourses.length > 0 && (
                <CompletedSummary courses={completedCourses} totalCredits={completedCredits} />
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <BigStat label="Semesters Needed" value={schedule.totalSemesters} accent={overLimit ? "red" : "violet"} />
                <BigStat label="Credits Remaining" value={schedule.totalCredits} accent="fuchsia" />
                <BigStat label="Courses Left" value={remainingCourses.length} accent="sky" />
                <BigStat label="Already Done" value={completedCourses.length} accent="emerald" />
              </div>

              {/* Elective groups */}
              {schedule.electiveGroups.length > 0 && (
                <ElectiveGroupsPanel groups={schedule.electiveGroups} />
              )}

              {/* Critical path */}
              {schedule.criticalPath.filter((c) => courses.get(c)?.status !== "complete").length > 0 && (
                <div className="bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5 shadow-sm">
                  <h3 className="font-semibold text-sm text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                    Critical Path — longest prerequisite chain remaining
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {schedule.criticalPath
                      .filter((c) => courses.get(c)?.status !== "complete")
                      .map((code, i, arr) => (
                        <span key={code} className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-300 font-medium">
                            {code}
                          </span>
                          {i < arr.length - 1 && <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600" />}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Semester grid */}
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="font-bold text-xl">Semester Plan</h2>
                    {semLimit && (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {schedule.totalSemesters} of {semLimit} semesters used
                        {overLimit && <span className="text-red-500 font-medium"> — over by {schedule.totalSemesters - semLimit}</span>}
                      </p>
                    )}
                  </div>
                  <Legend />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedule.semesters.map((sem) => (
                    <SemesterCard
                      key={sem.number}
                      semester={sem}
                      maxCredits={maxCredits}
                      semLimit={semLimit}
                      criticalPath={schedule.criticalPath}
                      bottleneck={schedule.bottleneckSemesters.includes(sem.number)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <RotateCcw size={14} /> Start Over
                </button>
                <button onClick={exportJSON} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white transition-colors">
                  <Download size={14} /> Export JSON
                </button>
              </div>
            </div>
          )}

          {!generated && files.length === 0 && (
            <div className="text-center">
              <p className="text-sm text-neutral-400 mb-3">No CSV yet? See the expected format:</p>
              <SampleCSV />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ElectiveGroupsPanel({ groups }: { groups: ElectiveGroupSummary[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-indigo-500" />
          <div>
            <p className="font-semibold text-indigo-700 dark:text-indigo-300">
              {groups.length} elective pool{groups.length !== 1 ? "s" : ""} auto-selected
            </p>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
              Easiest courses chosen to satisfy each credit requirement. Click to expand.
            </p>
          </div>
        </div>
        <ChevronRight size={16} className={`text-indigo-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-indigo-200 dark:border-indigo-700 divide-y divide-indigo-100 dark:divide-indigo-800">
          {groups.map((g) => {
            const totalSelected = g.creditsSatisfied + g.selected.reduce((s, c) => s + c.credits, 0);
            return (
              <div key={g.name} className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">{g.name}</p>
                    <p className="text-xs text-indigo-500/80 dark:text-indigo-400/80">
                      {totalSelected} / {g.creditsNeeded} credits satisfied
                      {g.creditsSatisfied > 0 && ` (${g.creditsSatisfied} already complete)`}
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="flex-1 min-w-24 max-w-32 h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{ width: `${Math.min(100, (totalSelected / g.creditsNeeded) * 100)}%` }}
                    />
                  </div>
                </div>

                {g.selected.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1.5">Selected for your plan:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.selected.map((c) => (
                        <span key={c.code} title={`${c.name} (${c.credits} cr)`}
                          className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 font-medium">
                          {c.code} <span className="opacity-60">·{c.credits}cr</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {g.skipped.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-indigo-400/70 dark:text-indigo-500/70 mb-1.5">Skipped (not needed):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.skipped.map((c) => (
                        <span key={c.code} title={`${c.name} (${c.credits} cr)`}
                          className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400 dark:text-indigo-600 border border-indigo-100 dark:border-indigo-800 line-through">
                          {c.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompletedSummary({ courses, totalCredits }: { courses: Course[]; totalCredits: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              {courses.length} courses already completed — {totalCredits} credits
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
              Read from the &quot;Status: Complete&quot; column in your CSV. Click to expand.
            </p>
          </div>
        </div>
        <ChevronRight size={16} className={`text-emerald-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-emerald-200 dark:border-emerald-700 pt-3">
          {courses.map((c) => (
            <span
              key={c.code}
              title={`${c.name} (${c.credits} cr)`}
              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 font-medium"
            >
              {c.code}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BigStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  const colors: Record<string, string> = {
    violet: "from-violet-500 to-violet-600",
    fuchsia: "from-fuchsia-500 to-fuchsia-600",
    sky: "from-sky-500 to-sky-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
  };
  return (
    <div className="bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5 text-center shadow-sm">
      <p className={`text-3xl font-bold bg-gradient-to-br ${colors[accent] ?? colors.violet} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-sm text-neutral-400 mt-1">{label}</p>
    </div>
  );
}

function SampleCSV() {
  const sample = `Status,Course Code,Course Name,Credits,Prerequisite(s)
Complete,CS 1301,Intro to Computing,3,None
Complete,MATH 1551,Differential Calculus,2,None
Not Complete,CS 1331,Intro OOP,3,CS 1301
Not Complete,CS 2050,Discrete Math,3,MATH 1551
Not Complete,CS 2110,Data Structures,4,CS 1331 & CS 2050
Not Complete,CS 3510,Algorithms,3,CS 2110`;

  const download = () => {
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sample-major.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inline-block text-left space-y-2">
      <p className="text-xs text-neutral-400 text-left">Expected format — Status column tells the app what you&apos;ve already taken:</p>
      <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 text-neutral-600 dark:text-neutral-400 font-mono overflow-x-auto max-w-2xl">
        {sample}
      </pre>
      <button onClick={download} className="text-xs text-violet-500 hover:text-violet-600 underline underline-offset-2">
        Download sample CSV
      </button>
    </div>
  );
}
