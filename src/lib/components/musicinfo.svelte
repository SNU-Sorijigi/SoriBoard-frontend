<script>
	import { createEventDispatcher } from 'svelte';
	import showIcon from '$lib/images/show.svg';
	import editIcon from '$lib/images/edit.svg';
	import xIcon from '$lib/images/x.svg';
	import checkIcon from '$lib/images/check.svg';
	import upIcon from '$lib/images/up.svg';
	import downIcon from '$lib/images/down.svg';
	import plusIcon from '$lib/images/plus.svg';
	import minusIcon from '$lib/images/minus.svg';
	import { webSocketServer } from '$lib/globals';
	import { onMount } from 'svelte';
	import { displayComposer } from '$lib/displayStore';
	import { displayTitle } from '$lib/displayStore';
	import { displaySemiTitle } from '$lib/displayStore';
	import { displayConductor } from '$lib/displayStore';
	import { displayOrchestra } from '$lib/displayStore';
	import { displayPlayers } from '$lib/displayStore';
  import { fontSizeInit } from '$lib/displayStore';

	export let composer = '';
	export let title = '';
	export let semiTitle = '';
	export let orchestra = '';
	export let conductor = '';
	export let players = [];

	export let is_requested = false;
	export let source = '';
	export let cd_id = '';
	export let id = '';

	export let deleteMusic;

	let isEditing = false;
	function toggleEdit() {
		isEditing = !isEditing;
	}

	function confirmEdit() {
		isEditing = false;
		updateData(id);
	}

	async function updateData(id) {
		const formData = {
			is_requested: is_requested,
			source: source,
			cd_id: cd_id,
			title: title,
			semi_title: semiTitle,
			composer_name: composer,
			conductor_name: conductor,
			orchestra_name: orchestra,
			player_names: players
		};
		const response = await fetch(`/api/music/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		if (!response.ok) {
			console.error('failed to edit');
		}
	}
	let ws;
	onMount(() => {
		ws = new WebSocket(`${webSocketServer}/ws/tv_display/`);
	});
	function showDisplay() {
		displayComposer.set(composer);
		displayTitle.set(title);
		displaySemiTitle.set(semiTitle);
		displayOrchestra.set(orchestra);
		displayConductor.set(conductor);
		displayPlayers.set(players);
		const displayData = {
			time_music_id: id,
			update_type: 'music'
		};
		const data = {
			update_type: 'size',
			composerFontSize: 3,
			titleFontSize: 2,
			orchestraFontSize: 1.25,
			playerFontSize: 1.25,
			spacerSize1: 2.25,
			spacerSize2: 1.6875,
			spacerSize3: 0.28125,
			spacerSize4: 0.28125
		};
    fontSizeInit();
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(displayData));
			ws.send(JSON.stringify(data));
		} else {
			console.log('WebSocket is not open. ReadyState: ', ws.readyState);
		}
	}

	const dispatch = createEventDispatcher();
	function goUp() {
		dispatch('goUp', { musicid: id });
	}
	function goDown() {
		dispatch('goDown', { musicid: id });
	}

	function addPlayer() {
		players = [...players, ''];
	}

	function removePlayer(index) {
		players = players.filter((_, i) => i !== index);
	}
</script>

<div class="musicinfo">
	<div class="textstack">
		<button class="button" on:click={() => deleteMusic(id)}>
			<img src={xIcon} alt="x" class="icon" />
			<div class="button_label">삭제</div>
		</button>
		<input bind:value={composer} readonly={!isEditing} class="composer" />
		<div class="divider"></div>
		<div class="col_stack">
			<div class="row_stack">
				<div class="col_stack">
					<input bind:value={title} readonly={!isEditing} class="title" />
					<div class="row_stack">
						<input bind:value={semiTitle} readonly={!isEditing} class="semititle" />
					</div>
					<div class="orchestra-conductor-row">
						<input bind:value={orchestra} readonly={!isEditing} class="orchestra" />
						<input bind:value={conductor} readonly={!isEditing} class="conductor" />
					</div>
					<div class="players-grid">
						{#each players as player, index}
							<div class="player-row">
								<input bind:value={player} readonly={!isEditing} class="player" />
								{#if isEditing}
									<button class="player-delete-btn" on:click={() => removePlayer(index)}>
										<img src={minusIcon} alt="remove player" class="small-icon" />
									</button>
								{/if}
							</div>
						{/each}
						{#if isEditing}
							<button class="player-add-btn" on:click={addPlayer}>
								<img src={plusIcon} alt="add player" class="small-icon" />
								<div class="add-label">연주자 추가</div>
							</button>
						{/if}
					</div>
				</div>
				<div class="col_stack">
					<div class="row_stack">
						<div class="col_stack">
							<button class="button" on:click={goUp}>
								<img src={upIcon} alt="up" class="arrow_icon" />
							</button>
							<button class="button" on:click={goDown}>
								<img src={downIcon} alt="down" class="arrow_icon" />
							</button>
						</div>
						{#if !isEditing}
							<button class="button" on:click={toggleEdit}>
								<img src={editIcon} alt="edit" class="icon" />
								<div class="button_label">수정</div>
							</button>
						{:else}
							<button class="button" on:click={confirmEdit}>
								<img src={checkIcon} alt="edit" class="icon icon-black" />
								<div class="button_label">확인</div>
							</button>
						{/if}
						<button class="button" on:click={showDisplay}>
							<img src={showIcon} alt="show" class="icon" />
							<div class="button_label">판서</div>
						</button>
					</div>
					<div class="row_stack">
						<input bind:value={cd_id} readonly={!isEditing} class="cd_id" />
						<input bind:value={source} readonly={!isEditing} class="source" />
					</div>
				</div>
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
		width: 920px;
		min-height: 80px;
		height: auto;
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
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		width: 250px;
		text-align: center;
	}
	.col_stack {
		display: flex;
		flex-direction: column;
		gap: 2px;
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
		font-size: var(--medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		width: 505px;
	}
	.semititle {
		font-family: var(--small-medium-font-family);
		font-size: var(--small-medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		width: 380px;
	}
	.source {
		font-family: var(--small-font-family);
		font-size: var(--small-font-size, 13px);
		font-weight: var(--small-font-weight, 500);
		width: 40px;
	}
	.cd_id {
		font-family: var(--small-font-family);
		font-size: var(--small-font-size, 13px);
		font-weight: var(--small-font-weight, 500);
		width: 50px;
	}
	.orchestra {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 130px;
	}
	.conductor {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 130px;
	}
	.orchestra-conductor-row {
		display: flex;
		flex-direction: row;
		gap: 3px;
		align-items: center;
		justify-content: flex-start;
	}
	.players-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 3px;
		max-width: 270px; /* Increased to accommodate larger player fields */
		align-items: start;
	}
	.player-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 2px;
		width: 100%;
		min-height: 20px;
	}
	.player {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 108px; /* Increased to match larger grid, minus space for delete button */
		flex-shrink: 0;
	}
	.player-delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: 1px solid var(--primary-primary-500);
		background-color: var(--primary-primary-200);
		border-radius: 50%;
		cursor: pointer;
		padding: 0;
		box-shadow: 1px 1px 2px 0px rgba(0, 0, 0, 0.15);
	}
	.player-add-btn {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 4px;
		width: 130px;
		height: 28px;
		border: 1px dashed var(--primary-primary-500);
		background-color: var(--primary-primary-100);
		border-radius: 4px;
		cursor: pointer;
		padding: 4px;
	}
	.small-icon {
		width: 10px;
		height: 10px;
	}
	.add-label {
		color: var(--gray-gray-950, #1a1a1a);
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		white-space: nowrap;
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
	.arrow_icon {
		flex-shrink: 0;
		width: 14px;
		height: 14px;
		position: relative;
		overflow: visible;
	}
	.icon-black {
		filter: invert(100%);
	}
	.button_label {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: left;
		font-family: var(--xsmall-font-family, 'NotoSansKr-Regular', sans-serif);
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
