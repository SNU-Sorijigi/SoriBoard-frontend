<script>
	import TimeCalendar from '$lib/components/timecalendar.svelte';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import plusicon from '$lib/images/plus.svg';
	import minusicon from '$lib/images/minus.svg';

	let semester_exists = false;

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

	async function getSemesterId(year, month) {
		const response = await fetch(`/api/semester/year/${year}`);
		const data = await response.json();
		let semester_id;
		if (month <= 7) {
			semester_id = data[0];
		} else {
			semester_id = data[1];
		}
		return semester_id;
	}

	async function fetchSemester(id) {
		if (id) {
			semester_exists = true;
			const response = await fetch(`/api/semester/${id}`);
			const data = await response.json();
			console.log(data);
			return data;
		} else {
			semester_exists = false;
		}
	}

	async function fetchTimetable(semester_id) {
		const response = await fetch(`/api/timetable/${semester_id}`);
		const data = await response.json();
		return data;
	}

	async function fetchTimetableUnit(timetableunit_id) {
		const response = await fetch(`/api/timetableunit/${timetableunit_id}`);
		const data = await response.json();
		return data;
	}

	async function fetchJigis(y, m, d, t) {
		let day = new Date(y, m - 1, d);

		// console.log(`y: ${y}, m: ${m}, d: ${d}, t: ${t}`);

		const semester_id = await getSemesterId(y, m);
		// console.log(`semester_id: ${semester_id}`);

		const semester_data = await fetchSemester(semester_id);
		// console.log(`semester_data: ${JSON.stringify(semester_data)}`);

		if (semester_exists === false) {
			return;
		}

		const timetable_data = await fetchTimetable(semester_data.timetable_id);
		// console.log(`timetable_data: ${JSON.stringify(timetable_data)}`);

		const timetable = timetable_data.table;
		// console.log(`timetable: ${JSON.stringify(timetable)}`);

		const timetableunit_id = timetable[day.getDay()][t];
		// console.log(`timetableunit_id: ${timetableunit_id}`);

		const timetableunit_data = await fetchTimetableUnit(timetableunit_id);
		// console.log(`timetableunit_data: ${JSON.stringify(timetableunit_data)}`);

		return timetableunit_data;
	}

	function toggle() {
		visible = !visible;
	}

	function formatDate(year, month, day) {
		const date = new Date(year, month - 1, day + 1);
		const formattedDate = date.toISOString().split('T')[0];
		return formattedDate;
	}

	let visible = false;
	let num = writable('');
	let date = writable('');
	let mento_time = writable('');
	let mentee_time = writable('');
	let mento = '';
	let mentee = '';
	let mento_id = [];
	let mentee_id = [];

	function addMentoRow() {
		mento_id = [...mento_id, ''];
	}
	function removeMentoRow(index) {
		mento_id = mento_id.filter((_, i) => i !== index);
	}

	function addMenteeRow() {
		mentee_id = [...mentee_id, ''];
	}
	function removeMenteeRow(index) {
		mentee_id = mentee_id.filter((_, i) => i !== index);
	}

	// Load all users for selection
	const allUsers = writable([]);
	async function fetchUsers() {
		try {
			const res = await fetch('/api/user/');
			if (res.ok) {
				const data = await res.json();
				allUsers.set(data);
			}
		} catch (e) {
			console.error('Failed to fetch users');
		}
	}

	let jigis = [];

	async function create(event) {
		const { year, month, day, time } = event.detail;
		const timeUnitData = await fetchJigis(year, month, day, time);
		if (semester_exists === false) {
			alert('해당 학기가 존재하지 않습니다.');
			return;
		}
		if (!timeUnitData.jigi_info || timeUnitData.jigi_info.length === 0) {
			alert('해당 타임의 시간표 정보가 존재하지 않습니다.');
			return;
		}
		let now = new Date(new Date().getTime() + 1000 * 60 * 60 * 9);
		mento_time.set(now.toISOString().substring(11, 16));
		mentee_time.set(now.toISOString().substring(11, 16));
		date.set(formatDate(year, month, day));
		num.set(time);
		// Prefill from timetable unit
		mento = Array.isArray(timeUnitData.jigi_info)
			? timeUnitData.jigi_info.join(', ')
			: timeUnitData.jigi_info;
		mento_id = (timeUnitData.users || []).map(String);
		mentee = Array.isArray(timeUnitData.mentee_info)
			? timeUnitData.mentee_info.join(', ')
			: timeUnitData.mentee_info || '';
		mentee_id = (timeUnitData.mentees || []).map(String);

		// Ensure user list is loaded before showing modal
		await fetchUsers();
		toggle();
	}

	function navigate(url) {
		window.location.href = url;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		const formData = {
			date: $date,
			time: $num,
			users: mento_id.map(Number),
			mentees: mentee_id.map(Number),
			arrival_time: $mento_time,
			mentee_arrival_time: $mentee_time
		};

		if (semester_exists === false) {
			alert('현재 학기가 존재하지 않습니다.');
			return;
		}

		const response = await fetch('/api/time', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		if (response.ok) {
			const data = await response.json();
			navigate('/time_manage/' + data.id);
		} else {
			console.error('Failed to create TimeInfo');
		}
	}
</script>

<svelte:head>
	<title>타임 관리</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<TimeCalendar on:createTime={create} />
{#if visible}
	<div class="modal">
		<div
			class="modal-content"
			use:clickOutside
			on:outclick={toggle}
			in:fly={{ y: '-20vh', duration: 400 }}
		>
			<span
				role="button"
				tabindex="0"
				class="xbutton"
				title="close"
				on:click={toggle}
				on:keydown={toggle}>&times;</span
			>
			<div class="title">타임 생성</div>
			<br />
			<form on:submit={handleSubmit} method="POST" class="form">
				<div class="stack">
					<label
						><input
							name="date"
							type="date"
							required
							bind:value={$date}
							style="width:120px"
							readonly
						/></label
					>
					<label
						><input
							name="number"
							type="number"
							min="1"
							max="5"
							bind:value={$num}
							required
							style="width:40px"
							readonly
						/> 타임</label
					>
				</div>
				<br />
				<div class="stack">
					<div class="col">
						<label for="mento-row-0">지기</label>
						{#each mento_id as id, i}
							<div class="row">
								<select id={`mento-row-${i}`} bind:value={mento_id[i]} aria-label={`지기 ${i + 1}`}>
									<option value="" disabled>선택</option>
									{#each $allUsers as u}
										<option value={String(u.id)}>{u.name} {u.major} {u.year_id}</option>
									{/each}
								</select>
								{#if i > 0}
									<button type="button" class="minus" on:click={() => removeMentoRow(i)}>
										<img src={minusicon} alt="minus" />
									</button>
								{/if}
							</div>
						{/each}
						<button type="button" class="plus" on:click={addMentoRow}>
							<img src={plusicon} alt="plus" />
						</button>
					</div>
					<label
						>출근 시간 <input
							name="time"
							type="time"
							required
							bind:value={$mento_time}
							style="width:8em"
						/></label
					>
				</div>
				<div class="stack">
					<div class="col">
						<label for="mentee-row-0">제자</label>
						{#each mentee_id as id, i}
							<div class="row">
								<select
									id={`mentee-row-${i}`}
									bind:value={mentee_id[i]}
									aria-label={`제자 ${i + 1}`}
								>
									<option value="" disabled>선택</option>
									{#each $allUsers as u}
										<option value={String(u.id)}>{u.name} {u.major} {u.year_id}</option>
									{/each}
								</select>
								{#if i > 0}
									<button type="button" class="minus" on:click={() => removeMenteeRow(i)}>
										<img src={minusicon} alt="minus" />
									</button>
								{/if}
							</div>
						{/each}
						<button type="button" class="plus" on:click={addMenteeRow}>
							<img src={plusicon} alt="plus" />
						</button>
					</div>
					<label style="visibility: {mentee_id.length ? 'visible' : 'hidden'};"
						>출근 시간 <input
							name="time"
							type="time"
							bind:value={$mentee_time}
							style="width:8em"
						/></label
					>
				</div>
				<br />
				<label>
					<input type="submit" value="타임 시작하기" class="submit" />
				</label>
			</form>
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
	.modal {
		z-index: 3;
		display: block;
		padding-top: 10vh;
		position: fixed;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		overflow: auto;
		backdrop-filter: blur(15px);
		margin-left: 58px;
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
	.form {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}
	.stack {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}
	.title {
		font-family: var(--xlarge-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--xlarge-font-size, 16px);
		font-weight: var(--xlarge-font-weight, 500);
		text-align: center;
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

	.submit {
		width: 100%;
		height: 100%;
		font-family: var(--large-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--large-font-size, 16px);
		font-weight: var(--large-font-weight, 500);
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.row {
		display: flex;
		flex-direction: row;
		gap: 6px;
		align-items: center;
	}
	.plus,
	.minus {
		width: 32px;
		height: 32px;
		border: none;
		background: var(--secondary-secondary-50);
		cursor: pointer;
	}
	.plus img,
	.minus img {
		width: 16px;
		height: 16px;
	}
</style>
