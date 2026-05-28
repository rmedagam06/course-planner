"use client";
import { Semester } from "@/lib/types";
import CourseTag from "./CourseTag";

interface Props {
  semester: Semester;
  maxCredits: number;
  semLimit: number | null;
  criticalPath: string[];
  bottleneck: boolean;
}

export default function SemesterCard({ semester, maxCredits, semLimit, criticalPath, bottleneck }: Props) {
  const overTimeline = semLimit !== null && semester.number > semLimit;
  const pct = (semester.totalCredits / maxCredits) * 100;

  const barColor =
    pct >= 90
      ? "bg-rose-400"
      : pct >= 70
      ? "bg-amber-400"
      : "bg-violet-400";

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 shadow-sm hover:shadow-md
        ${overTimeline
          ? "border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
          : bottleneck
          ? "border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
          : "border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800/60"
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-100">
            Semester {semester.number}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {semester.courses.length} course{semester.courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${bottleneck ? "text-amber-500" : "text-violet-500"}`}>
            {semester.totalCredits}
          </p>
          <p className="text-xs text-neutral-400">/ {maxCredits} cr</p>
        </div>
      </div>

      {/* Credit bar */}
      <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Courses */}
      <div className="flex flex-col gap-2">
        {semester.courses.map((course) => (
          <CourseTag
            key={course.code}
            course={course}
            isOnCriticalPath={criticalPath.includes(course.code)}
          />
        ))}
      </div>

      {overTimeline && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium mt-1">
          <span>⚠</span>
          <span>Outside your timeline</span>
        </div>
      )}
      {!overTimeline && bottleneck && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
          <span>⚠</span>
          <span>Heavy semester</span>
        </div>
      )}
    </div>
  );
}
