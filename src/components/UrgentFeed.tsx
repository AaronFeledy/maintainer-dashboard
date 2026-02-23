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
			class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
				props.type === "issue"
					? "bg-amber-100 text-amber-800"
					: "bg-purple-100 text-purple-800"
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
		<div class="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-gray-900">Urgent Items</h2>
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
					<ul class="divide-y divide-gray-100">
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
			class={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
				props.active
					? "bg-gray-900 text-white"
					: "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
					<span class="text-xs font-medium text-gray-500">
						{props.item.repo}
					</span>
					<span class="text-xs text-gray-400">#{props.item.number}</span>
				</div>
				<a
					href={props.item.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
				>
					{props.item.title}
				</a>
				<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
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
		<div class="py-8 text-center text-sm text-gray-500">
			Loading urgent items...
		</div>
	);
}

function EmptyState() {
	return (
		<div class="py-8 text-center text-sm text-gray-500">No urgent items</div>
	);
}
