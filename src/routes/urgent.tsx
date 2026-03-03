import { Link, useSearch } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { useUrgentItems } from "../queries/repos";
import type { UrgentItem } from "../types";

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

function TypeBadge(props: { type: UrgentItem["type"] }) {
	return (
		<span
			class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-tight ${
				props.type === "issue"
					? "bg-attention-subtle text-attention-fg"
					: "bg-done-subtle text-done-fg"
			}`}
		>
			<span class="mr-1">{props.type === "issue" ? "\u25CB" : "\u2192"}</span>
			{props.type === "issue" ? "Issue" : "PR"}
		</span>
	);
}

export default function UrgentListPage() {
	const query = useUrgentItems();
	const search = useSearch({ from: "/urgent" });

	const currentPage = createMemo(() => search().page ?? 1);
	const items = createMemo(() => query.data?.items ?? []);
	const totalPages = createMemo(() => Math.ceil(items().length / PAGE_SIZE));

	const paginatedItems = createMemo(() => {
		const start = (currentPage() - 1) * PAGE_SIZE;
		return items().slice(start, start + PAGE_SIZE);
	});

	return (
		<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
			<Link
				to="/"
				class="mb-4 inline-flex items-center gap-1 text-sm text-accent-fg no-underline hover:underline"
			>
				&larr; Back to overview
			</Link>

			<div class="mb-6">
				<h1 class="text-2xl font-bold text-fg-default">Urgent Items</h1>
				<p class="mt-1 text-sm text-fg-muted">
					Issues and PRs that need maintainer attention ({items().length} total)
				</p>
			</div>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-16 text-center text-sm text-fg-muted">
						Loading urgent items...
					</div>
				}
			>
				<div class="rounded-md border border-border-default bg-canvas-default">
					<ul class="divide-y divide-border-muted">
						<For each={paginatedItems()}>
							{(item) => (
								<li class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas-subtle">
									<div class="pt-0.5">
										<TypeBadge type={item.type} />
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<Link
												to="/repo/$name"
												params={{ name: item.repo }}
												class="text-xs font-semibold text-fg-muted hover:text-accent-fg hover:underline"
											>
												{item.repo}
											</Link>
											<span class="text-xs text-fg-subtle">#{item.number}</span>
										</div>
										<a
											href={item.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-sm font-medium text-accent-fg no-underline hover:underline"
										>
											{item.title}
										</a>
										<div class="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
											<span>by {item.author}</span>
											<span>&middot;</span>
											<time title={item.createdAt}>
												{relativeAge(item.createdAt)}
											</time>
										</div>
									</div>
								</li>
							)}
						</For>
					</ul>
				</div>

				<Show when={totalPages() > 1}>
					<Pagination
						currentPage={currentPage()}
						totalPages={totalPages()}
						baseUrl="/urgent"
					/>
				</Show>
			</Show>
		</div>
	);
}

function Pagination(props: {
	currentPage: number;
	totalPages: number;
	baseUrl: string;
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
				to={props.baseUrl}
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
							to={props.baseUrl}
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
				to={props.baseUrl}
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
