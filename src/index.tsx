import { render } from "solid-js/web";
import "./styles.css";

function App() {
	return <div class="p-4">Lando Dashboard</div>;
}

const root = document.getElementById("root");
if (root) {
	render(() => <App />, root);
}
