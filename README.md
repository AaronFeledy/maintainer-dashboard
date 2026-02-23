# Lando Maintainer Dashboard

A dashboard for [Lando](https://github.com/lando) maintainers to monitor repository health, surface unengaged issues and PRs, and triage across the lando GitHub organization.

## Tech Stack

- **Framework:** [SolidJS](https://www.solidjs.com/)
- **Routing:** [TanStack Solid Router](https://tanstack.com/router)
- **Data fetching:** [TanStack Solid Query](https://tanstack.com/query)
- **Tables:** [TanStack Solid Table](https://tanstack.com/table)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with GitHub-style theming (light + dark mode)
- **Build tool:** [Vite](https://vite.dev/)
- **Runtime / package manager:** [Bun](https://bun.sh/)
- **Linting / formatting:** [Biome](https://biomejs.dev/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Hosting:** [Netlify](https://www.netlify.com/) (static deploy)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed (v1.0+)

### Setup

```bash
bun install
bun run dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start Vite dev server on port 3000 |
| `build` | `bun run build` | Production build to `dist/` (also runs typecheck) |
| `preview` | `bun run preview` | Preview the production build locally |
| `check` | `bun run check` | Run Biome lint + format checks |
| `test` | `bun run test` | Run Vitest tests |
| `lint` | `bun run lint` | Run Biome linter only |
| `format` | `bun run format` | Run Biome formatter only |

**Quality gate:** All commits should pass `bun run build && bun run check`.

## Project Structure

```
src/
  components/          UI components (PascalCase.tsx)
    RepoTable.tsx        Sortable repo overview table with red-flag indicators
    RepoFilters.tsx      Search, filter toggles, and language dropdown
    UrgentFeed.tsx       Unengaged issues/PRs feed with filter tabs
  config/
    thresholds.ts        Red-flag thresholds and attention score weights
  queries/
    repos.ts             TanStack Query hooks for loading pre-fetched JSON data
  routes/
    overview.tsx         Homepage: urgent feed + repo table
    repo-detail.tsx      Per-repo detail page: issues, PRs, releases
  types/
    index.ts             Shared TypeScript interfaces (RepoOverview, UrgentItem, etc.)
  index.tsx              App entry point
  router.tsx             TanStack Router configuration
  styles.css             Tailwind CSS entry with GitHub theme tokens
scripts/
  fetch-github-data.ts   GitHub GraphQL data fetcher (run by CI)
public/data/             Pre-fetched JSON data (served at /data/)
  repos-overview.json    All repos with stats and attention scores
  urgent-items.json      Unengaged issues and PRs
  repos/{name}.json      Per-repo detail data (issues, PRs, releases)
```

## Data Pipeline

Dashboard data is pre-fetched via a GitHub Actions workflow rather than querying the API at runtime:

1. **GitHub Actions** runs `scripts/fetch-github-data.ts` every 2 hours (configurable via cron in `.github/workflows/fetch-data.yml`)
2. The script queries the GitHub GraphQL API for all non-archived repos in the `lando` org
3. Data is written to `public/data/*.json` and committed back to the repository
4. Vite serves `public/` at the site root, so data is available at `/data/repos-overview.json`, etc.

### What the script collects

- **Repo overview:** name, description, language, open issues/PRs, latest release, commits since release, attention score
- **Urgent items:** open issues with 0 comments and open PRs with 0 reviews older than 3 days
- **Per-repo detail:** open issues (with labels, comment count), open PRs (with review count), last 5 releases

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes (for data fetching) | GitHub personal access token or `secrets.GITHUB_TOKEN` in CI. Needs read access to the `lando` org repos. |

To run the fetch script locally:

```bash
GITHUB_TOKEN=ghp_your_token_here bun scripts/fetch-github-data.ts
```

## Features

- **Urgent items feed** -- surfaces issues and PRs with no maintainer engagement, sorted oldest-first
- **Sortable repo table** -- all repos at a glance with open issues, PRs, release info, and attention scores
- **Red-flag indicators** -- visual warnings when repos exceed configurable thresholds (e.g., >20 open issues, >5 open PRs, >180 days since release)
- **Attention scoring** -- weighted formula to prioritize repos needing attention: `openIssues * 1 + openPRs * 2 + daysSinceRelease * 0.5 + unengagedCount * 3`
- **Search and filters** -- text search, red-flag filter, unengaged filter, and language dropdown with URL-persisted state
- **Repo detail pages** -- drill into any repo to see its open issues, PRs, and recent releases
- **GitHub-style theming** -- light and dark mode that follows system preference

## Deployment

The dashboard is deployed as a static site on Netlify. Configuration is in `netlify.toml`:

- **Build command:** `bun run build`
- **Publish directory:** `dist`
- **SPA routing:** all paths redirect to `/index.html` with status 200

## Configuration

Thresholds and weights are centralized in `src/config/thresholds.ts`:

| Setting | Default | Description |
|---------|---------|-------------|
| `issueRedFlag` | 20 | Open issues count that triggers a red flag |
| `prRedFlag` | 5 | Open PRs count that triggers a red flag |
| `staleReleaseDays` | 180 | Days since last release to show a warning |
| `commitRedFlag` | 50 | Commits since release that triggers a red flag |
| `unengagedDays` | 3 | Days without engagement before an item is flagged |

## License

See the [Lando](https://github.com/lando) organization for license information.
