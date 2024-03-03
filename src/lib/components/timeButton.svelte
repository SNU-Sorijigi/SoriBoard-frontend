<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import { createEventDispatcher } from 'svelte';
    import time1Icon from '$lib/images/1time.svg';
    import time2Icon from '$lib/images/2time.svg';
    import time3Icon from '$lib/images/3time.svg';
    import time4Icon from '$lib/images/4time.svg';
    import time5Icon from '$lib/images/5time.svg';
    export let time = "1";
    export let year = "";
    export let month = "";
    export let day = "";
    let created = writable(false);
    let id = writable(null);
    $: variantsClassName = `created-${$created}`;
    const timeIcons = {
        "1": time1Icon,
        "2": time2Icon,
        "3": time3Icon,
        "4": time4Icon,
        "5": time5Icon
    };
    $: timeIcon = timeIcons[time] || time1Icon;

    function navigate(url) {
        window.location.href = url;
    }

    const dispatch = createEventDispatcher();
    function create(){
        dispatch('createTime', { year: year, month: month, day: day, time: time });
    }

    function handleClick() {
        if ($created) {
            navigate('/time_manage/' + $id);
        } else {
            create();
        }
    }

    async function fetchData(year, month, day, time){
        const response = await fetch(`/api/time/${year}/${month}/${day}/${time}`)
        if (!response.ok) {
            console.log("Error");
        }
        return await response.json();
    }

    async function loadTimeInfo(year, month, day, time) {
        try {
            const data = await fetchData(year, month, day, parseInt(time));
              if(data.id){
                id.set(data.id);
                created.set(true);
            } else {
                created.set(false);
            }
        } catch (error) {
            created.set(false);
        }
    }

    $: if (year && month && day && time){
        loadTimeInfo(year, month, day, time);
    }
    
    onMount(() => {
        loadTimeInfo(year, month, day, time);
    });
</script>
  
<div class="{'time-button ' + variantsClassName}" on:click={handleClick}>
    <div class="stack">
        <div class="text">{time}타임</div>
    </div>
    <img src={timeIcon} alt="timeButton" class="icon">
</div>
  
<style>
    .time-button {
      background: var(--primary-primary-600, #ffceb1);
      border-radius: 8px;
      padding: 0px 8px 0px 2px;
      display: flex;
      flex-direction: row;
      gap: 0px;
      align-items: center;
      justify-content: flex-start;
      width: 88px;
      height: 20px;
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }
    .stack {
      padding: 0px 0px 0px 20px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      align-items: center;
      justify-content: center;
      flex: 1;
      position: relative;
    }
    .text {
      color: var(--gray-gray-950, #331300);
      text-align: left;
      font-family: var(--small-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--small-medium-font-size, 10px);
      font-weight: var(--small-font-weight, 400);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      position: absolute;
      left: 23px;
      top: 16px;
      transform: translate(-16px, -16px);
      overflow: visible;
    }
    .time-button.created-false {
      background: var(--primary-primary-300, #ffefe5);
    }
</style>
  