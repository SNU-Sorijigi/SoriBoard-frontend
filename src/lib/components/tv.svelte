<script>
	import { onMount } from 'svelte';
	import { webSocketServer } from '$lib/globals';
	import { displayComposer } from '$lib/displayStore';
	import { displayTitle } from '$lib/displayStore';
	import { displaySemiTitle } from '$lib/displayStore';
	import { displayConductor } from '$lib/displayStore';
	import { displayOrchestra } from '$lib/displayStore';
	import { displayPlayers } from '$lib/displayStore';
	import {
		composerFontSize,
		titleFontSize,
		orchestraFontSize,
		playerFontSize,
		spacerSize1,
		spacerSize2,
		spacerSize3,
		spacerSize4
	} from '$lib/displayStore.js';
	let ws;
	onMount(() => {
		ws = new WebSocket(`${webSocketServer}/ws/tv_display/`);
	});
	function editDisplay() {
		const data = {
			update_type: 'size',
			composerFontSize: $composerFontSize,
			titleFontSize: $titleFontSize,
			orchestraFontSize: $orchestraFontSize,
			playerFontSize: $playerFontSize,
			spacerSize1: $spacerSize1,
			spacerSize2: $spacerSize2,
			spacerSize3: $spacerSize3,
			spacerSize4: $spacerSize4
		};
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(data));
		} else {
			console.log('WebSocket is not open. ReadyState: ', ws.readyState);
		}
	}
</script>

<div class="app">
	<div class="tv">
		<div class="stack">
			<div class="text" style="font-size: {$composerFontSize}vw">{$displayComposer}</div>
			<div class="spacer" style="height: {$spacerSize1}vh"></div>
			<div class="text" style="font-size: {$titleFontSize}vw">
				{$displayTitle}{#if $displaySemiTitle}<br />{$displaySemiTitle}{/if}
			</div>
			<div class="spacer" style="height: {$spacerSize2}vh"></div>
			{#if $displayOrchestra}
				<div class="text" style="font-size: {$orchestraFontSize}vw">
					{$displayOrchestra}{#if $displayConductor}{' / 지휘: ' + $displayConductor}{/if}
				</div>
				<div class="spacer" style="height: {$spacerSize3}vh"></div>
			{/if}
			{#each $displayPlayers as player}
				<div class="text" style="font-size: {$playerFontSize}vw">{player}</div>
				<div class="spacer" style="height: {$spacerSize4}vh"></div>
			{/each}
		</div>
	</div>

	<div class="buttons">
		<label
			>작곡가<input
				type="range"
				min="1"
				max="12"
				value={$composerFontSize / 0.4}
				on:input={(e) => ($composerFontSize = +e.target.value * 0.4)}
			/></label
		>
		<label
			>간격<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize1 / 0.4}
				on:input={(e) => ($spacerSize1 = +e.target.value * 0.4)}
			/></label
		>
		<label
			>곡제목<input
				type="range"
				min="1"
				max="12"
				value={$titleFontSize / 0.4}
				on:input={(e) => ($titleFontSize = +e.target.value * 0.4)}
			/></label
		>
		<label
			>간격<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize2 / 0.4}
				on:input={(e) => ($spacerSize2 = +e.target.value * 0.4)}
			/></label
		>
		<label
			>오케스트라<input
				type="range"
				min="1"
				max="12"
				value={$orchestraFontSize / 0.4}
				on:input={(e) => ($orchestraFontSize = +e.target.value * 0.4)}
			/></label
		>
		<label
			>간격<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize3 / 0.4}
				on:input={(e) => ($spacerSize3 = +e.target.value * 0.4)}
			/></label
		>
		<label
			>연주자<input
				type="range"
				min="1"
				max="12"
				value={$playerFontSize / 0.4}
				on:input={(e) => ($playerFontSize = +e.target.value * 0.4)}
			/></label
		>
		<label
			>간격<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize4 / 0.4}
				on:input={(e) => ($spacerSize4 = +e.target.value * 0.4)}
			/></label
		>
		<button on:click={editDisplay}>수정하기</button>
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.buttons {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
	}
	.tv {
		margin-top: 5vh;
		width: 50vw;
		height: 28.125vw;
		background-attachment: fixed;
		background-color: var(--black);
		background-size: cover;
		background-blend-mode: soft-light;
		border-color: var(--gray-gray-700);
		border-width: 10px;
		border-style: solid;
	}
	.stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		align-self: stretch;
		flex: 1;
		position: relative;
		height: 100%;
	}
	.text {
		color: var(--gray-gray-50, #fcfcfc);
		text-align: center;
		font-family: 'NotoSansKr-Bold', sans-serif;
		position: relative;
		font-weight: 700;
	}
</style>
