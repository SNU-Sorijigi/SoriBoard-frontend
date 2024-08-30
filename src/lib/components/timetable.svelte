<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import TimetableUnit from '$lib/components/timetableunit.svelte';
	export let timePerDay;
	export let timeStart;
	export let timeEnd;
	export let restTime;
	export let timetableId;

	function debug() {
		console.log("debugging whether the values are passed correctly");
		console.log(timePerDay);
		console.log(timeStart);
		console.log(timeEnd);
		console.log(restTime);
		console.log(timetableId);
		console.log("debugging end");
	}

	// Calculate start and end time of each time unit
	// with given timePerDay, timeStart, timeEnd, and restTime(=break time in minutes)
	// and store it in timeSchedule in form of "HH:MM~HH:MM"
	let timeSchedule = [];
	let timeScheduleLoaded = false;
	let dayName = ['월', '화', '수', '목', '금'];
	function calculateTime() {
		const startTime = new Date(`1970-01-01T${timeStart}`);
		const endTime = new Date(`1970-01-01T${timeEnd}`);

		const totalMinutes = (endTime - startTime) / 60000;
		const totalRestTime = restTime * (timePerDay - 1);

		const unitMinutes = (totalMinutes - totalRestTime) / timePerDay;

		const cur = new Date(startTime);

		for (let i = 0; i < timePerDay; i++) {
			const s = new Date(cur);
			const e = new Date(cur.getTime() + unitMinutes * 60000);

			const sFormatted = s.toTimeString().slice(0, 5);
			const eFormatted = e.toTimeString().slice(0, 5);

			timeSchedule.push(`${sFormatted}~${eFormatted}`);

			// update cur
			cur.setMinutes(cur.getMinutes() + unitMinutes + restTime);
		}

		console.log(timeSchedule);
		timeScheduleLoaded = true;
	}

	let timetableUnitIdData;
	let dataLoaded = false;
	let timetable = [[], [], [], [], []];

	// fetch timetable data
	async function fetchTimetable(id) {
		try {
			const response = await fetch(`/api/timetable/${id}`);
			const data = await response.json();
			timetableUnitIdData = data.table;
			console.log(timetableUnitIdData);
			removeFirstAndLastElement();
		} catch (error) {
			console.error(error);
			console.error(`Failed to fetch timetable id ${id}`);
		}
	}

	// remove first and last element of timetableUnitIdData - only Monday to Friday
	function removeFirstAndLastElement() {
		for (let i = 1; i <= 5; i++) {
			for (let j = 1; j <= timePerDay; j++) {
				timetable[i-1].push(timetableUnitIdData[i][j]);
			}
		}
		dataLoaded = true;
		console.log(timetable);
	}

	onMount(() => {
		// debug();
		calculateTime();
		fetchTimetable(timetableId);
	});

</script>

<div class="stack">
	{#if dataLoaded && timeScheduleLoaded}
		{#each Array(timePerDay) as _, index}
		<div class="stack2">
			<div class="stack">{index+1}타임: {timeSchedule[index]}</div>
			{#each timetable as day, dayIndex}
				<TimetableUnit id={day[index]}> </TimetableUnit>
			{/each}
		</div>
		{/each}
	{/if}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: flex-start;
		justify-content: flex-start;
		flex-shrink: 0;
		position: relative;
	}
	.stack2 {
		display: flex;
		flex-direction: row;
		gap: 100px;
		align-items: center;
		justify-content: flex-start;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

</style>
