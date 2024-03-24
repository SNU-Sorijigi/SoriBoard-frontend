<script>
	import DayBlock from './dayBlock.svelte';
	import { onMount } from 'svelte';
	export let week;
	export let month;
	export let year;
	let createdList = [];

	function calculateWeekDays(year, month, weekNumber) {
		const getSunday = (d) => new Date(d.setDate(d.getDate() - d.getDay()));
		const addDays = (d, days) => new Date(d.setDate(d.getDate() + days));
		const formatDate = (d) => ('0' + d.getDate()).slice(-2);
		const isSameDay = (d1, d2) =>
			d1.getFullYear() === d2.getFullYear() &&
			d1.getMonth() === d2.getMonth() &&
			d1.getDate() === d2.getDate();

		let dates = [];
		let date = new Date(year, month, 1);
		let firstSunday = getSunday(new Date(year, month, 1));

		date = addDays(firstSunday, weekNumber * 7);
		const today = new Date();

		for (let i = 0; i < 7; i++) {
			let day = addDays(new Date(date), i);
			dates.push({
				date: formatDate(day),
				month: day.getMonth(),
				year: day.getFullYear(),
				isToday: isSameDay(day, today),
				isThisMonth: day.getMonth() === month
			});
		}

		return dates;
	}

	$: daysOfWeek = calculateWeekDays(year, month, week);

	async function fetchData(start_year, start_month, start_day, end_year, end_month, end_day) {
		start_month = ('0' + start_month).slice(-2);
		end_month = ('0' + end_month).slice(-2);
		const response = await fetch(
			`/api/time/${start_year}/${start_month}/${start_day}/${end_year}/${end_month}/${end_day}`
		);
		if (!response.ok) {
			console.log('Error');
		}
		return await response.json();
	}

	onMount(() => {
		fetchData(
			daysOfWeek[0].year,
			daysOfWeek[0].month + 1,
			daysOfWeek[0].date,
			daysOfWeek[daysOfWeek.length - 1].year,
			daysOfWeek[daysOfWeek.length - 1].month + 1,
			daysOfWeek[daysOfWeek.length - 1].date
		).then((array) => {
			createdList = array;
		});
	});
</script>

<div class="week-block">
	{#each daysOfWeek as { date, month, year, isToday, isThisMonth }, i}
		<DayBlock
			day={date}
			month={month + 1}
			{year}
			time={i !== 0 && i !== 6}
			{isToday}
			{isThisMonth}
			create={createdList[i]}
			on:createTime
		></DayBlock>
	{/each}
</div>

<style>
	.week-block {
		display: flex;
		flex-direction: row;
		gap: 0px;
		align-items: center;
		justify-content: center;
		position: relative;
	}
</style>
