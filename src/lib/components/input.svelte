<script>
	export let label = '';
	export let value = '';
	export let width = '300px';
</script>

<div class="container" style="--width: {width};">
	<div class="label">{label}</div>
	<input type="text" bind:value />
</div>

<style>
	.container {
		position: relative;
		margin-top: 24px;
	}
	.label {
		position: absolute;
		top: -8px;
		left: 15px;
		background-color: var(--secondary-secondary-50);
		padding: 0 5px;
		font-size: 0.875rem;
		color: var(--primary-primary-700, #b7946c);
		text-align: left;
		font-family: var(--small-medium-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: 14px;
		font-weight: var(--small-font-weight, 400);
	}
	input[type='text'] {
		width: var(--width);
		padding: 8px;
		border: 1px solid var(--primary-primary-700);
		border-radius: 6px;
		border-width: 2px;
		color: var(--gray-gray-950, #1a1a1a);
		text-align: left;
		font-family: var(--small-medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		font-weight: var(--small-font-weight, 500);
	}
</style>
