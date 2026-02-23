import { useParams } from "@tanstack/solid-router";

export default function RepoDetailPage() {
	const params = useParams({ from: "/repo/$name" });

	return (
		<div class="p-6">
			<h1 class="text-2xl font-bold">Repo Detail: {params.name}</h1>
			<p class="mt-2 text-gray-600">
				Detailed repo information will appear here.
			</p>
		</div>
	);
}
