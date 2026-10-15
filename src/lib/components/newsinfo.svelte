<script>
	import editIcon from '$lib/images/edit.svg';
	import checkDarkIcon from '$lib/images/check-dark.svg';

	export let id = '';
	export let content = '';

	let isEditing = false;
	function toggleEdit() {
		isEditing = !isEditing;
	}
	async function confirmEdit() {
		if (await updateData(id)) {
			isEditing = false;
		}
	}

	async function updateData(id) {
		const formData = {
			content: content
		};
		let saved = false;
		try {
			const response = await fetch(`/api/information/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});
			saved = response.ok;
		} catch (error) {
			console.error('Failed to update data', error);
		}
		// After a failure the row stays in edit mode with the typed text
		if (!saved) {
			console.error('Failed to update data');
			alert('뉴스 수정에 실패했습니다.');
		}
		return saved;
	}
</script>

<div class="newsinfo">
	<input bind:value={content} readonly={!isEditing} class="content" aria-label="뉴스" />
	<div class="col_stack">
		<div class="row_stack">
			<!-- One button for 수정 and 확인: swapping two buttons dropped the keyboard focus -->
			<button class="edit_button" on:click={isEditing ? confirmEdit : toggleEdit}>
				<img src={isEditing ? checkDarkIcon : editIcon} alt="" class="icon" />
				<div class="button_label">{isEditing ? '확인' : '수정'}</div>
			</button>
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
	.edit_button {
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
</style>

