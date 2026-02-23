import { Link, useParams } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { useRepoDetail } from "../queries/repos";
import type { RepoIssue, RepoPR, RepoRelease } from "../types";

function relativeAge(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "today";
	if (diffDays === 1) return "1 day ago";
	if (diffDays < 30) return `${diffDays} days ago`;
	if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return months === 1 ? "1 month ago" : `${months} months ago`;
	}
	const years = Math.floor(diffDays / 365);
	return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default function RepoDetailPage() {
	const params = useParams({ from: "/repo/$name" });
	const query = useRepoDetail(() => params().name);

	return (
		<div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
			<Link
				to="/"
				class="mb-4 inline-flex items-center gap-1 text-sm text-accent-fg no-underline hover:underline"
			>
				&larr; Back to overview
			</Link>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-16 text-center text-sm text-fg-muted">
						Loading repo details...
					</div>
				}
			>
				<Show
					when={query.data}
					fallback={
						<div class="py-16 text-center text-sm text-fg-muted">
							Repo not found
						</div>
					}
				>
					{(data) => (
						<>
							<div class="mb-6 border-b border-border-muted pb-4">
								<div class="flex items-center gap-3">
									<h1 class="text-2xl font-bold text-fg-default">
										{data().name}
									</h1>
									<Show when={data().language}>
										{(lang) => (
											<span class="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent-fg">
												{lang()}
											</span>
										)}
									</Show>
								</div>
								<Show when={data().description}>
									{(desc) => <p class="mt-1 text-sm text-fg-muted">{desc()}</p>}
								</Show>
								<a
									href={`https://github.com/lando/${data().name}`}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-2 inline-flex items-center gap-1 text-sm text-accent-fg no-underline hover:underline"
								>
									View on GitHub &rarr;
								</a>
							</div>

							<div class="grid gap-6 lg:grid-cols-2">
								<IssuesList issues={data().issues} />
								<PRsList prs={data().pullRequests} />
							</div>

							<div class="mt-6">
								<ReleasesList releases={data().releases} />
							</div>
						</>
					)}
				</Show>
			</Show>
		</div>
	);
}

function IssuesList(props: { issues: RepoIssue[] }) {
	return (
		<div class="rounded-md border border-border-default">
			<div class="border-b border-border-default bg-canvas-subtle px-4 py-3">
				<h2 class="text-sm font-semibold text-fg-default">
					Open Issues ({props.issues.length})
				</h2>
			</div>
			<Show
				when={props.issues.length > 0}
				fallback={
					<p class="px-4 py-6 text-center text-sm text-fg-muted">
						No open issues
					</p>
				}
			>
				<ul class="divide-y divide-border-muted">
					<For each={props.issues}>
						{(issue) => (
							<li class="px-4 py-3 transition-colors hover:bg-canvas-subtle">
								<a
									href={issue.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-accent-fg no-underline hover:underline"
								>
									{issue.title}
								</a>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
									<span>by {issue.author}</span>
									<span>&middot;</span>
									<time title={issue.createdAt}>
										{relativeAge(issue.createdAt)}
									</time>
									<span>&middot;</span>
									<span>
										{issue.commentCount} comment
										{issue.commentCount !== 1 ? "s" : ""}
									</span>
								</div>
								<Show when={issue.labels.length > 0}>
									<div class="mt-1.5 flex flex-wrap gap-1">
										<For each={issue.labels}>
											{(label) => (
												<span class="rounded-full bg-neutral-subtle px-2 py-0.5 text-xs font-medium text-fg-muted">
													{label}
												</span>
											)}
										</For>
									</div>
								</Show>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
}

function PRsList(props: { prs: RepoPR[] }) {
	return (
		<div class="rounded-md border border-border-default">
			<div class="border-b border-border-default bg-canvas-subtle px-4 py-3">
				<h2 class="text-sm font-semibold text-fg-default">
					Open PRs ({props.prs.length})
				</h2>
			</div>
			<Show
				when={props.prs.length > 0}
				fallback={
					<p class="px-4 py-6 text-center text-sm text-fg-muted">No open PRs</p>
				}
			>
				<ul class="divide-y divide-border-muted">
					<For each={props.prs}>
						{(pr) => (
							<li class="px-4 py-3 transition-colors hover:bg-canvas-subtle">
								<a
									href={pr.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-done-fg no-underline hover:underline"
								>
									{pr.title}
								</a>
								<div class="mt-1 flex items-center gap-2 text-xs text-fg-muted">
									<span>by {pr.author}</span>
									<span>&middot;</span>
									<time title={pr.createdAt}>{relativeAge(pr.createdAt)}</time>
									<span>&middot;</span>
									<span>
										{pr.reviewCount} review
										{pr.reviewCount !== 1 ? "s" : ""}
									</span>
								</div>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
}

function ReleasesList(props: { releases: RepoRelease[] }) {
	return (
		<div class="rounded-md border border-border-default">
			<div class="border-b border-border-default bg-canvas-subtle px-4 py-3">
				<h2 class="text-sm font-semibold text-fg-default">Recent Releases</h2>
			</div>
			<Show
				when={props.releases.length > 0}
				fallback={
					<p class="px-4 py-6 text-center text-sm text-fg-muted">
						No releases found
					</p>
				}
			>
				<ul class="divide-y divide-border-muted">
					<For each={props.releases.slice(0, 5)}>
						{(release) => (
							<li class="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-canvas-subtle">
								<a
									href={release.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-accent-fg no-underline hover:underline"
								>
									{release.tagName}
								</a>
								<time class="text-xs text-fg-muted" title={release.publishedAt}>
									{relativeAge(release.publishedAt)}
								</time>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
}
