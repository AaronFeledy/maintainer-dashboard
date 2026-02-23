export interface RepoOverview {
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

export interface UrgentItem {
	repo: string;
	number: number;
	title: string;
	author: string;
	createdAt: string;
	url: string;
	type: "issue" | "pr";
}

export interface DataMeta {
	fetchedAt: string;
	repoCount: number;
}

export interface RepoIssue {
	title: string;
	author: string;
	labels: string[];
	createdAt: string;
	commentCount: number;
	url: string;
}

export interface RepoPR {
	title: string;
	author: string;
	createdAt: string;
	reviewCount: number;
	url: string;
}

export interface RepoRelease {
	tagName: string;
	publishedAt: string;
	url: string;
}

export interface RepoDetail {
	name: string;
	description: string | null;
	language: string | null;
	issues: RepoIssue[];
	pullRequests: RepoPR[];
	releases: RepoRelease[];
}
