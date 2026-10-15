<script>
	import { onMount } from 'svelte';
	import SemesterButton from './semesterButton.svelte';
	export let year = '';
	let createdList = [];

	async function fetchData(year) {
		const response = await fetch(`/api/semester/year/${year}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch semester data: ${response.status}`);
		}
		return await response.json();
	}

	onMount(() => {
		let destroyed = false;
		fetchData(year)
			.then((array) => {
				createdList = array;
			})
			.catch((error) => {
				// without the list both 학기 would look not created yet;
				// say so, unless the calendar has left this year
				console.error('Error fetching semester data', error);
				if (!destroyed) alert('학기 정보를 불러오지 못했습니다.');
			});
		return () => (destroyed = true);
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
