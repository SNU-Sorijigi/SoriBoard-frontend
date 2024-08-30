<script>
	import TimeCalendar from '$lib/components/timecalendar.svelte';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

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
	$: mento = '';
	$: mentee = '';
	$: mento_id = '';
	$: mentee_id = '';
	let users = [
		['강태현', '조형근', '오유진', '윤지호', '백서연'],
		['문도희', '한유진', '김동민', '이하정', '신재원'],
		['박인서', '이재원', '이윤재', '홍주한', '최창인'],
		['김진웅', '이채은', '한지호', '오윤서', '이현서'],
		['정수현', '김태후', '호원재', '박석진', '현상윤']
	];

	let jigis = [];

	async function create(event) {
		const { year, month, day, time } = event.detail;
		const timeUnitData = await fetchJigis(year, month, day, time);
		if (semester_exists === false) {
			alert('해당 학기가 존재하지 않습니다.');
			return;
		}
		if (timeUnitData.jigi_info === "") {
			alert('해당 타임의 시간표 정보가 존재하지 않습니다.');
			return;
		}
		let now = new Date(new Date().getTime() + 1000 * 60 * 60 * 9);
		mento_time.set(now.toISOString().substring(11, 16));
		mentee_time.set(now.toISOString().substring(11, 16));
		date.set(formatDate(year, month, day));
		num.set(time);
		// mento = users[d.getDay() - 1][time - 1];
		mento = timeUnitData.jigi_info;
		mento_id = timeUnitData.user;
		mentee = timeUnitData.mentee_info;
		mentee_id = timeUnitData.mentee;
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
			user: mento_id,
			mentee: mentee_id,
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
					<label
						>지기<input
							name="name"
							type="text"
							required
							style="width:5em"
							autocomplete="off"
							bind:value={mento}
							readonly
						/></label
					>
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
					<label
						>제자<input
							name="subname"
							type="text"
							style="width:5em"
							autocomplete="off"
							bind:value={mentee}
							readonly
						/></label
					>
					<label style="visibility: {mentee ? 'visible' : 'hidden'};"
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
</style>
