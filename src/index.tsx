import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { RouterProvider } from "@tanstack/solid-router";
import { render } from "solid-js/web";
import { router } from "./router";
import "./styles.css";

const queryClient = new QueryClient();

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}

const root = document.getElementById("root");
if (root) {
	render(() => <App />, root);
}
