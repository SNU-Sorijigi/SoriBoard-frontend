<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import editIcon from '$lib/images/edit.svg';
	import checkIcon from '$lib/images/check.svg';

	export let id;

	const users = writable([]);

	let day = '';
	let time = '';
	let timetable_id = '';
	let jigi_id = '';
	let mentee_id = '';

	let jigi_info = '';
	let mentee_info = '';

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
		if (id == "") {
			day = '';
			time = '';
			timetable_id = '';
			jigi_id = '';
			mentee_id = '';
			jigi_info = '';
			mentee_info = '';
		} else {
			try {
				const response = await fetch(`/api/timetableunit/${id}`);
				const data = await response.json();
				day = data.day;
				time = data.time;
				timetable_id = data.timetable;
				jigi_id = data.user;
				mentee_id = data.mentee;
				jigi_info = data.jigi_info;
				mentee_info = data.mentee_info;
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

	function confirmJigiEdit() {
		updateData(id);
		toggleJigiEdit();
	}

	function toggleMenteeEdit() {
		fetchUsers();
		isMenteeEditing = !isMenteeEditing;
	}

	function confirmMenteeEdit() {
		updateData(id);
		toggleMenteeEdit();
	}

	function resetUnit() {
		jigi_id = "";
		mentee_id = "";
	}

	async function updateData(id) {
		const formData = {
			day: day,
			time: time,
			timetable: timetable_id,
			user: jigi_id,
			mentee: mentee_id
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
				<label>지기</label>
			</div>
			<div class="col_stack">
				{#if isJigiEditing}
					<select bind:value={jigi_id}>
						<option value="">해당 없음</option>
						{#each $users as user}
							<option value={user.id}>{user.name} {user.major} {user.year_id}</option>
						{/each}
					</select>
				{:else}
					<div>{jigi_info}</div>
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
				<label>견습</label>
			</div>
			<div class="col_stack">
				{#if isMenteeEditing}
					<select bind:value={mentee_id}>
						<option value="">해당 없음</option>
						{#each $users as user}
							<option value={user.id}>{user.name} {user.major} {user.year_id}</option>
						{/each}
					</select>
				{:else}
					<div>{mentee_info}</div>
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
</style>
