<script>
	import sleeplogo from '$lib/images/sleep.svg';
	import { webSocketServer } from '$lib/globals';
	import { onMount } from 'svelte';
	export let time;
	let breakTime;
	let ws;
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

	onMount(() => {
		updateBreakTime(time);
		ws = new WebSocket(`${webSocketServer}/ws/tv_display/`);
	});

	function showDisplay() {
		const displayData = {
			update_type: 'breaktime',
			breaktime: '~' + breakTime
		};
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(displayData));
		} else {
			console.log('WebSocket is not open. ReadyState: ', ws.readyState);
		}
	}
	function quit() {
		const displayData = {
			update_type: 'breaktime',
			breaktime: goodBye,
		};
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(displayData));
		} else {
			console.log('WebSocket is not open. ReadyState: ', ws.readyState);
		}
	}
</script>
{#if time!=5}
<div class="set">
	<button class="sleep button" on:click={showDisplay}>
		<img src={sleeplogo} alt="sleep" />
		기기 휴식
	</button>
	<input name="time" type="time" bind:value={breakTime} style="width:110px" />
</div>
{:else}
<div class="set">
	<button class="sleep button" on:click={quit}>
		<img src={sleeplogo} alt="sleep" />
		운영 종료
	</button>
	<input name="time" type="text" bind:value={goodBye} style="width:110px" />
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
		gap: 4px;
		align-items: center;
		justify-content: center;
	}
	.sleep {
		background: var(--blue-blue-600);
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
</style>
