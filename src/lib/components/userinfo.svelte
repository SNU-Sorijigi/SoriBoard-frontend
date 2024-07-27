<script>
	import { createEventDispatcher } from 'svelte';
	import editIcon from '$lib/images/edit.svg';
	import checkIcon from '$lib/images/check.svg';
	import { onMount } from 'svelte';
  import { fontSizeInit } from '$lib/displayStore';

	export let name = '';
	export let sabu = '';
	export let major = '';
	export let yearId = '';
	export let isOb = false;

	export let deleteUser;

	let sabu_info = sabu.name + " " + sabu.major + " " + sabu.yearId;

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
			name: name,
			sabu: sabu,
			major: major,
			yearId: yearId,
			isOb: isOb
		};
		const response = await fetch(`/api/user/${id}`, {
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
	const dispatch = createEventDispatcher();
</script>

<div class="userinfo">
	<div class="textstack">
		<button class="button" on:click={() => deleteUser(id)}>
			<img src={xIcon} alt="x" class="icon" />
			<div class="button_label">삭제</div>
		</button>
		<input bind:value={name} readonly={!isEditing} class="name" />
		{#if isOb}
			<img src={checkicon} alt="check" class="check" />
		{:else}
			<img src={xicon} alt="x" class="check" />
		{/if}
		<div class="divider"></div>
		<div class="col_stack">
			<div class="row_stack">
				<div class="col_stack">
					{#if isEditing}
						<select bind:value={sabu} class="sabu">
							{#each $users as user}
								<option value={user.id}>{user.name} {user.major} {user.yearId}</option>
							{/each}
						</select>
					{:else}
						<input bind:value={sabu_info} readonly={!isEditing} class="sabu" />
					{/if}
					<div class="row_stack">
						<input bind:value={major} readonly={!isEditing} class="major" />
						<input bind:value={yearId} readonly={!isEditing} class="yearid" />
					</div>
				</div>
				<div class="col_stack">
					<div class="row_stack">
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
	.userinfo {
		width: 920px;
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
	.name {
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
	.sabu {
		font-family: var(--small-medium-font-family);
		font-size: var(--medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		width: 505px;
	}
	.major {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 110px;
	}
	.yearId {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 110px;
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
