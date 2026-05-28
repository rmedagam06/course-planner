export default function Legend() {
  const items = [
    { color: "bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-300", label: "Critical Path" },
    { color: "bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700 text-teal-600 dark:text-teal-300", label: "Shared (Double Major)" },
    { color: "bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-300", label: "Standard Course" },
    { color: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300", label: "Elective (auto-picked)" },
    { color: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-300", label: "Heavy Semester" },
  ];

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {items.map(({ color, label }) => (
        <div key={label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium ${color}`}>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
