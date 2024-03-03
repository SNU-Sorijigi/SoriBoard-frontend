<script>
    import './display.css';
    import { onMount } from 'svelte';

    let composer="";
    let title="";
    let semi_title="";
    let orchestra="";
    let conductor="";
    let players=[];
    onMount(() => {
        'use strict';
        const ws = new WebSocket('ws://localhost:8080/ws/tv_display/');

        ws.onopen = () => {
            console.log('Connection established');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if(data.update_type == 'breaktime'){
                    composer = "기기 휴식"
                    title = data.info;
                    semi_title='';
                    orchestra = '';
                    conductor = '';
                    players = [];
                }else{
                composer = data.info.composer_name;
                title = data.info.music_title;
                semi_title = data.info.music_semi_title
                orchestra = data.info.orchestra_name;
                conductor = data.info.conductor_name;
                players = data.info.player_names;
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
            <div class="text composer">{composer}</div>
            <div class="spacer" style="height:8vh"></div>
            <div class="text title">{title}{#if semi_title}<br>{semi_title}{/if}</div>
            <div class="spacer" style="height:6vh"></div>
            {#if orchestra}
                <div class="text orchestra">{orchestra}{#if conductor}{" / 지휘: "+conductor}{/if}</div>
                <div class="spacer" style="height:1vh"></div>
            {/if}
            {#each players as player}
                <div class="text player">{player}</div>
                <div class="spacer" style="height:1vh"></div>
            {/each}
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
        font-family: "NotoSansKr-Bold", sans-serif;
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
    .composer {
        font-size: 5vw;
    }
    .title {
        font-size: 4vw;
    }
    .orchestra {
        font-size: 2.5vw;
    }
    .player {
        font-size: 2.5vw;
    }
</style>
  