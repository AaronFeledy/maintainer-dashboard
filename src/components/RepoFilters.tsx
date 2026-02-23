import { useNavigate, useSearch } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";
import { useReposOverview } from "../queries/repos";
import type { OverviewSearch } from "../router";

export default function RepoFilters() {
	const search = useSearch({ from: "/" });
	const navigate = useNavigate();
	const query = useReposOverview();

	const languages = createMemo(() => {
		const repos = query.data?.repos ?? [];
		const langs = new Set<string>();
		for (const repo of repos) {
			if (repo.language) langs.add(repo.language);
		}
		return Array.from(langs).sort();
	});

	function updateFilters(updates: Partial<OverviewSearch>) {
		const current = search();
		const next: OverviewSearch = {
			search: updates.search !== undefined ? updates.search : current.search,
			redFlags:
				updates.redFlags !== undefined ? updates.redFlags : current.redFlags,
			unengaged:
				updates.unengaged !== undefined ? updates.unengaged : current.unengaged,
			language:
				updates.language !== undefined ? updates.language : current.language,
		};

		// Remove undefined/empty values for clean URLs
		const clean: Record<string, unknown> = {};
		if (next.search) clean.search = next.search;
		if (next.redFlags) clean.redFlags = true;
		if (next.unengaged) clean.unengaged = true;
		if (next.language) clean.language = next.language;

		navigate({ to: "/", search: clean });
	}

	function clearAll() {
		navigate({ to: "/", search: {} });
	}

	const hasActiveFilters = createMemo(() => {
		const s = search();
		return !!s.search || !!s.redFlags || !!s.unengaged || !!s.language;
	});

	return (
		<div class="flex flex-wrap items-center gap-3">
			<input
				type="text"
				placeholder="Search repos..."
				value={search().search ?? ""}
				onInput={(e) =>
					updateFilters({
						search: e.currentTarget.value || undefined,
					})
				}
				class="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>

			<ToggleButton
				label="Has red flags"
				active={!!search().redFlags}
				onClick={() =>
					updateFilters({
						redFlags: !search().redFlags || undefined,
					})
				}
			/>

			<ToggleButton
				label="Has unengaged items"
				active={!!search().unengaged}
				onClick={() =>
					updateFilters({
						unengaged: !search().unengaged || undefined,
					})
				}
			/>

			<select
				value={search().language ?? ""}
				onChange={(e) =>
					updateFilters({
						language: e.currentTarget.value || undefined,
					})
				}
				class="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				<option value="">All languages</option>
				<For each={languages()}>
					{(lang) => <option value={lang}>{lang}</option>}
				</For>
			</select>

			<Show when={hasActiveFilters()}>
				<button
					type="button"
					onClick={clearAll}
					class="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
				>
					Clear all
				</button>
			</Show>
		</div>
	);
}

function ToggleButton(props: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			class={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
				props.active
					? "border-blue-500 bg-blue-50 text-blue-700"
					: "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
			}`}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}
