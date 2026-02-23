# AGENTS.md - Lando Maintainer Dashboard

A SolidJS + TanStack web dashboard for monitoring GitHub repository health across the `lando` organization. Static site hosted on Netlify with data pre-fetched via GitHub Actions.

**Tech Stack:** SolidJS, TanStack (Solid Query, Solid Table, Solid Router), Tailwind CSS v4, Vite, Bun, Biome, Vitest

## Build/Lint/Test Commands

```bash
bun install              # Install dependencies
bun run dev              # Dev server on port 3000
bun run build            # Production build (catches type errors)
bun run check            # Biome lint + format (ALWAYS run before committing)
bun run test             # Run all Vitest tests
bun run test <pattern>   # Run single test file matching pattern
```

**Quality gate:** ALL commits must pass `bun run build && bun run check`.

## Project Structure

```
src/
├── components/          # UI components (PascalCase.tsx)
├── config/              # Constants (thresholds.ts)
├── queries/             # TanStack Query hooks
├── routes/              # Route components (kebab-case.tsx)
├── types/               # TypeScript interfaces
├── index.tsx            # App entry
├── router.tsx           # Router config
└── styles.css           # Tailwind entry
scripts/
└── fetch-github-data.ts # GitHub data fetcher (CI)
public/data/             # Pre-fetched JSON (served at /data/)
```

## Code Style (Biome)

- **Indentation:** Tabs
- **Quotes:** Double quotes
- **Imports:** Auto-sorted alphabetically; use `import type` for type-only imports
- **Node built-ins:** Use `node:` prefix (e.g., `node:fs`)

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `RepoTable.tsx` |
| Route files | kebab-case | `repo-detail.tsx` |
| Functions | camelCase | `relativeTime` |
| Query hooks | `use` prefix | `useReposOverview` |
| Types | PascalCase | `RepoOverview` |
| Script constants | SCREAMING_CASE | `GITHUB_TOKEN` |

### TypeScript

- **Interfaces** for data models in `src/types/index.ts`
- **Type aliases** for unions: `type Filter = "all" | "issue"`
- **Inline types** for props: `function Foo(props: { label: string }) {}`
- **`as const`** for config objects
- Path alias: `@/*` → `./src/*`

### Error Handling

```typescript
// Scripts: early exit
if (!TOKEN) { console.error("TOKEN required"); process.exit(1); }

// Query hooks: throw
if (!res.ok) throw new Error("Failed to fetch");

// UI: Show with callback
<Show when={query.error}>{(e) => <div>{e().message}</div>}</Show>
```

## SolidJS Patterns (NOT React!)

| SolidJS | React (WRONG) |
|---------|---------------|
| `createSignal()` | `useState()` |
| `createMemo()` | `useMemo()` |
| `<Show when={x}>` | `{x && ...}` |
| `<For each={items}>` | `{items.map(...)}` |
| `props.value` | destructured `{ value }` |

### TanStack Solid Query

```typescript
// Function wrapper REQUIRED for reactivity
export function useReposOverview() {
	return createQuery(() => ({
		queryKey: ["repos-overview"],
		queryFn: async () => { /* ... */ },
		staleTime: 5 * 60 * 1000,
	}));
}
// Access: query.data?.repos
```

### TanStack Solid Table

```typescript
const table = createSolidTable({
	get data() { return query.data?.repos ?? []; },  // Getter required
	columns,
	state: { get sorting() { return sorting(); } },
	onSortingChange: setSorting,
	getCoreRowModel: getCoreRowModel(),
	getSortedRowModel: getSortedRowModel(),
});
```

### TanStack Solid Router

- Route params: `$name` syntax (not `:name`)
- Search params: `validateSearch` on route, `useSearch({ from: "/" })()`
- Type registration: `declare module "@tanstack/solid-router" { interface Register { router: typeof router } }`

## Data Pipeline

- GitHub Actions fetches every 2 hours → `public/data/*.json`
- Vite serves `public/` at root (e.g., `/data/repos-overview.json`)
- Format: `{ meta: { fetchedAt, repoCount }, repos: [...] }`
- Per-repo: `public/data/repos/{name}.json`

## Common Gotchas

1. **Biome formatting:** Run `bun run check` after build — build won't catch format issues
2. **Props destructuring:** Never destructure SolidJS props — breaks reactivity
3. **Query wrappers:** `createQuery(() => ({...}))` — function wrapper required
4. **Show callbacks:** `{(val) => ...}` — `val` is accessor, call `val()`
5. **Table data:** Use getter `get data() {}` for reactive updates
6. **Import sorting:** Biome auto-sorts; don't manually order
