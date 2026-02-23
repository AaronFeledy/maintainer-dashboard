import { createQuery } from "@tanstack/solid-query";
import type { DataMeta, RepoDetail, RepoOverview, UrgentItem } from "../types";

interface ReposOverviewResponse {
	meta: DataMeta;
	repos: RepoOverview[];
}

interface UrgentItemsResponse {
	meta: DataMeta;
	items: UrgentItem[];
}

export function useReposOverview() {
	return createQuery(() => ({
		queryKey: ["repos-overview"],
		queryFn: async (): Promise<ReposOverviewResponse> => {
			const res = await fetch("/data/repos-overview.json");
			if (!res.ok) throw new Error("Failed to fetch repos overview");
			return res.json();
		},
		staleTime: 5 * 60 * 1000,
	}));
}

export function useUrgentItems() {
	return createQuery(() => ({
		queryKey: ["urgent-items"],
		queryFn: async (): Promise<UrgentItemsResponse> => {
			const res = await fetch("/data/urgent-items.json");
			if (!res.ok) throw new Error("Failed to fetch urgent items");
			return res.json();
		},
		staleTime: 5 * 60 * 1000,
	}));
}

export function useRepoDetail(name: () => string) {
	return createQuery(() => ({
		queryKey: ["repo-detail", name()],
		queryFn: async (): Promise<RepoDetail> => {
			const res = await fetch(`/data/repos/${name()}.json`);
			if (!res.ok) throw new Error(`Failed to fetch repo detail: ${name()}`);
			return res.json();
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!name(),
	}));
}
