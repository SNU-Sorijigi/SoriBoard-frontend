<script>
    import showIcon from '$lib/images/show.svg';
    import editIcon from '$lib/images/edit.svg';
    import xIcon from '$lib/images/x.svg';
    import checkIcon from '$lib/images/check.svg'
    import { onMount } from 'svelte';

    export let composer="";
    export let title="";
    export let semiTitle="";
    export let orchestra="";
    export let conductor="";
    export let players=[];

    export let is_requested=false;
    export let source="";
    export let cd_id="";
    export let id="";

    export let deleteMusic;

    let isEditing = false;
    function toggleEdit() {
      isEditing = !isEditing;
    }

    function confirmEdit() {
      isEditing = false;
      updateData(id);
    }

    async function updateData(id){
      const formData = {
        is_requested: is_requested,
        source: source,
        cd_id: cd_id,
        title: title,
        semi_title: semiTitle,
        composer_name: composer,
        conductor_name: conductor,
        orchestra_name: orchestra,
        player_names: players,
      }
      const response = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
      });
      if (!response.ok) {
        console.error('failed to edit');
      }
    }
    let ws;
    onMount(() => {
        ws = new WebSocket('ws://localhost:8080/ws/tv_display/');
    });
    function showDisplay() {
      const displayData = {
        time_music_id: id,
        update_type: "music",
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(displayData));
      } else {
        console.log("WebSocket is not open. ReadyState: ", ws.readyState);
      }
    }
</script>
  
<div class="musicinfo">
  <div class="textstack">
    <input bind:value={composer} readonly={!isEditing} class="composer">
    <div class="divider"></div>
    <div class="col_stack">
      <div class="row_stack">
        <div class="col_stack">
          <input bind:value={title} readonly={!isEditing} class="title">
          <input bind:value={semiTitle} readonly={!isEditing} class="semititle">
        </div>
        <div class="button" on:click={showDisplay}>
          <img src={showIcon} alt="show" class="icon"> 
          <div class="button_label">판서</div>
        </div>
        {#if !isEditing}
        <div class="button" on:click={toggleEdit}>
          <img src={editIcon} alt="edit" class="icon">
          <div class="button_label">수정</div>
        </div>
        {:else}
        <div class="button" on:click={confirmEdit}>
          <img src={checkIcon} alt="edit" class="icon icon-black">
          <div class="button_label">확인</div>
        </div>
        {/if}
        <div class="button" on:click={() => deleteMusic(id)}>
          <img src={xIcon} alt="x" class="icon">
          <div class="button_label">삭제</div>
        </div>
      </div>
      <div class="row_stack">
        {#if orchestra != ""}
        <input bind:value={orchestra} readonly={!isEditing} class="orchestra">
        {/if}
        {#if conductor != ""}
        <input bind:value={conductor} readonly={!isEditing} class="conductor">
        {/if}
        {#each players as player}
        <input bind:value={player} readonly={!isEditing} class="player">
        {/each}
      </div>
    </div>
  </div>
</div>
  
<style>
    input {
      background-color: var(--primary-primary-300);
      color: var(--gray-gray-950, #1a1a1a);
      text-overflow: ellipsis;
      border: 1px solid var(--primary-primary-300);
    }
    input:focus {
      outline: none;
    }
    input:not([readonly]) {
      border: 1px solid var(--gray-gray-950, #1a1a1a);
    }
    .musicinfo {
      width: 900px;
      height: 80px;
      border-style: solid;
      border-color: var(--primary-primary-800, #6a5134);
      border-width: 1px;
      padding: 0px 6px 0px 6px;
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      position: relative;
      box-shadow: 2px 2px 4px 0px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      background-color: var(--primary-primary-300);
    }
    .textstack {
      padding-top: 6px;
      padding-bottom: 6px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 5px;
    }
    .composer {
      font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
      font-size: var(--medium-font-size, 16px);
      font-weight: var(--medium-font-weight, 500);
      width: 250px;
      text-align: center;
    }
    .col_stack {
      display: flex;
      flex-direction: column;
      gap: 3px;
      align-items: flex-start;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .row_stack {
      display: flex;
      flex-direction: row;
      gap: 3px;
      align-items: center;
      justify-content: flex-start;
    }
    .title {
      font-family: var(--small-medium-font-family);
      font-size: var(--small-medium-font-size, 13px);
      font-weight: var(--small-medium-font-weight, 500);
      width: 505px;
    }
    .semititle {
      font-family: var(--small-medium-font-family);
      font-size: var(--small-medium-font-size, 13px);
      font-weight: var(--small-medium-font-weight, 500);
      width: 160px;
    }
    .orchestra {
      font-family: var(--small-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--small-font-size, 10px);
      font-weight: var(--small-font-weight, 400);
      width: 110px;
    }
    .conductor {
      font-family: var(--small-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--small-font-size, 10px);
      font-weight: var(--small-font-weight, 400);
      width: 110px;
    }
    .player {
      font-family: var(--small-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--small-font-size, 10px);
      font-weight: var(--small-font-weight, 400);
      width: 120px;
    }
    .button {
      display: flex;
      flex-direction: column;
      gap: 1px;
      align-items: center;
      justify-content: flex-start;
      position: relative;
      box-shadow: 2px 2px 4px 0px rgba(0, 0, 0, 0.25);
      padding: 4px;
      border-color: var(--primary-primary-500, #6a5134);
      border-width: 1px;
      border-style: solid;
      background-color: var(--primary-primary-200);
      border-radius: 10%;
      cursor: pointer;
    }
    .icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      position: relative;
      overflow: visible;
    }
    .icon-black {
      filter: invert(100%);
    }
    .button_label {
      color: var(--gray-gray-950, #1a1a1a);
      text-align: left;
      font-family: var(--xsmall-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--xsmall-font-size, 8px);
      font-weight: var(--xsmall-font-weight, 400);
      position: relative;
    }
    .divider {
      background: var(--primary-primary-800, #6a5134);
      align-self: stretch;
      flex-shrink: 0;
      width: 1px;
      position: relative;
      overflow: hidden;
    }
</style>