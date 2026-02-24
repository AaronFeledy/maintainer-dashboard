import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { graphql } from "@octokit/graphql";
import type {
	RefreshStatus,
	RepoRegistry,
	RepoRegistryEntry,
} from "../src/types/index.ts";

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
	console.error("GITHUB_TOKEN environment variable is required");
	process.exit(1);
}

const gql = graphql.defaults({
	headers: { authorization: `token ${GITHUB_TOKEN}` },
});

// Paths
const ROOT_DIR = join(import.meta.dirname ?? ".", "..");
const REGISTRY_PATH = join(ROOT_DIR, "src", "config", "repos.json");
const DATA_DIR = join(ROOT_DIR, "public", "data");
const REFRESH_STATUS_PATH = join(DATA_DIR, "refresh-status.json");
const REPOS_DIR = join(DATA_DIR, "repos");

// ============================================================================
// CLI Arguments
// ============================================================================

interface CliArgs {
	maxAge: string | null; // e.g., "2h", "30m", "1d"
	batchSize: number | null;
	include: string[]; // Repos to always include regardless of age
}

function parseCliArgs(): CliArgs {
	const { values } = parseArgs({
		options: {
			"max-age": { type: "string" },
			"batch-size": { type: "string" },
			include: { type: "string" },
		},
		allowPositionals: false,
	});

	return {
		maxAge: values["max-age"] ?? null,
		batchSize: values["batch-size"] ? Number(values["batch-size"]) : null,
		include: values.include ? values.include.split(",") : [],
	};
}

function parseDuration(duration: string): number {
	const match = duration.match(/^(\d+)(m|h|d)$/);
	if (!match) {
		console.error(
			`Invalid duration format: ${duration}. Use e.g., "30m", "2h", "1d"`,
		);
		process.exit(1);
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case "m":
			return value * 60 * 1000;
		case "h":
			return value * 60 * 60 * 1000;
		case "d":
			return value * 24 * 60 * 60 * 1000;
		default:
			return 0;
	}
}

// ============================================================================
// Registry & Refresh Status
// ============================================================================

function loadRegistry(): RepoRegistry {
	if (!existsSync(REGISTRY_PATH)) {
		console.error(`Registry file not found: ${REGISTRY_PATH}`);
		process.exit(1);
	}
	return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function loadRefreshStatus(): RefreshStatus {
	if (!existsSync(REFRESH_STATUS_PATH)) {
		return { meta: { lastFullRefresh: null }, repos: {} };
	}
	return JSON.parse(readFileSync(REFRESH_STATUS_PATH, "utf-8"));
}

function saveRefreshStatus(status: RefreshStatus): void {
	writeFileSync(REFRESH_STATUS_PATH, JSON.stringify(status, null, "\t"));
}

function getReposToProcess(
	registry: RepoRegistry,
	refreshStatus: RefreshStatus,
	args: CliArgs,
): RepoRegistryEntry[] {
	const now = Date.now();
	const maxAgeMs = args.maxAge ? parseDuration(args.maxAge) : null;

	// Start with active repos only
	let repos = registry.repos.filter((r) => r.active);

	// If batch mode is enabled, filter and sort by refresh time
	if (maxAgeMs !== null || args.batchSize !== null) {
		// Add refresh timestamp info for sorting
		const reposWithTime = repos.map((repo) => {
			const lastRefresh = refreshStatus.repos[repo.name]?.overview;
			const lastRefreshTime = lastRefresh ? new Date(lastRefresh).getTime() : 0;
			const isIncluded = args.include.includes(repo.name);
			return { repo, lastRefreshTime, isIncluded };
		});

		// Filter by max age (skip recently refreshed, unless explicitly included)
		if (maxAgeMs !== null) {
			const cutoff = now - maxAgeMs;
			repos = reposWithTime
				.filter((r) => r.isIncluded || r.lastRefreshTime < cutoff)
				.sort((a, b) => a.lastRefreshTime - b.lastRefreshTime)
				.map((r) => r.repo);
		} else {
			// Just sort by oldest first
			repos = reposWithTime
				.sort((a, b) => a.lastRefreshTime - b.lastRefreshTime)
				.map((r) => r.repo);
		}

		// Limit by batch size
		if (args.batchSize !== null && repos.length > args.batchSize) {
			repos = repos.slice(0, args.batchSize);
		}
	}

	return repos;
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const REPO_OVERVIEW_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    isArchived
    primaryLanguage { name }
    issues(states: OPEN) { totalCount }
    pullRequests(states: OPEN) { totalCount }
    releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        tagName
        publishedAt
      }
    }
    pushedAt
  }
}
`;

const COMMITS_SINCE_QUERY = `
query($owner: String!, $name: String!, $since: GitTimestamp!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $since) {
            totalCount
          }
        }
      }
    }
  }
}
`;

const UNENGAGED_ISSUES_QUERY = `
query($searchQuery: String!, $cursor: String) {
  search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on Issue {
        repository { nameWithOwner }
        number
        title
        author { login }
        createdAt
        url
      }
    }
  }
}
`;

const UNENGAGED_PRS_QUERY = `
query($searchQuery: String!, $cursor: String) {
  search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      ... on PullRequest {
        repository { nameWithOwner }
        number
        title
        author { login }
        createdAt
        url
      }
    }
  }
}
`;

const REPO_DETAIL_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        title
        author { login }
        labels(first: 10) { nodes { name } }
        createdAt
        comments { totalCount }
        url
      }
    }
    pullRequests(first: 50, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        title
        author { login }
        createdAt
        reviews { totalCount }
        url
      }
    }
    releases(first: 5, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        tagName
        publishedAt
        url
      }
    }
  }
}
`;

