<script>
	import { page } from '$app/stores';
</script>

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
    <h2>9/4(수) 3타임 정용환</h2>
</div>
<div class="time_table">
    <table>
        <thead>
            <tr>
                <th scope="col" style="width: 1vw">#</th>
                <th scope="col">신청곡</th>
                <th scope="col">음원 종류</th>
                <th scope="col">작곡가</th>
                <th scope="col">제목</th>
                <th scope="col">연주</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>X</td>
                <td>ROON</td>
                <td>요하네스 브람스</td>
                <td>피아노 소나타 제3번 바단조, Op.5</td>
                <td>피아노 : 헬렌 그리모</td>
            </tr>
        </tbody>
    </table>
</div>

<style>
    table, th, td {
        border: 1px solid black;
    }
    table {
        table-layout: fixed;
        border-collapse: collapse;
    }
    tr {
        vertical-align: top;
        height: 3vh;
    }
    
    tr, th {
        font-size: 16px;
        line-height: 20px;
        vertical-align: top;
        padding: 30px;
    }
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

    .time_info, .time_table {
        margin-left: 15vw;
    }

    h2 {
        font-size: 24px;
        font-weight: bold;
    }
</style>