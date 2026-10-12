<script>
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import plusicon from '$lib/images/plus.svg';
	import minusicon from '$lib/images/minus.svg';

	export let id;

	const users = writable([]);

	let day = '';
	let time = '';
	let timetable_id = '';
	let jigi_ids = [];
	let mentee_ids = [];

	let jigi_info = [];
	let mentee_info = [];

	async function fetchUsers() {
		try {
			const response = await fetch('/api/user/');
			const data = await response.json();
			users.set(data);
		} catch (error) {
			console.error('Failed to fetch users');
		}
	}

	function showUnit(data) {
		day = data.day;
		time = data.time;
		timetable_id = data.timetable;
		jigi_ids = (data.users || []).map(String);
		mentee_ids = (data.mentees || []).map(String);
		jigi_info = data.jigi_info || [];
		mentee_info = data.mentee_info || [];
	}

	async function fetchUnitData(id) {
		if (id == '') {
			day = '';
			time = '';
			timetable_id = '';
			jigi_ids = [];
			mentee_ids = [];
			jigi_info = [];
			mentee_info = [];
		} else {
			try {
				const response = await fetch(`/api/timetableunit/${id}`);
				if (!response.ok) {
					// keep what the cell shows: a failed load does not mean its 지기 are gone
					throw new Error(`Failed to fetch timetableunit: ${response.status}`);
				}
				showUnit(await response.json());
			} catch (error) {
				console.error('Failed to fetch timetableunit data', error);
			}
		}
	}

	let isJigiEditing = false;
	let isMenteeEditing = false;
	function toggleJigiEdit() {
		fetchUsers();
		isJigiEditing = !isJigiEditing;
	}

	function addJigiRow() {
		jigi_ids = [...jigi_ids, ''];
	}
	function removeJigiRow(index) {
		jigi_ids = jigi_ids.filter((_, i) => i !== index);
	}

	async function confirmJigiEdit() {
		if (await updateData(id)) {
			isJigiEditing = false;
		}
	}

	function toggleMenteeEdit() {
		fetchUsers();
		isMenteeEditing = !isMenteeEditing;
	}

	function addMenteeRow() {
		mentee_ids = [...mentee_ids, ''];
	}
	function removeMenteeRow(index) {
		mentee_ids = mentee_ids.filter((_, i) => i !== index);
	}

	async function confirmMenteeEdit() {
		if (await updateData(id)) {
			isMenteeEditing = false;
		}
	}

	function resetUnit() {
		jigi_ids = [];
		mentee_ids = [];
	}

	async function updateData(id) {
		// a row added with + and left at 선택 is '': skip it, or the backend refuses the whole edit
		const formData = {
			day: day,
			time: time,
			timetable: timetable_id,
			users: jigi_ids.filter(Boolean).map(Number),
			mentees: mentee_ids.filter(Boolean).map(Number)
		};
		try {
			const response = await fetch(`/api/timetableunit/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});
			if (!response.ok) {
				throw new Error(`Failed to update timetableunit: ${response.status}`);
			}
			// the answer is the saved cell, with its 지기/견습 names
			showUnit(await response.json());
			return true;
		} catch (error) {
			// stay in edit mode with the chosen rows, so the edit can be retried
			console.error('Failed to update timetableunit', error);
			alert('시간표 정보 수정에 실패했습니다.');
			return false;
		}
	}

	onMount(() => {
		console.log(`id: ${id}`);
		fetchUnitData(id);
	});
</script>

<div class="timetableunit">
	<div class="col_stack">
		<div class="row_stack">
			<div class="col_stack">
				<label for={`jigi-select-${id}`}>지기</label>
			</div>
			<div class="col_stack">
				{#if isJigiEditing}
					<div class="col_stack">
						{#each jigi_ids as jid, i}
							<div class="row_stack">
								<select bind:value={jid}>
									<option value="" disabled>선택</option>
									{#each $users as user}
										<option value={String(user.id)}>{user.name} {user.major} {user.year_id}</option>
									{/each}
								</select>
								{#if i > 0}
									<button class="iconbtn" type="button" on:click={() => removeJigiRow(i)}
										><img src={minusicon} alt="-" /></button
									>
								{/if}
							</div>
						{/each}
						<button class="iconbtn" type="button" on:click={addJigiRow}
							><img src={plusicon} alt="+" /></button
						>
					</div>
				{:else}
					<div>{jigi_info && jigi_info.length ? jigi_info.join(', ') : ''}</div>
				{/if}
			</div>
			<div class="col_stack">
				{#if !isJigiEditing}
					<button class="button" on:click={toggleJigiEdit}>
						<div class="button_label">수정</div>
					</button>
				{:else}
					<button class="button" on:click={confirmJigiEdit}>
						<div class="button_label">확인</div>
					</button>
				{/if}
			</div>
		</div>
		<div class="row_stack">
			<div class="col_stack">
				<label for={`mentee-select-${id}`}>견습</label>
			</div>
			<div class="col_stack">
				{#if isMenteeEditing}
					<div class="col_stack">
						{#each mentee_ids as mid, i}
							<div class="row_stack">
								<select bind:value={mid}>
									<option value="" disabled>선택</option>
									{#each $users as user}
										<option value={String(user.id)}>{user.name} {user.major} {user.year_id}</option>
									{/each}
								</select>
								{#if i > 0}
									<button class="iconbtn" type="button" on:click={() => removeMenteeRow(i)}
										><img src={minusicon} alt="-" /></button
									>
								{/if}
							</div>
						{/each}
						<button class="iconbtn" type="button" on:click={addMenteeRow}
							><img src={plusicon} alt="+" /></button
						>
					</div>
				{:else}
					<div>{mentee_info && mentee_info.length ? mentee_info.join(', ') : ''}</div>
				{/if}
			</div>
			<div class="col_stack">
				{#if !isMenteeEditing}
					<button class="button" on:click={toggleMenteeEdit}>
						<div class="button_label">수정</div>
					</button>
				{:else}
					<button class="button" on:click={confirmMenteeEdit}>
						<div class="button_label">확인</div>
					</button>
				{/if}
			</div>
		</div>
	</div>
	<div class="col_stack">
		<button class="button" on:click={resetUnit}>
			<div class="button_label">초기화</div>
		</button>
	</div>
</div>

<style>
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
	.iconbtn {
		width: 28px;
		height: 28px;
		border: none;
		background: var(--secondary-secondary-50);
		cursor: pointer;
	}
	.iconbtn img {
		width: 14px;
		height: 14px;
	}
</style>
