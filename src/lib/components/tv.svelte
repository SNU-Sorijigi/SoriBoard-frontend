<script>
	import { onDestroy, onMount } from 'svelte';
	import { webSocketServer } from '$lib/globals';
	import {
		displayComposer,
		displayTitle,
		displaySemiTitle,
		displayConductor,
		displayOrchestra,
		displayPlayers,
		composerFontSize,
		titleFontSize,
		orchestraFontSize,
		playerFontSize,
		spacerSize1,
		spacerSize2,
		spacerSize3,
		spacerSize4,
		fontSizeInit
	} from '$lib/displayStore.js';
	let ws;
	let _composerFontSize,
		_titleFontSize,
		_orchestraFontSize,
		_playerFontSize,
		_spacerSize1,
		_spacerSize2,
		_spacerSize3,
		_spacerSize4;
	onMount(() => {
		ws = new WebSocket(`${webSocketServer}/ws/tv_display/`);
		_composerFontSize = $composerFontSize;
		_titleFontSize = $titleFontSize;
		_orchestraFontSize = $orchestraFontSize;
		_playerFontSize = $playerFontSize;
		_spacerSize1 = $spacerSize1;
		_spacerSize2 = $spacerSize2;
		_spacerSize3 = $spacerSize3;
		_spacerSize4 = $spacerSize4;
	});
	onDestroy(() => {
		composerFontSize.set(_composerFontSize);
		titleFontSize.set(_titleFontSize);
		orchestraFontSize.set(_orchestraFontSize);
		playerFontSize.set(_playerFontSize);
		spacerSize1.set(_spacerSize1);
		spacerSize2.set(_spacerSize2);
		spacerSize3.set(_spacerSize3);
		spacerSize4.set(_spacerSize4);
	})
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
		_composerFontSize = $composerFontSize;
		_titleFontSize = $titleFontSize;
		_orchestraFontSize = $orchestraFontSize;
		_playerFontSize = $playerFontSize;
		_spacerSize1 = $spacerSize1;
		_spacerSize2 = $spacerSize2;
		_spacerSize3 = $spacerSize3;
		_spacerSize4 = $spacerSize4;
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
	<br>
	<div class="col_stack">
		<div class="row_stack">
		<div class="col_stack">
			<div>작곡가</div>
			<div>간격</div>
			<div>곡 제목</div>
			<div>간격</div>
			<div>오케스트라</div>
			<div>간격</div>
			<div>연주자</div>
			<div>간격</div>
		</div>
		<div class="col_stack">
			<input
				type="range"
				min="1"
				max="12"
				value={$composerFontSize / 0.4}
				on:input={(e) => ($composerFontSize = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize1 / 0.4}
				on:input={(e) => ($spacerSize1 = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$titleFontSize / 0.4}
				on:input={(e) => ($titleFontSize = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize2 / 0.4}
				on:input={(e) => ($spacerSize2 = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$orchestraFontSize / 0.4}
				on:input={(e) => ($orchestraFontSize = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize3 / 0.4}
				on:input={(e) => ($spacerSize3 = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$playerFontSize / 0.4}
				on:input={(e) => ($playerFontSize = +e.target.value * 0.4)}
			/>
			<input
				type="range"
				min="1"
				max="12"
				value={$spacerSize4 / 0.4}
				on:input={(e) => ($spacerSize4 = +e.target.value * 0.4)}
			/>
		</div>
		</div>
		<button on:click={fontSizeInit}>초기화</button>
		<br>
		<button on:click={editDisplay}>적용</button>
	</div>
</div>

<style>
	button {
		margin-top: 4px;
		background: var(--gray-gray-500);
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
	.app {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.col_stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.row_stack {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}
	.tv {
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
