<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { page} from '$app/stores';
	import { fly } from 'svelte/transition';
	import Input from '$lib/components/input.svelte';
	import TimeTable from '$lib/components/timetable.svelte';

	$: id = $page.params.id;

	let semesterYear;
	let semesterNum;
	let timePerDay;
	let timeStart;
	let timeEnd;
	let restTime;
	let timetableid;
	let dataLoaded = false;

	async function fetchSemester(id) {
		try {
			const response = await fetch(`/api/semester/${id}`);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Failed to fetch semester');
		}
	}

	async function loadSemesterInfo(id) {
		try {
			const data = await fetchSemester(id);
			semesterYear = data.year;
			semesterNum = data.semester_num;
			timePerDay = data.total_time;
			timeStart = data.start_time;
			timeEnd = data.end_time;
			restTime = data.rest_time;
			timetableid = data.timetable_id;

			dataLoaded = true;
		} catch (error) {
			console.error('Error loading semester data');
		}
	}

	let editing = false;

	function edit_toggle() {
		editing = !editing;
	}

	async function handleEdit(event) {
		event.preventDefault();
		const formData = {
			total_time: timePerDay,
			start_time: timeStart,
			end_time: timeEnd,
			rest_time: restTime
		};

		const response = await fetch(`/api/semester/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});

		if (response.ok) {
			const data = await response.json();
			location.reload();
		} else {
			console.error('Failed to update semester info');
		}
	}

	async function deleteSemester() {
		const response = await fetch(`/api/semester/${id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			location.href = '/setting/semester';
		} else {
			console.error('Failed to delete semester');
		}
	}

	function clickOutside(node) {
		const handleClick = (event) => {
			if (!node.contains(event.target)) {
				node.dispatchEvent(new CustomEvent('outclick'));
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	function debug() {
		console.log(semesterYear);
		console.log(semesterNum);
		console.log(timePerDay);
		console.log(timeStart);
		console.log(timeEnd);
		console.log(restTime);
		console.log(timetableid);
	}

	onMount(() => {
			loadSemesterInfo(id);
	});
</script>

<svelte:head>
	<title>학기 관리</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<div class="manage-screen">
	<div class="header">
		<div class="buttons">
			<button class="semester_edit button" on:click={edit_toggle}>학기 정보 수정 </button>
		</div>
		<div class="semesterinfo">{semesterYear}년도<br />{semesterNum}학기</div>
	</div>
	<div class="content">
		{#if dataLoaded}
			<div class="timetable hide-scrollbar">
				<TimeTable
					timePerDay={timePerDay}
					timeStart={timeStart}
					timeEnd={timeEnd}
					restTime={restTime}
					timetableId={timetableid}
				></TimeTable>
			</div>
		{/if}
	</div>
</div>

{#if editing}
	<div class="modal edit_modal">
		<div
			class="modal-content"
			use:clickOutside
			on:outclick={edit_toggle}
			in:fly={{ y: '-20vh', duration: 400 }}
		>
			<span
				role="button"
				tabindex="0"
				class="xbutton"
				title="close"
				on:click={edit_toggle}
				on:keydown={edit_toggle}>&times;</span
			>
			<div class="title">학기 정보 수정</div>
			<br />
			<form on:submit={handleEdit} method="PUT" class="form">
				<div class="stack">
					<label
						><input
							name="number"
							type="number"
							required
							bind:value={timePerDay}
							style="width:120px"
						/>타임</label
					>
				</div>
				<br />
				<div class="stack">
					<label
						>운영 시간
						<input
							name="time"
							type="time"
							required
							bind:value={timeStart}
							style="width:8em"
						/>
						~
						<input
							name="time"
							type="time"
							required
							bind:value={timeEnd}
							style="width:8em"
						/>
					</label >
				</div>
				<br />
				<div class="stack">
					<label
						>기기 휴식 길이 <input
							name="number"
							type="number"
							required
							bind:value={restTime}
							style="width:8em"
						/></label
					>
				</div>
				<br />
				<label>
					<input id="submit2" type="submit" value="학기 수정하기" class="submit" />
				</label>
			</form>
			<button class="delete" on:click={deleteSemester}>삭제</button>
		</div>
	</div>
{/if}


<style>
	input {
		background-color: var(--secondary-secondary-200);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
	}
	label {
		font-family: var(--large-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--large-font-size, 16px);
		font-weight: var(--large-font-weight, 500);
	}
	.playlist {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
	}
	.stack {
		display: flex;
		flex-direction: row;
		gap: 20px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.form {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}
	.label {
		color: var(--primary-primary-700, #b7946c);
		text-align: center;
		font-family: var(--small-medium-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-medium-font-size, 10px);
		font-weight: var(--small-medium-font-weight, 400);
		position: relative;
	}
	.header {
		padding: 16px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		flex-direction: row;
		background-color: var(--secondary-secondary-100);
		border-style: solid;
		border-color: var(--gray-gray-400, #bcbcbc);
		border-width: 1px;
		box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.25);
	}
	.manage-screen {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		position: relative;
		overflow: hidden;
	}
	.semesterinfo {
		margin-left: 120px;
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		position: relative;
	}
	.semester_edit {
		background: var(--gray-gray-500);
	}
	.buttons {
		gap: 40px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.button {
		color: var(--gray-gray-50, #fcfcfc);
		text-align: center;
		font-family: var(--small-medium-font-family,);
		font-size: var(--small-medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		position: relative;
		border-radius: 3px;
		padding: 4px 7px 4px 7px;
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 100px;
		height: 45px;
		position: relative;
		box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		border: none;
	}
	.xbutton {
		position: absolute;
		right: 0;
		top: 0;
		display: inline-block;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		padding: 8px 16px;
		font-weight: bold;
		font-size: 1.4em;
		border-radius: 10%;
	}
	.xbutton:hover {
		color: #fff !important;
		background-color: #f44336 !important;
	}
	.modal {
		z-index: 3;
		display: block;
		padding-top: 10vh;
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		margin-left: 58px;
	}
	.edit_modal {
		backdrop-filter: blur(15px);
	}
	@media only screen and (max-width: 1200px) {
		.content {
			display: flex;
			flex-direction: column;
			gap: 30px;
			width: 100%;
			align-items: center;
			justify-content: space-around;
			position: relative;
			overflow: hidden;
			padding: 40px;
		}
	}
	.content {
		display: flex;
		flex-direction: row;
		gap: 30px;
		width: 100%;
		align-items: flex-start;
		justify-content: space-around;
		position: relative;
		overflow: hidden;
		padding: 40px;
	}
	.modal-content {
		margin: auto;
		background-color: var(--primary-primary-100);
		position: relative;
		padding-top: 30px;
		padding-bottom: 50px;
		outline: 0;
		width: 44vw;
		border-radius: 2%;
		border-color: var(--gray-gray-400);
		border-style: solid;
	}
	.submit {
		background-color: var(--secondary-secondary-50);
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family,);
		font-size: var(--medium-font-size, 13px);
		font-weight: var(--medium-font-weight, 500);
		border: 1px solid var(--primary-primary-700);
		border-radius: 6px;
		border-width: 2px;
		padding: 6px 20px 6px 20px;
		cursor: pointer;
	}
	.title {
		color: var(--gray-gray-900, #202020);
		text-align: center;
		font-family: 'SeoulHangang-L', sans-serif;
		font-size: 32px;
		font-weight: 400;
		position: relative;
	}
</style>
