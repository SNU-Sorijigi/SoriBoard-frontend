<script>
	import { tick } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate, goto } from '$app/navigation';
	import ChartCard from '$lib/components/stat/ChartCard.svelte';
	import DataTable from '$lib/components/stat/DataTable.svelte';
	import TableCard from '$lib/components/stat/TableCard.svelte';
	import PeriodSelect from '$lib/components/stat/PeriodSelect.svelte';
	import MemberSelect from '$lib/components/stat/MemberSelect.svelte';
	import { horizontalBarOption, countBarOption, eraPieOption } from '$lib/chartOptions.js';
	import {
		placeholderText,
		rankCapNote,
		rankCapSubtitle,
		shareTable,
		topOf,
		PERFORMER_EMPTY
	} from '$lib/statTable.js';
	import { WORKS_LIMIT, barItemIndex } from '$lib/statDrill.js';
	import { pageTitle } from '$lib/statTitle.js';
	import { memberFileText, downloadName } from '$lib/statFileName.js';
	import { todayStamp } from '$lib/csv.js';
	import { downloadCsvTable, tableCsv } from '$lib/csvTable.js';
	import {
		ALL,
		CURRENT,
		CUSTOM,
		periodRangeText,
		currentSemesterRange,
		semesterLabel
	} from '$lib/statPeriod.js';
	import {
		semesterRangeOf,
		semesterOf,
		semesterBefore,
		timelineBucketName,
		timelineView
	} from '$lib/statBucket.js';
	import {
		previousSemester,
		kpiChangeText,
		rankChangeTable,
		rankNotes,
		chartTieNote,
		mixTable,
		ongoingText,
		upcomingText
	} from '$lib/semesterReport.js';
	import { catalogHref } from '$lib/composerCatalog.js';
	import { gapNote } from '$lib/bucketGaps.js';
	import {
		DEFAULT_KIND,
		catalogViewHref,
		composerVariants,
		duplicatesSearch,
		splitSpellings,
		splitSpellingNote,
		MUSIC_SPLIT_LEAD,
		firstSpellingSplits,
		firstSpellingNote,
		FIRST_MUSIC_LEAD
	} from '$lib/catalogSpelling.js';
	import {
		hasPeriodStart,
		firstsSubtitle,
		firstsEmptyText,
		byCount,
		firstDayHref,
		workDateLinks
	} from '$lib/statFirsts.js';
	import {
		readTableView,
		writeTableView,
		tableViewHref,
		readFirstsByCount,
		writeFirstsByCount,
		firstsByCountHref,
		cardHref
	} from '$lib/statQuery.js';
	import { loadStatusText, withPreviousFailure, withFailedLines } from '$lib/statCards.js';
	import { clubShareText, previousShareText } from '$lib/statShare.js';
	import {
		readComposerId,
		readComposerPeriod,
		writeComposerPeriod,
		readComposerMember,
		writeComposerMember,
		composerPeriodParams,
		composerMemberParams,
		composerPeriodName,
		composerStatHref,
		composerWorkHref,
		composerHistoryHref,
		composerRequestedHref,
		composerRankLinks,
		composerSemesterLinks,
		composerFacts,
		composerTimelineBucket,
		composerWorksTable,
		composerWorkName,
		composerWorksCsv,
		composerFirstsTable,
		composerIsWholeRecord,
		composerWholeDates,
		composerDayHref,
		composerHref,
		composerRankNote,
		composerRankLead,
		composerPreviousRankLead,
		RANK_LIMIT
	} from '$lib/composerStats.js';

	// 작곡가 한 명의 기록, 고른 기간·지기만(기본값은 전체 기간·전체 지기). 카드는 따로 불러오고,
	// 실패하면 그 카드에만 오류를 띄운다.
	$: composerId = readComposerId($page.params.id);

	// 기간과 지기는 URL에도 둔다(composerStats.js). 처음 열 때와 다른 작곡가로 옮겨 갈 때 URL에서 읽는다.
	let { period, start: customStart, end: customEnd } = readComposerPeriod($page.url.searchParams);
	let { userId, includeMentees } = readComposerMember($page.url.searchParams);
	// 모든 차트 표로 보기(view=table, 통계와 같다): 누르면 모든 차트 카드가 표를 보인다. 카드의 '표로 보기'는 그 카드만 바꾼다.
	let allTables = readTableView($page.url.searchParams);
	$: filter = { period, start: customStart, end: customEnd, userId, includeMentees };
	// 이번 학기 = 가장 최근 학기의 시작일부터 오늘까지(통계와 같다).
	const current = currentSemesterRange();

	// withMember 가 false 면 지기를 빼고 같은 기간 클럽 전체를 묻는다(KPI 칸의 클럽 몫, 통계와 같다).
	// signal 은 그 요청이 속한 보기의 것이다(cardAbort·previousAbort): 보기가 바뀌면 끊긴다.
	const getJson = async (endpoint, id, extra = {}, withMember = true, signal) => {
		const params = new URLSearchParams({
			composer_id: id,
			...composerPeriodParams({ period, start: customStart, end: customEnd }, current),
			...(withMember ? composerMemberParams({ userId, includeMentees }) : {}),
			...extra
		});
		const res = await fetch(`/api/stats/${endpoint}?${params}`, { signal });
		if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
		return res.json();
	};
	// 선곡 카드의 bucket: 여러 학기면 학기별, 한 학기면 월별. loadCards 가 정하고 '다시 시도'도 그대로 쓴다.
	// (filter 는 $: 라 기간을 바꾼 직후에는 아직 이전 값이다. getJson 처럼 기간 변수를 바로 쓴다.)
	const nextTimelineBucket = () =>
		composerTimelineBucket({ period, start: customStart, end: customEnd }, current);
	let timelineBucket = nextTimelineBucket();
	// 독주자·지휘자·오케스트라 차트의 길이. 이번 기간은 표로 보기·CSV에 모두 싣도록 백엔드의 상한(WORKS_LIMIT,
	// 100)까지 부르고, 앞 학기도 그만큼 불러 표의 지난 학기 칸에 상위 100 안의 순위를 그대로 적는다('23위', 통계와 같다).
	const LIMITS = { soloists: 10, conductors: 10, orchestras: 10 };
	const cardRequests = {
		summary: (id, signal) => getJson('summary', id, {}, true, signal),
		timeline: (id, signal) => getJson('timeline', id, { bucket: timelineBucket }, true, signal),
		works: (id, signal) => getJson('works', id, { limit: String(WORKS_LIMIT) }, true, signal),
		soloists: (id, signal) => getJson('soloists', id, { limit: String(WORKS_LIMIT) }, true, signal),
		conductors: (id, signal) =>
			getJson('conductors', id, { limit: String(WORKS_LIMIT) }, true, signal),
		orchestras: (id, signal) =>
			getJson('orchestras', id, { limit: String(WORKS_LIMIT) }, true, signal),
		genres: (id, signal) => getJson('genres', id, {}, true, signal),
		firstWorks: (id, signal) => getJson('firsts', id, { kind: 'work' }, true, signal)
	};
	const CARD_KEYS = Object.keys(cardRequests);
	// 처음 튼 곡(stats/firsts)은 기간의 시작이 있을 때만 묻는다. 없으면 모든 곡이 '처음'이다(statFirsts.js).
	const asksFirsts = (p, s) =>
		hasPeriodStart({ period: p, start: p === CUSTOM ? s : current.start });

	let composer = null; // composers/<id>/: 이름, 출생 연도, 시대
	let notFound = false;
	let composerError = '';
	/** @type {Record<string, any>} */
	let data = {};
	/** @type {Record<string, boolean>} */
	let loading = Object.fromEntries(CARD_KEYS.map((key) => [key, true]));
	/** @type {Record<string, string>} */
	let errors = {};
	$: ({ summary, timeline, works, soloists, conductors, orchestras, genres, firstWorks } = data);

	// 백엔드가 적용했다고 돌려준 기간(filters). 기간이 바뀔 때 비운다.
	let appliedFilters = null;

	// 다른 작곡가나 기간으로 옮겨 가면 이전의 늦은 응답은 버린다.
	let generation = 0;
	let cardGeneration = 0;
	// 기간·지기가 바뀌면(cardGeneration 이 오르면) 이전 보기의 요청도 끊는다. 아직 브라우저에서 기다리던
	// 요청은 서버에 가지 않는다. 끊긴 요청의 catch 는 세대가 지난 것이라 아무것도 하지 않는다.
	// '다시 시도'는 세대를 그대로 두므로 지금의 signal 을 쓰고, 아무것도 끊지 않는다.
	let cardAbort = new AbortController();

	async function loadComposer(id, gen) {
		try {
			const res = await fetch(`/api/composers/${id}`);
			if (gen !== generation) return;
			if (res.status === 404) {
				notFound = true;
				return;
			}
			if (!res.ok) throw new Error(`composers ${res.status}`);
			const result = await res.json();
			if (gen === generation) composer = result;
		} catch (e) {
			if (gen !== generation) return;
			console.error('작곡가 로딩 실패', e);
			composerError = '작곡가 정보를 불러오지 못했습니다.';
		}
	}

	function loadCard(key, id, gen) {
		cardRequests[key](id, cardAbort.signal)
			.then((result) => {
				if (gen !== cardGeneration) return;
				data[key] = result;
				appliedFilters = result.filters;
			})
			.catch((e) => {
				if (gen !== cardGeneration) return;
				console.error(`작곡가 통계 로딩 실패 (${key})`, e);
				errors[key] = '불러오지 못했습니다';
			})
			.finally(() => {
				if (gen === cardGeneration) loading[key] = false;
			});
	}

	// 기본값(전체 기간·전체 지기)이 아니면 처음·마지막 튼 날 칸 아래에 둘 이 작곡가의 전체 기록(기간·지기 없는
	// stats/summary). 카드가 아니다: loadCard 는 머리말의 기간(appliedFilters)을 응답의 filters 로 바꾼다.
	let wholeSummary = null;
	let wholeError = false;
	async function loadWhole(id, gen) {
		try {
			const res = await fetch(`/api/stats/summary?composer_id=${id}`, {
				signal: cardAbort.signal
			});
			if (!res.ok) throw new Error(`summary ${res.status}`);
			const result = await res.json();
			if (gen === cardGeneration) wholeSummary = result;
		} catch (e) {
			if (gen !== cardGeneration) return;
			console.error('작곡가 통계 로딩 실패 (전체 기록)', e);
			wholeError = true;
		}
	}

	// KPI 칸 아래 순위 줄의 많이 튼 작곡가(composer_id 없는 stats/composers, 같은 기간·지기, 상위 100).
	// 카드가 아니다: 실패하면 줄만 두지 않는다(표기만 다른 이름과 같다. 다시 시도도, 읽어 주는 상태도 없다).
	let rank = null;
	async function loadRank(gen) {
		try {
			const params = new URLSearchParams({
				...composerPeriodParams({ period, start: customStart, end: customEnd }, current),
				...composerMemberParams({ userId, includeMentees }),
				limit: String(RANK_LIMIT)
			});
			const res = await fetch(`/api/stats/composers?${params}`, { signal: cardAbort.signal });
			if (!res.ok) throw new Error(`composers ${res.status}`);
			const result = await res.json();
			if (gen === cardGeneration) rank = result;
		} catch (e) {
			if (gen !== cardGeneration) return;
			console.error('많이 튼 작곡가 순위 로딩 실패', e);
		}
	}
	// 지기를 고르면 KPI 칸 아래에 같은 기간 클럽 전체가 이 작곡가를 튼 것 중 그 지기의 몫을 쓴다
	// ('클럽 52곡 중 75.0%', 통계와 같다). 지기를 뺀 같은 기간의 요약이다. 카드가 아니다: 실패하면 줄만 없다(loadRank 와 같다).
	let clubSummary = null;
	async function loadClubSummary(id, gen) {
		try {
			const result = await getJson('summary', id, {}, false, cardAbort.signal);
			if (gen === cardGeneration) clubSummary = result;
		} catch (e) {
			if (gen === cardGeneration) console.error('작곡가 통계 로딩 실패 (클럽 요약)', e);
		}
	}
	$: rankNote = composerRankNote(rank, composerId, summary?.total_plays, previousRank);
	// 줄의 첫머리(많이 튼 작곡가 3위)는 통계의 그 표로 가는 링크다. 표에 없는 '100위 밖'은 글 그대로 둔다.
	$: rankLead = composerRankLead(rank, composerId);
	$: previousRankLead = composerPreviousRankLead(previousRank, composerId);
	// 첫머리 뒤의 나머지. 그것이 ' (지난 학기 5위)'로 시작하면 괄호 안의 그 글도 링크다(previousStatLink).
	$: rankRest = rankNote.slice(rankLead.length);
	$: previousPart = ` (${previousRankLead})`;
	$: previousLinked =
		Boolean(previousRankLead && previousStatLink) && rankRest.startsWith(previousPart);

	// 카드만 다시 부른다(기간이나 지기가 바뀌면 작곡가 정보는 그대로다).
	function loadCards() {
		const id = readComposerId($page.params.id);
		const gen = ++cardGeneration;
		cardAbort.abort();
		cardAbort = new AbortController();
		data = {};
		errors = {};
		appliedFilters = null;
		wholeSummary = null;
		wholeError = false;
		rank = null;
		clubSummary = null;
		timelineBucket = nextTimelineBucket();
		loading = Object.fromEntries(CARD_KEYS.map((key) => [key, Boolean(id)]));
		loadPreviousSummary();
		if (!id) return;
		const firsts = asksFirsts(period, customStart);
		if (!firsts) loading.firstWorks = false;
		for (const key of CARD_KEYS) if (key !== 'firstWorks' || firsts) loadCard(key, id, gen);
		loadRank(gen);
		if (userId) loadClubSummary(id, gen);
		// filter 는 아직 이전 값일 수 있으므로 기간·지기 변수를 바로 쓴다(nextTimelineBucket 과 같다).
		if (!composerIsWholeRecord({ period, start: customStart, end: customEnd, userId })) {
			loadWhole(id, gen);
		}
	}

	// '다시 시도': 그 카드만 지금 기간으로 다시 부른다. cardGeneration 은 그대로 두어 다른 카드의 요청을
	// 살리고, 그 사이 기간이나 작곡가를 바꾸면 이 요청의 늦은 응답도 버린다.
	// 단추는 사라지므로, 단추에 있던 포커스는 먼저 target(많이 튼 곡은 그 section, 글줄은 h1)으로 옮긴다.
	let heading;
	function retry(key, e, target) {
		if (e && document.activeElement === e.currentTarget) target?.focus();
		loading[key] = true;
		errors[key] = '';
		loadCard(key, composerId, cardGeneration);
	}
	function retryWhole(e) {
		if (document.activeElement === e.currentTarget) heading?.focus();
		wholeError = false;
		loadWhole(composerId, cardGeneration);
	}
	function retryComposer(e) {
		if (document.activeElement === e.currentTarget) heading?.focus();
		composerError = '';
		loadComposer(composerId, generation);
	}
	// 빈 기간에서 기간만 전체 기간으로 넓힌다. 기간 select 로 고른 것과 같다(단추가 사라지므로 포커스는 h1 으로)
	function widenPeriod(e) {
		if (document.activeElement === e.currentTarget) heading?.focus();
		period = ALL;
		onPeriodChange();
	}

	// 표기 정리의 묶음(catalog/duplicates/, 전체 기간·전체 지기): 모든 작곡가에 같으므로 종류마다(작곡가,
	// 독주자, 지휘자, 오케스트라) 처음 한 번만 부르고 둔다(다른 작곡가로 옮겨 가거나 기간·지기를 바꿔도 다시
	// 부르지 않는다). 작곡가 묶음은 제목 아래 '표기만 다른 이름' 줄에, 나머지는 많이 튼 독주자·지휘자·오케스트라에
	// 한 묶음의 표기가 둘 이상 들면 그 카드의 줄에 알린다(통계와 같다). 많이 튼 곡은 작품 번호가 같은 곡
	// (kind=music, 한 작곡가 안의 묶음)으로 같다. 못 받은 종류만 줄을 두지 않는다.
	/** @type {Record<string, any>} */
	let duplicates = {};
	let duplicatesAsked = false;
	async function loadDuplicates(kind) {
		try {
			const res = await fetch(`/api/catalog/duplicates${duplicatesSearch(kind)}`);
			if (!res.ok) throw new Error(`catalog/duplicates ${res.status}`);
			const groups = await res.json();
			// 나란히 부르므로, 받은 뒤의 duplicates 에 더한다(await 앞에서 펼치면 먼저 온 종류를 덮는다).
			duplicates = { ...duplicates, [kind]: groups };
		} catch (e) {
			console.error(`표기만 다른 이름 로딩 실패 (${kind})`, e);
		}
	}
	function loadAllDuplicates() {
		duplicatesAsked = true;
		['composer', 'player', 'conductor', 'orchestra', 'music'].forEach(loadDuplicates);
	}
	$: variants = composerVariants(duplicates.composer, composerId);
	$: soloistSplit = splitSpellingNote(splitSpellings(duplicates.player, soloists));
	$: conductorSplit = splitSpellingNote(splitSpellings(duplicates.conductor, conductors));
	$: orchestraSplit = splitSpellingNote(splitSpellings(duplicates.orchestra, orchestras));
	// 곡 이름은 표처럼 작곡가 이름 없이(작곡가를 아직 못 받았으면 응답의 이름 그대로).
	$: worksSplit = splitSpellingNote(
		splitSpellings(
			duplicates.music,
			works && composer
				? {
						...works,
						items: works.items.map((item) => ({ ...item, name: composerWorkName(item, composer) }))
					}
				: works
		),
		2,
		MUSIC_SPLIT_LEAD
	);
	// 카드의 줄: 상위 N위 줄 뒤에 표기 줄을 ' · '로 잇고, 표기 줄이 있으면 그 종류의 표기 정리로 잇는다.
	const withSplit = (capNote, split) => [capNote, split].filter(Boolean).join(' · ');
	const splitLink = (split, kind) =>
		split ? { href: catalogViewHref('', kind), text: '표기 정리' } : null;

	function loadAll() {
		const id = readComposerId($page.params.id);
		const gen = ++generation;
		composer = null;
		notFound = !id;
		composerError = '';
		if (id) loadComposer(id, gen);
		if (id && !duplicatesAsked) loadAllDuplicates();
		loadCards();
	}
	// 처음 열 때와, 같은 페이지에서 다른 작곡가로 옮겨 갈 때: 기간·지기도 URL에서 다시 읽는다.
	// 기간이나 지기를 바꿔 이 페이지가 URL을 고친 goto 는 건너뛴다(onPeriodChange·onMemberChange 가 이미 불러왔다).
	afterNavigate((navigation) => {
		if (navigation.type === 'goto' && navigation.from?.params?.id === navigation.to?.params?.id) {
			return;
		}
		({ period, start: customStart, end: customEnd } = readComposerPeriod($page.url.searchParams));
		({ userId, includeMentees } = readComposerMember($page.url.searchParams));
		allTables = readTableView($page.url.searchParams);
		const firsts = readFirstsByCount($page.url.searchParams);
		firstWorksByCount = firstWorksByCountKey = firsts.works;
		firstComposersByCount = firsts.composers;
		loadAll();
	});

	// 표로 보기도 URL에 둔다. 다시 불러오지 않는다(같은 작곡가의 goto 는 afterNavigate 가 건너뛴다).
	function toggleAllTables() {
		allTables = !allTables;
		const url = new URL($page.url);
		writeTableView(url.searchParams, allTables);
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	// 기간이 바뀌면 URL을 바꾼다. 히스토리를 쌓지 않고, 포커스·스크롤도 그대로 둔다.
	function onPeriodChange() {
		const url = new URL($page.url);
		writeComposerPeriod(url.searchParams, { period, start: customStart, end: customEnd });
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		loadCards();
	}
	// 지기도 같다(링크의 지기가 목록에 없어 전체 지기로 되돌릴 때도 MemberSelect 가 change 를 보낸다).
	function onMemberChange(e) {
		({ userId, includeMentees } = e.detail);
		const url = new URL($page.url);
		writeComposerMember(url.searchParams, { userId, includeMentees });
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		loadCards();
	}
	let userName = ''; // 고른 지기의 이름(MemberSelect)

	// PeriodSelect 가 불러온 학기 목록(최신순): 학기별 선곡의 학기를 그 학기(semester_id)로 연다.
	// 못 받으면 날짜로 연다.
	let semesters = [];

	// 기간이 목록의 학기면 총 선곡·타임·신청곡·곡 칸 아래에 바로 앞 학기와 견준 줄을 둔다(통계와 같다).
	// 앞 학기의 요약은 같은 작곡가·지기·견습 포함으로 카드와 함께 부르고, 실패하면 줄이 없다.
	// 많이 튼 독주자·지휘자·오케스트라 표에는 앞 학기 상위 WORKS_LIMIT 목록에서의 순위를 붙인다(통계와 같다).
	// 많이 튼 곡 표에는 앞 학기에 튼 횟수를 붙인다(같은 WORKS_LIMIT 의 목록).
	// 장르별 분포 표에는 앞 학기의 비율과 변화를 붙인다(통계와 같다).
	// 처음 튼 곡의 부제에는 앞 학기에 처음 튼 곡 수를 붙인다(통계와 같다).
	// 실패하면 그 표는 지금과 같다. 앞 학기의 요청이 하나라도 실패하면 KPI 칸 아래에 그 학기를 밝히고,
	// 실패한 요청만 다시 부르게 한다(통계와 같다).
	let previousSummary = null;
	let previousClubSummary = null; // 지기를 고르면: 앞 학기 클럽 전체의 이 작곡가 요약(지난 학기의 몫)
	/** @type {Record<string, any>} 앞 학기의 독주자·지휘자·오케스트라 목록(LIMITS 의 키) */
	let previousRanks = {};
	let previousWorks = null; // 앞 학기의 곡 목록
	let previousGenres = null; // 앞 학기의 장르별 분포
	let previousFirstWorks = null; // 앞 학기에 처음 튼 곡
	let previousRank = null; // 앞 학기의 많이 튼 작곡가(순위 줄의 '지난 학기 3위')
	let previousAsked = null; // 마지막으로 부른 앞 학기 id(없으면 null)
	let previousTarget = null; // 마지막으로 부른 앞 학기
	let previousComposerId = null; // 그때의 작곡가(다시 시도도 같은 작곡가로 부른다)
	let previousGeneration = 0; // 이전 보기의 늦은 응답은 버린다.
	let previousAbort = new AbortController(); // 이전 보기의 요청은 끊는다(cardAbort 와 같다).
	/** @type {string[]} 실패한 앞 학기 요청(엔드포인트). KPI 칸 아래에 다시 시도와 함께 알린다. */
	let previousFailed = [];
	// 이번 학기는 id 가 아닌 날짜 범위라, 그 시작일의 학기보다 앞선 가장 최근 학기와 견준다(statBucket.js).
	const previousOf = (p, list) => {
		if (p === CURRENT) return semesterBefore(semesterOf(current.start), list);
		const chosen = list.find((s) => String(s.id) === p);
		return chosen ? previousSemester(chosen, list) : null;
	};
	const previousRequests = {
		summary: { apply: (result) => (previousSummary = result) },
		// 지기를 고를 때만: 지기를 뺀 앞 학기 클럽 전체(withMember: false). 지난 학기의 몫을 잰다.
		clubSummary: {
			endpoint: 'summary',
			withMember: false,
			apply: (result) => (previousClubSummary = result)
		},
		works: {
			apply: (result) => (previousWorks = result),
			extra: { limit: String(WORKS_LIMIT) }
		},
		genres: { apply: (result) => (previousGenres = result) },
		firstWorks: {
			endpoint: 'firsts',
			extra: { kind: 'work' },
			apply: (result) => (previousFirstWorks = result)
		},
		...Object.fromEntries(
			Object.keys(LIMITS).map((key) => [
				key,
				{
					apply: (result) => (previousRanks = { ...previousRanks, [key]: result }),
					extra: { limit: String(WORKS_LIMIT) }
				}
			])
		)
	};
	async function askPrevious(endpoint) {
		const gen = previousGeneration;
		const { signal } = previousAbort;
		// 기록이 endpoint 를 밝히면 그것을 부른다(처음 튼 곡은 firsts). 실패 목록에는 기록의 키를 둔다.
		const {
			apply,
			extra = {},
			endpoint: path = endpoint,
			withMember = true
		} = previousRequests[endpoint];
		try {
			// getJson 은 extra 를 마지막에 넣으므로 기간의 semester_id 만 바뀌고 지기는 그대로다.
			const result = await getJson(
				path,
				previousComposerId,
				{ ...extra, semester_id: String(previousTarget.id) },
				withMember,
				signal
			);
			if (gen === previousGeneration) apply(result);
		} catch (e) {
			if (gen === previousGeneration) {
				console.error(`작곡가 통계 로딩 실패 (지난 학기 ${endpoint})`, e);
				previousFailed = [...previousFailed, endpoint];
			}
		}
	}
	// 순위 줄의 지난 학기 자리: loadRank 처럼 composer_id 없이 묻는다(getJson 은 늘 composer_id 를 붙이므로
	// previousRequests 에 둘 수 없다). 같은 지기, 기간만 앞 학기. 카드가 아니어서 실패하면 말만 붙이지 않는다
	// (previousFailed 에 넣지 않으므로 지난 학기 오류 줄과 다시 시도는 그대로다).
	async function loadPreviousRank(gen) {
		try {
			const params = new URLSearchParams({
				...composerMemberParams({ userId, includeMentees }),
				semester_id: String(previousTarget.id),
				limit: String(RANK_LIMIT)
			});
			const res = await fetch(`/api/stats/composers?${params}`, {
				signal: previousAbort.signal
			});
			if (!res.ok) throw new Error(`composers ${res.status}`);
			const result = await res.json();
			if (gen === previousGeneration) previousRank = result;
		} catch (e) {
			if (gen === previousGeneration) console.error('지난 학기 많이 튼 작곡가 순위 로딩 실패', e);
		}
	}
	async function loadPreviousSummary() {
		const id = readComposerId($page.params.id);
		++previousGeneration;
		previousAbort.abort();
		previousAbort = new AbortController();
		const previous = previousOf(period, semesters);
		previousAsked = previous?.id ?? null;
		previousTarget = previous;
		previousComposerId = id;
		previousFailed = [];
		previousSummary = null;
		previousClubSummary = null;
		previousRanks = {};
		previousWorks = null;
		previousGenres = null;
		previousFirstWorks = null;
		previousRank = null;
		if (!previous || !id) return;
		await Promise.allSettled([
			...Object.keys(previousRequests)
				.filter((key) => key !== 'clubSummary' || userId)
				.map(askPrevious),
			loadPreviousRank(previousGeneration)
		]);
	}
	// 지난 학기 수치의 '다시 시도': 실패한 요청만 같은 previousGeneration 으로 다시 부른다. 새로 올리면 아직
	// 오지 않은 첫 요청의 응답까지 버려진다. 단추는 사라지므로 포커스는 h1 으로 옮긴다(retryComposer 와 같다).
	function retryPrevious(e) {
		if (document.activeElement === e.currentTarget) heading?.focus();
		const failed = previousFailed;
		previousFailed = [];
		return Promise.allSettled(failed.map(askPrevious));
	}
	// 링크로 연 학기는 학기 목록이 온 뒤에야 앞 학기를 안다. 기간·지기·작곡가가 바뀔 때는 loadCards 가
	// 이미 불렀으므로, 앞 학기가 마지막으로 부른 것과 다를 때만 부른다.
	$: previousId = previousOf(period, semesters)?.id ?? null;
	$: if (previousId !== previousAsked) loadPreviousSummary();
	// 칸마다 { diff: '+3', before: '지난 학기 9' }. 앞 학기가 없거나 아직 없으면 null.
	$: changes = Object.fromEntries(
		['total_plays', 'sessions', 'requested', 'works'].map((key) => {
			const text = kpiChangeText(summary?.[key], previousSummary?.[key]);
			const [diff, before] = text.split(' · ');
			return [key, text ? { diff, before } : null];
		})
	);

	// 지기를 고르면 총 선곡·타임·신청곡 칸에 클럽 몫 줄(통계와 같다). 앞 학기가 있으면 끝 괄호에 그 학기의 몫
	// ('(지난 학기 40.0%)'). 불러오는 중이거나 실패했거나 클럽이 튼 것이 없으면 그 부분은 ''이다.
	$: clubShares = userId
		? Object.fromEntries(
				[
					['total_plays', '곡'],
					['sessions', '타임'],
					['requested', '곡']
				].map(([key, unit]) => [
					key,
					{
						text: clubShareText(summary?.[key], clubSummary?.[key], unit),
						previous: previousShareText(previousSummary?.[key], previousClubSummary?.[key])
					}
				])
			)
		: {};

	$: title = composer ? composer.name : composerError ? `작곡가 #${composerId}` : '작곡가';
	// 머리말 기간: 백엔드가 돌려준 범위. 아직 없으면 보낼 범위로 짐작한다(학기는 학기 목록의 연도·학기로).
	$: semesterRange = semesterRangeOf(period, semesters);
	// 고른 학기가 아직 진행 중이면 '진행 중 · 2026-11-01까지', 시작 전이면 '시작 전 · 2027-03-01부터'
	// (학기 결산과 같다). current.end 는 처음 연 날이다.
	$: ongoing = ongoingText(semesterRange, current.end);
	$: upcoming = upcomingText(semesterRange, current.end);
	$: periodText = appliedFilters
		? periodRangeText(appliedFilters)
		: period === CURRENT
			? periodRangeText(current)
			: period === ALL
				? '전체 기간'
				: period === CUSTOM
					? periodRangeText({ start: customStart, end: customEnd })
					: periodRangeText(semesterRange);
	// 직접 지정을 고르면 입력란에 지금 보이는 기간을 채운다(전체 기간이면 이번 학기).
	$: shownRange =
		appliedFilters && (appliedFilters.start || appliedFilters.end)
			? { start: appliedFilters.start ?? '', end: appliedFilters.end ?? '' }
			: semesterRange ?? current;
	// 기간의 이름('2025-2학기', '이번 학기'). 학기 목록이 아직 없으면 머리말의 기간.
	$: periodName = composerPeriodName(filter, semesters) || periodText;
	// 고른 지기의 이름(목록을 못 받았으면 '지기 #id'), 견습 포함이면 '+견습'. 전체 지기면 ''.
	$: memberText = memberFileText({ userId, name: userName, includeMentees });
	// 탭 제목과 내려받는 파일 이름에 작곡가와, 기본값이 아닌 기간·지기를 넣는다(이름을 못 받았으면 '작곡가 #id').
	$: tabTitle = pageTitle(composer?.name, period === ALL ? '' : periodName, memberText, '작곡가');
	$: fileTag = [
		composer ? composer.name : `작곡가 #${composerId}`,
		period === ALL ? '' : periodText,
		memberText
	];
	$: subtitleFor = (envelope) =>
		envelope
			? [periodName, memberText, `총 ${envelope.total_plays.toLocaleString()}곡`]
					.filter(Boolean)
					.join(' · ')
			: '';
	// 제목과 표의 머리글은 응답이 적용한 bucket 을 따른다(늦은 응답이 다른 이름으로 보이지 않게).
	$: shownBucket = timeline?.filters?.bucket ?? timelineBucket;
	$: timelineTitle = `${timelineBucketName(shownBucket)} 선곡`;
	$: timelineData = timeline && timelineView(timeline, current.end);
	// 선곡이 없어 빠진 달·학기 수(bucketGaps.js), 원래 라벨로 센다.
	$: timelineGapNote = timeline && gapNote(shownBucket, timeline.labels);
	$: timelineOpt =
		timelineData && countBarOption(timelineData, timelineTitle, subtitleFor(timeline));
	$: soloistOpt =
		soloists &&
		horizontalBarOption(
			topOf(soloists, LIMITS.soloists),
			'많이 튼 독주자',
			subtitleFor(soloists),
			rankNotes(soloistTable)?.slice(0, LIMITS.soloists)
		);
	$: conductorOpt =
		conductors &&
		horizontalBarOption(
			topOf(conductors, LIMITS.conductors),
			'많이 튼 지휘자',
			subtitleFor(conductors),
			rankNotes(conductorTable)?.slice(0, LIMITS.conductors)
		);
	$: orchestraOpt =
		orchestras &&
		horizontalBarOption(
			topOf(orchestras, LIMITS.orchestras),
			'많이 튼 오케스트라',
			subtitleFor(orchestras),
			rankNotes(orchestraTable)?.slice(0, LIMITS.orchestras)
		);
	$: genreOpt = genres && eraPieOption(genres, '장르별 분포', subtitleFor(genres));
	// 표로 보기와 CSV 저장은 같은 표다(순위·이름·횟수, 학기를 고르면 지난 학기).
	$: soloistTable =
		soloists && rankChangeTable(soloists, previousRanks.soloists, '연주자', WORKS_LIMIT);
	$: conductorTable =
		conductors && rankChangeTable(conductors, previousRanks.conductors, '지휘자', WORKS_LIMIT);
	$: orchestraTable =
		orchestras && rankChangeTable(orchestras, previousRanks.orchestras, '오케스트라', WORKS_LIMIT);
	// 장르는 장르·횟수·비율(학기를 고르면 지난 학기·변화까지, 통계와 같다).
	$: genreTable =
		genres &&
		(previousGenres ? mixTable(genres, previousGenres, '장르') : shareTable(genres, '장르'));
	$: worksTable =
		works && works.items.length > 0 && composerWorksTable(works, composer, previousWorks);
	// 곡 타일의 숫자가 이 카드의 표를 연다(통계의 KPI 숫자와 같다): 카드로 스크롤해 표(없으면 카드)에 포커스를 둔다.
	let worksCard;
	async function openWorks() {
		await tick();
		worksCard?.scrollIntoView({ block: 'start' });
		(worksCard?.querySelector('.table-scroll') ?? worksCard)?.focus({ preventScroll: true });
	}
	// 많이 튼 곡의 CSV 저장: 차트 카드(ChartCard)처럼, 표가 보일 때만 그 곡들을 받는다.
	$: canExportWorks = Boolean(worksTable) && !loading.works && !errors.works;
	function exportWorksCsv() {
		if (!canExportWorks) return;
		const csv = composerWorksCsv(works, composer, previousWorks);
		downloadCsvTable(
			downloadName(['통계', '많이 튼 곡', fileTag, todayStamp()], 'csv'),
			csv.headers,
			csv.rows
		);
	}
	// 링크는 모두 같은 기간·지기를 연다. 곡 이름은 그 곡의 선곡 기록으로 간다.
	$: worksLinks = works ? works.items.map((item) => composerWorkHref(item.id, filter)) : [];
	// 처음·마지막 날 → 그 하루, 그 곡의 선곡 기록(지기 없이: 날짜가 클럽 전체 기준이다).
	$: worksDateLinks = works ? workDateLinks(works.items) : {};
	// 처음 튼 곡의 '많이 튼 순'(TableCard, 통계와 같다). 기간·지기를 바꿔도 남는다. 표와 링크는 같은 보이는 목록에서 만든다.
	// 통계처럼 URL의 by_count=works 에 둔다. 누를 때만 URL에 쓴다:
	// firstWorksByCountKey 는 URL에 있는 값이고, afterNavigate 가 둘을 함께 URL에서 읽는다.
	let firstWorksByCount = readFirstsByCount($page.url.searchParams).works;
	// 처음 튼 작곡가의 by_count=composers 는 이 페이지가 쓰지 않고, 통계로 돌려주려고 URL과 링크에 잇기만 한다.
	let firstComposersByCount = readFirstsByCount($page.url.searchParams).composers;
	let firstWorksByCountKey = firstWorksByCount;
	// 머리말의 통계 링크(같은 기간·지기, 모든 차트 표로 보기와 처음 튼 많이 튼 순까지). 순위 줄의 링크도 이것에 #composers 를 붙인다.
	$: statLink = statLinkOf(filter, allTables, firstComposersByCount, firstWorksByCount);
	// 순위 줄의 '지난 학기 5위'는 같은 지기·표시로 그 앞 학기(previousTarget)의 통계를 연다(#composers 는 마크업에서).
	// previousTarget 은 반응 블록 안(loadPreviousSummary)에서 바뀌어 이 줄을 다시 부르지 않으므로, 늦게 오는
	// previousRank(그 학기의 순위, 순위 줄의 글)와 함께 다시 만든다.
	$: previousStatLink =
		previousRank && previousTarget
			? statLinkOf(
					{ ...filter, period: String(previousTarget.id), start: '', end: '' },
					allTables,
					firstComposersByCount,
					firstWorksByCount
				)
			: '';
	/**
	 * @param {typeof filter} f
	 * @param {boolean} tables
	 * @param {boolean} composersByCount
	 * @param {boolean} worksByCount
	 */
	function statLinkOf(f, tables, composersByCount, worksByCount) {
		return firstsByCountHref(tableViewHref(composerStatHref(f), tables), {
			composers: composersByCount,
			works: worksByCount
		});
	}
	$: if (firstWorksByCount !== firstWorksByCountKey) {
		firstWorksByCountKey = firstWorksByCount;
		syncFirstWorksByCount();
	}
	function syncFirstWorksByCount() {
		const url = new URL($page.url);
		writeFirstsByCount(url.searchParams, {
			composers: firstComposersByCount,
			works: firstWorksByCount
		});
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}
	$: shownFirstWorks = firstWorksByCount ? byCount(firstWorks) : firstWorks;
	// 처음 튼 곡의 표 아래 줄(통계와 같다): 작품 번호가 같은 곡이 먼저 튼 적이 있을 수 있는 곡, 보이는 순서대로
	// 2곡까지. 이름은 표처럼 이 작곡가를 뺀다: 목록의 곡은 composerFirstsTable 처럼, 다른 곡은 '이 작곡가 - '로
	// 시작하면 그 앞을 뺀다(다른 표기의 작곡가 아래에 든 곡은 '작곡가 - 곡' 그대로). 작곡가를 아직 못 받았으면
	// 받은 이름 그대로.
	$: firstWorkSpelling = firstSpellingNote(
		firstSpellingSplits(
			duplicates.music,
			shownFirstWorks && composer
				? {
						items: shownFirstWorks.items.map((item) => ({
							...item,
							name: composerWorkName({ ...item, composer_id: composer.id }, composer)
						}))
					}
				: shownFirstWorks
		).map((row) =>
			composer && row.variant.name.startsWith(`${composer.name} - `)
				? {
						...row,
						variant: { ...row.variant, name: row.variant.name.slice(`${composer.name} - `.length) }
					}
				: row
		),
		2,
		FIRST_MUSIC_LEAD,
		'곡'
	);
	$: firstWorkLinks = shownFirstWorks
		? shownFirstWorks.items.map((item) => composerWorkHref(item.id, filter))
		: [];
	// 처음 튼 날마다: 그 날 처음 튼 선곡(지기 없이, statFirsts.js 의 firstDayHref). 보이는 순서의 행마다.
	$: firstWorkDayLinks = shownFirstWorks
		? shownFirstWorks.items.map((item) => firstDayHref('work', item.id, item.first_played))
		: [];
	$: firstsAsked = asksFirsts(period, customStart);
	// 독주자·지휘자·오케스트라는 이 작곡가의 곡을 그 사람(악단)과 튼 선곡 기록으로 간다(표의 이름, 차트의 막대).
	$: soloistLinks = composerRankLinks(composerId, 'soloists', soloists, filter);
	$: conductorLinks = composerRankLinks(composerId, 'conductors', conductors, filter);
	$: orchestraLinks = composerRankLinks(composerId, 'orchestras', orchestras, filter);
	// 학기·달마다 그 학기·달에 이 작곡가의 곡을 튼 선곡 기록으로 간다(기간 밖의 날짜는 뺀다).
	$: semesterLinks = composerSemesterLinks(composerId, timeline, semesters, filter);
	// 막대의 dataIndex 는 뒤집힌 순서다(horizontalBarOption). 학기별·월별 선곡은 뒤집지 않는다.
	// 독주자·지휘자·오케스트라 차트는 응답의 앞 LIMITS 개만 그리므로, 그만큼의 링크를 넘긴다.
	function openBar(links, e, reversed = true) {
		const i = e.detail.dataIndex;
		const href = links[reversed ? barItemIndex(i, links.length) : i];
		if (href) goto(href);
	}
	// 처음·마지막 날짜는 기간·지기와 상관없이 그 곡의 전체 기록 기준이다(stats/works).
	$: worksSubtitle = works
		? subtitleFor(works) +
			rankCapSubtitle(works, WORKS_LIMIT, summary?.works, '곡') +
			(period === ALL && !userId ? '' : ' · 처음·마지막은 전체 기록 기준')
		: '';
	$: count = (v) => (v == null ? '—' : v.toLocaleString());
	// 처음·마지막 튼 날 칸 아래의 '전체 기록 YYYY-MM-DD'(전체 기간·전체 지기면 null).
	$: wholeDates = composerWholeDates(filter, wholeSummary);
	// 머리글의 선곡 기록 링크와 총 선곡 숫자는 같은 목록(이 작곡가, 같은 기간·지기)을 연다.
	$: historyLink = composerHistoryHref(composerId, [], filter);
	// 신청곡 숫자는 그중 신청곡만 연다.
	$: requestedLink = composerRequestedHref(composerId, filter);
	// 처음·마지막 튼 날의 날짜는 그날 이 작곡가의 선곡 기록을 연다(같은 지기). 전체 기록 줄의 날짜는 지기 없이 연다.
	// 날짜가 없으면 '' 이라 링크 없이 글자 그대로다.
	$: firstDayLink = composerDayHref(composerId, summary?.date_start, filter);
	$: lastDayLink = composerDayHref(composerId, summary?.date_end, filter);
	$: wholeFirstLink = composerDayHref(composerId, wholeSummary?.date_start);
	$: wholeLastLink = composerDayHref(composerId, wholeSummary?.date_end);
	// 기간에 이 작곡가의 선곡이 없을 때 카드 대신 보이는 말. 화면 낭독기의 로드 상태도 같은 말을 한다.
	$: emptyText = `${period === ALL ? '아직' : '이 기간에는'} ${userId ? '이 지기가 ' : ''}이 작곡가의 곡을 튼 적이 없습니다.`;
	// 화면 낭독기에 알릴 로드 상태(통계와 같다): 작곡가 정보나 카드를 불러오는 동안과 작곡가를 찾을 수 없을 때는
	// 비우고, 다 끝나면 실패한 카드의 이름(페이지 순서)이나 다 불러왔음을, 선곡이 없는 기간이면 그 말을 한다.
	// 처음 튼 곡을 묻지 않으면 loading·errors 가 없어 이름에 들지 않는다.
	$: cardNames = [
		['summary', '요약'],
		['timeline', timelineTitle],
		['works', '많이 튼 곡'],
		['soloists', '많이 튼 독주자'],
		['conductors', '많이 튼 지휘자'],
		['orchestras', '많이 튼 오케스트라'],
		['genres', '장르별 분포'],
		['firstWorks', '처음 튼 곡']
	];
	// 지난 학기 수치가 실패했다는 말은 KPI 칸 아래 줄과 같은 조건으로 붙인다. 작곡가 정보(KPI 칸 위)와
	// 전체 기록(그 아래)이 실패했다는 말도 화면의 줄과 같은 조건으로, 페이지 순서대로 앞뒤에 붙인다.
	$: loadStatus = withFailedLines(
		withPreviousFailure(
			!composerId || notFound || (!composer && !composerError) || CARD_KEYS.some((k) => loading[k])
				? ''
				: summary?.total_plays === 0
					? emptyText
					: loadStatusText(loading, errors, cardNames),
			previousFailed.length ? semesterLabel(previousTarget) : ''
		),
		{
			lead: [composerError && [composerError, '작곡가 정보 다시 시도']],
			tail: [
				wholeError && ['전체 기록의 처음·마지막 날을 불러오지 못했습니다.', '전체 기록 다시 시도']
			]
		}
	);
</script>

<svelte:head>
	<title>{tabTitle}</title>
</svelte:head>

<div class="composer-page">
	<p class="sr-only" role="status">{loadStatus}</p>
	<header class="page-header">
		<div class="title-group">
			<h1 tabindex="-1" bind:this={heading}>{title}</h1>
			{#if composer}
				<span class="facts">{composerFacts(composer)}</span>
			{/if}
			{#if composerId && !notFound}
				<span class="facts">{periodText}</span>
				{#if ongoing}<span class="facts">{ongoing}</span>{/if}
				{#if upcoming}<span class="facts">{upcoming}</span>{/if}
			{/if}
			<a class="page-link" href={statLink}>통계</a>
			{#if composerId && !notFound}
				<a class="page-link" href={historyLink}>선곡 기록</a>
			{/if}
			<!-- 이름으로 검색한 작곡가 정리: 시대·출생 연도를 고치는 곳 -->
			{#if composer}
				<a
					class="page-link"
					href={catalogHref(composer.name)}
					title="작곡가 정리에서 이 작곡가의 시대·출생 연도 고치기">작곡가 정리</a
				>
			{/if}
		</div>
		{#if composerId && !notFound}
			<div class="controls">
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
			</div>
		{/if}
	</header>

	{#if !composerId || notFound}
		<div class="empty-hint">작곡가를 찾을 수 없습니다.</div>
	{:else}
		{#if composerError}
			<p class="kpi-error">
				{composerError}
				<button class="tool-btn" on:click={retryComposer} aria-label="작곡가 정보 다시 시도">
					다시 시도
				</button>
			</p>
		{/if}
		<div class="kpi-row">
			<div class="kpi">
				<!-- 총 선곡 숫자는 그 선곡의 선곡 기록을 연다(0 이면 열 목록이 없어 글자 그대로) -->
				<div class="kpi-value">
					{#if summary?.total_plays > 0}
						<a
							class="kpi-link"
							href={historyLink}
							title="선곡 기록에서 보기"
							aria-label="총 선곡 {count(summary.total_plays)} 곡 선곡 기록에서 보기"
							>{count(summary.total_plays)}</a
						>
					{:else}
						{count(summary?.total_plays)}
					{/if}
				</div>
				<div class="kpi-label">총 선곡</div>
				<!-- 지기를 고르면: 같은 기간 클럽 전체에서의 몫, 괄호에 지난 학기의 몫(한 줄로 넘어간다). 지난 학기 줄보다 위 -->
				{#if clubShares.total_plays?.text}
					<div class="kpi-change kpi-share">
						{clubShares.total_plays.text}
						{#if clubShares.total_plays.previous}
							<span>({clubShares.total_plays.previous})</span>
						{/if}
					</div>
				{/if}
				<!-- 학기를 고르면 앞 학기와 견준 줄. 좁은 칸에서는 · 뒤에서만 줄을 바꾼다 -->
				{#if changes.total_plays}
					<div class="kpi-change">
						<span>{changes.total_plays.diff} ·</span>
						<span>{changes.total_plays.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi">
				<div class="kpi-value">{count(summary?.sessions)}</div>
				<div class="kpi-label">타임</div>
				{#if clubShares.sessions?.text}
					<div class="kpi-change kpi-share">
						{clubShares.sessions.text}
						{#if clubShares.sessions.previous}
							<span>({clubShares.sessions.previous})</span>
						{/if}
					</div>
				{/if}
				{#if changes.sessions}
					<div class="kpi-change">
						<span>{changes.sessions.diff} ·</span>
						<span>{changes.sessions.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi">
				<!-- 신청곡 숫자는 그 신청곡의 선곡 기록을 연다. requested 가 없는 예전 백엔드에서는 '—' -->
				<div class="kpi-value">
					{#if summary?.requested > 0}
						<a
							class="kpi-link"
							href={requestedLink}
							title="선곡 기록에서 보기"
							aria-label="신청곡 {count(summary.requested)} 곡 선곡 기록에서 보기"
							>{count(summary.requested)}</a
						>
					{:else}
						{count(summary?.requested)}
					{/if}
				</div>
				<div class="kpi-label">신청곡</div>
				{#if clubShares.requested?.text}
					<div class="kpi-change kpi-share">
						{clubShares.requested.text}
						{#if clubShares.requested.previous}
							<span>({clubShares.requested.previous})</span>
						{/if}
					</div>
				{/if}
				{#if changes.requested}
					<div class="kpi-change">
						<span>{changes.requested.diff} ·</span>
						<span>{changes.requested.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi">
				<!-- 곡 숫자는 많이 튼 곡 카드의 표를 연다(0 이면 카드가 없어 글자 그대로) -->
				<div class="kpi-value">
					{#if summary?.works > 0}
						<button
							type="button"
							class="kpi-link kpi-open"
							on:click={openWorks}
							title="많이 튼 곡 표 보기"
							aria-label="곡 {count(summary.works)} 곡 — 많이 튼 곡 표 보기"
							>{count(summary.works)}</button
						>
					{:else}
						{count(summary?.works)}
					{/if}
				</div>
				<div class="kpi-label">곡</div>
				{#if changes.works}
					<div class="kpi-change">
						<span>{changes.works.diff} ·</span>
						<span>{changes.works.before}</span>
					</div>
				{/if}
			</div>
			<!-- 처음·마지막 튼 날의 날짜는 그날의 선곡 기록을 연다. 전체 기록 줄은 날짜만 링크다(줄은 '전체 기록' 뒤에서 바뀐다) -->
			<div class="kpi">
				<div class="kpi-value small">
					{#if firstDayLink}
						<a
							class="kpi-link"
							href={firstDayLink}
							title="그날의 선곡 기록 보기"
							aria-label="처음 튼 날 {summary.date_start} 선곡 기록에서 보기"
							>{summary.date_start}</a
						>
					{:else}
						{summary?.date_start ?? '—'}
					{/if}
				</div>
				<div class="kpi-label">처음 튼 날</div>
				{#if wholeDates?.start}
					<div class="kpi-change">
						{#if wholeFirstLink}전체 기록 <a
								class="kpi-link"
								href={wholeFirstLink}
								title="그날의 선곡 기록 보기"
								aria-label="전체 기록의 처음 튼 날 {wholeSummary.date_start} 선곡 기록에서 보기"
								>{wholeSummary.date_start}</a
							>{:else}{wholeDates.start}{/if}
					</div>
				{/if}
			</div>
			<div class="kpi">
				<div class="kpi-value small">
					{#if lastDayLink}
						<a
							class="kpi-link"
							href={lastDayLink}
							title="그날의 선곡 기록 보기"
							aria-label="마지막으로 튼 날 {summary.date_end} 선곡 기록에서 보기"
							>{summary.date_end}</a
						>
					{:else}
						{summary?.date_end ?? '—'}
					{/if}
				</div>
				<div class="kpi-label">마지막으로 튼 날</div>
				{#if wholeDates?.end}
					<div class="kpi-change">
						{#if wholeLastLink}전체 기록 <a
								class="kpi-link"
								href={wholeLastLink}
								title="그날의 선곡 기록 보기"
								aria-label="전체 기록의 마지막으로 튼 날 {wholeSummary.date_end} 선곡 기록에서 보기"
								>{wholeSummary.date_end}</a
							>{:else}{wholeDates.end}{/if}
					</div>
				{/if}
			</div>
		</div>
		{#if errors.summary}
			<p class="kpi-error">
				요약을 불러오지 못했습니다.
				<button
					class="tool-btn"
					on:click={(e) => retry('summary', e, heading)}
					aria-label="요약 다시 시도"
				>
					다시 시도
				</button>
			</p>
		{/if}
		<!-- 요약의 '다시 시도'는 앞 학기를 다시 부르지 않으므로, 요약이 실패했어도 이 줄은 따로 둔다 -->
		{#if previousFailed.length}
			<p class="kpi-error">
				지난 학기({semesterLabel(previousTarget)})와 견준 수치를 불러오지 못했습니다.
				<button class="tool-btn" on:click={retryPrevious} aria-label="지난 학기 수치 다시 시도">
					다시 시도
				</button>
			</p>
		{/if}
		{#if wholeError}
			<p class="kpi-error">
				전체 기록의 처음·마지막 날을 불러오지 못했습니다.
				<button class="tool-btn" on:click={retryWhole} aria-label="전체 기록 다시 시도">
					다시 시도
				</button>
			</p>
		{/if}
		<!-- 진행 중인 학기를 학기 전체인 앞 학기와 견주면 모든 칸이 줄어 보이므로 그렇다고 적는다(학기 결산과 같은 말).
		     이번 학기는 늘 오늘까지라 진행 중이다(머리말의 '진행 중' 칸은 학기를 고를 때만 보인다). -->
		{#if (ongoing || period === CURRENT) && previousTarget}
			<p class="kpi-note">
				진행 중인 학기입니다. 지난 학기({semesterLabel(previousTarget)}) 수치는 학기 전체입니다.
			</p>
		{/if}
		<!-- 많이 튼 작곡가 중 이 작곡가의 순위와 기간 선곡 중 몫(같은 기간·지기, 통계의 많이 튼 작곡가와 같은 셈) -->
		<!-- 괄호 안의 '지난 학기 5위'는 그 앞 학기의 통계에서 많이 튼 작곡가 표를 연다(괄호는 링크 밖) -->
		{#if rankLead && rankNote.startsWith(rankLead)}
			<p class="kpi-note">
				<a
					class="page-link"
					href={cardHref(statLink, 'composers')}
					title="통계의 많이 튼 작곡가 표에서 보기">{rankLead}</a
				>{#if previousLinked}{' ('}<a
						class="page-link"
						href={cardHref(previousStatLink, 'composers')}
						title="통계에서 지난 학기({semesterLabel(previousTarget)})의 많이 튼 작곡가 표 보기"
						>{previousRankLead}</a
					>){rankRest.slice(previousPart.length)}{:else}{rankRest}{/if}
			</p>
		{:else if rankNote}
			<p class="kpi-note">{rankNote}</p>
		{/if}
		<!-- 표기만 다른 이름(표기 정리의 묶음): 그 선곡은 이 페이지에 들지 않으므로, 기간·지기와 상관없이 알린다.
		     이름은 띄어쓰기가 달라도 보이도록 그대로 두고, 그 작곡가 페이지를 같은 기간·지기로 연다.
		     표기 정리는 이 작곡가 이름으로 찾아 열어, 전체 목록 대신 이 작곡가의 묶음부터 보인다 -->
		{#if variants.length}
			<p class="kpi-note variants-note">
				표기만 다른 이름: {#each variants as row, i (row.id)}{i ? ', ' : ''}‘<a
						class="page-link variant"
						href={firstsByCountHref(tableViewHref(composerHref(row.id, filter), allTables), {
							composers: firstComposersByCount,
							works: firstWorksByCount
						})}>{row.name}</a
					>’ 선곡 {count(row.count)}회{/each} (전체 기간). 이 페이지의 수치에는 들지 않습니다. ·
				<a class="page-link" href={catalogViewHref(composer?.name ?? '', DEFAULT_KIND)}>표기 정리</a
				>
			</p>
		{/if}

		{#if summary && summary.total_plays === 0}
			<div class="empty-hint">
				{#if period === ALL}
					{emptyText}
				{:else}
					{emptyText}
					{#if !composerIsWholeRecord({ period, start: customStart, end: customEnd })}
						<button
							class="tool-btn"
							on:click={widenPeriod}
							title="기간만 전체 기간으로 바꿔 다시 보기">전체 기간에서 보기</button
						>
					{/if}
				{/if}
			</div>
		{:else}
			<!-- 키보드·화면 낭독기로 모든 차트를 한 번에 표로 읽는다(카드마다 '표로 보기'를 누르지 않고, 통계와 같다) -->
			<div class="view-row">
				<button
					class="tool-btn"
					class:active={allTables}
					aria-pressed={allTables}
					on:click={toggleAllTables}
					title="모든 차트의 수치를 표로 보기"
				>
					모든 차트 표로 보기
				</button>
			</div>
			<div class="chart-grid">
				<ChartCard
					showTable={allTables}
					title={timelineTitle}
					note={timelineGapNote}
					option={timelineOpt}
					data={timelineData}
					loading={loading.timeline}
					error={errors.timeline}
					retry={() => retry('timeline')}
					{fileTag}
					links={semesterLinks}
					on:itemclick={(e) => openBar(semesterLinks, e, false)}
					csvHeaders={[shownBucket === 'semester' ? '학기' : '월', '횟수']}
				/>
				<!-- 곡은 처음·마지막 날짜까지 보이도록 차트 없이 표로만 -->
				<section
					class="card works-card"
					tabindex="-1"
					aria-label="많이 튼 곡"
					bind:this={worksCard}
				>
					<h2 class="sr-only">많이 튼 곡</h2>
					<div class="toolbar">
						<button
							class="tool-btn"
							on:click={exportWorksCsv}
							disabled={!canExportWorks}
							title="데이터(CSV)로 저장"
							aria-label="많이 튼 곡 CSV 저장"
						>
							CSV 저장
						</button>
					</div>
					{#if loading.works || errors.works || !worksTable}
						<!-- 표가 없으면 제목도 없으므로, 차트 카드처럼 어느 카드인지 여기서 밝힌다. -->
						<div class="placeholder" class:error={!loading.works && errors.works}>
							{placeholderText('많이 튼 곡', { loading: loading.works, error: errors.works })}
							{#if !loading.works && errors.works}
								<button
									class="tool-btn"
									on:click={(e) => retry('works', e, e.currentTarget.closest('section'))}
									aria-label="많이 튼 곡 다시 시도"
								>
									다시 시도
								</button>
							{/if}
						</div>
					{:else}
						<DataTable
							table={worksTable}
							title="많이 튼 곡"
							subtitle={worksSubtitle}
							links={worksLinks}
							cellLinks={worksDateLinks}
						/>
						{#if worksSplit}
							<!-- 곡 표기 정리도 이 작곡가 이름으로 찾는다(작곡가 칸이 맞아 이 작곡가의 곡 묶음만) -->
							<div class="note">
								{worksSplit}&nbsp;·
								<a href={catalogViewHref(composer?.name ?? '', 'music')}>표기 정리</a>
							</div>
						{/if}
					{/if}
				</section>
				<ChartCard
					showTable={allTables}
					title="많이 튼 독주자"
					emptyText={PERFORMER_EMPTY.soloists}
					note={withSplit(rankCapNote(soloists, WORKS_LIMIT), soloistSplit)}
					noteLink={splitLink(soloistSplit, 'player')}
					chartNote={chartTieNote(soloists, LIMITS.soloists, WORKS_LIMIT, '독주자가', '명')}
					option={soloistOpt}
					data={soloists}
					loading={loading.soloists}
					error={errors.soloists}
					retry={() => retry('soloists')}
					{fileTag}
					table={soloistTable}
					csv={soloistTable && tableCsv(soloistTable)}
					links={soloistLinks}
					on:itemclick={(e) => openBar(soloistLinks.slice(0, LIMITS.soloists), e)}
					csvHeaders={['연주자', '횟수']}
				/>
				<ChartCard
					showTable={allTables}
					title="많이 튼 지휘자"
					emptyText={PERFORMER_EMPTY.conductors}
					note={withSplit(
						rankCapNote(conductors, WORKS_LIMIT, summary?.conductors, ['지휘자', '명']),
						conductorSplit
					)}
					noteLink={splitLink(conductorSplit, 'conductor')}
					chartNote={chartTieNote(conductors, LIMITS.conductors, WORKS_LIMIT, '지휘자가', '명')}
					option={conductorOpt}
					data={conductors}
					loading={loading.conductors}
					error={errors.conductors}
					retry={() => retry('conductors')}
					{fileTag}
					table={conductorTable}
					csv={conductorTable && tableCsv(conductorTable)}
					links={conductorLinks}
					on:itemclick={(e) => openBar(conductorLinks.slice(0, LIMITS.conductors), e)}
					csvHeaders={['지휘자', '횟수']}
				/>
				<ChartCard
					showTable={allTables}
					title="많이 튼 오케스트라"
					emptyText={PERFORMER_EMPTY.orchestras}
					note={withSplit(
						rankCapNote(orchestras, WORKS_LIMIT, summary?.orchestras, ['오케스트라', '곳']),
						orchestraSplit
					)}
					noteLink={splitLink(orchestraSplit, 'orchestra')}
					chartNote={chartTieNote(orchestras, LIMITS.orchestras, WORKS_LIMIT, '오케스트라가', '곳')}
					option={orchestraOpt}
					data={orchestras}
					loading={loading.orchestras}
					error={errors.orchestras}
					retry={() => retry('orchestras')}
					{fileTag}
					table={orchestraTable}
					csv={orchestraTable && tableCsv(orchestraTable)}
					links={orchestraLinks}
					on:itemclick={(e) => openBar(orchestraLinks.slice(0, LIMITS.orchestras), e)}
					csvHeaders={['오케스트라', '횟수']}
				/>
				<!-- 장르는 링크가 없다(통계와 같다) -->
				<ChartCard
					showTable={allTables}
					title="장르별 분포"
					option={genreOpt}
					data={genres}
					loading={loading.genres}
					error={errors.genres}
					retry={() => retry('genres')}
					{fileTag}
					table={genreTable}
					csv={genreTable && tableCsv(genreTable)}
					csvHeaders={['장르', '횟수']}
				/>
				<!-- 처음 튼 곡: 클럽 전체에서 처음 튼 날이 이 기간에 드는 이 작곡가의 곡(stats/firsts, 통계와 같다).
				     기간의 시작이 없으면(전체 기간, 시작을 비운 직접 지정) 모든 곡이 '처음'이므로 카드가 없다 -->
				{#if firstsAsked}
					<div class="wide">
						<TableCard
							title="처음 튼 곡"
							subtitle={firstsSubtitle(
								[periodName, memberText].filter(Boolean).join(' · '),
								firstWorks,
								'곡',
								'곡',
								previousFirstWorks
							)}
							table={shownFirstWorks?.items.length
								? composerFirstsTable(shownFirstWorks, composer)
								: null}
							links={firstWorkLinks}
							cellLinks={{ 1: { hrefs: firstWorkDayLinks, title: '이 날 처음 튼 선곡 보기' } }}
							sortLabel="많이 튼 순"
							bind:sorted={firstWorksByCount}
							loading={loading.firstWorks}
							error={errors.firstWorks}
							retry={() => retry('firstWorks')}
							{fileTag}
							note={firstWorkSpelling}
							noteLink={splitLink(firstWorkSpelling, 'music')}
							emptyText={firstWorks?.items.length === 0
								? firstsEmptyText('처음 튼 곡', '곡', previousFirstWorks)
								: ''}
						/>
					</div>
				{/if}
			</div>
			<!-- 장르별 분포에는 링크가 없으므로 이름을 들어 말한다 -->
			<p class="drill-hint">
				학기·달과 독주자·지휘자·오케스트라의 막대나 이름을 누르면 이 작곡가의 그 선곡 기록을 엽니다.
			</p>
		{/if}
	{/if}
</div>

<style>
	/* 통계 페이지와 같은 여백·머리말·KPI·카드 */
	.composer-page {
		padding: 24px 32px;
		width: 100%;
		box-sizing: border-box;
	}
	/* 화면 낭독기만 읽는 줄(통계와 같다) */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	/* 이름이 길거나 직접 지정을 열어 한 줄에 다 들어가지 않으면 컨트롤을 다음 줄 오른쪽에 둔다. */
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
		margin-bottom: 20px;
	}
	/* 이름이 길면 낱말·링크를 쪼개지 않고 통째로 다음 줄로 넘긴다 */
	.title-group {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 12px;
		row-gap: 4px;
	}
	h1 {
		font-family: var(--xlarge-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
		color: var(--gray-gray-950, #1a1a1a);
		margin: 0;
		word-break: keep-all;
	}
	.facts {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
		white-space: nowrap;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 12px 16px;
		margin-left: auto;
	}
	/* 지기 목록을 못 받으면 그 문구는 지기 칸의 오른쪽 끝에서 왼쪽으로 펼쳐진다(MemberSelect).
	   바로 옆 기간 칸의 문구와 겹치지 않도록, 그동안만 지기 칸을 문구만큼 넓힌다. */
	.controls :global(.member-select:has(select[aria-invalid='true'])) {
		min-width: 260px;
		justify-content: flex-end;
	}
	.page-link {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		text-underline-offset: 3px;
		white-space: nowrap;
	}
	.empty-hint {
		text-align: center;
		padding: 80px 0;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.empty-hint .tool-btn {
		margin-left: 12px;
	}
	.kpi-row {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 12px;
		margin-bottom: 20px;
	}
	.kpi {
		background: var(--secondary-secondary-100, #fef9f3);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		padding: 14px 10px;
		text-align: center;
	}
	.kpi-value {
		font-family: var(--large-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--large-font-size, 24px);
		font-weight: 700;
		color: var(--primary-primary-800, #6a5134);
	}
	.kpi-link {
		color: inherit;
		text-decoration: none;
		text-underline-offset: 3px;
	}
	.kpi-link:hover,
	.kpi-link:focus-visible {
		text-decoration: underline;
	}
	/* 카드의 표를 여는 숫자(단추)도 옆 링크와 같은 모양 */
	.kpi-open {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	/* 날짜는 작은 글씨로, 타일 높이가 숫자 타일과 같도록 줄 높이를 맞춘다 */
	.kpi-value.small {
		font-size: var(--medium-font-size, 16px);
		line-height: var(--large-font-size, 24px);
		padding: 4px 0;
	}
	.kpi-label {
		margin-top: 4px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.kpi-change {
		margin-top: 2px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: 12px;
		color: var(--gray-gray-600, #7c7c7c);
	}
	.kpi-change span {
		white-space: nowrap;
	}
	/* 좁은 칸에서도 '52곡' 같은 낱말 안에서는 줄을 바꾸지 않는다 */
	.kpi-share {
		word-break: keep-all;
	}
	.kpi-error,
	.kpi-note {
		margin: -8px 0 16px;
		text-align: center;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--secondary-secondary-800, #95560d);
	}
	.kpi-note {
		color: var(--gray-gray-600, #7c7c7c);
	}
	/* 표기만 다른 이름: 띄어쓰기가 다른 표기도 그대로 보이도록(표기 정리와 같다) */
	.page-link.variant {
		white-space: pre-wrap;
	}
	/* 카드(ChartCard)의 단추와 같은 모양 */
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
	.tool-btn:disabled {
		color: var(--gray-gray-500);
		border-color: var(--gray-gray-400);
		background: var(--secondary-secondary-50);
		cursor: default;
	}
	.kpi-error .tool-btn {
		margin-left: 8px;
	}
	/* 카드의 '표로 보기'가 눌린 모양과 같다. 위의 :hover 규칙보다 세게, 마우스를 올려도 눌린 색을 지킨다 */
	.tool-btn.active,
	.tool-btn.active:hover:not(:disabled) {
		background: var(--action-bg);
		color: var(--action-fg);
	}
	.view-row {
		display: flex;
		justify-content: flex-end;
		margin: -8px 0 8px;
	}
	/* 통계의 안내와 같다 */
	.drill-hint {
		margin: 8px 0 0;
		text-align: center;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.chart-grid {
		display: grid;
		/* 캔버스 폭이 칸의 최소 폭이 되지 않게: 창을 줄이면 카드도 줄어든다 */
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	/* 처음 튼 곡은 격자의 마지막 줄을 다 쓴다(빈칸이 남지 않게) */
	.wide {
		grid-column: 1 / -1;
		min-width: 0;
	}
	/* ChartCard 와 같은 카드 */
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
		min-width: 0;
	}
	/* 많이 튼 곡의 CSV 저장은 ChartCard 의 저장 단추처럼 오른쪽 위에 */
	.works-card {
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
	/* 많이 튼 곡의 줄: ChartCard 의 .note 와 같다 */
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

	@page {
		size: A4;
		margin: 12mm;
	}
	@media print {
		/* 통계와 같다: 사이드바·레이아웃의 규칙은 컴포넌트 범위라 !important 로 이겨 A4 폭에 제 크기로 싣는다 */
		:global(.side-bar) {
			display: none !important;
		}
		:global(html),
		:global(body),
		:global(.screen),
		:global(.app) {
			min-width: 0 !important;
		}
		/* 오른쪽 1px: 카드의 오른쪽 테두리가 종이 끝에 잘리지 않게 */
		.composer-page {
			padding: 0 1px 0 0;
		}
		/* 종이에는 고르는 것·누르는 것을 싣지 않는다: 기간·지기 고르기, 머리말 링크, 모든 차트 표로 보기,
		   카드의 단추(표로 보기, PNG·CSV 저장, 다시 시도, 전체 기간에서 보기), 막대를 누르라는 안내.
		   표의 이름은 남는다 */
		.controls,
		.view-row,
		.title-group .page-link,
		.toolbar,
		.drill-hint,
		.composer-page :global(.tool-btn) {
			display: none !important;
		}
		/* 통계와 같은 작은 칸: A4 폭의 여섯 칸에서 '마지막으로 튼 날'이 낱말 사이에서만 줄을 바꾸게.
		   날짜(.kpi-value.small)는 제 크기 그대로 */
		.kpi-row {
			gap: 6px;
		}
		.kpi {
			padding: 10px 4px;
		}
		.kpi-value {
			font-size: 20px;
		}
		.kpi-label {
			font-size: 12px;
			word-break: keep-all;
		}
		/* 좁은 칸의 '전체 기록 2026-03-02'는 날짜의 '-'가 아니라 '전체 기록' 뒤에서 줄을 바꾼다 */
		.kpi-change {
			text-wrap: balance;
		}
		/* 카드는 한 줄에 하나, 쪽 사이에서 자르지 않는다(표가 든 카드는 길면 다음 쪽으로 이어진다) */
		.chart-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.composer-page :global(.card) {
			box-shadow: none !important;
			break-inside: avoid;
		}
		.composer-page :global(.card:has(.table-view)) {
			break-inside: auto;
		}
		/* 표는 340px 상자 안에서 스크롤하지 않고 모든 행을 싣는다. 쪽을 넘는 표가 카드 밖으로 넘치지 않도록
		   카드와 표 상자는 flex 를 풀고, 머리줄은 붙이지 않는다(새 쪽마다 브라우저가 머리줄을 다시 싣는다).
		   많이 튼 곡은 이 페이지의 카드지만 표 상자는 DataTable 의 것이라 :global 로 잡는다 */
		.composer-page :global(.card:has(.table-view)),
		.composer-page :global(.table-view) {
			display: block !important;
			height: auto !important;
		}
		.composer-page :global(.chart-area:has(.table-view)),
		.composer-page :global(.table-area:has(.table-view)) {
			min-height: 0 !important;
		}
		.composer-page :global(.table-scroll) {
			overflow: visible !important;
		}
		.composer-page :global(.table-scroll thead th) {
			position: static !important;
		}
		/* 인쇄는 차트를 다시 그리지 않으므로, 넓은 창에서 그린 캔버스가 카드보다 넓으면 비율을 지켜 줄인다 */
		.composer-page :global(.echart > div),
		.composer-page :global(.echart canvas) {
			max-width: 100% !important;
		}
		.composer-page :global(.echart canvas) {
			height: auto !important;
		}
	}
</style>
