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
