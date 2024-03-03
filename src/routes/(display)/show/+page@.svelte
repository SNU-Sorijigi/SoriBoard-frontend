<script>
    import './display.css';
    let composer="루트비히 판 베토벤";
    let title="피아노 소나타 제7번 라장조, Op.10 No.3";
    let semititle="";
    let orchestra="";
    let conductor="";
    let players=[
        {instrument: "피아노", name: "백건우"}
    ];
</script>

<div class="app">
	<div class="contents">
        <div class="stack">
            <div class="text composer">{composer}</div>
            <div class="text title">{title}</div>
            {#if orchestra}
                <div class="text orchestra">{orchestra}</div>
            {/if}
            {#if conductor}
                <div class="text conductor">{conductor}</div>
            {/if}
            {#each players as player}
                <div class="text player">{player.instrument + ": " + player.name}</div>
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
        gap: 14vh;
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
    .conductor {
        font-size: 2.5vw;
    }
    .player {
        font-size: 2.5vw;
    }
</style>
  