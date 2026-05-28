"use client";
import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";

export interface UploadedFile {
  name: string;
  content: string;
  majorName: string;
}

interface Props {
  files: UploadedFile[];
  onAdd: (files: UploadedFile[]) => void;
  onRemove: (name: string) => void;
  onRename: (name: string, majorName: string) => void;
}

export default function FileUpload({ files, onAdd, onRemove, onRename }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const handleRawFiles = async (rawFiles: FileList | File[]) => {
    const arr = Array.from(rawFiles).filter((f) => f.name.endsWith(".csv"));
    const parsed: UploadedFile[] = await Promise.all(
      arr.map(async (f) => ({
        name: f.name,
        content: await readFile(f),
        majorName: f.name.replace(/\.csv$/i, ""),
      }))
    );
    // Only add files that aren't already loaded
    const fresh = parsed.filter((p) => !files.find((f) => f.name === p.name));
    if (fresh.length > 0) onAdd(fresh);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleRawFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
          ${dragging
            ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
            : "border-neutral-200 dark:border-neutral-700 hover:border-violet-300 dark:hover:border-violet-600 bg-neutral-50 dark:bg-neutral-800/50"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleRawFiles(e.target.files)}
        />
        <Upload className="mx-auto mb-3 text-violet-400" size={36} />
        <p className="font-semibold text-neutral-700 dark:text-neutral-200">
          Drop CSV files here or click to browse
        </p>
        <p className="text-sm text-neutral-400 mt-1">
          Each file = one major. Upload multiple for a double major.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 shadow-sm border border-neutral-100 dark:border-neutral-700"
            >
              <FileText size={18} className="text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">
                  {f.name}
                </p>
                <input
                  value={f.majorName}
                  onChange={(e) => onRename(f.name, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Major name..."
                  className="text-xs text-neutral-500 bg-transparent border-b border-dashed border-neutral-300 dark:border-neutral-600 outline-none w-full mt-0.5 focus:border-violet-400"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(f.name); }}
                className="text-neutral-400 hover:text-red-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
