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
				class="rounded-md border border-border-default bg-canvas-default px-3 py-1.5 text-sm text-fg-default shadow-sm placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none focus:ring-1 focus:ring-accent-fg"
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
				class="rounded-md border border-border-default bg-canvas-default px-3 py-1.5 text-sm text-fg-default shadow-sm focus:border-accent-fg focus:outline-none focus:ring-1 focus:ring-accent-fg"
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
					class="rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-neutral-muted hover:text-fg-default"
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
					? "border-accent-fg bg-accent-subtle text-accent-fg"
					: "border-border-default bg-btn-bg text-fg-default hover:bg-btn-hover-bg"
			}`}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}
