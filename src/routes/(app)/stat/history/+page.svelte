<script>
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import PeriodSelect from '$lib/components/stat/PeriodSelect.svelte';
	import MemberSelect from '$lib/components/stat/MemberSelect.svelte';
	import PlayTable from '$lib/components/stat/PlayTable.svelte';
	import { ALL, currentSemesterRange } from '$lib/statPeriod.js';
	import { composerHref } from '$lib/composerStats.js';
	import { downloadCsvTable } from '$lib/csvTable.js';
	import { todayStamp } from '$lib/csv.js';
	import { downloadName, memberFileText } from '$lib/statFileName.js';
	import { pageTitle, periodTitle } from '$lib/statTitle.js';
	import {
		EXPORT_PAGE_SIZE,
		PLAY_CSV_HEADERS,
		readHistoryQuery,
		historyHref,
		statHref,
		playsParams,
		appendPage,
		fetchAllPlays,
		playCsvRow,
		targetLookup,
		targetName,
		targetText,
		historyFileTags,
		historyPeriod
	} from '$lib/playHistory.js';
	import {
		catalogViewHref,
		duplicatesSearch,
		spellingKindOf,
		spellingVariants,
		variantHistoryHref
	} from '$lib/catalogSpelling.js';

	// 검색어·기간·지기·신청곡과 통계 drill-down 의 id 필터는 URL에 둔다(링크로 같은 목록을 연다).
	// 페이지가 시작될 때 한 번만 읽는다.
	const initial = readHistoryQuery($page.url.searchParams);
	let period = initial.period; // 'current' | 'all' | 'custom' | 학기 id
	let customStart = initial.start;
	let customEnd = initial.end;
	let q = initial.q; // 적용된 검색어
	let query = q; // 검색란의 값. 검색을 누르면 q 로 옮긴다.
	let userId = initial.userId;
	let includeMentees = initial.includeMentees;
	let requested = initial.requested; // '' | 'true' | 'false'
	let targets = initial.targets; // 작곡가·연주자·지휘자·오케스트라·곡의 id 필터, 없으면 []
	// 필터마다(param) 보일 문구. 이름을 찾으면 바꾼다.
	let targetLabels = Object.fromEntries(targets.map((t) => [t.param, targetText(t, null)]));
	/** @type {Record<string, string | null>} */
	let targetNames = {}; // 필터마다 찾은 이름(CSV 파일 이름에 쓴다)
	let searchInput;
	const current = currentSemesterRange();

	const filter = () => ({
		period,
		start: customStart,
		end: customEnd,
		q,
		userId,
		includeMentees,
		requested,
		targets
	});

	/** @type {import('$lib/playHistory.js').Play[]} */
	let rows = [];
	let count = null; // 조건에 맞는 선곡 수(plays/ 의 count)
	let offset = 0; // 지금까지 받은 행 수(다음 쪽의 offset)
	let loading = false;
	let error = '';
	// 가장 최근 요청의 응답만 반영한다. 필터를 바꾸면 진행 중인 '더 보기'의 응답도 버린다.
	// 응답을 반영했으면(성공이든 실패든) true 를 돌려준다.
	let requestId = 0;

	async function load(more = false) {
		const id = ++requestId;
		if (!more) {
			rows = [];
			count = null;
			offset = 0;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/plays?${playsParams(filter(), current, offset)}`);
			if (!res.ok) throw new Error(`plays ${res.status}`);
			const result = await res.json();
			if (id !== requestId) return false;
			rows = appendPage(rows, result.results);
			offset += result.results.length;
			count = result.count;
		} catch (e) {
			if (id !== requestId) return false;
			console.error('선곡 기록 로딩 실패', e);
			error = '불러오지 못했습니다';
		} finally {
			if (id === requestId) loading = false;
		}
		return true;
	}

	// '더 보기'는 불러오는 동안 비활성이 되고, 다 받으면 사라지거나 '다시 시도'로 바뀌어 포커스를 잃는다.
	// 그래서 새로 온 첫 행의 타임 링크로(실패하면 '다시 시도'로) 포커스를 옮긴다. 그 사이 다른 곳을
	// 골랐거나 필터를 바꿨으면 그대로 둔다.
	let listCard;
	let moreBar;
	async function loadMore() {
		const first = rows.length;
		if (!(await load(true))) return;
		await tick();
		const active = document.activeElement;
		if (active && active !== document.body && !moreBar?.contains(active)) return;
		const row = error ? null : listCard?.querySelectorAll('tbody tr')[first];
		(row?.querySelector('a') ?? moreBar?.querySelector('button'))?.focus();
	}

	// 목록의 '다시 시도'도 누르면 '불러오는 중...'으로 바뀌어 사라지므로, 먼저 목록 카드로 포커스를 옮긴다.
	// 또 실패했는데 포커스가 아직 카드에 있으면 새 '다시 시도'로 되돌린다.
	async function retryList(e) {
		const hadFocus = document.activeElement === e.currentTarget;
		if (hadFocus) listCard?.focus();
		if (!(await load())) return;
		if (!hadFocus || !error) return;
		await tick();
		if (document.activeElement === listCard)
			listCard.querySelector('.placeholder.error button')?.focus();
	}

	// 필터가 바뀌면 URL을 바꾸고(히스토리를 쌓지 않고, 포커스·스크롤도 그대로) 처음부터 다시 부른다.
	function apply() {
		goto(historyHref(filter()), { replaceState: true, keepFocus: true, noScroll: true });
		exportError = '';
		load();
	}

	// id 필터의 이름은 URL에 없으므로 그 대상의 순위에서 id 로 찾는다(실패하면 '작곡가 #id').
	/** @param {import('$lib/playHistory.js').HistoryTarget} wanted */
	async function loadTargetName(wanted) {
		const lookup = targetLookup(wanted);
		if (!lookup) return;
		try {
			const res = await fetch(`/api/stats/${lookup.endpoint}?${lookup.params}`);
			if (!res.ok) throw new Error(`${lookup.endpoint} ${res.status}`);
			const name = targetName(await res.json(), wanted);
			if (targets.includes(wanted)) {
				targetLabels = { ...targetLabels, [wanted.param]: targetText(wanted, name) };
				targetNames = { ...targetNames, [wanted.param]: name };
			}
		} catch (e) {
			console.error('선곡 기록 대상 이름 로딩 실패', e);
		}
	}

	// 표기 정리의 묶음(catalog/duplicates/, 전체 기간·전체 지기): id 필터의 종류마다 한 번만 부른다.
	// 필터는 해제로 줄기만 하므로 다시 부르지 않는다. 못 받으면 줄을 두지 않는다.
	/** @type {Record<string, any>} */
	let duplicates = {};
	/** @param {string} kind */
	async function loadDuplicates(kind) {
		try {
			const res = await fetch(`/api/catalog/duplicates${duplicatesSearch(kind)}`);
			if (!res.ok) throw new Error(`catalog/duplicates ${res.status}`);
			const result = await res.json();
			duplicates = { ...duplicates, [kind]: result };
		} catch (e) {
			console.error('표기만 다른 이름 로딩 실패', e);
		}
	}
	// id 필터마다 그 대상의 다른 표기와, 지금 조건에서 그 id 만 바꾼 링크(없으면 줄을 두지 않는다).
	// 조건을 바꾸면 링크도 따라 바뀌도록 filter() 대신 값을 하나하나 적는다.
	$: variantView = {
		period,
		start: customStart,
		end: customEnd,
		q,
		userId,
		includeMentees,
		requested,
		targets
	};
	$: variantLines = targets
		.map((target) => {
			const kind = spellingKindOf(target.param);
			const rows = kind ? spellingVariants(duplicates[kind], target.id) : [];
			return {
				target,
				kind,
				rows: rows.map((row) => ({
					...row,
					plays: (row.count ?? 0).toLocaleString(),
					href: variantHistoryHref(variantView, target, row.id)
				}))
			};
		})
		.filter((line) => line.rows.length);

	onMount(() => {
		load();
		targets.forEach(loadTargetName);
		new Set(targets.map((t) => spellingKindOf(t.param)).filter(Boolean)).forEach(loadDuplicates);
	});

	function onSearch() {
		q = query.trim();
		query = q;
		apply();
	}
	// 검색란을 ✕(또는 Escape)로 비우면 곧바로 전체를 보인다. Enter 도 search 이벤트를 보내지만
	// (브라우저에 따라 submit 앞이나 뒤에) 그때는 submit 이 검색하므로 넘어간다.
	let enterKey = false;
	const onSearchKeydown = (e) => (enterKey = e.key === 'Enter' && !e.isComposing);
	function onSearchEvent(e) {
		const byEnter = enterKey;
		enterKey = false;
		if (byEnter || e.currentTarget.value !== '' || !q) return;
		query = '';
		onSearch();
	}
	const onPeriodChange = (e) => {
		period = e.detail;
		apply();
	};
	// 빈 목록에서 기간만 전체 기간으로 넓힌다. 기간 select 로 고른 것과 같다(버튼이 사라지므로 포커스는 목록 카드로).
	function widenPeriod(e) {
		if (document.activeElement === e.currentTarget) listCard?.focus();
		period = ALL;
		apply();
	}
	function onMemberChange(e) {
		userId = e.detail.userId;
		includeMentees = e.detail.includeMentees;
		apply();
	}
	function onRequestedChange(e) {
		requested = e.target.value;
		apply();
	}
	// CSV 저장: 누른 때의 조건에 맞는 선곡을 모두(불러온 행만이 아니라) 받아 한 파일로 내려받는다.
	let exporting = false;
	let exported = 0; // 받은 선곡 수
	let exportTotal = 0;
	let exportError = '';
	let userName = ''; // 고른 지기의 이름(MemberSelect)
	let exportButton;

	async function exportCsv() {
		const wanted = filter();
		// 저장하는 동안 단추가 비활성이 되어 포커스를 잃으므로, 단추에 있었으면 끝난 뒤 돌려준다.
		const hadFocus = document.activeElement === exportButton;
		// 파일 이름에 누른 때의 기간·지기와 그 밖의 조건(id 필터, 신청곡, 검색어)을 넣는다(statFileName.js).
		const filename = downloadName(
			[
				'선곡기록',
				periodText,
				memberFileText({ userId, name: userName, includeMentees }),
				historyFileTags(wanted, targetNames),
				todayStamp()
			],
			'csv'
		);
		exporting = true;
		exported = 0;
		exportTotal = count ?? 0;
		exportError = '';
		try {
			const plays = await fetchAllPlays(
				async (from) => {
					const res = await fetch(
						`/api/plays?${playsParams(wanted, current, from, EXPORT_PAGE_SIZE)}`
					);
					if (!res.ok) throw new Error(`plays ${res.status}`);
					return res.json();
				},
				(done, total) => {
					exported = done;
					exportTotal = total;
				}
			);
			downloadCsvTable(filename, PLAY_CSV_HEADERS, plays.map(playCsvRow));
		} catch (e) {
			console.error('선곡 기록 CSV 저장 실패', e);
			exportError = 'CSV를 만들지 못했습니다.';
		} finally {
			exporting = false;
		}
		// 그 사이 다른 곳을 골랐으면 그대로 둔다.
		await tick();
		const active = document.activeElement;
		if (hadFocus && (!active || active === document.body)) exportButton?.focus();
	}

	// 해제하면 단추가 사라지므로 포커스를 검색란으로 옮긴다.
	/** @param {import('$lib/playHistory.js').HistoryTarget} target */
	async function clearTarget(target) {
		targets = targets.filter((t) => t !== target);
		apply();
		await tick();
		searchInput.focus();
	}

	// 머리말의 기간과, 직접 지정을 고르면 입력란에 채울 범위(지금 보이는 기간, 전체 기간이면 이번 학기).
	// 학기의 날짜는 학기 목록(PeriodSelect)의 연도·학기로 정한다(백엔드의 semester_id 와 같은 규칙).
	let semesters = [];
	$: ({ text: periodText, shown: shownRange } = historyPeriod(
		{ period, start: customStart, end: customEnd },
		current,
		semesters
	));
	$: statLink = statHref({
		period,
		start: customStart,
		end: customEnd,
		q,
		userId,
		includeMentees,
		requested
	});
	// 작곡가로 좁힌 목록은 그 작곡가 페이지를 링크한다(행의 작곡가 링크와 같은 기간·지기).
	$: composerTarget = targets.find((t) => t.param === 'composer_id');
	$: composerLink =
		composerTarget &&
		composerHref(composerTarget.id, {
			period,
			start: customStart,
			end: customEnd,
			userId,
			includeMentees
		});
	$: hasMore = count !== null && offset < count;
	// 탭 제목: id 필터(이름을 찾기 전에는 '작곡가 #12'), 지기, 기간(이번 학기는 빼고).
	// 검색어와 신청곡은 넣지 않는다: '가상 작곡가 D · 전체 기간 · 선곡 기록'.
	$: tabTitle = pageTitle(
		...targets.map((t) => targetNames[t.param] || targetText(t, null)),
		memberFileText({ userId, name: userName, includeMentees }),
		periodTitle({ period, start: customStart, end: customEnd }, semesters),
		'선곡 기록'
	);
</script>

<svelte:head>
	<title>{tabTitle}</title>
</svelte:head>

<div class="history-page">
	<header class="page-header">
		<div class="title-group">
			<h1>선곡 기록</h1>
			<span class="period">{periodText}</span>
			<a class="stat-link" href={statLink}>통계</a>
			<!-- 작곡가 페이지의 '선곡 기록'이 이 목록을 연다(#38): 거꾸로 가는 링크 -->
			{#if composerLink}
				<a class="stat-link" href={composerLink} title="이 작곡가 페이지 열기">작곡가 페이지</a>
			{/if}
		</div>
	</header>

	<div class="toolbar">
		<form class="search" role="search" on:submit|preventDefault={onSearch}>
			<input
				type="search"
				bind:value={query}
				bind:this={searchInput}
				on:keydown={onSearchKeydown}
				on:search={onSearchEvent}
				placeholder="작곡가, 곡, 연주자, 지휘자, 오케스트라"
				aria-label="선곡 검색"
			/>
			<button type="submit">검색</button>
		</form>
		<div class="filters">
			{#each targets as target (target.param)}
				<span class="target">
					{targetLabels[target.param]}
					<button
						class="tool-btn"
						on:click={() => clearTarget(target)}
						aria-label={`${targetLabels[target.param]} 필터 해제`}
					>
						해제
					</button>
				</span>
			{/each}
			<PeriodSelect
				bind:period
				bind:start={customStart}
				bind:end={customEnd}
				bind:semesters
				{shownRange}
				on:change={onPeriodChange}
			/>
			<MemberSelect
				bind:userId
				bind:includeMentees
				bind:userName
				emptyLabel="전체 지기"
				on:change={onMemberChange}
			/>
			<select value={requested} on:change={onRequestedChange} aria-label="신청곡">
				<option value="">신청곡 포함</option>
				<option value="true">신청곡만</option>
				<option value="false">신청곡 제외</option>
			</select>
		</div>
	</div>

	<!-- 표기만 다른 이름(표기 정리의 묶음): 그 선곡은 이 목록에 들지 않으므로 알리고, 이 목록에서 그 필터의
	     id 만 바꿔 연다. 이 페이지는 URL을 처음 한 번만 읽으므로 링크는 페이지를 새로 불러온다
	     (data-sveltekit-reload). 이름은 띄어쓰기가 달라도 보이도록 그대로 둔다 -->
	{#each variantLines as line (line.target.param)}
		<p class="variants-note">
			{line.kind === 'music' ? '작품 번호가 같은 곡' : '표기만 다른 이름'}: {#each line.rows as row, i (row.id)}{i
					? ', '
					: ''}‘<a class="variant" href={row.href} data-sveltekit-reload>{row.name}</a>’ 선곡 {row.plays}회{/each}
			(전체 기간). 이 목록에는 들지 않습니다. ·
			<a href={catalogViewHref('', line.kind)}>표기 정리</a>
		</p>
	{/each}

	<div class="result-bar">
		<p class="result-count" aria-live="polite">
			{#if count !== null}
				총 {count.toLocaleString()}곡{#if q}&nbsp;· '{q}' 검색{/if}
			{/if}
		</p>
		<div class="export">
			<span class="more-error" aria-live="polite">{exportError}</span>
			<button
				class="tool-btn"
				bind:this={exportButton}
				on:click={exportCsv}
				disabled={!count || exporting}
				title="조건에 맞는 선곡을 모두 CSV로 저장"
			>
				{exporting
					? `CSV 준비 중… ${exported.toLocaleString()} / ${exportTotal.toLocaleString()}`
					: 'CSV 저장'}
			</button>
		</div>
	</div>

	<section class="card" aria-label="선곡 목록" tabindex="-1" bind:this={listCard}>
		{#if rows.length > 0}
			<!-- 긴 목록은 이 상자 안에서 스크롤해 머리줄이 남는다. 키보드로도 스크롤하게 포커스를 준다(DataTable 과 같다). -->
			<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
			<div class="list-scroll" role="region" aria-label="선곡 목록 표" tabindex="0">
				<PlayTable
					{rows}
					composerPeriod={{ period, start: customStart, end: customEnd, userId, includeMentees }}
				/>
			</div>
		{:else if loading}
			<div class="placeholder">불러오는 중...</div>
		{:else if error}
			<div class="placeholder error">
				{error}
				<button class="tool-btn" on:click={retryList} aria-label="선곡 목록 다시 시도"
					>다시 시도</button
				>
			</div>
		{:else if count === 0}
			{#if period !== ALL}
				<div class="placeholder">
					이 기간에는 조건에 맞는 선곡이 없습니다
					<button
						class="tool-btn"
						on:click={widenPeriod}
						title="기간만 전체 기간으로 바꿔 다시 찾기">전체 기간에서 찾기</button
					>
				</div>
			{:else}
				<div class="placeholder">조건에 맞는 선곡이 없습니다</div>
			{/if}
		{/if}
	</section>

	{#if rows.length > 0}
		<div class="more" bind:this={moreBar}>
			{#if error}
				<span class="more-error">더 불러오지 못했습니다.</span>
				<button class="tool-btn" on:click={loadMore}>다시 시도</button>
			{:else if hasMore}
				<button class="tool-btn" on:click={loadMore} disabled={loading}>
					{loading ? '불러오는 중...' : '더 보기'}
				</button>
				<span class="more-count">{rows.length.toLocaleString()} / {count.toLocaleString()}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* 통계 페이지와 같은 여백·머리말·컨트롤 */
	.history-page {
		padding: 24px 32px;
		width: 100%;
		box-sizing: border-box;
	}
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.title-group {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	h1 {
		font-family: var(--xlarge-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
		color: var(--gray-gray-950, #1a1a1a);
		margin: 0;
	}
	.period,
	.result-count,
	.more-count,
	.variants-note {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.variants-note {
		margin: 16px 0 -8px;
	}
	.stat-link,
	.variants-note a {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		text-underline-offset: 3px;
	}
	/* 띄어쓰기가 다른 표기도 그대로 보이도록(표기 정리, 작곡가 페이지와 같다) */
	.variants-note .variant {
		white-space: pre-wrap;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
	}
	.search,
	.filters {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
	}
	.filters {
		flex-wrap: wrap;
		gap: 10px 16px;
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
	/* 통계 drill-down 에서 온 id 필터: 입력란과 같은 테두리 */
	.target {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px 4px 10px;
		border: 1px solid var(--control-border);
		border-radius: 6px;
		background: var(--secondary-secondary-50, #fffdfc);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-950, #1a1a1a);
	}
	.tool-btn:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.result-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 20px 0 8px;
	}
	.result-count {
		min-height: 1.5em;
		margin: 0;
	}
	.export {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		font-variant-numeric: tabular-nums;
	}
	/* ChartCard 와 같은 카드 */
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
	}
	/* 레이아웃의 main 은 스크롤하지 않는 스크롤 상자라 sticky 머리줄이 붙지 못하므로, 표에 제 스크롤 상자를 준다 */
	.list-scroll {
		max-height: calc(100vh - 200px);
		overflow: auto;
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
	.placeholder.error,
	.more-error {
		color: var(--secondary-secondary-800, #95560d);
	}
	.more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 16px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
	}
	/* 인쇄에는 불러온 행을 모두 싣는다(한 화면만큼 자르지 않는다) */
	@media print {
		:global(.list-scroll) {
			max-height: none !important;
			overflow: visible !important;
		}
	}
</style>
