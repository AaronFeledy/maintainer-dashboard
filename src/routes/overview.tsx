import { Show } from "solid-js";
import RepoFilters from "../components/RepoFilters";
import RepoTable from "../components/RepoTable";
import UrgentFeed from "../components/UrgentFeed";
import { useReposOverview } from "../queries/repos";

function relativeAge(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

export default function OverviewPage() {
	const query = useReposOverview();

	return (
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="mb-6 flex items-center justify-between border-b border-border-muted pb-4">
				<h1 class="text-2xl font-bold text-fg-default">Lando Dashboard</h1>
				<Show when={query.data?.meta.fetchedAt}>
					{(fetchedAt) => (
						<span class="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-canvas-subtle px-3 py-1 text-xs text-fg-muted">
							<span class="inline-block h-2 w-2 rounded-full bg-success-emphasis" />
							Last updated: {relativeAge(fetchedAt())}
						</span>
					)}
				</Show>
			</div>

			<Show when={query.error}>
				{(error) => (
					<div class="mb-4 rounded-md border border-danger-fg/20 bg-danger-subtle px-4 py-3 text-sm text-danger-fg">
						Failed to load data: {error().message}
					</div>
				)}
			</Show>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-16 text-center text-sm text-fg-muted">
						Loading dashboard data...
					</div>
				}
			>
				<div class="space-y-6">
					<UrgentFeed />
					<RepoFilters />
					<RepoTable />
				</div>
			</Show>
		</div>
	);
}
