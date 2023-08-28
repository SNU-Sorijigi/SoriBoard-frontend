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
        <thread>
            <tr>
                <th scope="col">#</th>
                <th scope="col">삭제</th>
                <th scope="col">신청곡</th>
                <th scope="col">음원 종류</th>
                <th scope="col">음반 번호</th>
                <th scope="col">작곡가</th>
                <th scope="col">제목</th>
                <th scope="col">오케스트라</th>
                <th scope="col">지휘자</th>
                <th scope="col">연주자</th>
                <th scope="col">편집</th>
                <th scope="col">판서</th>
            </tr>
        </thread>
    </table>
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

    .time_info, .time_table {
        margin-left: 15vw;
    }

    h2 {
        font-size: 24px;
        font-weight: bold;
    }

    tr, th {
        font-size: 16px;
        line-height: 16px;
        vertical-align: top;
        padding: 40px;
    }
</style>