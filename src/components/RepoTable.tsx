import { Link, useSearch } from "@tanstack/solid-router";
import type { SortingState } from "@tanstack/solid-table";
import {
	createColumnHelper,
	createSolidTable,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
} from "@tanstack/solid-table";
import { createMemo, createSignal, For, Show } from "solid-js";
import { thresholds } from "../config/thresholds";
import { useReposOverview } from "../queries/repos";
import type { RepoOverview } from "../types";

function relativeTime(dateStr: string | null): string {
	if (!dateStr) return "Never";
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

function daysSince(dateStr: string | null): number {
	if (!dateStr) return 999;
	const date = new Date(dateStr);
	const now = new Date();
	return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function hasRedFlags(repo: RepoOverview): boolean {
	return (
		repo.openIssues > thresholds.issueRedFlag ||
		repo.openPRs > thresholds.prRedFlag ||
		daysSince(repo.lastRelease) > thresholds.staleReleaseDays ||
		repo.commitsSinceRelease > thresholds.commitRedFlag
	);
}

function RedBadge() {
	return (
		<span
			class="ml-1.5 inline-flex h-2 w-2 rounded-full bg-danger-emphasis"
			title="Exceeds threshold"
		/>
	);
}

function WarningBadge() {
	return (
		<span
			class="ml-1.5 inline-flex h-2 w-2 rounded-full bg-attention-emphasis"
			title="Needs attention"
		/>
	);
}

const columnHelper = createColumnHelper<RepoOverview>();

const columns = [
	columnHelper.accessor("name", {
		header: "Repo Name",
		cell: (info) => (
			<Link
				to="/repo/$name"
				params={{ name: info.getValue() }}
				class="font-semibold text-accent-fg no-underline hover:underline"
			>
				{info.getValue()}
			</Link>
		),
	}),
	columnHelper.accessor("openIssues", {
		header: "Open Issues",
		cell: (info) => (
			<span class="flex items-center tabular-nums">
				{info.getValue()}
				<Show when={info.getValue() > thresholds.issueRedFlag}>
					<RedBadge />
				</Show>
			</span>
		),
	}),
	columnHelper.accessor("openPRs", {
		header: "Open PRs",
		cell: (info) => (
			<span class="flex items-center tabular-nums">
				{info.getValue()}
				<Show when={info.getValue() > thresholds.prRedFlag}>
					<RedBadge />
				</Show>
			</span>
		),
	}),
	columnHelper.accessor("lastRelease", {
		header: "Last Release",
		cell: (info) => (
			<span class="flex items-center" title={info.getValue() ?? "No releases"}>
				<span class="text-fg-muted">{relativeTime(info.getValue())}</span>
				<Show when={daysSince(info.getValue()) > thresholds.staleReleaseDays}>
					<WarningBadge />
				</Show>
			</span>
		),
	}),
	columnHelper.accessor("commitsSinceRelease", {
		header: "Commits Since Release",
		cell: (info) => (
			<span class="flex items-center tabular-nums">
				{info.getValue()}
				<Show when={info.getValue() > thresholds.commitRedFlag}>
					<WarningBadge />
				</Show>
			</span>
		),
	}),
	columnHelper.accessor("lastPush", {
		header: "Last Push",
		cell: (info) => (
			<span class="text-fg-muted" title={info.getValue()}>
				{relativeTime(info.getValue())}
			</span>
		),
	}),
	columnHelper.accessor("attentionScore", {
		header: "Attention Score",
		cell: (info) => {
			const score = info.getValue();
			const colorClass =
				score >= 100
					? "text-danger-fg font-bold"
					: score >= 50
						? "text-attention-fg font-semibold"
						: "text-fg-default font-medium";
			return <span class={`tabular-nums ${colorClass}`}>{score}</span>;
		},
	}),
];

export default function RepoTable() {
	const query = useReposOverview();
	const search = useSearch({ from: "/" });
	const [sorting, setSorting] = createSignal<SortingState>([
		{ id: "attentionScore", desc: true },
	]);

	const filteredRepos = createMemo(() => {
		let repos = query.data?.repos ?? [];
		const params = search();

		if (params.search) {
			const term = params.search.toLowerCase();
			repos = repos.filter((r) => r.name.toLowerCase().includes(term));
		}

		if (params.redFlags) {
			repos = repos.filter((r) => hasRedFlags(r));
		}

		if (params.unengaged) {
			repos = repos.filter((r) => r.unengagedCount > 0);
		}

		if (params.language) {
			repos = repos.filter((r) => r.language === params.language);
		}

		return repos;
	});

	const table = createSolidTable({
		get data() {
			return filteredRepos();
		},
		columns,
		state: {
			get sorting() {
				return sorting();
			},
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div class="overflow-x-auto rounded-md border border-border-default">
			<table class="min-w-full border-collapse">
				<thead>
					<For each={table.getHeaderGroups()}>
						{(headerGroup) => (
							<tr class="bg-canvas-subtle">
								<For each={headerGroup.headers}>
									{(header) => (
										<th
											class="cursor-pointer select-none border-b border-border-default px-4 py-3 text-left text-xs font-semibold text-fg-muted transition-colors hover:text-fg-default"
											onClick={header.column.getToggleSortingHandler()}
										>
											<div class="flex items-center gap-1">
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
												<SortIndicator
													direction={header.column.getIsSorted()}
												/>
											</div>
										</th>
									)}
								</For>
							</tr>
						)}
					</For>
				</thead>
				<tbody>
					<For each={table.getRowModel().rows}>
						{(row, index) => (
							<tr
								class={`transition-colors ${
									hasRedFlags(row.original)
										? "bg-danger-subtle/40 hover:bg-danger-subtle/70"
										: index() % 2 === 0
											? "bg-canvas-default hover:bg-canvas-subtle/70"
											: "bg-canvas-subtle/30 hover:bg-canvas-subtle/70"
								}`}
							>
								<For each={row.getVisibleCells()}>
									{(cell) => (
										<td class="whitespace-nowrap border-b border-border-muted px-4 py-2.5 text-sm text-fg-default">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									)}
								</For>
							</tr>
						)}
					</For>
				</tbody>
			</table>
			<Show when={filteredRepos().length === 0 && !query.isLoading}>
				<div class="py-8 text-center text-sm text-fg-muted">
					No repos match the current filters.
				</div>
			</Show>
		</div>
	);
}

function SortIndicator(props: { direction: false | "asc" | "desc" }) {
	if (!props.direction)
		return <span class="text-fg-subtle/40 transition-colors">&#8597;</span>;
	return (
		<span class="text-accent-fg">
			{props.direction === "asc" ? "\u2191" : "\u2193"}
		</span>
	);
}
