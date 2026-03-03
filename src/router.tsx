import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from "@tanstack/solid-router";
import OverviewPage from "./routes/overview";
import RepoDetailPage from "./routes/repo-detail";
import RepoIssuesPage from "./routes/repo-issues";
import RepoPRsPage from "./routes/repo-prs";
import UrgentListPage from "./routes/urgent";

const rootRoute = createRootRoute({
	component: () => (
		<div class="min-h-screen bg-canvas-subtle">
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

export interface PaginatedSearch {
	page?: number;
}

const urgentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/urgent",
	component: UrgentListPage,
	validateSearch: (input: Record<string, unknown>): PaginatedSearch => ({
		page:
			typeof input.page === "number"
				? input.page
				: typeof input.page === "string"
					? Number.parseInt(input.page, 10) || 1
					: undefined,
	}),
});

const repoIssuesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/repo/$name/issues",
	component: RepoIssuesPage,
	validateSearch: (input: Record<string, unknown>): PaginatedSearch => ({
		page:
			typeof input.page === "number"
				? input.page
				: typeof input.page === "string"
					? Number.parseInt(input.page, 10) || 1
					: undefined,
	}),
});

const repoPRsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/repo/$name/prs",
	component: RepoPRsPage,
	validateSearch: (input: Record<string, unknown>): PaginatedSearch => ({
		page:
			typeof input.page === "number"
				? input.page
				: typeof input.page === "string"
					? Number.parseInt(input.page, 10) || 1
					: undefined,
	}),
});

const routeTree = rootRoute.addChildren([
	overviewRoute,
	repoDetailRoute,
	urgentRoute,
	repoIssuesRoute,
	repoPRsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/solid-router" {
	interface Register {
		router: typeof router;
	}
}
