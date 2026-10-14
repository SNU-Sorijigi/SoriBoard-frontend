<script>
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import editIcon from '$lib/images/edit.svg';
	import xIcon from '$lib/images/x.svg';
	import checkIcon from '$lib/images/check.svg';
	import checkDarkIcon from '$lib/images/check-dark.svg';

	export let id = '';
	export let sabu_info = '';
	// The list's values, passed again on every refetch (확인 or 삭제 on another row). They reach
	// the boxes only outside 수정, so a refetch keeps what is being typed
	let listName = '';
	let listSabuId = '';
	let listMajor = '';
	let listYearId = '';
	let listIsOb = false;
	let listJoinYear = '';
	let listJoinSemester = '';
	export {
		listName as name,
		listSabuId as sabu_id,
		listMajor as major,
		listYearId as year_id,
		listIsOb as is_ob,
		listJoinYear as join_year,
		listJoinSemester as join_semester
	};

	// What the boxes show and 수정 edits
	let name, sabu_id, major, year_id, is_ob, join_year, join_semester;
	function showListValues() {
		if (isEditing) return;
		name = listName;
		sabu_id = listSabuId;
		major = listMajor;
		year_id = listYearId;
		is_ob = listIsOb;
		join_year = listJoinYear;
		join_semester = listJoinSemester;
	}
	// Only when the list's values change: leaving 수정 after a save keeps the saved values shown
	// until the refetch brings them
	$: listName,
		listSabuId,
		listMajor,
		listYearId,
		listIsOb,
		listJoinYear,
		listJoinSemester,
		showListValues();

	export let deleteUser;

	export let refetchUsers;


	const users = writable([]);
	async function fetchUsers() {
		try {
			const response = await fetch('/api/user');
			if (!response.ok) {
				throw new Error(`Failed to fetch users: ${response.status}`);
			}
			const data = await response.json();
			users.set(data);
		} catch (error) {
			// edit mode still opens, with the list of an earlier load if there was one
			console.error('failed to fetch users', error);
			alert('지기 목록을 불러오지 못했습니다.');
		}
	}

	onMount(() => {
		// fetchUsers();
	});

	function toggleCheck() {
		is_ob = !is_ob;
	}

	let isEditing = false;
	function toggleEdit() {
		fetchUsers();
		// A 지기 without 사부 comes as null, which no option matches (the select showed blank):
		// 해당 없음 is ''
		sabu_id = sabu_id ?? '';
		isEditing = !isEditing;
	}

	async function confirmEdit() {
		let saved = false;
		try {
			saved = await updateData(id);
		} catch (error) {
			console.error('failed to edit', error);
		}
		// After a failure the row stays editable with the typed values
		if (saved) {
			isEditing = false;
			refetchUsers();
		} else {
			alert('지기 정보 수정에 실패했습니다.');
		}
	}

	async function updateData(id) {
		const formData = {
			name: name,
			// 해당 없음 is sent as null, as 지기 추가 sends 사부 없음
			sabu_id: sabu_id || null,
			major: major,
			year_id: year_id,
			is_ob: is_ob,
			join_year: join_year,
			join_semester: join_semester
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
		return response.ok;
	}
</script>

<div class="userinfo">
	<div class="textstack">
		<button class="button" on:click={() => deleteUser(id)}>
			<img src={xIcon} alt="" class="icon" />
			<div class="button_label">삭제</div>
		</button>
		<input bind:value={name} readonly={!isEditing} class="name" aria-label="이름" />
		<label for={`user-ob-${id}`}>OB</label>
		{#if isEditing}
			<button
				type="button"
				id={`user-ob-${id}`}
				class="checkbox"
				aria-pressed={is_ob}
				on:click={toggleCheck}
				class:checked={is_ob}
			>
				{#if is_ob}
					<img src={checkIcon} alt="check" class="check" />
				{:else}
					<img src={xIcon} alt="x" class="check" />
				{/if}
			</button>
		{:else}
			{#if is_ob}
				<img src={checkDarkIcon} alt="check" class="check" />
			{:else}
				<img src={xIcon} alt="x" class="check" />
			{/if}
		{/if}
		<div class="divider"></div>
		<div class="col_stack">
			<div class="row_stack">
				<div class="col_stack">
					<div class="row_stack">
						전공:<input bind:value={major} readonly={!isEditing} class="major" aria-label="전공" />
						학번:<input
							bind:value={year_id}
							readonly={!isEditing}
							class="yearid"
							aria-label="학번"
						/>
					</div>
					<label>사부
					{#if isEditing}
						<select bind:value={sabu_id} class="sabu">
							<option value="">해당 없음</option>
							{#each $users as user}
								<option value={user.id}>{user.name} {user.major} {user.year_id}</option>
							{/each}
						</select>
					{:else}
						<input bind:value={sabu_info} readonly={!isEditing} class="sabu" />
					{/if}
					</label>
				</div>
				<div class="col_stack">
					<div class="row_stack">
						{#if isEditing}
							<label for={`user-join-year-${id}`}>입부 년도</label>
						{/if}
						<input
							id={`user-join-year-${id}`}
							bind:value={join_year}
							readonly={!isEditing}
							class="join"
						/>
					</div>
					<div class="row_stack">
						{#if isEditing}
							<label for={`user-join-semester-${id}`}>입부 학기</label>
						{/if}
						<input
							id={`user-join-semester-${id}`}
							bind:value={join_semester}
							readonly={!isEditing}
							class="join"
						/>
					</div>
				</div>
				<div class="col_stack">
					<div class="row_stack">
						{#if !isEditing}
							<button class="button" on:click={toggleEdit}>
								<img src={editIcon} alt="" class="icon" />
								<div class="button_label">수정</div>
							</button>
						{:else}
							<button class="button" on:click={confirmEdit}>
								<img src={checkDarkIcon} alt="" class="icon" />
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
	.checkbox {
		padding: 0;
		border: 2px solid var(--control-border);
		border-radius: 4px;
		background-color: var(--primary-primary-100);
		cursor: pointer;
	}
	.checkbox.checked {
		background-color: var(--checked-bg);
	}
	input:not([readonly]) {
		border: 1px solid var(--control-border);
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
		width: 150px;
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
	.major {
		font-family: var(--small-medium-font-family);
		font-size: var(--medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		width: 110px;
	}
	.sabu {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 200px;
	}
	.join {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 100px;
	}
	.year_id {
		font-family: var(--small-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-font-size, 10px);
		font-weight: var(--small-font-weight, 400);
		width: 40px;
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
	.icon {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
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
