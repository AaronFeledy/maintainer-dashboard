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
		<div class="rounded-md border border-border-default bg-canvas-default">
			<div class="flex items-center justify-between border-b border-border-default bg-canvas-subtle px-4 py-3">
				<h2 class="flex items-center gap-2 text-sm font-semibold text-fg-default">
					<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger-emphasis text-xs text-fg-on-emphasis">
						{filteredItems().length}
					</span>
					Urgent Items
				</h2>
				<div class="flex rounded-md border border-border-default bg-canvas-default">
					<FilterButton
						label="All"
						active={filter() === "all"}
						onClick={() => setFilter("all")}
						position="left"
					/>
					<FilterButton
						label="Issues"
						active={filter() === "issue"}
						onClick={() => setFilter("issue")}
						position="middle"
					/>
					<FilterButton
						label="PRs"
						active={filter() === "pr"}
						onClick={() => setFilter("pr")}
						position="right"
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
	position: "left" | "middle" | "right";
}) {
	const roundedClass = () => {
		if (props.position === "left") return "rounded-l-md";
		if (props.position === "right") return "rounded-r-md";
		return "";
	};

	return (
		<button
			type="button"
			class={`px-3 py-1 text-xs font-medium transition-colors ${roundedClass()} ${
				props.active
					? "bg-accent-fg text-fg-on-emphasis"
					: "bg-canvas-default text-fg-muted hover:bg-canvas-subtle hover:text-fg-default"
			}`}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}

function UrgentItemRow(props: { item: UrgentItem }) {
	return (
		<li class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas-subtle">
			<div class="pt-0.5">
				<TypeBadge type={props.item.type} />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-fg-muted">
						{props.item.repo}
					</span>
					<span class="text-xs text-fg-subtle">#{props.item.number}</span>
				</div>
				<a
					href={props.item.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm font-medium text-accent-fg no-underline hover:underline"
				>
					{props.item.title}
				</a>
				<div class="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
					<span>by {props.item.author}</span>
					<span>&middot;</span>
					<time title={props.item.createdAt}>
						{relativeAge(props.item.createdAt)}
					</time>
				</div>
			</div>
		</li>
	);
}

function LoadingState() {
	return (
		<div class="py-10 text-center text-sm text-fg-muted">
			Loading urgent items...
		</div>
	);
}

function EmptyState() {
	return (
		<div class="py-10 text-center">
			<p class="text-sm text-fg-muted">No urgent items</p>
			<p class="mt-1 text-xs text-fg-subtle">
				All issues and PRs have maintainer engagement
			</p>
		</div>
	);
}
