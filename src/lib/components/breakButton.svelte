<script>
	import sleeplogo from '$lib/images/sleep.svg';
	import { tvSender } from '$lib/tvSocket';
	import { onMount } from 'svelte';
	export let time;
	let breakTime;
	let tv;
	let goodBye = "안녕히가세요";

	function updateBreakTime(time) {
		switch (time) {
			case 1:
				breakTime = '11:10';
				break;
			case 2:
				breakTime = '12:50';
				break;
			case 3:
				breakTime = '14:30';
				break;
			case 4:
				breakTime = '16:10';
				break;
			case 5:
				breakTime = '17:50';
				break;
			default:
				breakTime = '';
				break;
		}
	}

	// Also after ◀/▶: the session page keeps this button and only changes `time`
	$: updateBreakTime(time);

	onMount(() => {
		tv = tvSender();
		return () => tv.close();
	});

	function showDisplay() {
		const displayData = {
			update_type: 'breaktime',
			breaktime: '~' + breakTime
		};
		tv.send(displayData);
	}
	function quit() {
		const displayData = {
			update_type: 'breaktime',
			breaktime: goodBye,
		};
		tv.send(displayData);
	}
</script>
{#if time!=5}
<div class="set">
	<button class="sleep button" on:click={showDisplay}>
		<img src={sleeplogo} alt="" />
		기기 휴식
	</button>
	<input
		name="time"
		type="time"
		bind:value={breakTime}
		style="width:110px"
		aria-label="휴식 종료 시각"
	/>
</div>
{:else}
<div class="set">
	<button class="sleep button" on:click={quit}>
		<img src={sleeplogo} alt="" />
		운영 종료
	</button>
	<input
		name="time"
		type="text"
		bind:value={goodBye}
		style="width:110px"
		aria-label="운영 종료 문구"
	/>
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
	.set {
		display: flex;
		flex-direction: row;
		gap: 8px; /* room for the 4px diagonal button shadow */
		align-items: center;
		justify-content: center;
	}
	.sleep {
		background: var(--rest-bg);
	}
	.button {
		color: var(--rest-fg);
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
</style>
