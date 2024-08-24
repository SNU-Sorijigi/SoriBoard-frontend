<script>
	import YearBlock from './yearBlock.svelte';
	let currentDate = new Date();
	let year = currentDate.getFullYear();
	let createdList = [];

	function prevYear() {
		year--;
	}

	function nextYear() {
		year++;
	}

	function goToday() {
		year = currentDate.getFullYear();
	}

	function formatYearDisplay(year) {
		return `${year}년`;
	}

</script>

<div class="semestercalendar">
	<div class="header">
		<div class="month">{formatYearDisplay(year)}</div>
		<div class="buttons">
			<button class="button" on:click={goToday}>&nbsp&nbsp오늘&nbsp&nbsp</button>
			<button class="button" on:click={prevYear}
				>&nbsp&nbsp&nbsp&nbsp{'<'}&nbsp&nbsp&nbsp&nbsp</button
			>
			<button class="button" on:click={nextYear}
				>&nbsp&nbsp&nbsp&nbsp{'>'}&nbsp&nbsp&nbsp&nbsp</button
			>
		</div>
	</div>
	<div class="stack">
		<div class="stack2">
			<div class="div">1학기(봄학기)</div>
			<div class="div">2학기(가을학기)</div>
		</div>
		<div class="year-block">
			{#key year}
				<YearBlock year={year} on:createSemester></YearBlock>
			{/key}
		</div>
	</div>
</div>

<style>
	.semestercalendar {
		display: flex;
		flex-direction: column;
		gap: 20px;
		align-items: flex-start;
		justify-content: flex-start;
		position: relative;
		margin-top: 5vh;
	}
	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		justify-content: space-evenly;
	}
	.year-block {
		border-style: dashed;
		border-color: var(--gray-gray-600, #7c7c7c);
		border-width: 1px;
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		flex-shrink: 0;
		position: relative;
	}
</style>

