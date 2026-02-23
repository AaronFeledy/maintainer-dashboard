export const thresholds = {
	/** Issues count that triggers a red flag */
	issueRedFlag: 20,
	/** PR count that triggers a red flag */
	prRedFlag: 5,
	/** Days since last release that triggers a stale warning */
	staleReleaseDays: 180,
	/** Commits since release that triggers a red flag */
	commitRedFlag: 50,
	/** Days without engagement before an item is considered unengaged */
	unengagedDays: 3,
} as const;

export const attentionWeights = {
	issues: 1,
	prs: 2,
	releaseStaleness: 0.5,
	unengaged: 3,
} as const;

export const orgConfig = {
	name: "lando",
} as const;
