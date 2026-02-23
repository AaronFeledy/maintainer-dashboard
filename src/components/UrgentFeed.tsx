import { createMemo, createSignal, For, Show } from "solid-js";
import { useUrgentItems } from "../queries/repos";
import type { UrgentItem } from "../types";

type FilterType = "all" | "issue" | "pr";

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
			class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
				props.type === "issue"
					? "border-attention-subtle bg-attention-subtle text-attention-fg"
					: "border-done-subtle bg-done-subtle text-done-fg"
			}`}
		>
			{props.type === "issue" ? "Issue" : "PR"}
		</span>
	);
}

export default function UrgentFeed() {
	const query = useUrgentItems();
	const [filter, setFilter] = createSignal<FilterType>("all");

	const filteredItems = createMemo(() => {
		const items = query.data?.items ?? [];
		const currentFilter = filter();
		if (currentFilter === "all") return items;
		return items.filter((item) => item.type === currentFilter);
	});

	return (
		<div class="rounded-md border border-danger-fg/20 bg-canvas-default p-4 shadow-sm">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold text-fg-default">Urgent Items</h2>
				<div class="flex gap-1">
					<FilterButton
						label="All"
						active={filter() === "all"}
						onClick={() => setFilter("all")}
					/>
					<FilterButton
						label="Issues"
						active={filter() === "issue"}
						onClick={() => setFilter("issue")}
					/>
					<FilterButton
						label="PRs"
						active={filter() === "pr"}
						onClick={() => setFilter("pr")}
					/>
				</div>
			</div>

			<Show when={!query.isLoading} fallback={<LoadingState />}>
				<Show when={filteredItems().length > 0} fallback={<EmptyState />}>
					<ul class="divide-y divide-border-muted">
						<For each={filteredItems()}>
							{(item) => <UrgentItemRow item={item} />}
						</For>
					</ul>
				</Show>
			</Show>
		</div>
	);
}

function FilterButton(props: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			class={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
				props.active
					? "border-border-default bg-canvas-default text-fg-default shadow-sm"
					: "border-transparent bg-transparent text-fg-muted hover:bg-neutral-muted"
			}`}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}

function UrgentItemRow(props: { item: UrgentItem }) {
	return (
		<li class="flex items-start gap-3 py-3">
			<TypeBadge type={props.item.type} />
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="text-xs font-medium text-fg-muted">
						{props.item.repo}
					</span>
					<span class="text-xs text-fg-subtle">#{props.item.number}</span>
				</div>
				<a
					href={props.item.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm font-medium text-accent-fg hover:underline"
				>
					{props.item.title}
				</a>
				<div class="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
					<span>by {props.item.author}</span>
					<span>&middot;</span>
					<span>{relativeAge(props.item.createdAt)}</span>
				</div>
			</div>
		</li>
	);
}

function LoadingState() {
	return (
		<div class="py-8 text-center text-sm text-fg-muted">
			Loading urgent items...
		</div>
	);
}

function EmptyState() {
	return (
		<div class="py-8 text-center text-sm text-fg-muted">No urgent items</div>
	);
}
