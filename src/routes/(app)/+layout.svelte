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
		height: 100vh;
		width: 100%;
		align-items: flex-start;
		justify-content: flex-start;
		position: relative;
	}

	.contents {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		width: 100%;
	}
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		width: 100%;
	}
	main {
		width: 100%;
		display: flex;
		justify-content: center;
	}
</style>
