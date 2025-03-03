<script>
	import './display.css';
	import { onMount } from 'svelte';
	import { webSocketServer } from '$lib/globals';
	import { backendServer } from '$lib/globals';
	import { writable } from 'svelte/store';
	let composer = '';
	let title = '';
	let semi_title = '';
	let orchestra = '';
	let conductor = '';
	let players = [];
	let composerFontSize = 6;
	let titleFontSize = 4;
	let orchestraFontSize = 2.5;
	let playerFontSize = 2.5;
	let spacerSize1 = 8;
	let spacerSize2 = 6;
	let spacerSize3 = 1;
	let spacerSize4 = 1;
	let spacerSize5 = 8;
	let infoNewsFontSize = 2.5;
	let instagramFontSize = 2;
	let infoNews = '';
	let instagram = '@snu_sorijigi';
	const news = writable([]);
	async function fetchNews() {
		const response = await fetch('/api/information/');
		const newsdata = await response.json();
		news.set(newsdata);
		infoNews = newsdata[0].content;
	}
	onMount(() => {
		'use strict';
		// Fetch data from backend for news and instagram
		fetchNews();

		const ws = new WebSocket(`${webSocketServer}/ws/tv_display/`);

		ws.onopen = () => {
			console.log('Connection established');
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				const regexPattern = /^~(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
				if (data.update_type == 'breaktime') {
					if (!regexPattern.test(data.info)){
						composer = '운영 종료'
						title = data.info;
						semi_title = '';
						orchestra = '';
						conductor = '';
						players = [];
					}else{
					composer = '기기 휴식';
					title = data.info;
					semi_title = '';
					orchestra = '';
					conductor = '';
					players = [];
					}
					console.log('Update Breaktime:', data.info);
				} else if (data.update_type == 'music') {
					composer = data.info.composer_name;
					title = data.info.music_title;
					semi_title = data.info.music_semi_title;
					orchestra = data.info.orchestra_name;
					conductor = data.info.conductor_name;
					players = data.info.player_names;
					console.log('Update Music:', data.info);
				} else {
					composerFontSize = data.info.composerFontSize * 2;
					titleFontSize = data.info.titleFontSize * 2;
					orchestraFontSize = data.info.orchestraFontSize * 2;
					playerFontSize = data.info.playerFontSize * 2;
					spacerSize1 = data.info.spacerSize1 * 3.5555;
					spacerSize2 = data.info.spacerSize2 * 3.5555;
					spacerSize3 = data.info.spacerSize3 * 3.5555;
					spacerSize4 = data.info.spacerSize4 * 3.5555;
					spacerSize5 = data.info.spacerSize5 * 3.5555;
					infoNewsFontSize = data.info.infoNewsFontSize * 2;
					instagramFontSize = data.info.instagramFontSize * 2;
					console.log('Update Music:', data.info);
				}
			} catch (error) {
				console.error('Error parsing JSON:', error);
			}
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};

		ws.onclose = (event) => {
			console.log('WebSocket closed:', event.reason);
		};
	});
</script>

<div class="app">
	<div class="contents">
		<div class="stack">
			<div class="text" style="font-size: {composerFontSize}vw">{composer}</div>
			<div class="spacer" style="height: {spacerSize1}vh"></div>
			<div class="text" style="font-size: {titleFontSize}vw">
				{title}{#if semi_title}<br />{semi_title}{/if}
			</div>
			<div class="spacer" style="height: {spacerSize2}vh"></div>
			{#if orchestra}
				<div class="text" style="font-size: {orchestraFontSize}vw">
					{orchestra}{#if conductor}{' / 지휘: ' + conductor}{/if}
				</div>
				<div class="spacer" style="height: {spacerSize3}vh"></div>
			{/if}
			{#each players as player}
				<div class="text" style="font-size: {playerFontSize}vw">{player}</div>
				<div class="spacer" style="height: {spacerSize4}vh"></div>
			{/each}
			<div class="spacer" style="height: {spacerSize5}vh"></div>
			<div class="info-outline">
				<div class="text" style="font-size: {infoNewsFontSize}vw">{infoNews}</div>
				<div class="text" style="font-size: {instagramFontSize}vw">{instagram}</div>
			</div>
		</div>
	</div>
</div>

<style>
	.contents {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--black);
	}
	.text {
		color: var(--gray-gray-50, #fcfcfc);
		text-align: center;
		font-family: 'NotoSansKr-Bold', sans-serif;
		position: relative;
		font-weight: 700;
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
	.info-outline {
		border: 1px solid white;
		padding: 10px;
		display: inline-block;
		text-aligh: center;
	}
</style>
