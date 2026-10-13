<script>
	import { createEventDispatcher } from 'svelte';
	import showIcon from '$lib/images/show.svg';
	import editIcon from '$lib/images/edit.svg';
	import xIcon from '$lib/images/x.svg';
	import checkDarkIcon from '$lib/images/check-dark.svg';
	import upIcon from '$lib/images/up.svg';
	import downIcon from '$lib/images/down.svg';
	import plusIcon from '$lib/images/plus.svg';
	import minusIcon from '$lib/images/minus.svg';
	import { tvSender } from '$lib/tvSocket';
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

	// What the inputs show and edit. A playlist reload (곡 추가, 삭제, ↑/↓) passes the saved
	// values again: they replace these only while the row is not in 수정, so the typed text
	// is kept until 확인 saves it.
	let fields = {};
	$: showSaved(composer, title, semiTitle, orchestra, conductor, players, cd_id, source);
	function showSaved() {
		if (isEditing) return;
		fields = {
			composer,
			title,
			semiTitle,
			orchestra,
			conductor,
			players: [...players],
			cd_id,
			source
		};
	}

	async function confirmEdit() {
		// Same rule as 곡 추가: a player, trimmed, is empty or splits in two on ': ' (as the backend does).
		const isValid = fields.players.every((player) => {
			const trimmed = player.trim();
			return trimmed === '' || trimmed.split(': ').length === 2;
		});
		if (!isValid) {
			alert("'{악기/역할} : {연주자 이름}' 형식으로 적어주세요");
			return;
		}

		let saved = false;
		try {
			saved = await updateData(id);
		} catch (error) {
			console.error('failed to edit', error);
		}
		if (saved) {
			isEditing = false;
			// The page reloads the playlist, so 업로드 shows the saved text too
			dispatch('saved', { musicid: id });
		} else {
			alert('곡 수정에 실패했습니다.');
		}
	}

	// The 지휘 field shows '지휘: ' + name. The backend keeps the part after ': ',
	// so a name typed without that prefix (or as '지휘:name') gets it added
	function conductorName(value) {
		const trimmed = value.trim();
		const parts = trimmed.split(': ');
		return parts.length === 2 ? parts[1].trim() : trimmed.replace(/^지휘\s*:\s*/, '');
	}

	async function updateData(id) {
		const name = conductorName(fields.conductor);
		const formData = {
			is_requested: is_requested,
			source: fields.source,
			cd_id: fields.cd_id,
			title: fields.title,
			semi_title: fields.semiTitle,
			composer_name: fields.composer,
			conductor_name: name ? '지휘: ' + name : '',
			orchestra_name: fields.orchestra,
			// Upstream's backend fails on an empty player, after saving the rest of the edit
			player_names: fields.players.filter((player) => player.trim() !== '')
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
		} else {
			fields.conductor = formData.conductor_name;
		}
		return response.ok;
	}
	let tv;
	onMount(() => {
		tv = tvSender();
		return () => tv.close();
	});
	function showDisplay() {
		displayComposer.set(fields.composer);
		displayTitle.set(fields.title);
		displaySemiTitle.set(fields.semiTitle);
		displayOrchestra.set(fields.orchestra);
		// The preview adds ' / 지휘: ' itself, as the TV does
		displayConductor.set(conductorName(fields.conductor));
		displayPlayers.set(fields.players);
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
		tv.send(displayData, data);
	}

	const dispatch = createEventDispatcher();
	function goUp() {
		dispatch('goUp', { musicid: id });
	}
	function goDown() {
		dispatch('goDown', { musicid: id });
	}

	function addPlayer() {
		fields.players = [...fields.players, ''];
	}

	function removePlayer(index) {
		fields.players = fields.players.filter((_, i) => i !== index);
	}
</script>

<div class="musicinfo">
	<div class="textstack">
		<button class="button delete" on:click={() => deleteMusic(id)}>
			<img src={xIcon} alt="" class="icon" />
			<div class="button_label">삭제</div>
		</button>
		<input
			bind:value={fields.composer}
			readonly={!isEditing}
			class="composer"
			aria-label="작곡가"
		/>
		<div class="divider"></div>
		<div class="col_stack">
			<div class="row_stack">
				<div class="col_stack">
					<input bind:value={fields.title} readonly={!isEditing} class="title" aria-label="제목" />
					<div class="row_stack">
						<input
							bind:value={fields.semiTitle}
							readonly={!isEditing}
							class="semititle"
							aria-label="곡 세부 정보(악장 등)"
						/>
					</div>
					<div class="orchestra-conductor-row">
						<input
							bind:value={fields.orchestra}
							readonly={!isEditing}
							class="orchestra"
							aria-label="오케스트라/실내악단"
						/>
						<input
							bind:value={fields.conductor}
							readonly={!isEditing}
							class="conductor"
							aria-label="지휘자"
						/>
					</div>
					<div class="players-grid">
						{#each fields.players as player, index}
							<div class="player-row">
								<input
									bind:value={player}
									readonly={!isEditing}
									class="player"
									aria-label={`연주자 ${index + 1}`}
								/>
								{#if isEditing}
									<button class="player-delete-btn" on:click={() => removePlayer(index)}>
										<img src={minusIcon} alt={`연주자 ${index + 1} 삭제`} class="small-icon" />
									</button>
								{/if}
							</div>
						{/each}
						{#if isEditing}
							<button class="player-add-btn" on:click={addPlayer}>
								<img src={plusIcon} alt="" class="small-icon" />
								<div class="add-label">연주자 추가</div>
							</button>
						{/if}
					</div>
				</div>
				<div class="col_stack">
					<div class="row_stack">
						<div class="col_stack">
							<button class="button tool" on:click={goUp}>
								<img src={upIcon} alt="위로 이동" class="arrow_icon" />
							</button>
							<button class="button tool" on:click={goDown}>
								<img src={downIcon} alt="아래로 이동" class="arrow_icon" />
							</button>
						</div>
						{#if !isEditing}
							<button class="button tool" on:click={toggleEdit}>
								<img src={editIcon} alt="" class="icon" />
								<div class="button_label">수정</div>
							</button>
						{:else}
							<button class="button tool" on:click={confirmEdit}>
								<img src={checkDarkIcon} alt="" class="icon" />
								<div class="button_label">확인</div>
							</button>
						{/if}
						<button class="button tool" on:click={showDisplay}>
							<img src={showIcon} alt="" class="icon" />
							<div class="button_label">판서</div>
						</button>
					</div>
					<div class="row_stack">
						<input
							bind:value={fields.cd_id}
							readonly={!isEditing}
							class="cd_id"
							aria-label="음반 번호"
						/>
						<input
							bind:value={fields.source}
							readonly={!isEditing}
							class="source"
							aria-label="음원 종류"
						/>
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
		box-shadow: 1px 1px 0 0 var(--button-shadow);
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
		box-shadow: 2px 2px 0 0 var(--button-shadow);
		padding: 4px;
		border-color: var(--primary-primary-500, #6a5134);
		border-width: 1px;
		border-style: solid;
		background-color: var(--primary-primary-200);
		border-radius: 10%;
		cursor: pointer;
	}
	.tool {
		background-color: var(--tool-bg);
	}
	.delete {
		background-color: var(--danger-bg);
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
