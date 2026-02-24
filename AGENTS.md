# AGENTS.md - Lando Maintainer Dashboard

This file is yours to edit. It exists to describe common mistakes and confusion points that you encounter as you work in this project. If you ever encounter something in this project that surprises you, please alert the developer working with you and update this AGENTS.md file to help prevent similar confusion in the future.

## Project Overview

A SolidJS + TanStack web dashboard for monitoring GitHub repository health across the `lando` organization. Static site hosted on Netlify with data pre-fetched via GitHub Actions.

**Tech Stack:** SolidJS, TanStack (Solid Query, Solid Table, Solid Router), Tailwind CSS v4, Vite, Bun, Biome, Vitest

## Build/Lint/Test 

**Quality gate:** ALL commits must pass `bun run build && bun run check`.

## SolidJS Patterns (NOT React!)

| SolidJS | React (WRONG) |
|---------|---------------|
| `createSignal()` | `useState()` |
| `createMemo()` | `useMemo()` |
| `<Show when={x}>` | `{x && ...}` |
| `<For each={items}>` | `{items.map(...)}` |
| `props.value` | destructured `{ value }` |

## Common Gotchas

1. **Biome formatting:** Run `bun run check` after build — build won't catch format issues
2. **Props destructuring:** Never destructure SolidJS props — breaks reactivity
3. **Query wrappers:** `createQuery(() => ({...}))` — function wrapper required
4. **Show callbacks:** `{(val) => ...}` — `val` is accessor, call `val()`
5. **Table data:** Use getter `get data() {}` for reactive updates
6. **Import sorting:** Biome auto-sorts; don't manually order
