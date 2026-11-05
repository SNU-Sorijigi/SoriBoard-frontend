<script>
	import { tick } from 'svelte';
	import EChart from './EChart.svelte';
	import DataTable from './DataTable.svelte';
	import { seriesTable, chartLabel, placeholderText } from '$lib/statTable.js';
	import { downloadCsv, downloadDataUrl, todayStamp } from '$lib/csv.js';
	import { downloadCsvTable } from '$lib/csvTable.js';
	import { downloadName } from '$lib/statFileName.js';

	export let title = '';
	export let option = null; // ECharts option (제목/부제 포함)
	export let data = null; // { labels, values } — CSV 내보내기용
	export let csvHeaders = ['항목', '횟수'];
	export let csv = null; // { headers, rows }: 여러 열 CSV(csvTable.js). 없으면 data 와 csvHeaders 로 만든다.
	export let loading = false;
	export let note = ''; // 데이터 경고 등
	export let noteLink = null; // { href, text }: 경고 뒤에 붙는 링크(예: 작곡가 정리)
	export let chartNote = ''; // 차트에만 붙는 말: 차트가 화면에 있는 동안만 보인다(예: 잘린 동점, chartTieNote).
	export let error = ''; // 불러오기 실패 문구
	export let emptyText = ''; // 빈 카드에 '데이터가 없습니다' 대신 보일 까닭(예: PERFORMER_EMPTY, statTable.js)
	export let table = null; // '표로 보기'의 표(statTable.js). 없으면 data 와 csvHeaders 로 만든다.
	export let rowLabel = ''; // 주면 표의 이름 칸이 단추가 된다(예: '곡 보기', DataTable 의 rowselect).
	/** @type {(string | null)[]} */
	export let links = []; // 주면 표의 이름 칸이 그 주소로 가는 링크가 된다(행마다, DataTable 의 links).
	/** @type {string | string[]} */
	export let fileTag = ''; // 내려받는 파일 이름에서 제목 뒤에 붙는 보기(기간, 지기 등, statFileName.js)
	/** @type {(() => void) | null} */
	export let retry = null; // 주면 실패한 카드에 '다시 시도' 단추가 보인다.
	export let markedBar = -1; // 주면 차트의 그 막대(dataIndex)를 칠한다(열린 drill-down 패널의 대상, 화면에만).
	export let markedRow = -1; // 주면 표로 보기의 그 행을 고른 행으로 보인다(DataTable 의 selectedRow).

	let chartRef;
	// 표로 보기: 캔버스는 키보드·화면 낭독기로 읽을 수 없으므로 같은 수치를 표로 보인다.
	// 다시 불러와도 그대로 두고, 차트는 숨긴 채 남겨 PNG 저장이 계속 된다.
	// 페이지가 정할 수 있다(통계의 '모든 차트 표로 보기'). 이 카드의 단추는 페이지 값이 바뀔 때까지 이 카드만 바꾼다.
	export let showTable = false;
	let viewToggle;

	let cardEl;

	// 페이지가 이 카드의 표를 연다(통계의 KPI 숫자): 표를 켜고, 카드로 스크롤해 표(없으면 표로 보기 단추)에 포커스를 둔다.
	export async function openTable() {
		showTable = true;
		await tick();
		cardEl.scrollIntoView({ block: 'start' });
		(cardEl.querySelector('.table-scroll') ?? viewToggle).focus({ preventScroll: true });
	}

	// 누르면 단추가 사라지므로, 포커스가 본문으로 떨어지지 않도록 먼저 이 카드의 '표로 보기'로 옮긴다.
	function onRetry() {
		viewToggle?.focus();
		retry();
	}

	$: hasData = data && data.labels && data.labels.length > 0;
	// 불러오는 동안 data 는 아직 이전 필터의 것이고 차트는 내려가 있으므로 저장을 막는다.
	$: canExport = hasData && !loading;
	$: shownTable =
		table ??
		(hasData
			? seriesTable(data.labels, csvHeaders[0], [{ name: csvHeaders[1], values: data.values }])
			: null);

	function exportPng() {
		const url = chartRef && chartRef.getPng();
		if (url) downloadDataUrl(downloadName(['통계', title, fileTag, todayStamp()], 'png'), url);
	}

	function exportCsv() {
		if (!hasData) return;
		const filename = downloadName(['통계', title, fileTag, todayStamp()], 'csv');
		if (csv) downloadCsvTable(filename, csv.headers, csv.rows);
		else downloadCsv(filename, data.labels, data.values, csvHeaders);
	}
