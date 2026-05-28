"use client";
import { Course } from "@/lib/types";

interface Props {
  course: Course;
  isOnCriticalPath?: boolean;
  isBottleneck?: boolean;
  compact?: boolean;
}

export default function CourseTag({ course, isOnCriticalPath, isBottleneck, compact }: Props) {
  const base =
    "rounded-lg border text-left transition-all duration-150 cursor-default select-none";

  let colorClass = "";
  if (isOnCriticalPath) {
    colorClass =
      "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300";
  } else if (isBottleneck) {
    colorClass =
      "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300";
  } else if (course.isShared) {
    colorClass =
      "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300";
  } else {
    colorClass =
      "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300";
  }

  if (compact) {
    return (
      <div className={`${base} ${colorClass} px-2 py-1 text-xs font-medium`}>
        <span>{course.code}</span>
        <span className="ml-1 opacity-60">({course.credits}cr)</span>
      </div>
    );
  }

  return (
    <div className={`${base} ${colorClass} px-3 py-2 group relative`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">{course.code}</p>
          <p className="text-xs opacity-75 leading-tight mt-0.5 truncate">{course.name}</p>
        </div>
        <span className="text-xs font-bold opacity-80 shrink-0">{course.credits}cr</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {isOnCriticalPath && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-800/50 text-rose-600 dark:text-rose-300 font-medium">
            Critical Path
          </span>
        )}
        {course.isShared && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-800/50 text-teal-600 dark:text-teal-300 font-medium">
            Shared
          </span>
        )}
        {course.electiveGroup && course.electiveSelected !== false && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-300 font-medium"
            title={`Elective pool: ${course.electiveGroup}`}>
            Elective
          </span>
        )}
        {course.prerequisites.length > 0 && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-medium opacity-70"
            title={`Prereqs: ${course.prerequisites.join(", ")}`}
          >
            {course.prerequisites.length} prereq{course.prerequisites.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
