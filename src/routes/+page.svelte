<script>
    import { fade, fly } from 'svelte/transition';
    import { onMount } from 'svelte';

    let year;
    let semester;
    let time_num = 5;
    $: timetable = Array.from({ length: time_num }, () => 
        Array.from({ length: 5 }, () => 
            Array.from({ length: 2 }, () => 
                new Array(5).fill("")
            )
        )
    );
    function updateDate() {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        semester = (month >= 2 && month <= 7) ? 1 : 2;
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

    let loaded = false;
    onMount(() => {
        loaded = true
        updateDate();
    });

    async function fetchData(year, semester) {
        const response = await fetch(`/api/semester/${year}/${semester}`);
        if (!response.ok) {
            console.log("Error");
        }
        return await response.json();
    }

    $: if (year && semester && time_num) {
        timetable = Array.from({ length: time_num }, () => 
            Array.from({ length: 5 }, () => 
                Array.from({ length: 2 }, () => 
                    new Array(5).fill("")
                )
            )
        );
        fetchData(year, semester).then(data => {
            data.forEach(element => {
                timetable[element.time-1][element.day-1][0][0] = element.user.name;
                timetable[element.time-1][element.day-1][0][1] = element.user.major;
                timetable[element.time-1][element.day-1][0][2] = element.user.year_id;
                timetable[element.time-1][element.day-1][0][3] = element.user.is_ob;
                timetable[element.time-1][element.day-1][0][4] = element.user.id;
                if (element.mentee != null){
                    timetable[element.time-1][element.day-1][1][0] = element.mentee.name;
                    timetable[element.time-1][element.day-1][1][1] = element.mentee.major;
                    timetable[element.time-1][element.day-1][1][2] = element.mentee.year_id;
                    timetable[element.time-1][element.day-1][1][3] = element.mentee.is_ob;
                    timetable[element.time-1][element.day-1][1][4] = element.mentee.id;
                }
            });
        });
    }

	let visible = false;

    function toggle() {
        loaded = !loaded;
        visible = !visible;
    }

    let now = new Date((new Date()).getTime() + 1000*60*60*9);
    
    $: date = now.toISOString().substring(0, 10);
    let time = now.toISOString().substring(11, 16);
    let num = 1;

    $: selected_day = (new Date(date)).getDay();
    $: day = (selected_day === 0 || selected_day === 6) ? 1 : selected_day;

    $: mento = timetable[num-1][day-1][0][0];
    $: mentee = timetable[num-1][day-1][1][0];

    async function handleSubmit(event) {
        event.preventDefault(); // Prevent default form submission

        const formData = {
            date: event.target.date.value,
            time: event.target.num.value,
            arrival_time: event.target.time.value,
        };

        try {
            const response = await fetch('/api/endpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Handle success
            console.log('Data submitted successfully');
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    }
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
            <form on:submit={handleSubmit} method="POST">
                <label>타임 일자 <input name="date" type="date" required bind:value={date} style="width:8em"></label>
                <label><input name="number" type="number" min="1" max="5" bind:value={num} required style="width:3em"> 타임</label>
                <br><br>
                <label>출근 시간 <input name="time" type="time" required value={time} style="width:8em"></label>
                <br><br>
                <label>지기 이름 <input name="name" type="text" required style="width:5em" autocomplete="off" value={mento}></label>
                <label>제자 이름 <input name="subname" type="text" style="width:5em" autocomplete="off" value={mentee}></label>
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