// ============================================================================
// Types
// ============================================================================

interface GraphQLRepo {
	name: string;
	description: string | null;
	isArchived: boolean;
	primaryLanguage: { name: string } | null;
	issues: { totalCount: number };
	pullRequests: { totalCount: number };
	releases: {
		nodes: Array<{
			tagName: string;
			publishedAt: string;
		}>;
	};
	pushedAt: string;
}

interface PageInfo {
	hasNextPage: boolean;
	endCursor: string | null;
}

interface RepoOverview {
	name: string;
	description: string | null;
	language: string | null;
	openIssues: number;
	openPRs: number;
	lastRelease: string | null;
	commitsSinceRelease: number;
	lastPush: string;
	attentionScore: number;
	unengagedCount: number;
}

interface DataMeta {
	fetchedAt: string;
	repoCount: number;
}

interface UrgentItem {
	repo: string;
	number: number;
	title: string;
	author: string;
	createdAt: string;
	url: string;
	type: "issue" | "pr";
}

interface RepoDetailData {
	name: string;
	description: string | null;
	language: string | null;
	issues: Array<{
		title: string;
		author: string;
		labels: string[];
		createdAt: string;
		commentCount: number;
		url: string;
	}>;
	pullRequests: Array<{
		title: string;
		author: string;
		createdAt: string;
		reviewCount: number;
		url: string;
	}>;
	releases: Array<{
		tagName: string;
		publishedAt: string;
		url: string;
	}>;
}

interface SearchNode {
	repository: { nameWithOwner: string };
	number: number;
	title: string;
	author: { login: string } | null;
	createdAt: string;
	url: string;
}

// Attention score weights
const WEIGHTS = {
	issues: 1,
	prs: 2,
	releaseStaleness: 0.5,
	unengaged: 3,
};

// ============================================================================
// Data Fetching Functions
// ============================================================================

interface FetchWarning {
	repo: string;
	message: string;
}

const warnings: FetchWarning[] = [];

function addWarning(repo: string, message: string): void {
	warnings.push({ repo, message });
	console.warn(`  Warning [${repo}]: ${message}`);
}

