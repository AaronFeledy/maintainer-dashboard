import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from "@tanstack/solid-router";
import OverviewPage from "./routes/overview";
import RepoDetailPage from "./routes/repo-detail";

const rootRoute = createRootRoute({
	component: () => (
		<div class="min-h-screen bg-gray-50">
			<Outlet />
		</div>
	),
});

export interface OverviewSearch {
	search?: string;
	redFlags?: boolean;
	unengaged?: boolean;
	language?: string;
}

const overviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: OverviewPage,
	validateSearch: (input: Record<string, unknown>): OverviewSearch => ({
		search: typeof input.search === "string" ? input.search : undefined,
		redFlags: input.redFlags === true || input.redFlags === "true" || undefined,
		unengaged:
			input.unengaged === true || input.unengaged === "true" || undefined,
		language: typeof input.language === "string" ? input.language : undefined,
	}),
});

const repoDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/repo/$name",
	component: RepoDetailPage,
});

const routeTree = rootRoute.addChildren([overviewRoute, repoDetailRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router;
	}
}
