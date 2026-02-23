import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { graphql } from "@octokit/graphql";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
	console.error("GITHUB_TOKEN environment variable is required");
	process.exit(1);
}

const ORG = "lando";

const gql = graphql.defaults({
	headers: { authorization: `token ${GITHUB_TOKEN}` },
});

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
	defaultBranchRef: {
		target: {
			history: { totalCount: number };
		};
	} | null;
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

const REPOS_QUERY = `
query($org: String!, $cursor: String) {
  organization(login: $org) {
    repositories(first: 100, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
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
        defaultBranchRef {
          target {
            ... on Commit {
              history { totalCount }
            }
          }
        }
      }
    }
  }
}
`;

const COMMITS_SINCE_QUERY = `
query($org: String!, $repo: String!, $since: GitTimestamp!) {
  repository(owner: $org, name: $repo) {
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

// Attention score weights
const WEIGHTS = {
	issues: 1,
	prs: 2,
	releaseStaleness: 0.5,
	unengaged: 3,
};

async function fetchAllRepos(): Promise<GraphQLRepo[]> {
	const repos: GraphQLRepo[] = [];
	let cursor: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		const result: {
			organization: {
				repositories: {
					pageInfo: PageInfo;
					nodes: GraphQLRepo[];
				};
			};
		} = await gql(REPOS_QUERY, { org: ORG, cursor });

		const { nodes, pageInfo } = result.organization.repositories;
		repos.push(...nodes);
		hasNextPage = pageInfo.hasNextPage;
		cursor = pageInfo.endCursor;

		console.log(`Fetched ${repos.length} repos so far...`);
	}

	return repos.filter((r) => !r.isArchived);
}

async function getCommitsSinceRelease(
	repoName: string,
	releaseDate: string,
): Promise<number> {
	try {
		const result: {
			repository: {
				defaultBranchRef: {
					target: { history: { totalCount: number } };
				} | null;
			};
		} = await gql(COMMITS_SINCE_QUERY, {
			org: ORG,
			repo: repoName,
			since: releaseDate,
		});

		return result.repository.defaultBranchRef?.target.history.totalCount ?? 0;
	} catch {
		console.warn(`Could not fetch commits since release for ${repoName}`);
		return 0;
	}
}

function daysSince(dateStr: string): number {
	const date = new Date(dateStr);
	const now = new Date();
	return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
	console.log(`Fetching repos for org: ${ORG}`);

	const repos = await fetchAllRepos();
	console.log(`Found ${repos.length} non-archived repos`);

	const overviews: RepoOverview[] = [];

	for (const repo of repos) {
		const lastRelease = repo.releases.nodes[0] ?? null;

		let commitsSinceRelease = 0;
		if (lastRelease) {
			commitsSinceRelease = await getCommitsSinceRelease(
				repo.name,
				lastRelease.publishedAt,
			);
		}

		const releaseStaleDays = lastRelease
			? daysSince(lastRelease.publishedAt)
			: 365;

		// unengagedCount is computed in US-005, default to 0 for now
		const unengagedCount = 0;

		const attentionScore =
			repo.issues.totalCount * WEIGHTS.issues +
			repo.pullRequests.totalCount * WEIGHTS.prs +
			releaseStaleDays * WEIGHTS.releaseStaleness +
			unengagedCount * WEIGHTS.unengaged;

		overviews.push({
			name: repo.name,
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
	}

	// Sort by attention score descending
	overviews.sort((a, b) => b.attentionScore - a.attentionScore);

	const meta: DataMeta = {
		fetchedAt: new Date().toISOString(),
		repoCount: overviews.length,
	};

	const outDir = join(import.meta.dirname ?? ".", "..", "public", "data");
	mkdirSync(outDir, { recursive: true });

	const output = { meta, repos: overviews };
	writeFileSync(
		join(outDir, "repos-overview.json"),
		JSON.stringify(output, null, 2),
	);

	console.log(
		`Wrote ${overviews.length} repos to public/data/repos-overview.json`,
	);
}

main().catch((err) => {
	console.error("Failed to fetch data:", err);
	process.exit(1);
});
