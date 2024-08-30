<script>
	import SemesterCalendar from '$lib/components/SemesterCalendar.svelte';
	import { fade, fly } from 'svelte/transition';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

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

	let createSemesterVisible = false;
	let semYear = writable('');
	let semesterNum = writable('');
	let timePerDay = writable('');
	let timeStart = writable('');
	let timeEnd = writable('');
	let restTime = writable('');

	function toggle() {
		createSemesterVisible = !createSemesterVisible;
	}

	function create(event) {
		const { year, semester } = event.detail;
		semYear.set(year);
		semesterNum.set(semester);
		toggle();
	}

	function navigate(url) {
		window.location.href = url;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		const formData = {
			year: $semYear,
			total_time: $timePerDay,
			semester_num: $semesterNum,
			start_time: $timeStart,
			end_time: $timeEnd,
			rest_time: $restTime
		};

		const response = await fetch('/api/semester', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		if (response.ok) {
			const data = await response.json();
			navigate('/setting/semester/' + data.id);
		} else {
			console.error('Failed to create SemesterInfo');
		}
	}


</script>

<svelte:head>
	<title>학기 관리</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<SemesterCalendar on:createSemester={create} />
{#if createSemesterVisible}
	<div class="modal">
		<div class="modal-content" use:clickOutside on:outclick={toggle} in:fly={{ y: '-20vh', duration: 400 }}>
			<span
				role="button"
				tabindex="0"
				class="xbutton"
				title="close"
				on:click={toggle}
				on:keydown={toggle}>&times;</span
			>
			<div class="title">학기 생성</div>
			<br />
			<form on:submit={handleSubmit} method="POST" class="form">
				<div class="stack">
					<label>
						<input
							name="year"
							type="number"
							required
							bind:value={$semYear}
						/>
						년도
					</label>
					<label>
						<input
							name="semester"
							type="number"
							required
							bind:value={$semesterNum}
						/>
						학기
					</label>
				</div>
				<div class="stack">
					<label >
						운영 시작
						<input
							name="time"
							type="time"
							required
							bind:value={$timeStart}
							style="width:8em"
						/>
					</label>
					<label >
						종료
						<input
							name="time"
							type="time"
							required
							bind:value={$timeEnd}
							style="width:8em"
						/>
					</label>
				</div>
				<div class="stack">
					<label>
						하루
						<input
							name="time"
							type="number"
							required
							bind:value={$timePerDay}
						/>타임
					</label>
					<label>
						기기 휴식
						<input
							name="time"
							type="number"
							required
							bind:value={$restTime}
						/>분
					</label>
				</div>
				<label>
					<input type="submit" value="학기 생성" class="submit" />
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
