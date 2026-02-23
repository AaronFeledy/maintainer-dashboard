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

const overviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: OverviewPage,
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
