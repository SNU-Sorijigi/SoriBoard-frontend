<script>
	import { onMount } from 'svelte';
	import { page} from '$app/stores';
	import { fly } from 'svelte/transition';
	import TimeTable from '$lib/components/timetable.svelte';
	import { closeOnKey } from '$lib/closeKey.js';
	import { dialogFocus } from '$lib/dialogFocus.js';
	import { clickOutside } from '$lib/clickOutside.js';

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
		const response = await fetch(`/api/semester/${id}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch semester: ${response.status}`);
		}
		return await response.json();
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
			// No timetable is shown for a semester that did not load
			console.error('Error loading semester data', error);
			alert('학기 정보를 불러오지 못했습니다.');
		}
	}

	let editing = false;

	// 학기 정보 수정 edits copies, filled from the saved values on every open, so an
	// edit closed with × or a click outside is dropped (a changed 타임 clears the timetable).
	let editTimePerDay;
	let editTimeStart;
	let editTimeEnd;
	let editRestTime;

	function edit_toggle() {
		if (!editing) {
			editTimePerDay = timePerDay;
			editTimeStart = timeStart;
			editTimeEnd = timeEnd;
			editRestTime = restTime;
		}
		editing = !editing;
	}

	// True from a 학기 수정하기 or 삭제 until it failed or the page navigates: a second click
	// would ask again and send it twice, and a refused second 삭제 alerts a failure.
	let sending = false;

	async function handleEdit(event) {
		event.preventDefault();
		if (sending) return;
		// The backend rebuilds the timetable when the 타임 count changes, emptying every cell.
		// After 취소 the modal stays open with the typed values.
		if (
			editTimePerDay !== timePerDay &&
			!confirm('타임 수를 바꾸면 시간표에 배정된 지기와 견습이 모두 지워집니다. 수정하시겠습니까?')
		) {
			return;
		}
		sending = true;
		const formData = {
			total_time: editTimePerDay,
			start_time: editTimeStart,
			end_time: editTimeEnd,
			rest_time: editRestTime
		};

		let saved = false;
		try {
			const response = await fetch(`/api/semester/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});
			saved = response.ok;
		} catch (error) {
			console.error('Failed to update semester info', error);
		}

		// After a failure the modal stays open with the typed values
		if (saved) {
			location.reload();
		} else {
			sending = false;
			console.error('Failed to update semester info');
			alert('학기 정보 수정에 실패했습니다.');
		}
	}

	async function deleteSemester() {
		if (sending) return;
		const isConfirmed = confirm('삭제하시겠습니까?');
		if (!isConfirmed) {
			return;
		}
		sending = true;
		let deleted = false;
		try {
			const response = await fetch(`/api/semester/${id}`, {
				method: 'DELETE'
			});
			deleted = response.ok;
		} catch (error) {
			console.error('Failed to delete semester', error);
		}

		if (deleted) {
			location.href = '/setting/semester';
		} else {
			sending = false;
			console.error('Failed to delete semester');
			alert('학기 삭제에 실패했습니다.');
		}
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
		<!-- Empty until the 학기 loads, not "undefined년도" (also after a failed load) -->
		<div class="semesterinfo">
			{#if dataLoaded}{semesterYear}년도<br />{semesterNum}학기{/if}
		</div>
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
			role="dialog"
			aria-labelledby="edit-semester-title"
			tabindex="-1"
			use:dialogFocus={edit_toggle}
			use:clickOutside
			on:outclick={edit_toggle}
			in:fly={{ y: '-20vh', duration: 400 }}
		>
			<span
				role="button"
				tabindex="0"
				class="xbutton"
				title="close"
				aria-label="닫기"
				on:click={edit_toggle}
				on:keydown={closeOnKey(edit_toggle)}>&times;</span
			>
			<div class="title" id="edit-semester-title">학기 정보 수정</div>
			<br />
			<form on:submit={handleEdit} method="PUT" class="form">
				<div class="stack">
					<label
						><input
							name="number"
							type="number"
							min="1"
							required
							bind:value={editTimePerDay}
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
							bind:value={editTimeStart}
							style="width:8em"
							aria-label="운영 시작"
						/>
						~
						<input
							name="time"
							type="time"
							required
							bind:value={editTimeEnd}
							style="width:8em"
							aria-label="운영 종료"
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
							bind:value={editRestTime}
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
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.25);
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
		background: var(--neutral-bg);
	}
	.buttons {
		gap: 40px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.button {
		color: var(--neutral-fg);
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
		box-shadow: 4px 4px 0 0 var(--button-shadow);
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
		color: var(--gray-gray-50) !important;
		background-color: var(--red-red-700) !important;
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
		background-color: transparent; /* shows the page or modal colour underneath (both exact) */
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
	.delete {
		/* the 삭제 button had no rule and painted browser defaults; same danger pair as the session delete */
		background: var(--danger-bg);
		color: var(--danger-fg);
		border: none;
		border-radius: 3px;
		padding: 4px 10px;
		cursor: pointer;
	}
</style>
