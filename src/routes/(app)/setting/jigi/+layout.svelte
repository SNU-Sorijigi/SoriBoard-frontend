<script>
	import '../../../../app.css';
</script>

<div class="app">
	<div class="screen">
		<div class="contents">
			<main>
				<slot />
			</main>
		</div>
	</div>
</div>

<style>
	.screen {
		background: var(--secondary-secondary-100, #fdf1e4);
		display: flex;
		flex-direction: row;
		gap: 0px;
		height: 100vh;
		align-items: center;
		justify-content: flex-start;
		position: relative;
		overflow: hidden;
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
	}
</style>
