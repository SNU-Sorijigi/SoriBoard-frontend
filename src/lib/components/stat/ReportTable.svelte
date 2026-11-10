<script>
	// 학기 결산의 표(statTable.js 의 표). 카드 높이에 갇히지 않고 내용만큼 늘어나서 인쇄에도 다 나온다.
	/** @type {import('$lib/statTable.js').Table} */
	export let table;
	export let labelledby = ''; // 표 이름을 가진 요소(카드 제목)의 id
	export let describedby = ''; // 표 설명을 가진 요소(카드 부제)의 id
	// 주면 행의 이름 칸이 그 주소로 가는 링크가 된다(행마다, 없는 행은 글자 그대로).
	/** @type {(string | null)[]} */
	export let links = [];
	// 주면 그 링크들의 툴팁(통계의 DataTable 과 같다). 비우면 툴팁이 없다.
	export let linkTitle = '';
	// 주면 이름이 아닌 칸도 링크가 된다: 열의 위치 → { hrefs: 행마다 주소(없는 행은 글자 그대로), title }.
	/** @type {Record<number, { hrefs: (string | null)[], title: string }>} */
	export let cellLinks = {};
</script>

<table aria-labelledby={labelledby || undefined} aria-describedby={describedby || undefined}>
	<thead>
		<tr>
			{#each table.columns as column}
				<th scope="col" class:numeric={column.numeric}>{column.name}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each table.rows as row, r}
			<tr>
				{#each row as cell, i}
					{#if i === table.rowHeader}
						<th scope="row" class:numeric={table.columns[i].numeric}>
							{#if links[r]}<a href={links[r]} title={linkTitle || undefined}>{cell}</a
								>{:else}{cell}{/if}
						</th>
					{:else}
						<td class:numeric={table.columns[i].numeric}>
							{#if cellLinks[i]?.hrefs[r]}<a href={cellLinks[i].hrefs[r]} title={cellLinks[i].title}
									>{cell}</a
								>{:else}{cell}{/if}
						</td>
					{/if}
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	/* 통계 카드의 표(DataTable)와 같은 글꼴·색·선 */
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
		background: var(--secondary-secondary-100, #fef9f3);
		color: var(--gray-gray-600, #7c7c7c);
		font-weight: 500;
	}
	tbody tr:last-child > * {
		border-bottom: none;
	}
	tr {
		break-inside: avoid;
	}
	a {
		color: inherit;
		text-decoration-color: var(--gray-gray-500, #656667);
		text-underline-offset: 3px;
	}
	/* 수치 칸은 내용만큼, 남는 폭은 이름 칸에 */
	.numeric {
		width: 1%;
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
