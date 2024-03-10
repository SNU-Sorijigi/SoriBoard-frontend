<script>
    import TimeButton from './timeButton.svelte'
    export let day = "01";
    export let time = false;
    export let isToday = false;
    export let isThisMonth = true;
    export let year = "";
    export let month = "";
    export let create = [];
</script>
  
<div class="day-block">
    <div class="day {isToday ? 'today' : ''} {isThisMonth ? 'this-month' : 'not-this-month'}">{day}</div>
    {#if time}
    <div class="stack">
        <TimeButton time="1" year={parseInt(year)} month={parseInt(month)} day={parseInt(day)} id={create[0]} on:createTime></TimeButton>
        <TimeButton time="2" year={parseInt(year)} month={parseInt(month)} day={parseInt(day)} id={create[1]} on:createTime></TimeButton>
        <TimeButton time="3" year={parseInt(year)} month={parseInt(month)} day={parseInt(day)} id={create[2]} on:createTime></TimeButton>
        <TimeButton time="4" year={parseInt(year)} month={parseInt(month)} day={parseInt(day)} id={create[3]} on:createTime></TimeButton>
        <TimeButton time="5" year={parseInt(year)} month={parseInt(month)} day={parseInt(day)} id={create[4]} on:createTime></TimeButton>
    </div>
    {/if}
</div>
  
<style>
    .day-block {
      border-style: dashed;
      border-color: var(--gray-gray-600, #7c7c7c);
      border-width: 1px;
      padding: 5px;
      display: flex;
      flex-direction: row;
      gap: 4px;
      align-items: flex-start;
      justify-content: flex-start;
      width: 132px;
      height: 110px;
      position: relative;
    }
    .this-month {
      color: var(--gray-gray-600, #7c7c7c);
    }
    .not-this-month {
      color: var(--gray-gray-200);
    }
    .today {
      color: var(--red-red-700);
    }
    .day {
      text-align: left;
      font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
      font-size: var(--medium-font-size, 16px);
      font-weight: var(--medium-font-weight, 500);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      align-self: stretch;
      flex: 1;
      position: relative;
    }
</style>
  