async function fetchRepoOverview(
	repoFullName: string,
): Promise<GraphQLRepo | null> {
	const [owner, name] = repoFullName.split("/");

	try {
		const result: { repository: GraphQLRepo } = await gql(REPO_OVERVIEW_QUERY, {
			owner,
			name,
		});
		return result.repository;
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		addWarning(repoFullName, `Failed to fetch overview - ${message}`);
		return null;
	}
}

async function getCommitsSinceRelease(
	repoFullName: string,
	releaseDate: string,
): Promise<number> {
	const [owner, name] = repoFullName.split("/");

	try {
		const result: {
			repository: {
				defaultBranchRef: {
					target: { history: { totalCount: number } };
				} | null;
			};
		} = await gql(COMMITS_SINCE_QUERY, {
			owner,
			name,
			since: releaseDate,
		});

		return result.repository.defaultBranchRef?.target.history.totalCount ?? 0;
	} catch {
		return 0;
	}
}

async function fetchUnengagedIssues(
	repoNames: string[],
	cutoffDate: string,
): Promise<UrgentItem[]> {
	// Build search query for specific repos
	const repoQueries = repoNames.map((name) => `repo:${name}`).join(" ");
	const searchQuery = `${repoQueries} is:issue is:open comments:0 created:<${cutoffDate}`;

	const items: UrgentItem[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		const result: {
			search: {
				pageInfo: PageInfo;
				nodes: SearchNode[];
			};
		} = await gql(UNENGAGED_ISSUES_QUERY, { searchQuery, cursor });

		for (const node of result.search.nodes) {
			items.push({
				repo: node.repository.nameWithOwner,
				number: node.number,
				title: node.title,
				author: node.author?.login ?? "unknown",
				createdAt: node.createdAt,
				url: node.url,
				type: "issue",
			});
		}

		hasNextPage = result.search.pageInfo.hasNextPage;
		cursor = result.search.pageInfo.endCursor;
	}

	return items;
}

async function fetchUnengagedPRs(
	repoNames: string[],
	cutoffDate: string,
): Promise<UrgentItem[]> {
	const repoQueries = repoNames.map((name) => `repo:${name}`).join(" ");
	const searchQuery = `${repoQueries} is:pr is:open review:none created:<${cutoffDate}`;

	const items: UrgentItem[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		const result: {
			search: {
				pageInfo: PageInfo;
				nodes: SearchNode[];
			};
		} = await gql(UNENGAGED_PRS_QUERY, { searchQuery, cursor });

		for (const node of result.search.nodes) {
			items.push({
				repo: node.repository.nameWithOwner,
				number: node.number,
				title: node.title,
				author: node.author?.login ?? "unknown",
				createdAt: node.createdAt,
				url: node.url,
				type: "pr",
			});
		}

		hasNextPage = result.search.pageInfo.hasNextPage;
		cursor = result.search.pageInfo.endCursor;
	}

	return items;
}

