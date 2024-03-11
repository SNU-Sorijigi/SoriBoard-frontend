<script>
    import { writable } from 'svelte/store';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { fade, fly } from 'svelte/transition';
    import MusicInfo from '$lib/components/musicinfo.svelte';
    import Input from '$lib/components/input.svelte';
    import BreakButton from '$lib/components/breakButton.svelte';
    import instalogo from '$lib/images/insta.svg';
    import plusicon from '$lib/images/plus.svg';
    import minusicon from '$lib/images/minus.svg';
    import checkicon from '$lib/images/check.svg';

    $: id = $page.params.id;

    function navigate(url) {
        window.location.href = url;
    }

    let timeDate = "";
    let timeUser = "";
    let timeMusic = [];
    let time;
    let mento;
    let mentee;
    let arrival_time;
    let mentee_arrival_time;
    let date;

    let composer = '';
    let title = '';
    let detail = '';
    let conductor = '';
    let orchestra = '';
    let source = 'ROON';
    let cd_id = '';
    let is_requested = false;
    let players = writable(['']);

    function addPlayer() {
        players.update(currentPlayers => [...currentPlayers, '']);
    }

    function deletePlayer(index) {
        players.update(currentPlayers => {
            return currentPlayers.filter((_, i) => i !== index);
        });
    }

    function toggleCheck() {
        is_requested = !is_requested;
    }

    async function deleteMusic(music_id) {
        const isConfirmed = confirm("삭제하시겠습니까?");
        if (isConfirmed){
            const response = await fetch(`/api/music/${music_id}`, {
                method: 'DELETE'
            });
            loadTimeInfo(id);
        }
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
            date = new Date(data.date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            time = data.time;
            const mento_name = data.user.name;
            const mentee_name = data.mentee ? ` / ${data.mentee.name}` : "";
            timeMusic = data.time_music;
            timeDate=`${year}년 ${month}월 ${day}일 ${time}타임`;
            timeUser=`${mento_name}${mentee_name}`;
            mento = data.user.name;
            mentee = data.mentee ? data.mentee.name : "";
            arrival_time = data.arrival_time;
            mentee_arrival_time = data.mentee_arrival_time ? data.mentee_arrival_time : "";
            date = date.toISOString().split('T')[0];
        } catch (error) {
            console.log("Error");
        }
    }

    onMount(() => {
        loadTimeInfo(id);
    })

    async function handleSubmit(event) {
        event.preventDefault();
        const isValid = $players.every(player => player !== '' && !player.includes(':'));
        if (isValid){
            alert("'{악기/역할} : {연주자 이름}' 형식으로 적어주세요");
            return;
        }
        const formData = {
            time: id,
            order: timeMusic.length > 0 ? timeMusic[timeMusic.length-1].order + 1 : 1,
            is_requested: is_requested,
            source: source,
            cd_id: cd_id,
            title: title,
            semi_title: detail,
            composer_name: composer,
            conductor_name: conductor,
            orchestra_name: orchestra,
            player_names: $players,
        };

        const response = await fetch('/api/music', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });
        if (response.ok) {
            composer = '';
            title = '';
            detail = '';
            conductor = '';
            orchestra = '';
            source = 'ROON';
            cd_id = '';
            is_requested = false;
            players.set(['']);
            loadTimeInfo(id);
        } else {
            console.error('Failed to create');
        }
    }

    async function handleEdit(event) {
        event.preventDefault();
        const formData = {
            date: date,
            time: time,
            user: mento,
            mentee: mentee,
            arrival_time: arrival_time,
            mentee_arrival_time: mentee_arrival_time,
        };

        const response = await fetch(`/api/time/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });
        if (response.ok) {
            const data = await response.json();
            location.reload();
        } else {
            console.error('Failed to edit TimeInfo');
        }
    }

    let visible = false;
    let editing = false;

    function toggle() {
        visible = !visible;
        editing = false;
    }

    function edit_toggle() {
        editing = !editing;
        visible = false;
    }

    function clickOutside(node) {
	    const handleClick = (event) => {
		    if (!node.contains(event.target)) {
			    node.dispatchEvent(new CustomEvent('outclick'));
		    }
	    };

	    document.addEventListener('click', handleClick, true);

	    return {
		    destroy() {
			    document.removeEventListener('click', handleClick, true);
		    }
	    };
    }
    function findItemIndexById(id) {
        return timeMusic.findIndex(item => item.id === id);
    }

    async function deleteTime() {
        const isConfirmed = confirm("삭제하시겠습니까?");
        if (isConfirmed){
            const response = await fetch(`/api/time/${id}`, {
                method: 'DELETE'
            });
            navigate('/time_manage');
        }
    }

    async function swapOrders(id1, id2){
        try {
            const response = await fetch(`/api/music/${id1}/${id2}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
        } catch (error) {
            console.error('Error swapping orders:', error);
        }
    }

    async function goDown(event){
        const {musicid} = event.detail;
        const index = findItemIndexById(musicid);
        if (index === -1 || index === timeMusic.length - 1) return;
        const currentItem = timeMusic[index];
        const nextItem = timeMusic[index + 1];
        await swapOrders(currentItem.id, nextItem.id);
        loadTimeInfo(id);
    }
    async function goUp(event){
        const {musicid} = event.detail;
        const index = findItemIndexById(musicid);
        if (index <= 0) return;
        const currentItem = timeMusic[index];
        const prevItem = timeMusic[index - 1];
        await swapOrders(currentItem.id, prevItem.id);
        loadTimeInfo(id);
    }
