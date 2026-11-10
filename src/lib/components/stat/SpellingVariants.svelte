<script>
	import { createEventDispatcher, tick } from 'svelte';
	import {
		SPELLING_KINDS,
		duplicatesSearch,
		rowLinks,
		groupHeading,
		spellingSummary,
		filterSpellingGroups,
		otherSpellingHits,
		searchEmptyText,
		spellingCsv,
		spellingFileParts
	} from '$lib/catalogSpelling.js';
	import MarkedText from '$lib/components/stat/MarkedText.svelte';
	import { downloadCsvTable } from '$lib/csvTable.js';
	import { downloadName } from '$lib/statFileName.js';
	import { todayStamp } from '$lib/csv.js';

	// 작곡가 정리의 '표기 정리': 표기만 다른 이름의 묶음(catalog/duplicates/)과 각 표기의 선곡 수.
	// 읽기 전용이다. 종류가 바뀌면 다시 불러오고, 가장 최근 요청의 응답만 반영한다.
	export let kind = 'composer';
	// 페이지가 이미 받은 답(종류 → catalog/duplicates/ 의 답). 있는 종류는 묻지 않고 곧바로 보인다.
	// 새로 받은 답은 'loaded'로 페이지에 알려, 보기나 종류를 바꿔 돌아와도 다시 묻지 않게 한다.
	/** @type {Record<string, any>} */
	export let answers = {};
	// 페이지의 검색어(작곡가 목록과 같은 q). 묶음은 이미 다 받았으므로 여기서 거른다.
	export let q = '';

	const dispatch = createEventDispatcher();

	/** @type {import('$lib/catalogSpelling.js').SpellingGroup[]} */
	let groups = [];
	let loadedKind = '';
	let loading = false;
	let error = '';
	let requestId = 0;

	// 받은 답이 있으면 곧바로 쓴다(requestId 를 올려 아직 오는 다른 종류의 답이 덮지 못하게).
	// '다시 시도'(fresh)는 늘 묻는다.
	/**
	 * @param {string} target
	 * @param {boolean} [fresh]
	 */
	async function load(target, fresh = false) {
		const id = ++requestId;
		error = '';
		const known = fresh ? null : answers[target];
		if (known) {
			groups = known.groups ?? [];
			loadedKind = target;
			loading = false;
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/catalog/duplicates${duplicatesSearch(target)}`);
			if (!res.ok) throw new Error(`catalog/duplicates ${res.status}`);
			const result = await res.json();
			// 늦게 온 답도 그 종류의 답이니 페이지에는 알린다(화면에는 가장 최근 요청의 답만).
			dispatch('loaded', { kind: target, result });
			if (id !== requestId) return;
			groups = result.groups ?? [];
			loadedKind = target;
		} catch (e) {
			if (id !== requestId) return;
			console.error('표기 정리 로딩 실패', e);
			error = '불러오지 못했습니다';
		} finally {
			if (id === requestId) loading = false;
		}
	}

	$: load(kind);

	// '다시 시도'는 누르면 '불러오는 중...'이나 표로 바뀌어 사라지므로, 먼저 카드로 포커스를 옮긴다.
	// 또 실패했는데 포커스가 아직 카드에 있으면 새 '다시 시도'로 되돌린다.
	/** @type {HTMLElement} */
	let card;
	async function retryList(e) {
		const hadFocus = document.activeElement === e.currentTarget;
		if (hadFocus) card?.focus();
		await load(kind, true);
		if (!hadFocus || !error) return;
		await tick();
		if (document.activeElement === card) card.querySelector('.placeholder.error button')?.focus();
	}

	function onKindChange() {
		dispatch('change', kind);
	}

	// 검색란(작곡가 목록의 것과 같다): 검색·Enter 로 찾고, ✕(또는 Escape)로 비우면 곧바로 모든 묶음을 보인다.
	// 찾을 말은 페이지가 URL에 두고 q 로 돌려준다.
	let query = q; // 검색란의 값
	$: query = q;
	function onSearch() {
		query = query.trim();
		dispatch('search', query);
	}
	// Enter 도 search 이벤트를 보내지만(브라우저에 따라 submit 앞이나 뒤에) 그때는 submit 이 검색하므로 넘어간다.
	let enterKey = false;
	const onSearchKeydown = (e) => (enterKey = e.key === 'Enter' && !e.isComposing);
	function onSearchEvent(e) {
		const byEnter = enterKey;
		enterKey = false;
		if (byEnter || e.currentTarget.value !== '' || !q) return;
		query = '';
		onSearch();
	}

	// 표는 불러온 종류의 열로 그린다(새 종류를 불러오는 동안에는 흐리게).
	$: spec = SPELLING_KINDS.find((s) => s.kind === loadedKind);
	$: extra = loadedKind === 'player' ? '악기' : loadedKind === 'music' ? '작곡가' : '';
	$: columns = extra ? 4 : 3;
	// 보이는 묶음: 검색어가 이름(곡이면 작곡가도)에 든 묶음. 검색어가 없으면 모두.
	$: term = q.trim();
	$: shown = filterSpellingGroups(groups, term);

	// 검색어가 보이는 종류에서 아무 묶음도 찾지 못하면 다른 종류에도 묻는다(받지 않은 종류만, 이 방문에서 한 번씩).
	// 받은 답은 'loaded'로 페이지에 맡기고(answers 로 돌아온다), 못 받으면 넘어간다(다시 묻지 않는다).
	/** @type {Set<string>} */
	const askedKinds = new Set();
	/** @param {string} target */
	async function askOther(target) {
		askedKinds.add(target);
		try {
			const res = await fetch(`/api/catalog/duplicates${duplicatesSearch(target)}`);
			if (!res.ok) throw new Error(`catalog/duplicates ${res.status}`);
			dispatch('loaded', { kind: target, result: await res.json() });
		} catch (e) {
			console.error('표기 정리 다른 종류 로딩 실패', e);
		}
	}
	$: if (term && spec && !loading && !error && groups.length > 0 && shown.length === 0) {
		for (const { kind: other } of SPELLING_KINDS) {
			if (other !== loadedKind && !answers[other] && !askedKinds.has(other)) askOther(other);
		}
	}
	// 맞는 묶음이 있는 다른 종류: 빈 줄에 그 수를 적고, 종류마다 'OO에서 보기'로 그 종류를 고른다.
	$: hits = otherSpellingHits(answers, loadedKind, term);
	// 단추는 종류를 바꾸면 사라지므로 먼저 종류 고르기로 포커스를 옮긴다.
	/** @type {HTMLSelectElement} */
	let kindSelect;
	/** @param {string} target */
	function showKind(target) {
		kindSelect?.focus();
		kind = target;
		dispatch('change', target);
	}

	// CSV 저장: 표가 보이는 묶음을 그 순서로, 표의 열로(prop kind 가 아니라 불러온 종류 loadedKind 로). 새 종류를
	// 부르는 동안(표는 이전 종류를 흐리게 보인다), 실패했을 때와 보이는 묶음이 없을 때는 저장하지 않는다.
	$: canExport = Boolean(spec) && !loading && !error && shown.length > 0;
	function exportCsv() {
		if (!canExport) return;
		const csv = spellingCsv(loadedKind, shown);
		const name = downloadName(
			['표기 정리', spellingFileParts(loadedKind, term), todayStamp()],
			'csv'
		);
		downloadCsvTable(name, csv.headers, csv.rows);
	}
</script>

<p class="hint">
	띄어쓰기·점·대소문자·줄표만 다른 이름을 묶었습니다(곡은 같은 작곡가의 같은 작품 번호). 같은
	대상인지는 직접 확인하세요. 여기서는 합치지 않습니다.
</p>

<div class="toolbar">
	<div class="controls">
		<label class="kind">
			종류
			<select bind:value={kind} bind:this={kindSelect} on:change={onKindChange}>
				{#each SPELLING_KINDS as option}
					<option value={option.kind}>{option.label}</option>
				{/each}
			</select>
		</label>
		<form class="search" role="search" on:submit|preventDefault={onSearch}>
			<input
				type="search"
				bind:value={query}
				on:keydown={onSearchKeydown}
				on:search={onSearchEvent}
				placeholder={kind === 'music' ? '곡, 작곡가' : '이름'}
				aria-label="표기 정리 검색"
			/>
			<button type="submit">검색</button>
		</form>
		<button
			class="tool-btn csv-save"
			on:click={exportCsv}
			disabled={!canExport}
			title="보이는 표기 정리 묶음을 CSV로 저장">CSV 저장</button
		>
	</div>
	<p class="result-count" aria-live="polite">
		{#if spec && !loading && !error}{spec.label} · {spellingSummary(shown)}{#if term}&nbsp;· '{term}'
				검색{/if}{:else if error}
			<!-- 실패는 화면 낭독기에만 알린다(보이는 줄은 비운다). -->
			<span class="sr-only"
				>표기 정리를 불러오지 못했습니다. 표기 정리 다시 시도로 다시 부를 수 있습니다.</span
			>{/if}
	</p>
</div>

<section class="card" aria-label="표기 정리" tabindex="-1" bind:this={card}>
	{#if error}
		<div class="placeholder error">
			{error}
			<button class="tool-btn" on:click={retryList} aria-label="표기 정리 다시 시도"
				>다시 시도</button
			>
		</div>
	{:else if !spec}
		<div class="placeholder">불러오는 중...</div>
	{:else if groups.length === 0}
		<div class="placeholder" class:stale={loading}>{spec.empty}</div>
	{:else if shown.length === 0}
		<div class="placeholder" class:stale={loading}>
			{searchEmptyText(loadedKind, term, hits)}
			{#each hits as hit (hit.kind)}
				<button
					class="tool-btn"
					title="종류를 바꿔 같은 검색어로 보기"
					on:click={() => showKind(hit.kind)}>{hit.label}에서 보기</button
				>
			{/each}
		</div>
	{:else}
		<!-- 긴 목록은 이 상자 안에서 스크롤해 머리줄이 남는다(작곡가 목록과 같다). 키보드로도 스크롤하게 포커스를 준다(DataTable 과 같다). -->
		<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
		<div class="list-scroll" role="region" aria-label="표기 정리 표" tabindex="0">
			<table aria-label={`표기 정리: ${spec.label}`} class:stale={loading}>
				<thead>
					<tr>
						<th scope="col">{loadedKind === 'music' ? '곡' : '표기'}</th>
						{#if extra}<th scope="col" class="extra">{extra}</th>{/if}
						<th scope="col" class="num">선곡 수</th>
						<th scope="col" class="id">id</th>
					</tr>
				</thead>
				{#each shown as group}
					{@const heading = groupHeading(group)}
					<tbody>
						<tr class="group">
							<th scope="rowgroup" colspan={columns}>
								<span class="spelling"><MarkedText text={heading.title} q={term} loose /></span>
								<span class="meta">{heading.meta}</span>
							</th>
						</tr>
						{#each group.rows as row (row.id)}
							{@const links = rowLinks(loadedKind, row)}
							<tr>
								<th scope="row">
									{#if links.name}
										<a class="spelling" href={links.name}
											><MarkedText text={row.name} q={term} loose /></a
										>
									{:else}
										<span class="spelling"><MarkedText text={row.name} q={term} loose /></span>
									{/if}
								</th>
								{#if loadedKind === 'player'}
									<td>{row.instrument || '—'}</td>
								{:else if loadedKind === 'music'}
									<td>
										{#if links.composer}
											<a class="spelling" href={links.composer}
												><MarkedText text={row.composer_name} q={term} loose /></a
											>
										{:else if row.composer_name}
											<span class="spelling"
												><MarkedText text={row.composer_name} q={term} loose /></span
											>
										{:else}
											<span class="spelling">—</span>
										{/if}
									</td>
								{/if}
								<td class="num">
									{#if links.count}
										<a
											class="count"
											href={links.count}
											title="선곡 기록에서 보기"
											aria-label={`${row.name} 선곡 ${row.count.toLocaleString()} 곡 선곡 기록에서 보기`}
											>{row.count.toLocaleString()}</a
										>
									{:else}
										{row.count.toLocaleString()}
									{/if}
								</td>
								<td class="id">#{row.id}</td>
							</tr>
						{/each}
					</tbody>
				{/each}
			</table>
		</div>
	{/if}
</section>

<style>
	/* 작곡가 목록과 같은 안내·컨트롤·카드·표 */
	.hint,
	.result-count {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.hint {
		margin: 0 0 16px;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
		margin-bottom: 12px;
	}
	/* 종류와 검색란은 왼쪽에 나란히, 결과 줄은 오른쪽에 */
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
	}
	.result-count {
		min-height: 1.5em;
		margin: 0;
	}
	.kind,
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.search {
		margin: 0;
	}
	input,
	select {
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
		padding: 6px 10px;
		border: 1px solid var(--control-border);
		border-radius: 6px;
		background: var(--secondary-secondary-50, #fffdfc);
		color: var(--gray-gray-950, #1a1a1a);
	}
	input[type='search'] {
		width: 300px;
	}
	.search button,
	.tool-btn {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		background: var(--secondary-secondary-100, #fef9f3);
		border: 1px solid var(--primary-primary-600, #c8ad8f);
		border-radius: 4px;
		padding: 4px 12px;
		cursor: pointer;
	}
	.search button:hover,
	.tool-btn:hover {
		background: var(--secondary-secondary-200, #fdf1e4);
	}
	.tool-btn:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
	}
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		height: 160px;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.placeholder.error {
		color: var(--secondary-secondary-800, #95560d);
	}
	.stale {
		opacity: 0.6;
	}
	/* 레이아웃의 main 은 스크롤하지 않는 스크롤 상자라 sticky 머리줄이 붙지 못하므로, 표에 제 스크롤 상자를 준다 */
	.list-scroll {
		max-height: calc(100vh - 200px);
		overflow: auto;
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
		padding: 6px 10px;
		text-align: left;
		vertical-align: middle;
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
	/* 묶음의 머리줄: 가장 많이 튼 표기와 표기 수·선곡 수 */
	tr.group th {
		padding-top: 14px;
		font-weight: 500;
		border-bottom-color: var(--primary-primary-600, #c8ad8f);
	}
	tbody tr:not(.group) th {
		padding-left: 24px;
	}
	tbody:last-child tr:last-child > * {
		border-bottom: none;
	}
	/* 표기의 차이(겹친 띄어쓰기 등)가 그대로 보이도록 */
	.spelling {
		white-space: pre-wrap;
	}
	.meta {
		margin-left: 8px;
		font-weight: 400;
		color: var(--gray-gray-600, #7c7c7c);
	}
	tbody a {
		color: inherit;
		text-decoration-color: var(--gray-gray-500, #656667);
		text-underline-offset: 3px;
	}
	tbody a:hover {
		text-decoration-thickness: 2px;
	}
	/* 선곡 수 링크: 통계의 숫자 링크처럼 밑줄은 가리키거나 키보드로 고를 때만 */
	tbody a.count {
		text-decoration: none;
	}
	tbody a.count:hover,
	tbody a.count:focus-visible {
		text-decoration: underline;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	th.num {
		width: 10%;
	}
	th.extra {
		width: 28%;
	}
	.id {
		width: 64px;
		text-align: right;
		color: var(--gray-gray-500, #9f9f9f);
		font-variant-numeric: tabular-nums;
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
	/* 인쇄: 작곡가 목록과 같다. 종류 고르기는 남기고 검색란과 다시 시도는 빼며(검색어는 개수 줄에 남는다), 곡 이름은 낱말 사이에서만 줄을 바꾼다.
	   모든 묶음을 싣는다(스크롤 상자로 한 화면만큼 자르지 않는다). */
	@media print {
		:global(.list-scroll) {
			max-height: none !important;
			overflow: visible !important;
		}
		.card {
			box-shadow: none;
		}
		.search,
		.csv-save,
		.placeholder .tool-btn {
			display: none;
		}
		table {
			word-break: keep-all;
		}
	}
</style>
