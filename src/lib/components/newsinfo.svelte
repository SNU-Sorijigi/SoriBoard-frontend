<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import editIcon from '$lib/images/edit.svg';
	import checkIcon from '$lib/images/check.svg';

	export let id = '';
	export let content = '';

	export let refetchNews;

	const news = writable([]);
	async function fetchNews() {
		try {
			const response = await fetch('/api/information');
			const data = await response.json();
			news.set(data);
		} catch (error) {
			console.error('Failed to fetch news');
		}
	}

	onMount(() => {
		fetchNews();
	});

	let isEditing = false;
	function toggleEdit() {
		fetchNews();
		isEditing = !isEditing;
	}
	function confirmEdit() {
		isEditing = false;
		updateData(id);
	}

	async function updateData(id) {
		const formData = {
			content: content
		};
		const response = await fetch(`/api/information/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(formData)
		});
		if (!response.ok) {
			console.error('Failed to update data');
		}
		fetchNews();
	}
	const dispatch = createEventDispatcher();
</script>

<div class="newsinfo">
	<input bind:value={content} readonly={!isEditing} class="content" />
	<div class="col_stack">
		<div class="row_stack">
			{#if !isEditing}
				<button class="edit_button" on:click={toggleEdit}>
					<img src={editIcon} alt="edit" class="icon" />
					<div class="button_label">수정</div>
				</button>
			{:else}
				<button class="edit_button" on:click={confirmEdit}>
					<img src={checkIcon} alt="edit" class="icon icon-black" />
					<div class="button_label">확인</div>
				</button>
			{/if}
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
	.newsinfo {
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
	.content {
		flex: 1;
		min_width: 0;
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

