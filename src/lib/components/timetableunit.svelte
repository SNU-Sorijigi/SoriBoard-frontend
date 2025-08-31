<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import editIcon from '$lib/images/edit.svg';
	import checkIcon from '$lib/images/check.svg';
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
				const data = await response.json();
				day = data.day;
				time = data.time;
				timetable_id = data.timetable;
				jigi_ids = (data.users || []).map(String);
				mentee_ids = (data.mentees || []).map(String);
				jigi_info = data.jigi_info || [];
				mentee_info = data.mentee_info || [];
			} catch (error) {
				console.error('Failed to fetch timetableunit data');
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

	function confirmJigiEdit() {
		updateData(id);
		toggleJigiEdit();
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

	function confirmMenteeEdit() {
		updateData(id);
		toggleMenteeEdit();
	}

	function resetUnit() {
		jigi_ids = [];
		mentee_ids = [];
	}

	async function updateData(id) {
		const formData = {
			day: day,
			time: time,
			timetable: timetable_id,
			users: jigi_ids.map(Number),
			mentees: mentee_ids.map(Number)
		};
		const response = await fetch(`/api/timetableunit/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		if (!response.ok) {
			console.error('Failed to update timetableunit');
		}
		fetchUnitData(id);
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
								<select bind:value={jigi_ids[i]}>
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
								<select bind:value={mentee_ids[i]}>
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
