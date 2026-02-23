import { Show } from "solid-js";
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
		<div class="mx-auto max-w-7xl p-6">
			<div class="mb-6 flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Lando Dashboard</h1>
				<Show when={query.data?.meta.fetchedAt}>
					{(fetchedAt) => (
						<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
							Last updated: {relativeAge(fetchedAt())}
						</span>
					)}
				</Show>
			</div>

			<Show when={query.error}>
				{(error) => (
					<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						Failed to load data: {error().message}
					</div>
				)}
			</Show>

			<Show
				when={!query.isLoading}
				fallback={
					<div class="py-12 text-center text-gray-500">
						Loading dashboard data...
					</div>
				}
			>
				<div class="space-y-6">
					<UrgentFeed />
					<RepoTable />
				</div>
			</Show>
		</div>
	);
}
