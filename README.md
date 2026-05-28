# Degree Planner

A smart, browser-based degree planning tool that takes your university course CSV files and generates an optimized semester-by-semester schedule — automatically respecting prerequisites, handling double majors, and minimizing the total number of semesters needed to graduate.

Built for GT-style course sheets but designed to work with any structured CSV export.

---

## Features

- **Prerequisite-aware scheduling** — Courses are placed using a topological sort (Kahn's algorithm) so that no course ever appears in the same semester as its prerequisite or earlier.
- **Minimum-semester optimization** — A wave-based greedy scheduler fills each semester to your chosen credit cap before opening the next, producing the most compressed plan possible.
- **Elective pool support** — Declare "pick N credits from this list" groups in your CSV. The planner automatically selects the easiest qualifying subset (fewest prerequisites, shallowest chains) and skips the rest.
- **Double major support** — Upload multiple CSVs simultaneously. Shared courses are detected, deduplicated, and highlighted across both degree maps.
- **Status-aware** — Mark courses as `Complete` in your CSV and the planner accounts for them as satisfied prerequisites without re-scheduling them.
- **Critical path analysis** — Identifies the longest prerequisite chain in your degree and surfaces it so you know which courses to prioritize.
- **Timeline fit check** — Set how many semesters you have left. The planner warns you (and highlights overflowing semesters in red) if the plan exceeds your timeline.
- **Dark mode** — Full light/dark theme with a single toggle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| CSV Parsing | [PapaParse](https://www.papaparse.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Scheduling | Custom topological sort + wave-based greedy scheduler |

---

## CSV Format

The planner auto-detects two formats:

### GT-style (recommended)

```csv
Status,Course Code,Course Name,Credits,Prerequisite(s),Elective Group,Credits Needed
Complete,CS 1301,Intro to Computing,3,None,,
Complete,MATH 1551,Differential Calculus,2,None,,
Not Complete,CS 1331,Intro to OOP,3,CS 1301,,
Not Complete,CS 3600,Intro to AI,3,CS 2110 & MATH 3012,,
Not Complete,CS 4641,Machine Learning,3,CS 3600,,
Not Complete,CS 4476,Computer Vision,3,CS 3600,Perception Thread,9
Not Complete,CS 3630,Robotics & Perception,3,CS 2110,Perception Thread,9
Not Complete,CS 4649,Robot Intelligence,3,CS 3630,Perception Thread,9
```

- **Status**: `Complete` or `Not Complete`
- **Prerequisite(s)**: Supports `&` (AND), `or` / `/` (OR), and `Coreq:` prefix
- **Elective Group** + **Credits Needed**: Optional. Groups courses into a pool; the planner picks just enough credits to satisfy the requirement.

### Simple format

```csv
course_code,course_name,credits,prerequisites
CS 1301,Intro to Computing,3,
CS 1331,Intro to OOP,3,CS 1301
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (comes with Node)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/rmedagam06/course-planner.git
cd course-planner

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## How It Works

1. **Upload** one or more CSV files (one per major).
2. **Set your constraints** — max credits per semester and how many semesters you have left.
3. **Generate** — the planner runs:
   - Prerequisite graph construction
   - Elective pool selection (easiest-first greedy pick)
   - Topological sort for ordering
   - Wave-based semester packing to minimize total semesters
   - Critical path detection
4. **Review** the semester grid, elective pool summary, warnings, and critical path — then adjust your CSV and regenerate as needed.
