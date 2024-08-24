<script>
	import { onMount } from 'svelte';
	import SemesterButton from './semesterButton.svelte';
	export let year = '';
	let createdList = [];

	async function fetchData(year) {
		const response = await fetch(
			`/api/semester/year/${year}`
		);
		if (!response.ok) {
			console.log('Error fetching semester data');
		}
		return await response.json();
	}

	onMount(() => {
		fetchData(year).then((array) => {
			createdList = array;
		});
	});

</script>

<div class="year-block">
	<div class="year">
		{year}
	</div>
	<div class="stack">
		<SemesterButton
			year={parseInt(year)}
			semester="1"
			id={createdList[0]}
			on:createSemester
		></SemesterButton>
		<SemesterButton
			year={parseInt(year)}
			semester="2"
			id={createdList[1]}
			on:createSemester
		></SemesterButton>
	</div>
</div>

<style>
	.year-block {
		border-style: dashed;
		border-color: var(--gray-gray-600, #7c7c7c);
		border-width: 1px;
		padding: 5px;
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items: flex-start;
		justify-content: flex-start;
		width: 132px;
		height: 110px;
		position: relative;
	}
	.year {
		text-align: left;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		align-self: stretch;
		flex: 1;
		position: relative;
	}
</style>
