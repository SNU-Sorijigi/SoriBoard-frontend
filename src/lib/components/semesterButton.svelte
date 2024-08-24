<script>
	import { createEventDispatcher } from 'svelte';
	import time1Icon from '$lib/images/1time.svg';
	import time2Icon from '$lib/images/2time.svg';
	export let semester = '1';
	export let year = '';
	export let id = null;
	$: variantsClassName = `created-${id ? true : false}`;
	const semesterIcons = {
		'1': time1Icon,
		'2': time2Icon,
	};
	$: semesterIcon = semesterIcons[semester] || time1Icon;

	function navigate(url) {
		window.location.href = url;
	}

	const dispatch = createEventDispatcher();
	function create() {
		dispatch('createSemester', { year: year, semester: semester});
	}

	function handleClick() {
		if (id) {
			navigate('/setting/semester/' + id);
		} else {
			create();
		}
	}
</script>

<button class={'semester-button ' + variantsClassName} on:click={handleClick}>
	<div class="stack">
		<div class="text">{semester}타임</div>
	</div>
	<img src={semesterIcon} alt="semesterButton" class="icon" />
</button>

<style>
	.semester-button {
		background: var(--primary-primary-600, #ffceb1);
		border-radius: 8px;
		padding: 0px 8px 0px 2px;
		display: flex;
		flex-direction: row;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		width: 88px;
		height: 20px;
		position: relative;
		overflow: hidden;
		cursor: pointer;
		border: none;
	}
	.stack {
		padding: 0px 0px 0px 20px;
		display: flex;
		flex-direction: row;
		gap: 10px;
		align-items: center;
		justify-content: center;
		flex: 1;
		position: relative;
	}
	.text {
		color: var(--gray-gray-950, #331300);
		text-align: left;
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-medium-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.icon {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		position: absolute;
		left: 23px;
		top: 16px;
		transform: translate(-16px, -16px);
		overflow: visible;
	}
	.semester-button.created-false {
		background: var(--primary-primary-300, #ffefe5);
	}
</style>
