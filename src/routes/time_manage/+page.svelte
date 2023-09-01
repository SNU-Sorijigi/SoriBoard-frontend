<script>
	import { page } from '$app/stores';
    import Music from './Music.svelte'
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
    <Music>
        <span slot="composer">요하네스 브람스</span>
	    <span slot="name">피아노 협주곡 제1번 라단조, Op.15</span>
	    <span slot="requested">신청곡</span>
    	<span slot="source">CD : BRA-9006</span>
	    <span slot="conductor">카를 뵘</span>
    	<span slot="orchestra">빈 필하모니 관현악단</span>
	    <span slot="performer">피아노 : 마우리치오 폴리니</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
    <Music>
        <span slot="composer">프레데리크 쇼팽</span>
	    <span slot="name">첼로 소나타 사단조, Op.65</span>
    	<span slot="source">ROON</span>
	    <span slot="performer">첼로 : 요요 마<br>피아노 : 엠마누엘 엑스</span>
    </Music>
</div>

<div class="command">
    <form>
        <label>신청곡 <input name="requested" type="checkbox"></label><br>
        <label>음원 종류: <input name="source" type="text" required ></label><br>
        <label>음반 번호: <input name="number" type="text"></label><br>
        <label>작곡가: <input name="composer" type="text" required></label><br>
        <label>제목: <input name="name" type="text" required></label><br>
        <label>지휘자: <input name="conductor" type="text"></label><br>
        <label>오케스트라: <input name="orchestra" type="text"></label><br>
        <label>연주자 리스트: <input name="performer" type="text"></label><br>
    </form>
</div>

<style>
    nav {
        margin: 0;
        padding: 0;
        list-style: none;
        background-color: whitesmoke;
        width: 10vw;
        min-height: 30vh;
        overflow: auto;
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