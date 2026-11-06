<script>
	import DataTable from './DataTable.svelte';
	import { placeholderText } from '$lib/statTable.js';
	import { todayStamp } from '$lib/csv.js';
	import { downloadCsvTable, tableCsv } from '$lib/csvTable.js';
	import { downloadName } from '$lib/statFileName.js';

	// 차트 없이 표만 있는 통계 카드(처음 튼 작곡가·곡). 모양·문구·단추는 ChartCard 와 같다.
	export let title = '';
	export let subtitle = ''; // 표의 부제이자 설명(DataTable)
	/** @type {import('$lib/statTable.js').Table | null} */
	export let table = null; // 행이 없으면 null(빈 카드)
	/** @type {(string | null)[]} */
	export let links = []; // 행마다 이름 칸의 링크(DataTable 의 links)
	/** @type {Record<number, { hrefs: (string | null)[], title: string }>} */
	export let cellLinks = {}; // 이름이 아닌 칸의 링크: 열 → 행마다 주소와 title(DataTable 의 cellLinks)
	export let loading = false;
	export let error = ''; // 불러오기 실패 문구
	/** @type {(() => void) | null} */
	export let retry = null; // 주면 실패한 카드에 '다시 시도' 단추가 보인다.
	/** @type {string | string[]} */
	export let fileTag = ''; // 내려받는 파일 이름에서 제목 뒤에 붙는 보기(statFileName.js)
	export let emptyText = ''; // 주면 부르지 않은 카드에 이 문구를 보인다(예: 기간의 시작이 없을 때).
	// 주면(예: '많이 튼 순') 표가 보이는 동안 왼쪽 위에 그 순서로 보는 단추가 있다. 비우면 단추가 없다.
	// 눌렸는지는 sorted 로 알리고(bind:sorted), 행을 그 순서로 주는 것은 부르는 쪽이다(table, links).
	export let sortLabel = '';
	export let sorted = false;
	export let headingLevel = 2; // 화면 낭독기만 읽는 카드 제목의 수준(h2, 페이지의 소제목 아래면 3)
	// 표가 보이는 동안 카드 아래에 붙는 한 줄(ChartCard 의 note·noteLink 와 같다). 비우면 없다.
	export let note = '';
	/** @type {{ href: string, text: string } | null} */
	export let noteLink = null; // 줄 뒤에 붙는 링크(예: 표기 정리)

	let card;

	// 누르면 단추가 사라지므로, 포커스가 본문으로 떨어지지 않도록 먼저 카드로 옮긴다.
	function onRetry() {
		card?.focus();
		retry?.();
	}

	$: canExport = Boolean(table) && !loading && !error && !emptyText;
	// 빈 카드는 한 줄뿐이므로 표의 높이를 지키지 않는다(불러오는 중·실패는 표가 올 자리라 그대로).
	$: showSort = Boolean(sortLabel) && canExport;
	$: shownSubtitle = sorted && sortLabel ? `${subtitle} · ${sortLabel}` : subtitle;
	$: compact = !loading && !error && (Boolean(emptyText) || !table);
	// 보이는 표는 행만큼만 높다(DataTable 의 fit). 짧은 목록의 카드가 빈 틀이 되지 않는다.
	$: fit = !compact && !loading && !error && Boolean(table);

	function exportCsv() {
		if (!canExport || !table) return;
		const { headers, rows } = tableCsv(table);
		downloadCsvTable(downloadName(['통계', title, fileTag, todayStamp()], 'csv'), headers, rows);
	}
</script>

<div class="card" bind:this={card} tabindex="-1" role="group" aria-label={title}>
	<!-- 화면 낭독기가 제목으로 카드 사이를 옮겨 다니도록 숨은 제목을 둔다(ChartCard 와 같다). -->
	<svelte:element this={`h${headingLevel}`} class="sr-only">{title}</svelte:element>
	{#if showSort}
		<button
			class="tool-btn view-toggle"
			class:active={sorted}
			aria-pressed={sorted}
			on:click={() => (sorted = !sorted)}
			title={`${sortLabel}으로 보기`}
			aria-label={`${title} ${sortLabel}으로 보기`}
		>
			{sortLabel}
		</button>
	{/if}
	<div class="toolbar">
		<button
			class="tool-btn"
			on:click={exportCsv}
			disabled={!canExport}
			title="데이터(CSV)로 저장"
			aria-label={`${title} CSV 저장`}
		>
			CSV 저장
		</button>
	</div>

	<div class="table-area" class:compact class:fit>
		{#if loading || error || emptyText || !table}
			<!-- 제목은 표가 보이므로, 표가 없으면 어느 카드인지 여기서 밝힌다(ChartCard 와 같다). -->
			<div class="placeholder" class:error={!loading && error} class:compact>
				{!loading && !error && emptyText ? emptyText : placeholderText(title, { loading, error })}
				{#if !loading && error && retry}
					<button class="tool-btn" on:click={onRetry} aria-label={`${title} 다시 시도`}>
						다시 시도
					</button>
				{/if}
			</div>
		{:else}
			<DataTable {table} {title} subtitle={shownSubtitle} {links} {cellLinks} fit />
		{/if}
	</div>

	{#if note && fit}
		<div class="note">
			{note}{#if noteLink}&nbsp;· <a href={noteLink.href}>{noteLink.text}</a>{/if}
		</div>
	{/if}
</div>

<style>
	/* ChartCard 의 카드·단추·자리 문구와 같은 모양 */
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
		display: flex;
		flex-direction: column;
		position: relative;
	}
	.toolbar {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 2;
	}
	.tool-btn {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		background: var(--secondary-secondary-100, #fef9f3);
		border: 1px solid var(--primary-primary-600, #c8ad8f);
		border-radius: 4px;
		padding: 3px 8px;
		cursor: pointer;
	}
	.tool-btn:hover:not(:disabled) {
		background: var(--secondary-secondary-200, #fdf1e4);
	}
	/* ChartCard 의 '표로 보기'와 같은 자리·모양: 왼쪽 위, 눌린 상태는 포인터가 올라가 있어도 유지한다. */
	.view-toggle {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 2;
	}
	.view-toggle.active,
	.view-toggle.active:hover:not(:disabled) {
		background: var(--action-bg);
		color: var(--action-fg);
	}
	.tool-btn:disabled {
		/* exact swatches instead of a 40% opacity blend */
		color: var(--gray-gray-500);
		border-color: var(--gray-gray-400);
		background: var(--secondary-secondary-50);
		cursor: default;
	}
	.table-area {
		flex: 1;
		min-height: 340px;
	}
	.table-area.fit {
		min-height: 0;
	}
	.table-area.compact {
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		height: 340px;
		padding: 0 24px;
		text-align: center;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	/* 학기 결산의 빈 줄과 같은 120px. 옆 카드에 맞춰 늘어나면 그 높이를 채운다. */
	.placeholder.compact {
		height: auto;
		min-height: 120px;
		flex: 1;
	}
	.placeholder.error {
		color: var(--secondary-secondary-800, #95560d);
	}
	/* ChartCard 의 .note 와 같다 */
	.note {
		margin-top: 4px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--secondary-secondary-800, #95560d);
		text-align: center;
	}
	.note a {
		color: inherit;
		text-underline-offset: 3px;
	}
	/* 통계 페이지의 .sr-only 와 같다: 보이지 않고 화면 낭독기만 읽는다. */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
