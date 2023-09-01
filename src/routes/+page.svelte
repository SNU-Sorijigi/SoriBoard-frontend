<script>
    import { clickOutside } from '$lib/outclick.js';
    import { fade, fly } from 'svelte/transition';
    import { onMount } from 'svelte';

    let loaded = false;
    onMount(() => loaded = true);

	let visible = false;

    function toggle() {
        loaded = !loaded;
        visible = !visible;
    }

    let now = new Date((new Date()).getTime() + 1000*60*60*9);
    let date = now.toISOString().substring(0, 10);
    let time = now.toISOString().substring(11, 16);
</script>

<svelte:head>
    <title>홈</title>
    <meta name="description" content="SoriBoard" />
</svelte:head>

{#if loaded}
    <section>
        <h1 class="welcomeText" in:fly={{ x: '15vw', duration: 3000 }} out:fade={{ duration: 200 }}>
            소리지기에 오신 것을 환영합니다!!
        </h1>
        <button type="button" class="welcomeButton" on:click={toggle} in:fade={{ delay: 1000, duration: 1000 }} out:fade={{ duration: 200 }}>
            타임 시작하기
        </button>
    </section>
{/if}

{#if visible}
    <div class="modal">
        <div class="modal-content" use:clickOutside on:outclick={toggle} in:fly={{ y: '-20vh', duration: 400}}>
            <span role="button" tabindex="0" class="xbutton" title="close" on:click={toggle} on:keydown={toggle}>&times;</span>
            <br>
            <h3>타임 생성</h3>
            <form method="POST">
                <label>지기 이름 <input name="name" type="text" required style="width:5em"></label>
                <label>제자 이름 <input name="subname" type="text" style="width:5em"></label>
                <br><br>
                <label>출근 시간 <input name="time" type="time" required value={time} style="width:8em"></label>
                <br><br>
                <label>타임 일자 <input name="date" type="date" required value={date} style="width:8em"></label>
                <label><input name="number" type="number" min="1" max="5" value="1" required style="width:3em"> 타임</label>
                <br><br>
                <label>
                    <input type="submit" value="타임 시작하기" class="submit">
                </label>
            </form>
        </div>
    </div>
{/if}

<style>
    section {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        margin-top: 30vh;
        margin-left: 10vw;
        width: 70vw;
    }

    input {
        background-color: rgb(182, 255, 231);
        color: rgb(44, 44, 44);
        height: 27px;
        font-size: 1em;
    }

    label {
        margin-left: 10px;
        font-size: 1.3em;
    }

    h3 {
        text-align: center;
        font-size: 1.5em;
    }

    .xbutton {
        position: absolute;
        right: 0;
        top: 0;
        display: inline-block;
        vertical-align: middle;
        text-decoration: none;
        text-align: center;
        cursor: pointer;
        padding: 8px 16px;
        font-weight: bold;
        font-size: 1.4em;
        border-radius: 17%;
    }

    .xbutton:hover {
        color: #fff!important;
        background-color: #f44336!important
    }
    
    .submit {
        height: 40px;
        width: 8vw;
        margin: 30px;
        margin-left: 9vw;
    }

    .modal {
        z-index: 3;
        display: block;
        padding-top: 10vh;
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgb(0,0,0);
        background-color: rgba(0,0,0,0.4)
    }

    .modal-content {
        margin: auto;
        background-color:#fff;
        position: relative;
        padding: 0;
        outline: 0;
        width: 26vw;
        border-radius: 3%;
        border-color: #4b4b4b;
        border-style: solid;
    }

    .welcomeText {
        font-size: 2.5em;
        width: 30vw;
        margin-right: 15vw;
    }

    .welcomeButton {
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
</style>