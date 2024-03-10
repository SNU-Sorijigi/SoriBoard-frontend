<script>
    import WeekBlock from './weekBlock.svelte';

    let currentDate = new Date();
    $: month = currentDate.getMonth();
    $: year = currentDate.getFullYear();

    function prevMonth() {
      if(!(month==2 && year==2024)){
        month--;
        if (month < 0) {
            month = 11;
            year--;
        }
      }
    }

    function nextMonth() {
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    }

    function goToday() {
      month = currentDate.getMonth();
      year = currentDate.getFullYear();
    }

    function formatMonthDisplay(month, year) {
        const date = new Date(year, month);
        return `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월`;
    }

    function calculateWeeksInMonth(year, month) {
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const firstWeekDay = firstDayOfMonth.getDay();
      const totalDays = lastDayOfMonth.getDate();
      const daysInFirstWeek = 7 - firstWeekDay;
      const totalWeeks = 1 + Math.ceil((totalDays - daysInFirstWeek) / 7);
      return totalWeeks;
    }
    function createWeekList(n) {
      let list = [];
      for (let i = 0; i < n; i++) {
        list.push(i);
      }
      return list;
    }
    $: weeksInMonth = calculateWeeksInMonth(year, month);
    $: weekList = createWeekList(weeksInMonth);
</script>
  
<div class="calendar">
    <div class="header">
      <div class="month">{formatMonthDisplay(month, year)}</div>
      <div class="buttons">
        <button class="button" on:click={goToday}>&nbsp&nbsp오늘&nbsp&nbsp</button>
        <button class="button" on:click={prevMonth}>&nbsp&nbsp&nbsp&nbsp{"<"}&nbsp&nbsp&nbsp&nbsp</button>
        <button class="button" on:click={nextMonth}>&nbsp&nbsp&nbsp&nbsp{">"}&nbsp&nbsp&nbsp&nbsp</button>
      </div>
    </div>
    <div class="stack">
      <div class="stack2">
          <div class="div">일</div>
          <div class="div">월</div>
          <div class="div">화</div>
          <div class="div">수</div>
          <div class="div">목</div>
          <div class="div">금</div>
          <div class="div">토</div>
      </div>
      <div class="month-block">
          {#each weekList as index (year.toString() + '-' + month.toString() + '-' + index)}
              <WeekBlock week={index} month={month} year={year} on:createTime></WeekBlock>
          {/each}
      </div>
  </div>
</div>
<style>
    .calendar {
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
    justify-content: flex-start;
    position: relative;
    margin-top: 5vh;
  }
  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    justify-content: space-evenly;
  }
  .buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .button {
    font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
    font-size: var(--medium-font-size, 16px);
    font-weight: var(--medium-font-weight, 500);
    box-shadow: 2px 2px 4px 0px rgba(0, 0, 0, 0.25);
    padding: 5px;
    border-color: var(--gray-gray-600, #6a5134);
    border-width: 1px;
    background-color: var(--gray-gray-50);
    cursor: pointer;
  }
  .month {
    color: var(--gray-gray-900, #202020);
    text-align: left;
    font-family: var(--xlarge-font-family, "NotoSansKr-Medium", sans-serif);
    font-size: var(--xlarge-font-size, 32px);
    font-weight: var(--xlarge-font-weight, 500);
    position: relative;
    transform-origin: 0 0;
    transform: rotate(0deg) scale(1, 1);
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 0px;
    align-items: flex-start;
    justify-content: flex-start;
    flex-shrink: 0;
    position: relative;
  }
  .stack2 {
    display: flex;
    flex-direction: row;
    gap: 100px;
    align-items: center;
    justify-content: flex-start;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .div {
    color: var(--gray-gray-900, #202020);
    text-align: left;
    font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
    font-size: var(--medium-font-size, 16px);
    font-weight: var(--medium-font-weight, 500);
    position: relative;
    width: 46px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .month-block {
    border-style: dashed;
    border-color: var(--gray-gray-600, #7c7c7c);
    border-width: 1px;
    display: flex;
    flex-direction: column;
    gap: 0px;
    align-items: center;
    justify-content: flex-start;
    flex-shrink: 0;
    position: relative;
  }
</style>