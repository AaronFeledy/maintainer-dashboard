import { Link } from "@tanstack/solid-router";
import type { SortingState } from "@tanstack/solid-table";
import {
	createColumnHelper,
	createSolidTable,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
} from "@tanstack/solid-table";
import { createSignal, For, Show } from "solid-js";
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
	return <span class="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500" />;
}

function WarningBadge() {
	return <span class="ml-1 inline-flex h-2 w-2 rounded-full bg-amber-500" />;
}

const columnHelper = createColumnHelper<RepoOverview>();

const columns = [
	columnHelper.accessor("name", {
		header: "Repo Name",
		cell: (info) => (
			<Link
				to="/repo/$name"
				params={{ name: info.getValue() }}
				class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
			>
				{info.getValue()}
			</Link>
		),
	}),
	columnHelper.accessor("openIssues", {
		header: "Open Issues",
		cell: (info) => (
			<span class="flex items-center">
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
			<span class="flex items-center">
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
				{relativeTime(info.getValue())}
				<Show when={daysSince(info.getValue()) > thresholds.staleReleaseDays}>
					<WarningBadge />
				</Show>
			</span>
		),
	}),
	columnHelper.accessor("commitsSinceRelease", {
		header: "Commits Since Release",
		cell: (info) => (
			<span class="flex items-center">
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
			<span title={info.getValue()}>{relativeTime(info.getValue())}</span>
		),
	}),
	columnHelper.accessor("attentionScore", {
		header: "Attention Score",
		cell: (info) => <span class="font-semibold">{info.getValue()}</span>,
	}),
];

export default function RepoTable() {
	const query = useReposOverview();
	const [sorting, setSorting] = createSignal<SortingState>([
		{ id: "attentionScore", desc: true },
	]);

	const table = createSolidTable({
		get data() {
			return query.data?.repos ?? [];
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
		<div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<For each={table.getHeaderGroups()}>
						{(headerGroup) => (
							<tr>
								<For each={headerGroup.headers}>
									{(header) => (
										<th
											class="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
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
				<tbody class="divide-y divide-gray-100">
					<For each={table.getRowModel().rows}>
						{(row) => (
							<tr
								class={
									hasRedFlags(row.original)
										? "bg-red-50/50 hover:bg-red-50"
										: "hover:bg-gray-50"
								}
							>
								<For each={row.getVisibleCells()}>
									{(cell) => (
										<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
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
		</div>
	);
}

function SortIndicator(props: { direction: false | "asc" | "desc" }) {
	if (!props.direction) return <span class="text-gray-300">↕</span>;
	return (
		<span class="text-gray-700">{props.direction === "asc" ? "↑" : "↓"}</span>
	);
}
