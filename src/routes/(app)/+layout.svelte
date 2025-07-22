<script>
	import '../../app.css';
	import SideBar from '$lib/components/sidebar.svelte';
</script>

<div class="app">
	<div class="screen">
		<SideBar />
		<div class="contents">
			<main>
				<slot />
			</main>
		</div>
	</div>
</div>

<style>
	.screen {
		background: var(--secondary-secondary-50, #fdf1e4);
		display: flex;
		flex-direction: row;
		gap: 0px;
		min-height: 100vh; /* Allow expansion beyond viewport */
		width: 100%;
		min-width: 1000px; /* Ensure minimum width for proper layout */
		align-items: stretch;
		justify-content: flex-start;
		position: relative;
		overflow: visible; /* Allow content to expand */
	}

	.contents {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: center;
		flex: 1;
		min-width: 0; /* Allow shrinking */
		min-height: 100vh; /* Allow expansion beyond viewport */
		overflow-x: auto;
		overflow-y: visible; /* Let content determine height */
	}
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		width: 100%;
		min-width: 1000px; /* Ensure minimum width for the entire app */
		overflow-x: auto;
		overflow-y: auto;
	}
	main {
		width: 100%;
		min-width: 0; /* Allow shrinking */
		display: flex;
		justify-content: center;
		overflow-x: auto;
		overflow-y: visible; /* Let content determine height */
		min-height: 100vh; /* Ensure minimum height but allow growth */
	}
</style>
