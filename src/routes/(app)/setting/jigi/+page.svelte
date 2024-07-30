<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import Input from '$lib/components/input.svelte';
	import UserInfo from '$lib/components/userinfo.svelte';
	import checkIcon from '$lib/images/check.svg';

	const users = writable([]);

	async function fetchUsers() {
		try {
			const response = await fetch('/api/user/');
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
	let new_sabu_id = '';
	let new_major = '';
	let new_year_id = '';
	let new_is_ob = false;

	function toggleCheck() {
		new_is_ob = !new_is_ob;
	}

	async function createNewUser(event) {
		event.preventDefault();
		const newUser = {
			name: new_name,
			major: new_major,
			year_id: new_year_id,
			is_ob: new_is_ob,
			sabu_id: new_sabu_id || null,
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
		new_year_id = '';
		new_sabu_id = '';
		new_is_ob = false;
		location.reload();
	}

	async function deleteUser(id) {
		const isConfirmed = confirm('삭제하시겠습니까?');
		if (isConfirmed) {
			const response = await fetch(`/api/user/${id}`, {
				method: 'DELETE'
			});
			fetchUsers();
		}
	}

	/* let edit = false;
	let edit_id = '';
	let edit_name = '';
	let edit_major = '';
	let edit_year_id = '';
	let edit_is_ob = false;
	async function editUser(event) {
		event.preventDefault();
		const editedUser = {
			name: edit_name,
			major: edit_major,
			year_id: edit_year_id,
			is_ob: edit_is_ob,
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
		edit_year_id = '';
		edit_is_ob = false;
		location.reload();
	}

	async function openUserEditForm(user) {
		edit = false;
		edit = true;
		edit_id = user.id;
		edit_name = user.name;
		edit_major = user.major;
		edit_year_id = user.year_id;
		edit_is_ob = user.is_ob;
	} */

</script>

<svelte:head>
	<title>지기 관리</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<div class="setting-jigi-screen">
	<div class="header">
		<!-- <div class="buttons">
			<button class="time_edit button" on:click={edit_toggle}> 타임 정보 수정 </button>
			<button class="time_edit button" on:click={display_toggle}> 판서 화면 수정 </button>
		</div>
		<div class="timeinfo">{timeDate}<br />{timeUser}</div>
		<div class="buttons">
			<button class="insta button" on:click={toggle}>
				<img src={instalogo} alt="insta" />
				업로드
			</button>
			{#if time}
				<BreakButton {time} />
			{/if}
		</div> -->
		<div class="settinginfo">지기 설정</div>
	</div>
	<div class="content">
		<div class="userlist hide-scrollbar">
			{#each $users as user}
				<UserInfo
					id={user.id}
					name={user.name}
					major={user.major}
					year_id={user.year_id}
					is_ob={user.is_ob}
					sabu_id={user.sabu_id}
					sabu_info={user.sabu_info}
					deleteUser={deleteUser}
					refetchUsers={fetchUsers}
				></UserInfo>
			{/each}
		</div>
		<form on:submit={createNewUser} method="POST" class="inputfield">
			<div class="stack">
				<div class="box">
					<div class="label">OB 여부</div>
					<button type="button" class="checkbox" on:click={toggleCheck} class:checked={new_is_ob}>
						{#if new_is_ob}
							<img src={checkIcon} alt="check" class="check" />
						{/if}
					</button>
				</div>
			</div>
			<Input label="이름" bind:value={new_name}></Input>
			<Input label="전공" bind:value={new_major}></Input>
			<Input label="학번" bind:value={new_year_id}></Input>
			<label for="sabu-select">사부</label>
			<select id="sabu-select" bind:value={new_sabu_id}>
				<option value="">사부 없음</option>
				{#each $users as user}
					<option value={user.id}>{user.name} {user.major} {user.year_id}</option>
				{/each}
			</select>
			<!--
			{#each $players as player, i}
				<div class="player_stack">
					<Input
						label={'연주자 ' + (i + 1)}
						bind:value={$players[i]}
						width={i != 0 ? '265px' : '300px'}
					></Input>
					{#if i > 0}
						<button type="button" class="minus" on:click={() => deletePlayer(i)}>
							<img src={minusicon} alt="minus" />
						</button>
					{/if}
				</div>
			{/each}
			<button type="button" class="plus" on:click={addPlayer}>
				<img src={plusicon} alt="plus" />
			</button>
			-->
			<input id="submit1" type="submit" value="지기 추가하기" class="submit" />
		</form>
	</div>
</div>


<style>
	input {
		background-color: var(--secondary-secondary-200);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
	}
	label {
		font-family: var(--large-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--large-font-size, 16px);
		font-weight: var(--large-font-weight, 500);
	}
	.settinginfo {
		margin-left: 120px;
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		position: relative;
	}
	.stack {
		display: flex;
		flex-direction: row;
		gap: 20px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.form {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}
	.box {
		margin-top: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.label {
		color: var(--primary-primary-700, #b7946c);
		text-align: center;
		font-family: var(--small-medium-font-family, 'NotoSansKr-Regular', sans-serif);
		font-size: var(--small-medium-font-size, 10px);
		font-weight: var(--small-medium-font-weight, 400);
		position: relative;
	}
	.checkbox {
		padding: 0;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 2px solid var(--primary-primary-700);
		cursor: pointer;
		background-color: var(--primary-primary-100);
	}
	.checked {
		background-color: var(--primary-primary-700);
	}
	.delete {
		text-align: center;
		color: var(--gray-gray-50);
		font-family: var(--small-medium-font-family,);
		font-size: var(--small-medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		position: relative;
		border-radius: 3px;
		padding: 4px 7px 4px 7px;
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 60px;
		height: 40px;
		position: absolute;
		box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		border: none;
		background: var(--red-red-700);
		margin-left: 10px;
	}
	.check {
		width: 22px;
		height: 22px;
	}
	.setting-jigi-screen {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		position: relative;
		overflow: hidden;
	}
	.header {
		padding: 16px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		flex-direction: row;
		background-color: var(--secondary-secondary-100);
		border-style: solid;
		border-color: var(--gray-gray-400, #bcbcbc);
		border-width: 1px;
		box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.25);
	}
	.userinfo {
		margin-left: 120px;
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		position: relative;
	}
	.buttons {
		gap: 40px;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.button {
		color: var(--gray-gray-50, #fcfcfc);
		text-align: center;
		font-family: var(--small-medium-font-family,);
		font-size: var(--small-medium-font-size, 13px);
		font-weight: var(--small-medium-font-weight, 500);
		position: relative;
		border-radius: 3px;
		padding: 4px 7px 4px 7px;
		display: flex;
		flex-direction: row;
		gap: 4px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 100px;
		height: 45px;
		position: relative;
		box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		border: none;
	}
	.content {
		display: flex;
		flex-direction: row;
		gap: 30px;
		width: 100%;
		align-items: flex-start;
		justify-content: space-around;
		position: relative;
		overflow: hidden;
		padding: 40px;
	}
	@media only screen and (max-width: 1200px) {
		.content {
			display: flex;
			flex-direction: column;
			gap: 30px;
			width: 100%;
			align-items: center;
			justify-content: space-around;
			position: relative;
			overflow: hidden;
			padding: 40px;
		}
	}
	.userlist {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
	}
	.inputfield {
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}
	.submit {
		background-color: var(--secondary-secondary-50);
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family,);
		font-size: var(--medium-font-size, 13px);
		font-weight: var(--medium-font-weight, 500);
		border: 1px solid var(--primary-primary-700);
		border-radius: 6px;
		border-width: 2px;
		padding: 6px 20px 6px 20px;
		cursor: pointer;
	}
	.xbutton {
		position: absolute;
		right: 0;
		top: 0;
		display: inline-block;
		text-decoration: none;
		text-align: center;
		cursor: pointer;
		padding: 8px 16px;
		font-weight: bold;
		font-size: 1.4em;
		border-radius: 10%;
	}
	.xbutton:hover {
		color: #fff !important;
		background-color: #f44336 !important;
	}
	.modal {
		z-index: 3;
		display: block;
		padding-top: 10vh;
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		margin-left: 58px;
	}
	.edit_modal {
		backdrop-filter: blur(15px);
	}
	.modal-content {
		margin: auto;
		background-color: var(--primary-primary-100);
		position: relative;
		padding-top: 30px;
		padding-bottom: 50px;
		outline: 0;
		width: 44vw;
		border-radius: 2%;
		border-color: var(--gray-gray-400);
		border-style: solid;
	}
	.modal-content2 {
		margin: auto;
		background-color: var(--primary-primary-100);
		position: relative;
		padding-top: 30px;
		padding-bottom: 50px;
		outline: 0;
		width: 60vw;
		border-radius: 2%;
		border-color: var(--gray-gray-400);
		border-style: solid;
	}
	.hide-scrollbar {
		-ms-overflow-style: none; /* Internet Explorer 10+ */
		scrollbar-width: none; /* Firefox */
	}

	.hide-scrollbar::-webkit-scrollbar {
		display: none; /* Safari and Chrome */
	}
</style>