</script>

<div class="card" bind:this={cardEl}>
	<button
		bind:this={viewToggle}
		class="tool-btn view-toggle"
		class:active={showTable}
		aria-pressed={showTable}
		on:click={() => (showTable = !showTable)}
		title="차트의 수치를 표로 보기"
		aria-label={`${title} 표로 보기`}
	>
		표로 보기
	</button>
	<div class="toolbar">
		<button
			class="tool-btn"
			on:click={exportPng}
			disabled={!canExport}
			title="이미지(PNG)로 저장"
			aria-label={`${title} PNG 저장`}
		>
			PNG 저장
		</button>
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

	<div class="chart-area">
		{#if loading || error || !hasData}
			<!-- 제목은 차트가 그리므로, 실패하거나 비었으면 어느 카드인지 여기서 밝힌다. -->
			<div class="placeholder" class:error={!loading && error}>
				{placeholderText(title, { loading, error, empty: emptyText || undefined })}
				{#if !loading && error && retry}
					<button class="tool-btn" on:click={onRetry} aria-label={`${title} 다시 시도`}>
						다시 시도
					</button>
				{/if}
			</div>
		{:else}
			<div class="chart-view" class:hidden={showTable && shownTable}>
				<EChart
					bind:this={chartRef}
					{option}
					marked={markedBar}
					label={chartLabel(title, option?.title?.subtext ?? '')}
					on:itemclick
				/>
			</div>
			{#if showTable && shownTable}
				<DataTable
					table={shownTable}
					{title}
					subtitle={option?.title?.subtext ?? ''}
					{rowLabel}
					{links}
					selectedRow={markedRow}
					on:rowselect
				/>
			{/if}
		{/if}
	</div>

	{#if chartNote && hasData && !loading && !error && !(showTable && shownTable)}
		<div class="note">{chartNote}</div>
	{/if}
	{#if note}
		<div class="note">
			{note}{#if noteLink}&nbsp;· <a href={noteLink.href}>{noteLink.text}</a>{/if}
		</div>
	{/if}
</div>

<style>
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
		display: flex;
		flex-direction: column;
		position: relative;
		container-type: inline-size;
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
	/* 가운데 차트 제목과 겹치지 않도록 오른쪽 저장 버튼들과 떨어진 왼쪽 위에 둔다. */
	.view-toggle {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 2;
	}
	/* 눌린 상태는 포인터가 올라가 있어도 유지한다(hover 규칙보다 우선). */
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
	.chart-area {
		flex: 1;
		min-height: 340px;
	}
	/* 좁은 카드에서는 가운데 제목이 위 단추(표로 보기 · PNG · CSV 저장)에 가리므로 차트·표를 단추 줄 아래로 내린다.
	   폭: 2 × (저장 단추 149 + 간격 8) + 가장 긴 제목('많이 튼 오케스트라' 135) ≈ 449px, 다른 글꼴 여유로 500px.
	   높이: 단추 줄 24px + 4px 에서 표 제목의 위 여백 2px 를 뺀 26px. */
	@container (width < 500px) {
		.chart-area {
			padding-top: 26px;
		}
	}
	/* 차트 크기 계산(height: 100%)이 그대로 이어지도록 상자를 만들지 않는다. */
	.chart-view {
		display: contents;
	}
	.chart-view.hidden {
		display: none;
	}
	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		height: 340px;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.placeholder.error {
		color: var(--secondary-secondary-800, #95560d);
	}
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
</style>
