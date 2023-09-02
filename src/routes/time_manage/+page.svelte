<script>
    import Music from './Music.svelte'
    import { current } from './display.js'
   
    export let data;

    function change() {
        current.update((data) =>
        ["요하네스 브람스", "피아노 협주곡 제1번 라단조, Op.15", "카를 뵘 / 빈 필하모니 관현악단 \n 피아노 : 마우리치오 폴리니"]
        );
        target_num++;
    };

    let target_num = 1;
</script>

<svelte:head>
    <title>타임 관리</title>
    <meta name="description" content="SoriBoard" />
</svelte:head>

<nav>
    <ul>
        <li>
          <a href="/time_manage/start">9/4</a>
          <ul>
            <li><a href="/time_manage/start">1타임</a></li>
            <li><a href="/time_manage/start">2타임</a></li>
            <li><a href="/time_manage/start">3타임</a></li>
            <li><a href="/time_manage/start">4타임</a></li>
            <li><a href="/time_manage/start">5타임</a></li>
          </ul>
        </li>
        <li>
          <a href="/time_manage/start">9/1</a>
          <ul>
            <li><a href="/time_manage/start">1타임</a></li>
            <li><a href="/time_manage/start">2타임</a></li>
            <li><a href="/time_manage/start">3타임</a></li>
            <li><a href="/time_manage/start">4타임</a></li>
            <li><a href="/time_manage/start">5타임</a></li>
          </ul>
        </li>
      </ul>
</nav>

<div class="time_info">
    <h2>9/4(월) 3타임 정용환</h2>
</div>
<div class="time_table">
    {#each data.time_table as info, i}
    <Music>
        <span slot="id">{i + 1}</span>
        <span slot="composer">{info.composer}</span>
	    <span slot="title">{info.title}</span>
	    <span slot="requested">{#if info.requested === 'on'}신청곡 / {/if}</span>
    	<span slot="source">{info.source} {#if info.number != ''}- {info.number}{/if}</span>
        <span slot="orchestra">{#if info.conductor!=''}{info.conductor} / {info.orchestra}<br>{/if}</span>
	    <span slot="performer">{info.performer}</span>
    </Music>
    {/each}
</div>

<div class="command">
    <form method="POST">
        <label>신청곡 <input name="requested" type="checkbox"></label><br>
        <label>음원 종류: <input name="source" type="text" required value="ROON"></label><br>
        <label>음반 번호: <input name="number" type="text"></label><br>
        <label>작곡가: <input name="composer" type="text" required></label><br>
        <label>제목: <input name="title" type="text" required></label><br>
        <label>지휘자: <input name="conductor" type="text"></label><br>
        <label>오케스트라: <input name="orchestra" type="text"></label><br>
        <label>연주자 리스트: <input name="performer" type="text"></label><br><br>
        <input type="submit" value="추가하기" class="submit">
    </form>
    <br><br>
    <input name="target" type="number" min="1" value={target_num}>
    <button on:click={change}>판서!</button>
    <br>

</div>

<style>
    nav {
        margin: 0;
        padding: 0;
        margin-top: 100px;
        list-style: none;
        background-color: whitesmoke;
        width: 10vw;
        
        
        position: fixed;
    }

    ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        margin: 0;
        padding: 0;
        list-style: none;
        position: relative;
    }

    ul > li:hover > a {
        background-color: lightblue;
    }

    ul > li:hover > ul {
        display: block;
        position:absolute;
        background-color: rgb(197, 197, 197);
        top: 0;
        left: 100%;
        width: 100%;
    }

    a{
        color: inherit;
        text-decoration: none;
        display: block;
        font-size: 1.4rem;
        font-weight: bold;
        padding-top: 20px;
        padding-bottom: 20px;
        padding-left: 50px;
    }

    ul ul {
        display: none;
    }

    .time_info {
        margin-left: 15vw;
    }

    .time_table {
        margin-left: 15vw;
        position: relative;
        width: 50vw;
        max-height: 75vh;
        overflow: auto;
    }

    .command {
        margin-left: 70vw;
        margin-top: 5vh;
        position: fixed;
    }

    h2 {
        font-size: 24px;
        font-weight: bold;
    }
</style>