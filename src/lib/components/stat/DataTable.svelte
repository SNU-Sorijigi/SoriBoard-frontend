<script context="module">
	let nextId = 0;
</script>

<script>
	import { createEventDispatcher } from 'svelte';
	import { tableRegionLabel } from '$lib/statTable.js';

	// 차트 카드의 '표로 보기': 차트와 같은 제목·부제와 수치를 표로 보인다(statTable.js 의 표).
	/** @type {import('$lib/statTable.js').Table} */
	export let table;
	export let title = '';
	export let subtitle = '';
	// 주면 행의 이름 칸이 단추가 되고, 누르면 그 행의 위치로 rowselect 를 알린다(drill-down).
	export let rowLabel = '';
	// 주면 행의 이름 칸이 그 주소로 가는 링크가 된다(행마다, 없는 행은 글자 그대로).
	/** @type {(string | null)[]} */
	export let links = [];
	// 주면 그 링크의 title(툴팁)이 된다.
	export let linkTitle = '';
	// 주면 이름이 아닌 칸도 링크가 된다: 열의 위치 → { hrefs: 행마다 주소(없는 행은 글자 그대로), title }.
	// reload 면 페이지를 새로 불러온다(같은 페이지의 다른 보기, 통계는 URL을 처음에만 읽는다).
	/** @type {Record<number, { hrefs: (string | null)[], title: string, reload?: boolean }>} */
	export let cellLinks = {};
	// 이름 단추(rowLabel)가 있는 표에서 고른 행(열린 drill-down 패널의 대상): 배경·굵은 이름, aria-current.
	export let selectedRow = -1;
	// 짧은 표는 행만큼만 높아지고, 340px 를 넘으면 지금처럼 스크롤한다(처음 튼 작곡가·곡의 TableCard).
	export let fit = false;

	const dispatch = createEventDispatcher();

	const titleId = `stat-table-${++nextId}`;
	// 부제(기간·지기·총 몇 곡)는 표의 설명으로 읽힌다(차트의 이름이 부제까지 읽는 것처럼).
	const subtitleId = titleId + '-sub';
</script>

<div class="table-view" class:fit>
	<div class="table-title" id={titleId}>{title}</div>
	{#if subtitle}
		<div class="table-subtitle" id={subtitleId}>{subtitle}</div>
	{/if}
	<!-- 카드 높이 안에서 스크롤하므로 키보드로도 스크롤하게 포커스를 주고, 감싼 카드와 구별되게 '<제목> 표'라 부른다. -->
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div class="table-scroll" role="region" aria-label={tableRegionLabel(title)} tabindex="0">
		<table aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined}>
			<thead>
				<tr>
					{#each table.columns as column}
						<th scope="col" class:numeric={column.numeric}>{column.name}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each table.rows as row, r}
					<tr class:selected={rowLabel && r === selectedRow}>
						{#each row as cell, i}
							{#if i === table.rowHeader && rowLabel}
								<th scope="row" class:numeric={table.columns[i].numeric}>
									<button
										class="row-btn"
										aria-label={`${cell} ${rowLabel}`}
										aria-current={r === selectedRow ? 'true' : undefined}
										title={rowLabel}
										on:click={() => dispatch('rowselect', r)}>{cell}</button
									>
								</th>
							{:else if i === table.rowHeader && links[r]}
								<th scope="row" class:numeric={table.columns[i].numeric}>
									<a class="row-link" href={links[r]} title={linkTitle || undefined}>{cell}</a>
								</th>
							{:else if i === table.rowHeader}
								<th scope="row" class:numeric={table.columns[i].numeric}>{cell}</th>
							{:else if cellLinks[i]?.hrefs[r]}
								<td class:numeric={table.columns[i].numeric}>
									<a
										class="row-link"
										href={cellLinks[i].hrefs[r]}
										title={cellLinks[i].title}
										data-sveltekit-reload={cellLinks[i].reload || undefined}>{cell}</a
									>
								</td>
							{:else}
								<td class:numeric={table.columns[i].numeric}>{cell}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.table-view {
		display: flex;
		flex-direction: column;
		height: 340px;
	}
	.table-view.fit {
		height: auto;
		max-height: 340px;
	}
	.table-view.fit .table-scroll {
		flex: 0 1 auto;
	}
	/* 종이에는 모든 행을 싣는다: 페이지의 인쇄 규칙이 height 를 풀듯 max-height 도 푼다 */
	@media print {
		.table-view.fit {
			max-height: none;
		}
	}
	/* 차트 제목·부제(chartOptions.js 의 titleBlock)와 같은 글꼴·색 */
	.table-title {
		margin-top: 2px;
		text-align: center;
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: 18px;
		font-weight: 700;
		color: var(--gray-gray-950, #1a1a1a);
	}
	.table-subtitle {
		margin-top: 4px;
		text-align: center;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: 12px;
		color: var(--gray-gray-600, #7c7c7c);
	}
	.table-scroll {
		flex: 1;
		min-height: 0;
		overflow: auto;
		margin-top: 12px;
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 4px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-950, #1a1a1a);
	}
	th,
	td {
		padding: 5px 10px;
		text-align: left;
		border-bottom: 1px solid var(--gray-gray-300, #d4d4d4);
	}
	tbody th {
		font-weight: 400;
	}
	thead th {
		position: sticky;
		top: 0;
		background: var(--secondary-secondary-100, #fef9f3);
		color: var(--gray-gray-600, #7c7c7c);
		font-weight: 500;
	}
	tbody tr:last-child > * {
		border-bottom: none;
	}
	/* 이름 단추는 글자처럼 보이고, 누를 수 있다는 것은 밑줄로 알린다 */
	.row-btn {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: var(--gray-gray-500, #656667);
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.row-btn:hover {
		text-decoration-thickness: 2px;
	}
	/* 고른 행은 눌린 단추(ChartCard 의 표로 보기)와 같은 배경에 굵은 이름 */
	tr.selected {
		background: var(--action-bg);
	}
	tr.selected .row-btn {
		font-weight: 700;
	}
	/* 다른 페이지로 가는 이름(선곡 기록 등)은 PlayTable 의 링크와 같게 */
	.row-link {
		color: inherit;
		text-decoration-color: var(--gray-gray-500, #656667);
		text-underline-offset: 3px;
	}
	.row-link:hover {
		text-decoration-thickness: 2px;
	}
	/* 수치 칸은 내용만큼, 남는 폭은 이름 칸에 */
	.numeric {
		width: 1%;
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
