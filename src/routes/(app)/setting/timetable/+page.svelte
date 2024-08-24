<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	const users = writable([]);

	async function fetchUsers() {
		try {
			const response = await fetch('/api/user');
			const data = await response.json();
			users.set(data);
		} catch (error) {
			console.error('Failed to fetch users');
		}
	}

	onMount(() => {
			fetchUsers();
	});

	let new_name = '';
	let new_major = '';
	let new_yearId = '';
	let new_isOb = false;
	async function createNewUser(event) {
		event.preventDefault();
		const newUser = {
			name: new_name,
			major: new_major,
			yearId: new_yearId,
			isOb: new_isOb,
		};
		const response = await fetch('/api/user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(newUser),
		});
		new_name = '';
		new_major = '';
		new_yearId = '';
		new_isOb = false;
		location.reload();
	}

	let edit = false;
	let edit_id = '';
	let edit_name = '';
	let edit_major = '';
	let edit_yearId = '';
	let edit_isOb = false;
	async function editUser(event) {
		event.preventDefault();
		const editedUser = {
			name: edit_name,
			major: edit_major,
			yearId: edit_yearId,
			isOb: edit_isOb,
		};
		const response = await fetch(`/api/user/${edit_id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(editedUser),
		});

		if (response.ok) {
		} else {
			console.error('Failed to edit user');
		}
		edit = false;
		edit_id = '';
		edit_name = '';
		edit_major = '';
		edit_yearId = '';
		edit_isOb = false;
		location.reload();
	}
	async function openUserEditForm(user) {
		edit = false;
		edit = true;
		edit_id = user.id;
		edit_name = user.name;
		edit_major = user.major;
		edit_yearId = user.year_id;
		edit_isOb = user.is_ob;
	}
</script>

<main>
  <h1>공사 중...</h1>
</main>

<style>
	.text {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--xlarge-font-family);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
	}
</style>
