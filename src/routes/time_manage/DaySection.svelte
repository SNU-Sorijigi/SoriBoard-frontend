<script>
    import { GradientButton } from 'flowbite-svelte';
    export let index;
    export let data;
  
    function createTime() {
        console.log("create time");
    }
</script>

{#if data==null}
<div class="no_time">
    {index + 1}타임
    <GradientButton on:click={createTime} color="pinkToOrange">타임 생성</GradientButton>
</div>
{:else}
<div class="yes_time">
    {index + 1}타임
    {data.user.name}
    <GradientButton href="/time_manage/{data.id}" color="tealToLime">타임 관리</GradientButton>
</div>
{/if}

<style>
    .no_time {
        background-color: #c99;
        margin: 5px;
        padding: 10px;
        width: 100%;
        display: flex;
        justify-content: space-between;
    }

    .yes_time {
        background-color: #7ce;
        margin: 5px;
        padding: 10px;
        width: 100%;
        display: flex;
        justify-content: space-between;
    }
</style>