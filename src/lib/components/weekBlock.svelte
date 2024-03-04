<script>
    import DayBlock from './dayBlock.svelte';
    export let week;
    export let month;
    export let year;

    function calculateWeekDays(year, month, weekNumber) {
        const getSunday = (d) => new Date(d.setDate(d.getDate() - d.getDay()));
        const addDays = (d, days) => new Date(d.setDate(d.getDate() + days));
        const formatDate = (d) => ('0' + d.getDate()).slice(-2);
        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
                                      d1.getMonth() === d2.getMonth() &&
                                      d1.getDate() === d2.getDate();

        let dates = [];
        let date = new Date(year, month, 1);
        let firstSunday = getSunday(new Date(year, month, 1));
    
        date = addDays(firstSunday, weekNumber * 7);
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            let day = addDays(new Date(date), i);
            dates.push({
                date: formatDate(day),
                month: day.getMonth(),
                year: day.getFullYear(),
                isToday: isSameDay(day, today),
                isThisMonth: day.getMonth() === month
            });
        }

        return dates;
    }

    $: daysOfWeek = calculateWeekDays(year, month, week);
</script>

<div class="week-block">
    {#each daysOfWeek as {date, month, year, isToday, isThisMonth}, i}
        <DayBlock 
          day={date} 
          month={month+1}
          year={year}
          time={i !== 0 && i !== 6} 
          isToday={isToday} 
          isThisMonth={isThisMonth}
          on:createTime
          >
        </DayBlock>
    {/each}
</div>


<style>
    .week-block {
      display: flex;
      flex-direction: row;
      gap: 0px;
      align-items: center;
      justify-content: center;
      position: relative;
    }
</style>
