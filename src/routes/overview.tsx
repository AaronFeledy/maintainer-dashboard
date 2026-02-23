import RepoTable from "../components/RepoTable";
import UrgentFeed from "../components/UrgentFeed";

export default function OverviewPage() {
	return (
		<div class="p-6">
			<h1 class="text-2xl font-bold">Overview</h1>
			<div class="mt-4">
				<UrgentFeed />
			</div>
			<div class="mt-6">
				<RepoTable />
			</div>
		</div>
	);
}
