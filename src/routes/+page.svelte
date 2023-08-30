<script>
	let visible = false;

    function toggle() {
        visible = !visible;
    }

    let now = new Date((new Date()).getTime() + 1000*60*60*9)
    let date = now.toISOString().substring(0, 10);
    let time = now.toISOString().substring(11, 16);
</script>

<svelte:head>
    <title>Home</title>
    <meta name="description" content="Soriboard" />
</svelte:head>

<section>
    <h1 class="welcomeText">
        소리지기에 오신 것을 환영합니다!!
    </h1>
    <button type="button" class="welcomeButton" on:click={toggle}>타임 시작하기</button>
</section>

<div class="{visible ? "modal" : "modalInvisible"}">
    <div class="modal-content animate-top">
        <div>
            <span role="button" tabindex="0" class="button hover-red display-topright" title="close" on:click={toggle} on:keydown={toggle}>&times;</span>
        </div>
        <br>
        <h3>타임 생성</h3>
        <form method="POST">
            <label>
              지기 이름
              <input name="name" type="text" required>
            </label>
            <label>
              제자 이름
              <input name="subname" type="text">
            </label>
            <br><br>
            <label>
                출근 시간
                <input name="time" type="time" required value={time}>
            </label>
            <br><br>
            <label>
                타임 일자
                <input name="date" type="date" required value={date}>
            </label>
            <label>
                <input name="number" type="number" min="1" max="5" value="1" required>
                타임
            </label>
            <br><br>
            <label>
                <input type="submit" value="타임 시작하기">
                <input type="reset" value="초기화" class="display-right">
            </label>
          </form>
    </div>
</div>

<style>
    .display-topright{position:absolute;right:0;top:0}
    .display-right{position: absolute;right:0}
    .hover-red:hover{color:#fff!important;background-color:#f44336!important}
    .button{border:none;display:inline-block;padding:8px 16px;vertical-align:middle;overflow:hidden;text-decoration:none;color:inherit;background-color:inherit;text-align:center;cursor:pointer;white-space:nowrap}
    .modal {
        z-index:3;
        display: block;
        padding-top:100px;
        position:fixed;
        left:0;
        top:0;
        width:100%;
        height:100%;
        overflow:auto;
        background-color:rgb(0,0,0);
        background-color:rgba(0,0,0,0.4)
    }
    .modalInvisible {
        display: none;
    }

    .modal-content {
        margin:auto;
        background-color:#fff;
        position:relative;
        padding:0;
        outline:0;
        width:600px
    }

    .animate-top {
        position:relative;
        animation:animatetop 0.4s
    }
    @keyframes animatetop {
        from {
            top:-300px;opacity:0
        } 
        to {
            top:0;opacity:1
        }
    }

    section {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        margin-top: 30vh;
        margin-left: 12vw;
        width: 70vw;
    }

    .welcomeText {
        opacity: 0;
        animation: fadeInText 3s 0.4s ease-out forwards;
        width: 30vw;
    }

    .welcomeButton {
        opacity: 0;
        animation: fadeInButton 3s 2s ease-out forwards;
        margin: 0;
        font-size: 2em;
        font-weight: 400;
        text-align: center;
        text-decoration: none;
        border: none;
        border-radius: 10px;
        box-shadow: 0 14px 18px 3px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        width: 15vw;
        height: 15vh;
    }

    @keyframes fadeInText {
        0% {
            opacity: 0;
            transform: translateX(30%);
        }
        40% {
            opacity: 1;
            transform: translateX(30%);
        }
        100% {
            opacity: 1;
            transform: translateX(-10%);
        }
    }

    @keyframes fadeInButton {
        100% {
            opacity: 1;
        }
    }

    h1 {
        width: 100%;
        font-size: 2.5em;
    }

    h3 {
        text-align: cetner;
    }
</style>