</script>

<svelte:head>
    <title>타임 관리</title>
    <meta name="description" content="SoriBoard" />
</svelte:head>

<div class="manage-screen">
    <div class="header">
        <div class="buttons">
            <button class="time_edit button" on:click={edit_toggle}>
                타임 정보 수정
            </button>
        </div>
        <div class="timeinfo">{timeDate}<br>{timeUser}</div>
        <div class="buttons">
            <button class="insta button" on:click={toggle}>
                <img src={instalogo} alt="insta">
                업로드
            </button>
            {#if time}
            <BreakButton time={time}/>
            {/if}
        </div>
    </div>
    <div class="content">
        <div class="playlist hide-scrollbar">
            {#each timeMusic as music}
            <MusicInfo
                on:goDown={goDown}
                on:goUp={goUp}
                id={music.id}
                is_requested={music.is_requested}
                source={music.source}
                cd_id={music.cd_id}
                composer={music.composer_name} 
                title={music.music_title} 
                semiTitle={music.music_semi_title ? music.music_semi_title : ""} 
                orchestra={music.orchestra_name ? music.orchestra_name : ""} 
                conductor={music.conductor_name ? "지휘: "+music.conductor_name : ""} 
                players={music.player_names ? music.player_names : []}
                deleteMusic={deleteMusic}>
            </MusicInfo>
            {/each}
        </div>
        <form on:submit={handleSubmit} method="POST" class="inputfield">
            <div class="stack">
                <div class="box">
                    <div class="label">신청곡</div>
                    <div class="checkbox" on:click={toggleCheck} class:checked={is_requested}>
                        {#if is_requested}
                        <img src={checkicon} alt="check" class="check">
                        {/if}
                    </div>
                </div>
                <Input label="음원 종류" width="100px" bind:value={source}></Input>
                <Input label="음반 번호" width="100px" bind:value={cd_id}></Input>
            </div>
            <Input label="작곡가" bind:value={composer}></Input>
            <Input label="제목" bind:value={title}></Input>
            <Input label="곡 세부 정보(악장 등)" bind:value={detail}></Input>
            <Input label="오케스트라" bind:value={orchestra}></Input>
            <Input label="지휘자" bind:value={conductor}></Input>
            {#each $players as player, i}
            <div class="player_stack">
                <Input label={"연주자 "+(i+1)} bind:value={$players[i]} width={i != 0 ? '265px' : '300px'}></Input>
                {#if i > 0}
                    <div class="minus" on:click={() => deletePlayer(i)}>
                        <img src={minusicon} alt="minus">
                    </div>
                {/if}
            </div>
            {/each}
            <div class="plus" on:click={addPlayer}>
                <img src={plusicon} alt="plus">
            </div>
            <input id="submit1" type="submit" value="곡 추가하기" class="submit">
        </form>
    </div>
</div>

{#if visible}
    <div class="modal">
        <div class="modal-content" use:clickOutside on:outclick={toggle} in:fly={{ y: '-20vh', duration: 400}}>
            <span role="button" tabindex="0" class="xbutton" title="close" on:click={toggle} on:keydown={toggle}>&times;</span>
            <div class="title">인스타 업로드 형식</div>
            <div class="insta_content">
            {#each timeMusic as music}
                <br>
                {music.composer_name}
                <br>
                {music.music_title}
                {music.music_semi_title ? music.music_semi_title : ""}
                <br>
                {#if music.orchestra_name}
                    {music.orchestra_name}
                    <br>
                {/if}
                {#if music.conductor_name}
                    {music.conductor_name ? "지휘: "+music.conductor_name : ""}
                    <br>
                {/if}
                {#each music.player_names as player}
                    {player}
                {/each}
            {/each}
            </div>
        </div>
    </div>
{/if}

{#if editing}
    <div class="modal edit_modal">
        <div class="modal-content" use:clickOutside on:outclick={edit_toggle} in:fly={{ y: '-20vh', duration: 400}}>
            <span role="button" tabindex="0" class="xbutton" title="close" on:click={edit_toggle} on:keydown={edit_toggle}>&times;</span>
            <div class="title">타임 정보 수정</div>
            <br>
            <form on:submit={handleEdit} method="PUT" class="form">
                <div class="stack">
                    <label><input name="date" type="date" required bind:value={date} style="width:120px" readonly></label>
                    <label><input name="number" type="number" min="1" max="5" bind:value={time} required style="width:40px" readonly> 타임</label>
                </div>
                <br>
                <div class="stack">
                <label>지기 이름 <input name="name" type="text" required style="width:5em" autocomplete="off" bind:value={mento}></label>
                <label>출근 시간 <input name="time" type="time" required bind:value={arrival_time} style="width:8em"></label>
                </div>
                <div class="stack">
                <label>제자 이름 <input name="subname" type="text" style="width:5em" autocomplete="off" bind:value={mentee}></label>
                <label>출근 시간 <input name="time" type="time" bind:value={mentee_arrival_time} style="width:8em"></label>
                </div>
                <br>
                <label>
                    <input id="submit2" type="submit" value="타임 수정하기" class="submit">
                </label>
            </form>
            <button class="delete" on:click={deleteTime}>삭제</button>
        </div>
    </div>
{/if}

<style>
    input {
        background-color: var(--secondary-secondary-200);
        color: var(--gray-gray-950);
        font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
        font-size: var(--medium-font-size, 16px);
        font-weight: var(--medium-font-weight, 500);
    }
    label {
        font-family: var(--large-font-family, "NotoSansKr-Medium", sans-serif);
        font-size: var(--large-font-size, 16px);
        font-weight: var(--large-font-weight, 500);
    }
    .stack {
        display: flex;
        flex-direction: row;
        gap: 20px;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
    }
    .form {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
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
    .delete {
        text-align: center;
        color: var(--gray-gray-50);
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
        width: 60px;
        height: 40px;
        position: absolute;
        box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
        cursor: pointer;
        border: none;
        background: var(--red-red-700);
        margin-left: 10px;
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
        border: none;
    }
    .insta {
        background: var(--red-red-500, #f49a9a);
    }
    .time_edit {
        background: var(--gray-gray-500);
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
    @media only screen and (max-width: 1200px) {
        .content {
            display: flex;
            flex-direction: column;
            gap: 30px;
            width: 100%;
            align-items: center;
            justify-content: space-around;
            position: relative;
            overflow: hidden;
            padding: 40px;
        }
    }
    .playlist {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        justify-content: center;
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
    .player_stack {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 3px;
    }
    .plus {
        width: 32px;
        height: 32px;
        position: relative;
        overflow: visible;
        cursor: pointer;
        margin-top: 8px;
        margin-bottom: 8px;
    }
    .minus {
        margin-top: 20px;
        width: 32px;
        height: 32px;
        position: relative;
        overflow: visible;
        cursor: pointer;
    }
    .submit {
        background-color: var(--secondary-secondary-50);
        color: var(--gray-gray-950, #1a1a1a);
        text-align: center;
        font-family: var(--medium-font-family,);
        font-size: var(--medium-font-size, 13px);
        font-weight: var(--medium-font-weight, 500);
        border: 1px solid var(--primary-primary-700);
        border-radius: 6px;
        border-width: 2px;
        padding: 6px 20px 6px 20px;
        cursor: pointer;
    }
    .xbutton {
        position: absolute;
        right: 0;
        top: 0;
        display: inline-block;
        text-decoration: none;
        text-align: center;
        cursor: pointer;
        padding: 8px 16px;
        font-weight: bold;
        font-size: 1.4em;
        border-radius: 10%;
    }

    .xbutton:hover {
        color: #fff!important;
        background-color: #f44336!important
    }
    .modal {
        z-index: 3;
        display: block;
        padding-top: 10vh;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin-left: 58px;
    }
    .edit_modal {
        backdrop-filter: blur(15px);
    }
    .modal-content {
        margin: auto;
        background-color: var(--primary-primary-100);
        position: relative;
        padding-top: 30px;
        padding-bottom: 50px;
        outline: 0;
        width: 44vw;
        border-radius: 2%;
        border-color: var(--gray-gray-400);
        border-style: solid;
    }
    .insta_content {
        text-align: center;
    }
    .hide-scrollbar {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
    }

    .hide-scrollbar::-webkit-scrollbar { 
        display: none;  /* Safari and Chrome */
    }
</style>