async function fetchRepoDetail(
	repoFullName: string,
	description: string | null,
	language: string | null,
): Promise<RepoDetailData | null> {
	const [owner, name] = repoFullName.split("/");

	try {
		const result: {
			repository: {
				issues: {
					nodes: Array<{
						title: string;
						author: { login: string } | null;
						labels: { nodes: Array<{ name: string }> };
						createdAt: string;
						comments: { totalCount: number };
						url: string;
					}>;
				};
				pullRequests: {
					nodes: Array<{
						title: string;
						author: { login: string } | null;
						createdAt: string;
						reviews: { totalCount: number };
						url: string;
					}>;
				};
				releases: {
					nodes: Array<{
						tagName: string;
						publishedAt: string;
						url: string;
					}>;
				};
			};
		} = await gql(REPO_DETAIL_QUERY, { owner, name });

		return {
			name: repoFullName,
			description,
			language,
			issues: result.repository.issues.nodes.map((issue) => ({
				title: issue.title,
				author: issue.author?.login ?? "unknown",
				labels: issue.labels.nodes.map((l) => l.name),
				createdAt: issue.createdAt,
				commentCount: issue.comments.totalCount,
				url: issue.url,
			})),
			pullRequests: result.repository.pullRequests.nodes.map((pr) => ({
				title: pr.title,
				author: pr.author?.login ?? "unknown",
				createdAt: pr.createdAt,
				reviewCount: pr.reviews.totalCount,
				url: pr.url,
			})),
			releases: result.repository.releases.nodes.map((release) => ({
				tagName: release.tagName,
				publishedAt: release.publishedAt,
				url: release.url,
			})),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		addWarning(repoFullName, `Failed to fetch detail - ${message}`);
		return null;
	}
}

// ============================================================================
// Utilities
// ============================================================================

function daysSince(dateStr: string): number {
	const date = new Date(dateStr);
	const now = new Date();
	return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getRepoShortName(fullName: string): string {
	return fullName.split("/")[1];
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	const args = parseCliArgs();

	console.log("=".repeat(60));
	console.log("Lando Maintainer Dashboard - Data Fetch");
	console.log("=".repeat(60));

	if (args.maxAge) console.log(`Max age: ${args.maxAge}`);
	if (args.batchSize) console.log(`Batch size: ${args.batchSize}`);
	if (args.include.length > 0)
		console.log(`Force include: ${args.include.join(", ")}`);

	// Load registry and refresh status
	const registry = loadRegistry();
	const refreshStatus = loadRefreshStatus();

	console.log(
		`\nLoaded registry with ${registry.repos.length} repos (${registry.repos.filter((r) => r.active).length} active)`,
	);

	// Determine which repos to process
	const reposToProcess = getReposToProcess(registry, refreshStatus, args);

	if (reposToProcess.length === 0) {
		console.log("\nNo repos need refreshing based on current criteria.");
		return;
	}

	console.log(`\nProcessing ${reposToProcess.length} repos...`);

	// Ensure output directories exist
	mkdirSync(DATA_DIR, { recursive: true });
	mkdirSync(REPOS_DIR, { recursive: true });

	const now = new Date().toISOString();
	const fetchedRepos: Map<string, GraphQLRepo> = new Map();

	// Fetch overview data for each repo
	console.log("\n--- Fetching repo overviews ---");
	for (const repoEntry of reposToProcess) {
		console.log(`  Fetching ${repoEntry.name}...`);
		const repoData = await fetchRepoOverview(repoEntry.name);
		if (repoData) {
			// Check if repo is archived (in case registry is out of date)
			if (repoData.isArchived) {
				addWarning(
					repoEntry.name,
					"Repository is archived but marked active in registry",
				);
			}
			fetchedRepos.set(repoEntry.name, repoData);
		}
	}

	console.log(
		`\nSuccessfully fetched ${fetchedRepos.size}/${reposToProcess.length} repos`,
	);

	// Fetch unengaged issues and PRs (older than 3 days)
	const threeDaysAgo = new Date();
	threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
	const cutoffDate = threeDaysAgo.toISOString().split("T")[0];

	const repoNames = Array.from(fetchedRepos.keys());

	console.log(`\n--- Fetching unengaged items (older than ${cutoffDate}) ---`);
	const [unengagedIssues, unengagedPRs] = await Promise.all([
		fetchUnengagedIssues(repoNames, cutoffDate),
		fetchUnengagedPRs(repoNames, cutoffDate),
	]);

	const allUrgentItems = [...unengagedIssues, ...unengagedPRs];
	allUrgentItems.sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);

	console.log(
		`Found ${unengagedIssues.length} unengaged issues and ${unengagedPRs.length} unengaged PRs`,
	);

	// Count unengaged items per repo
	const unengagedByRepo = new Map<string, number>();
	for (const item of allUrgentItems) {
		unengagedByRepo.set(item.repo, (unengagedByRepo.get(item.repo) ?? 0) + 1);
	}

	// Build overviews
	console.log("\n--- Building repo overviews ---");
	const overviews: RepoOverview[] = [];

	for (const [repoName, repo] of fetchedRepos) {
		const lastRelease = repo.releases.nodes[0] ?? null;

		let commitsSinceRelease = 0;
		if (lastRelease) {
			commitsSinceRelease = await getCommitsSinceRelease(
				repoName,
				lastRelease.publishedAt,
			);
		}

		const releaseStaleDays = lastRelease
			? daysSince(lastRelease.publishedAt)
			: 365;

		const unengagedCount = unengagedByRepo.get(repoName) ?? 0;

		const attentionScore =
			repo.issues.totalCount * WEIGHTS.issues +
			repo.pullRequests.totalCount * WEIGHTS.prs +
			releaseStaleDays * WEIGHTS.releaseStaleness +
			unengagedCount * WEIGHTS.unengaged;

		overviews.push({
			name: repoName,
			description: repo.description,
			language: repo.primaryLanguage?.name ?? null,
			openIssues: repo.issues.totalCount,
			openPRs: repo.pullRequests.totalCount,
			lastRelease: lastRelease?.publishedAt ?? null,
			commitsSinceRelease,
			lastPush: repo.pushedAt,
			attentionScore: Math.round(attentionScore * 10) / 10,
			unengagedCount,
		});

		// Update refresh status for overview
		if (!refreshStatus.repos[repoName]) {
			refreshStatus.repos[repoName] = { overview: null, detail: null };
		}
		refreshStatus.repos[repoName].overview = now;
	}

	// Sort by attention score descending
	overviews.sort((a, b) => b.attentionScore - a.attentionScore);

	const meta: DataMeta = {
		fetchedAt: now,
		repoCount: overviews.length,
	};

	// Write overview data
	writeFileSync(
		join(DATA_DIR, "repos-overview.json"),
		JSON.stringify({ meta, repos: overviews }, null, "\t"),
	);
	console.log(
		`Wrote ${overviews.length} repos to public/data/repos-overview.json`,
	);

	// Write urgent items
	writeFileSync(
		join(DATA_DIR, "urgent-items.json"),
		JSON.stringify({ meta, items: allUrgentItems }, null, "\t"),
	);
	console.log(
		`Wrote ${allUrgentItems.length} urgent items to public/data/urgent-items.json`,
	);

	// Fetch per-repo detail data for repos with issues or PRs
	const reposWithActivity = Array.from(fetchedRepos.entries()).filter(
		([_, r]) => r.issues.totalCount > 0 || r.pullRequests.totalCount > 0,
	);

	console.log(
		`\n--- Fetching detail for ${reposWithActivity.length} repos with activity ---`,
	);

	let detailCount = 0;
	for (const [repoName, repo] of reposWithActivity) {
		console.log(`  Fetching detail for ${repoName}...`);
		const detail = await fetchRepoDetail(
			repoName,
			repo.description,
			repo.primaryLanguage?.name ?? null,
		);
		if (detail) {
			const shortName = getRepoShortName(repoName);
			writeFileSync(
				join(REPOS_DIR, `${shortName}.json`),
				JSON.stringify(detail, null, "\t"),
			);
			detailCount++;

			// Update refresh status for detail
			refreshStatus.repos[repoName].detail = now;
		}
	}

	console.log(
		`Wrote detail data for ${detailCount} repos to public/data/repos/`,
	);

	// Update refresh status metadata
	const isFullRefresh = args.maxAge === null && args.batchSize === null;
	if (isFullRefresh) {
		refreshStatus.meta.lastFullRefresh = now;
	}

	saveRefreshStatus(refreshStatus);
	console.log("Updated refresh status");

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("Summary");
	console.log("=".repeat(60));
	console.log(`Repos processed: ${fetchedRepos.size}`);
	console.log(`Detail files written: ${detailCount}`);
	console.log(`Urgent items found: ${allUrgentItems.length}`);

	if (warnings.length > 0) {
		console.log(`\nWarnings (${warnings.length}):`);
		for (const w of warnings) {
			console.log(`  - [${w.repo}] ${w.message}`);
		}
		console.log(
			"\nThese warnings are informational and do not affect other repos.",
		);
	}
}

main().catch((err) => {
	console.error("Failed to fetch data:", err);
	process.exit(1);
});
