<script>
    import { writable } from 'svelte/store';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import MusicInfo from '$lib/components/musicinfo.svelte';
    import Input from '$lib/components/input.svelte';
    import instalogo from '$lib/images/insta.svg';
    import sleeplogo from '$lib/images/sleep.svg';
    import plusicon from '$lib/images/plus.svg';
    import checkicon from '$lib/images/check.svg';

    $: id = $page.params.id;

    let timeDate = writable("");
    let timeUser = writable("");

    let composer = '';
    let title = '';
    let semititle = '';
    let players = '';
    let conductor = '';
    let orchestra = '';
    let source = '';
    let is_requested = writable(false);

    function toggleCheck() {
        is_requested.update(n => !n);
    }

    async function fetchTimeInfo() {
        const response = await fetch(`/api/time/${id}`);
        if (response.ok) {
            timeInfo = await response.json();
        } else {
            console.error('Failed to fetch TimeInfo');
        }
    }

    async function fetchData(id){
        const response = await fetch(`/api/time/${id}`)
        if (!response.ok) {
            console.log("Error");
        }
        return await response.json();
    }

    async function loadTimeInfo(id) {
        try {
            const data = await fetchData(id);
            const date = new Date(data.date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const time = data.time;
            const mento_name = data.mento_name;
            const mentee_name = data.mentee_name ? ` / ${data.mentee_name}` : "";
            timeDate.set(`${year}년 ${month}월 ${day}일 ${time}타임`);
            timeUser.set(`${mento_name}${mentee_name}`);
        } catch (error) {
            console.log("Error");
        }
    }

    onMount(() => {
        loadTimeInfo(id);
    })
</script>

<svelte:head>
    <title>타임 관리</title>
    <meta name="description" content="SoriBoard" />
</svelte:head>

<div class="manage-screen">
    <div class="header">
        <div class="spacer"></div>
        <div class="timeinfo">{$timeDate}<br>{$timeUser}</div>
        <div class="buttons">
            <div class="insta button">
                <img src={instalogo} alt="insta">
                업로드
            </div>
            <div class="sleep button">
                <img src={sleeplogo} alt="sleep">
                기기 휴식
            </div>
        </div>
    </div>
    <div class="content">
        <div class="playlist">
            <MusicInfo></MusicInfo>
        </div>
        <div class="inputfield">
            <div class="stack">
                <div class="box">
                    <div class="label">신청곡</div>
                    <div class="checkbox" on:click={toggleCheck} class:checked={$is_requested}>
                        {#if $is_requested}
                        <img src={checkicon} alt="check" class="check">
                        {/if}
                    </div>
                </div>
                <Input label="음원 종류" width="100px"></Input>
                <Input label="음반 번호" width="100px"></Input>
            </div>
            <Input label="작곡가"></Input>
            <Input label="제목"></Input>
            <Input label="곡 세부 정보"></Input>
            <Input label="오케스트라"></Input>
            <Input label="지휘자"></Input>
            <Input label="연주자"></Input>
            <div class="plus">
                <img src={plusicon} alt="plus">
            </div>
        </div>
    </div>
</div>


<style>
    .stack {
        display: flex;
        flex-direction: row;
        gap: 20px;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
    }
    .box {
        margin-top: 14px;
    }
    .label {
        color: var(--primary-primary-700, #b7946c);
        text-align: center;
        font-family: var(--small-medium-font-family, "NotoSansKr-Regular", sans-serif);
        font-size: var(--small-medium-font-size, 10px);
        font-weight: var(--small-medium-font-weight, 400);
        position: relative;
    }
    .checkbox {
        margin: auto;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 2px solid var(--primary-primary-700);
        cursor: pointer;
        background-color: var(--primary-primary-100); 
    }
    .checked {
        background-color: var(--primary-primary-700);
    }
    .check {
        width: 20px;
        height: 20px;
    }
    .manage-screen {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0px;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        overflow: hidden;
    }
    .header {
        padding: 16px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        flex-direction: row;
        background-color: var(--secondary-secondary-100);
        border-style: solid;
        border-color: var(--gray-gray-400, #bcbcbc);
        border-width: 1px;
        box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.25);
    }
    .timeinfo {
        margin-left: 120px;
        color: var(--gray-gray-950, #1a1a1a);
        text-align: center;
        font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
        font-size: var(--medium-font-size, 16px);
        font-weight: var(--medium-font-weight, 500);
        position: relative;
    }
    .buttons .spacer {
        flex: 1;
        text-align: center;
    }
    .buttons {
        gap: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .button {
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
    }
    .insta {
        background: var(--red-red-500, #f49a9a);
    }
    .sleep {
        background: var(--blue-blue-600);
    }
    .title {
        color: var(--gray-gray-900, #202020);
        text-align: center;
        font-family: "SeoulHangang-L", sans-serif;
        font-size: 32px;
        font-weight: 400;
        position: relative;
    }
    .content {
        display: flex;
        flex-direction: row;
        gap: 30px;
        width: 100%;
        align-items: flex-start;
        justify-content: space-around;
        position: relative;
        overflow: hidden;
        padding: 40px;
    }
    .inputfield {
        display: flex;
        flex-direction: column;
        gap: 0px;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
    }
    .plus {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        position: relative;
        overflow: visible;
        cursor: pointer;
    }
    .hide-scrollbar {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
    }

    .hide-scrollbar::-webkit-scrollbar { 
        display: none;  /* Safari and Chrome */
    }

    .table-height {
        max-height: 70vh;
    }
</style>