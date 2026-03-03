import { Link, useParams, useSearch } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { useRepoDetail } from "../queries/repos";

const PAGE_SIZE = 25;

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

export default function RepoIssuesPage() {
	const params = useParams({ from: "/repo/$name/issues" });
	const search = useSearch({ from: "/repo/$name/issues" });
	const query = useRepoDetail(() => params().name);

	const currentPage = createMemo(() => search().page ?? 1);
	const issues = createMemo(() => query.data?.issues ?? []);
	const totalPages = createMemo(() => Math.ceil(issues().length / PAGE_SIZE));

	const paginatedIssues = createMemo(() => {
		const start = (currentPage() - 1) * PAGE_SIZE;
		return issues().slice(start, start + PAGE_SIZE);
	});

	return (
		<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
			<Link
				to="/repo/$name"
				params={{ name: params().name }}
				class="mb-4 inline-flex items-center gap-1 text-sm text-accent-fg no-underline hover:underline"
			>
				&larr; Back to {params().name}
			</Link>

			<div class="mb-6">
				<h1 class="text-2xl font-bold text-fg-default">
					{params().name} - Open Issues
				</h1>
				<p class="mt-1 text-sm text-fg-muted">{issues().length} open issues</p>
			</div>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-16 text-center text-sm text-fg-muted">
						Loading issues...
					</div>
				}
			>
				<Show
					when={issues().length > 0}
					fallback={
						<div class="rounded-md border border-border-default bg-canvas-default py-16 text-center text-sm text-fg-muted">
							No open issues
						</div>
					}
				>
					<div class="rounded-md border border-border-default bg-canvas-default">
						<ul class="divide-y divide-border-muted">
							<For each={paginatedIssues()}>
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
					</div>

					<Show when={totalPages() > 1}>
						<Pagination
							currentPage={currentPage()}
							totalPages={totalPages()}
							repoName={params().name}
						/>
					</Show>
				</Show>
			</Show>
		</div>
	);
}

function Pagination(props: {
	currentPage: number;
	totalPages: number;
	repoName: string;
}) {
	const pages = createMemo(() => {
		const result: (number | "...")[] = [];
		const current = props.currentPage;
		const total = props.totalPages;

		if (total <= 7) {
			for (let i = 1; i <= total; i++) result.push(i);
		} else {
			result.push(1);
			if (current > 3) result.push("...");
			for (
				let i = Math.max(2, current - 1);
				i <= Math.min(total - 1, current + 1);
				i++
			) {
				result.push(i);
			}
			if (current < total - 2) result.push("...");
			result.push(total);
		}
		return result;
	});

	return (
		<nav class="mt-4 flex items-center justify-center gap-1">
			<Link
				to="/repo/$name/issues"
				params={{ name: props.repoName }}
				search={{ page: Math.max(1, props.currentPage - 1) }}
				class={`rounded px-3 py-1.5 text-sm ${
					props.currentPage === 1
						? "pointer-events-none text-fg-subtle"
						: "text-fg-default hover:bg-canvas-subtle"
				}`}
			>
				&larr; Prev
			</Link>

			<For each={pages()}>
				{(page) => (
					<Show
						when={page !== "..."}
						fallback={<span class="px-2 text-fg-subtle">...</span>}
					>
						<Link
							to="/repo/$name/issues"
							params={{ name: props.repoName }}
							search={{ page: page as number }}
							class={`rounded px-3 py-1.5 text-sm ${
								page === props.currentPage
									? "bg-accent-fg text-fg-on-emphasis"
									: "text-fg-default hover:bg-canvas-subtle"
							}`}
						>
							{page}
						</Link>
					</Show>
				)}
			</For>

			<Link
				to="/repo/$name/issues"
				params={{ name: props.repoName }}
				search={{ page: Math.min(props.totalPages, props.currentPage + 1) }}
				class={`rounded px-3 py-1.5 text-sm ${
					props.currentPage === props.totalPages
						? "pointer-events-none text-fg-subtle"
						: "text-fg-default hover:bg-canvas-subtle"
				}`}
			>
				Next &rarr;
			</Link>
		</nav>
	);
}
