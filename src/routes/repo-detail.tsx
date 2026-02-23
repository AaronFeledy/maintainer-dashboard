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
	const query = useRepoDetail(() => params.name);

	return (
		<div class="mx-auto max-w-5xl p-6">
			<Link
				to="/"
				class="mb-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
			>
				&larr; Back to overview
			</Link>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-12 text-center text-gray-500">
						Loading repo details...
					</div>
				}
			>
				<Show
					when={query.data}
					fallback={
						<div class="py-12 text-center text-gray-500">Repo not found</div>
					}
				>
					{(data) => (
						<>
							<div class="mb-6">
								<div class="flex items-center gap-3">
									<h1 class="text-2xl font-bold text-gray-900">
										{data().name}
									</h1>
									<Show when={data().language}>
										{(lang) => (
											<span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
												{lang()}
											</span>
										)}
									</Show>
								</div>
								<Show when={data().description}>
									{(desc) => <p class="mt-1 text-gray-600">{desc()}</p>}
								</Show>
								<a
									href={`https://github.com/lando/${data().name}`}
									target="_blank"
									rel="noopener noreferrer"
									class="mt-2 inline-block text-sm text-blue-600 hover:underline"
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
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-gray-900">
				Open Issues ({props.issues.length})
			</h2>
			<Show
				when={props.issues.length > 0}
				fallback={<p class="text-sm text-gray-500">No open issues</p>}
			>
				<ul class="divide-y divide-gray-100">
					<For each={props.issues}>
						{(issue) => (
							<li class="py-3">
								<a
									href={issue.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-blue-600 hover:underline"
								>
									{issue.title}
								</a>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
									<span>by {issue.author}</span>
									<span>&middot;</span>
									<span>{relativeAge(issue.createdAt)}</span>
									<span>&middot;</span>
									<span>
										{issue.commentCount} comment
										{issue.commentCount !== 1 ? "s" : ""}
									</span>
								</div>
								<Show when={issue.labels.length > 0}>
									<div class="mt-1 flex flex-wrap gap-1">
										<For each={issue.labels}>
											{(label) => (
												<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
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
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-gray-900">
				Open PRs ({props.prs.length})
			</h2>
			<Show
				when={props.prs.length > 0}
				fallback={<p class="text-sm text-gray-500">No open PRs</p>}
			>
				<ul class="divide-y divide-gray-100">
					<For each={props.prs}>
						{(pr) => (
							<li class="py-3">
								<a
									href={pr.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-purple-600 hover:underline"
								>
									{pr.title}
								</a>
								<div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
									<span>by {pr.author}</span>
									<span>&middot;</span>
									<span>{relativeAge(pr.createdAt)}</span>
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
		<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<h2 class="mb-3 text-lg font-semibold text-gray-900">Recent Releases</h2>
			<Show
				when={props.releases.length > 0}
				fallback={<p class="text-sm text-gray-500">No releases found</p>}
			>
				<ul class="divide-y divide-gray-100">
					<For each={props.releases.slice(0, 5)}>
						{(release) => (
							<li class="flex items-center justify-between py-2">
								<a
									href={release.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm font-medium text-blue-600 hover:underline"
								>
									{release.tagName}
								</a>
								<span class="text-xs text-gray-500">
									{relativeAge(release.publishedAt)}
								</span>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
}
