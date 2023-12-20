<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import DaySection from './DaySection.svelte';
    import { ButtonGroup, GradientButton, Input, Button } from 'flowbite-svelte';
    let currentDate = new Date();
    let selectedDate = currentDate.toISOString().split('T')[0];
  
    function getWeekDays(date) {
        let weekDays = [];
        let current = new Date(date);
        current.setDate(current.getDate() - (current.getDay() === 0 ? 6 : current.getDay() - 1));
        for (let i = 0; i < 5; i++) {
            weekDays.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return weekDays;
    }
  
    function goToNextWeek() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
    }
  
    function goToPreviousWeek() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
    }

    function goToday() {
        currentDate = new Date();
    }

    let data = writable([]);
    let isLoading = writable(true);

    onMount(async () => {
        const response = await fetch(`/api/time`);
        if (!response.ok) {
            console.log("Error");
        }
        data.set(await response.json());
        isLoading.set(false);
    });

    $: weekDays = getWeekDays(selectedDate);

    function findDataForDay(day, index) {
        let foundData = null;
        $data.forEach(item => {
            const itemDate = new Date(item.date);
            if (itemDate.toDateString() === day.toDateString() && item.time === index) {
                foundData = item;
            }
        });
        return foundData;
    }
  
    $: weekDays = getWeekDays(currentDate);
</script>
{#if $isLoading}
{:else}
<br><br>
<div class="flex justify-center">
    <ButtonGroup class="space-x-px">
        <GradientButton pill shadow="teal" color="teal" on:click={goToPreviousWeek}>← 지난 주</GradientButton>
        <GradientButton pill shadow="teal" color="teal" on:click={goToNextWeek}>다음 주 →</GradientButton>
    </ButtonGroup>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
    <Input type="date" bind:value={selectedDate} class="w-min"/>
    <GradientButton shadow="teal" color="teal" on:click={goToday}>오늘</GradientButton>
</div>
<br>
<br>
<div class="week-grid">
    {#each weekDays as day}
    <div class="day-column">
        <div class="day-header">
            {`${(day.getMonth() + 1).toString().padStart(2, '0')}/${day.getDate().toString().padStart(2, '0')} ${day.toLocaleDateString('ko-KR', { weekday: 'short' })}`}
        </div>
        {#each Array(5) as _, index}
            <DaySection index={index} data={findDataForDay(day, index+1)} />
        {/each}
    </div>
    {/each}
</div>
{/if}
<style>
    .week-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        width: 60vw;
        margin-left: auto;
        margin-right: auto;
    }
    .day-column {
      border: 1px solid #ccc;
      padding: 10px;
    }
    .day-header {
      font-weight: bold;
      margin-bottom: 10px;
    }
</style>