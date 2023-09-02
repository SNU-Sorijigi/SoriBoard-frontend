<script>
    import { current } from '../time_manage/display.js'
</script>

<svelte:head>
    <title>판서</title>
    <meta name="description" content="SoriBoard" />
</svelte:head>

<a class="display" href='/time_manage'>
    <div class="composer">{$current[0]}</div>
    <div class="title">{$current[1]}</div>
    <div class="performer">{$current[2]}</div>
</a>

<style>
    a {
        height: 100vh;
        width: 100vw;
    }

    .display {
        background-color: black;
        height: 100vh;
        width: 100vw;
        color: white;
        text-align: center;
    }
    .composer {
        margin-top: 15vh;
        font-size: 10vh;
    }
    .title {
        margin-top: 15vh;
        font-size: 4vh;
    }
    .performer {
        margin-top: 10vh;
        font-size: 3vh;
    }
</style>