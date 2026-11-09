<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ChartCard from '$lib/components/stat/ChartCard.svelte';
	import ScopeToggle from '$lib/components/stat/ScopeToggle.svelte';
	import MemberSelect from '$lib/components/stat/MemberSelect.svelte';
	import PeriodSelect from '$lib/components/stat/PeriodSelect.svelte';
	import DrillPanel from '$lib/components/stat/DrillPanel.svelte';
	import TableCard from '$lib/components/stat/TableCard.svelte';
	import {
		horizontalBarOption,
		timelineOption,
		eraPieOption,
		countBarOption,
		diversityLineOption
	} from '$lib/chartOptions.js';
	import {
		readStatQuery,
		statQueryHref,
		readTableView,
		writeTableView,
		tableViewHref,
		readFirstsByCount,
		writeFirstsByCount,
		firstsByCountHref,
		readLinkedCard,
		cardHref
	} from '$lib/statQuery.js';
	import { createLatestRequests } from '$lib/latestRequest.js';
	import {
		requestGroups,
		retryKeys,
		previousRetryRequests,
		eraDistribution,
		genreDistribution,
		diversityTiles,
		loadStatusText,
		withPreviousFailure,
		emptyPeriodText,
		withEmptyPeriod
	} from '$lib/statCards.js';
	import {
		chooseTimelineBucket,
		timelineBucketName,
		timelineView,
		readDiversityBucket,
		writeDiversityBucket,
		semesterRangeOf,
		semesterOf,
		semesterBefore
	} from '$lib/statBucket.js';
	import {
		shareTable,
		seriesTable,
		formatEvenness,
		groupEvenness,
		unknownEraNote,
		topOf,
		rankCapNote,
		PERFORMER_EMPTY
	} from '$lib/statTable.js';
	import { tableCsv } from '$lib/csvTable.js';
	import {
		barItemIndex,
		drillTarget,
		drillParams,
		readDrillQuery,
		writeDrillQuery,
		drillItemIndex,
		drillMark,
		WORKS_LIMIT
	} from '$lib/statDrill.js';
	import {
		CURRENT,
		ALL,
		CUSTOM,
		readStatPeriod,
		readStatRange,
		writeStatPeriod,
		periodRangeText,
		currentSemesterRange,
		semesterLabel
	} from '$lib/statPeriod.js';
	import { historyHref, drillWorkTargets, bucketHistoryLinks } from '$lib/playHistory.js';
	import { gapNote } from '$lib/bucketGaps.js';
	import { composerHref } from '$lib/composerStats.js';
	import {
		reportHref,
		previousSemester,
		kpiChangeText,
		evennessChangeText,
		mixTable,
		rankChangeTable,
		previousRankHrefs,
		rankNotes,
		chartTieNote,
		firstIdSet,
		firstsTable,
		ongoingText,
		upcomingText
	} from '$lib/semesterReport.js';
	import {
		hasPeriodStart,
		firstsSubtitle,
		firstsEmptyText,
		byCount,
		firstDayHref
	} from '$lib/statFirsts.js';
	import { memberFileText } from '$lib/statFileName.js';
	import { pageTitle, periodTitle } from '$lib/statTitle.js';
	import { clubShareText, previousShareText } from '$lib/statShare.js';
	import {
		splitSpellings,
		splitSpellingNote,
		duplicatesSearch,
		catalogViewHref,
		DEFAULT_KIND,
		MUSIC_SPLIT_LEAD,
		drillSplitNote,
		firstSpellingSplits,
		firstSpellingNote,
		FIRST_SPELLING_LEAD,
		FIRST_MUSIC_LEAD
	} from '$lib/catalogSpelling.js';
	import { catalogEraHref, eraCatalogLinks, UNKNOWN_ERA } from '$lib/composerCatalog.js';
	import {
		tasteComposers,
		tasteTable,
		tasteCsv,
		tasteNote,
		tasteBarNotes,
		TASTE_EMPTY,
		TASTE_MIN_PLAYS,
		TASTE_MIN_RATIO
	} from '$lib/statTaste.js';

	// 시대 미상 경고의 '작곡가 정리' 링크: 시대 미상 작곡가만 골라 연다(머리의 링크는 모든 시대).
	const unknownEraHref = catalogEraHref('/stat/composers', UNKNOWN_ERA);

	// 범위·지기·견습 포함·기간·주별/월별·열린 drill-down 패널은 URL에도 둔다(링크로 같은 보기를 연다). 페이지가 시작될 때 한 번만 읽는다.
	const initial = readStatQuery($page.url.searchParams);
	let scope = initial.scope;
	let userId = initial.userId;
	let includeMentees = initial.includeMentees;
	// 모든 차트 표로 보기(view=table): 누르면 모든 차트 카드가 표를 보인다. 카드의 '표로 보기'는 그 카드만 바꾼다.
	let allTables = readTableView($page.url.searchParams);
	let period = readStatPeriod($page.url.searchParams); // 'current' | 'all' | 'custom' | 학기 id
	// 직접 지정 범위(YYYY-MM-DD, 빈 값 = 그쪽이 열림).
	let { start: customStart, end: customEnd } =
		period === CUSTOM ? readStatRange($page.url.searchParams) : { start: '', end: '' };
	// PeriodSelect 가 불러온 학기 목록: 학기 버킷의 링크를 그 학기(semester_id)로 연다.
	let semesters = [];

	// 보기가 바뀌면 URL을 바꾼다. 히스토리를 쌓지 않고, 포커스·스크롤도 그대로 둔다.
	function syncUrl() {
		const url = new URL($page.url);
		writeStatPeriod(url.searchParams, period, { start: customStart, end: customEnd });
		writeDiversityBucket(url.searchParams, diversityBucket);
		writeDrillQuery(url.searchParams, drill ?? linkedDrill);
		writeTableView(url.searchParams, allTables);
		writeFirstsByCount(url.searchParams, firstsByCount);
		goto(statQueryHref(url, { scope, userId, includeMentees }), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	// 기본 기간 = 가장 최근 학기의 시작일부터 오늘까지(선곡 기록과 같은 규칙, statPeriod.js).
	let { start: startDate, end: endDate } = currentSemesterRange();

	let diversityBucket = readDiversityBucket($page.url.searchParams); // 'week' | 'month'
	// 기간별 선곡 추이의 단위: 한 학기를 넘으면 학기별, 아니면 토글이 보이지 않는 쪽(statBucket.js).
	const nextTimelineBucket = () =>
		chooseTimelineBucket(
			period === CUSTOM
				? { period, start: customStart, end: customEnd }
				: { period, start: startDate, end: endDate },
			diversityBucket,
			endDate
		);
	let timelineBucket = nextTimelineBucket();
	// 백엔드가 적용했다고 돌려준 기간(filters). 기간이 바뀔 때만 비운다.
	let appliedFilters = null;

	// 현재 필터를 쿼리스트링으로. withMember 가 false 면 개인 범위여도 지기를 빼고 클럽 전체를 묻는다.
	function buildQuery(extra = {}, withMember = true) {
		const params = new URLSearchParams();
		if (period === CURRENT) {
			if (startDate) params.set('start', startDate);
			if (endDate) params.set('end', endDate);
		} else if (period === CUSTOM) {
			if (customStart) params.set('start', customStart);
			if (customEnd) params.set('end', customEnd);
		} else if (period !== ALL) {
			params.set('semester_id', period);
		}
		if (withMember && scope === 'individual' && userId) {
			params.set('user_id', userId);
			if (includeMentees) params.set('include_mentees', 'true');
		}
		for (const [k, v] of Object.entries(extra)) params.set(k, v);
		const s = params.toString();
		return s ? `?${s}` : '';
	}

	// signal: 그 요청이 더는 어느 카드의 최신도 아니면 취소된다(latestRequest.js). 취소되면 fetch 가 실패하지만,
	// 그때는 isLatest 가 거짓이라 아무것도 알리지 않는다.
	async function getJson(endpoint, extra, withMember = true, signal = undefined) {
		const res = await fetch(`/api/stats/${endpoint}${buildQuery(extra, withMember)}`, { signal });
		if (!res.ok) throw new Error(`${endpoint} 실패`);
		return res.json();
	}

	// 순위 카드의 차트 길이. 이번 기간은 표로 보기·CSV에 모두 싣도록 백엔드의 상한(WORKS_LIMIT, 100)까지
	// 부르고, 앞 학기도 그만큼 불러 표의 지난 학기 칸에 상위 100 안의 순위를 그대로 적는다('23위').
	const LIMITS = { composers: 12, soloists: 12, conductors: 10, orchestras: 10, works: 10 };
	// 카드는 따로 불러오고, 실패하면 그 카드에만 오류를 띄운다. 요청 하나가 여러 카드를 그릴 수 있다:
	// 시대·장르별 분포와 선곡 다양성의 칸은 따로 부르지 않고 다양성 응답으로 그린다(statCards.js).
	const cardRequests = {
		summary: (signal) => getJson('summary', {}, true, signal),
		composers: (signal) => getJson('composers', { limit: WORKS_LIMIT }, true, signal),
		soloists: (signal) => getJson('soloists', { limit: WORKS_LIMIT }, true, signal),
		conductors: (signal) => getJson('conductors', { limit: WORKS_LIMIT }, true, signal),
		orchestras: (signal) => getJson('orchestras', { limit: WORKS_LIMIT }, true, signal),
		timeline: (signal) => getJson('timeline', { bucket: timelineBucket }, true, signal),
		diversity: (signal) => getJson('diversity', { bucket: diversityBucket }, true, signal),
		works: (signal) => getJson('works', { limit: WORKS_LIMIT }, true, signal),
		// 개인 범위만: 지기를 뺀 같은 기간 클럽 전체의 작곡가. 취향 카드가 지기의 작곡가(위 composers)와 견준다.
		clubComposers: (signal) =>
			scope === 'individual' ? getJson('composers', { limit: WORKS_LIMIT }, false, signal) : null,
		// 시작이 없는 기간이면 firsts 는 지금까지 튼 모든 것을 주므로 부르지 않는다(null, statFirsts.js).
		firstComposers: (signal) =>
			hasFirsts() ? getJson('firsts', { kind: 'composer' }, true, signal) : null,
		firstWorks: (signal) => (hasFirsts() ? getJson('firsts', { kind: 'work' }, true, signal) : null)
	};
	const hasFirsts = () =>
		hasPeriodStart({ period, start: period === CUSTOM ? customStart : startDate });
	// 다른 카드의 응답에서 꺼내 그리는 카드.
	const pickCard = { eras: eraDistribution, genres: genreDistribution, diversityTiles };
	const CARD_KEYS = [...Object.keys(cardRequests), ...Object.keys(pickCard)];

	/** @type {Record<string, any>} */
	let data = {};
	/** @type {Record<string, boolean>} */
	let loading = Object.fromEntries(CARD_KEYS.map((key) => [key, true]));
	/** @type {Record<string, string>} */
	let errors = {};
	$: ({
		summary,
		composers,
		soloists,
		conductors,
		orchestras,
		timeline,
		eras,
		genres,
		diversity,
		works
	} = data);
	// 선곡 다양성의 칸: 다양성 응답의 summary. 주별/월별만 바꾸면 다시 부르지 않고 그대로 둔다.
	$: tiles = data.diversityTiles;
	// 요약을 받았는데 선곡이 0이면 카드 대신 한 줄로 알린다(작곡가 페이지·학기 결산과 같다).
	// 불러오는 중(null)·실패에는 카드 그대로다. 카드는 숨은 동안에도 지금처럼 부른다.
	$: empty = summary?.total_plays === 0;
	$: emptyText = emptyPeriodText({
		wholePeriod: period === ALL,
		individual: scope === 'individual',
		includeMentees
	});
	// 칸의 고른정도: 잴 것이 없으면(불러오는 중·실패·센 선곡 없음) null 이고 칸은 '—'다.
	$: eraEvenness = groupEvenness(tiles?.era);
	$: genreEvenness = groupEvenness(tiles?.genre);

	// 카드마다 자기를 덮는 가장 최근 요청의 응답만 반영한다. 늦게 도착한 이전 요청의 응답은 버린다.
	const requests = createLatestRequests();
	// 페이지를 떠나면 아직 기다리던 요청을 끊는다: 다음 페이지의 요청이 브라우저의 대기열에서 그 뒤에 서지 않게.
	onDestroy(() => requests.abortAll());

	async function load(keys) {
		// 개인 범위인데 지기 미선택이면 로드 보류.
		if (scope === 'individual' && !userId) return;
		if (keys.includes('summary')) {
			loadPreviousSummary();
			loadClubSummary();
		}
		const id = requests.begin(keys);
		for (const key of keys) {
			// 불러오는 동안(그리고 실패한 뒤) 이전 필터의 수치가 새 필터의 이름으로 남아 보이지 않도록 비운다.
			data[key] = null;
			loading[key] = true;
			errors[key] = '';
		}
		await Promise.allSettled(
			requestGroups(keys).map(async ([request, cards]) => {
				// 주별/월별로 다양성만 다시 부르면 시대·장르 카드는 덮이지 않으므로, 진행 중인 전체 로드의
				// 다양성 응답이 그 카드들을 채운다(summary 는 버킷과 무관하다).
				const latest = () => cards.filter((key) => requests.isLatest(key, id));
				// 이 요청이 그리는 카드가 모두 더 새 요청으로 넘어가면 취소된다(await 앞에서 받는다).
				const signal = requests.signal(id, cards);
				try {
					const result = await cardRequests[request](signal);
					// 부르지 않은 카드(null)는 비운 채로 둔다.
					if (result == null) return;
					for (const key of latest()) {
						data[key] = pickCard[key] ? pickCard[key](result) : result;
						// 모든 통계 응답이 적용된 기간(filters)을 돌려준다.
						appliedFilters = result.filters;
						openLinkedDrill(key);
					}
				} catch (e) {
					const failed = latest();
					if (failed.length) console.error(`통계 로딩 실패 (${request})`, e);
					for (const key of failed) errors[key] = '불러오지 못했습니다';
				} finally {
					for (const key of latest()) loading[key] = false;
				}
			})
		);
	}
	// 취향 카드는 지기의 작곡가(많이 튼 작곡가와 같은 요청)와 클럽의 작곡가로 그린다: 실패한 쪽만 다시 부른다.
	function retryTaste() {
		for (const key of ['composers', 'clubComposers']) if (errors[key]) retry(key);
	}
	// '다시 시도': 그 카드의 요청이 그리는 카드 가운데 실패한 것만 한 번에 다시 부른다(statCards.js).
	// loadAll 과 달리 drill-down 패널과 기간별 선곡 추이의 단위는 그대로 둔다.
	// 그 카드의 앞 학기 요청도 실패했으면 retryPrevious 처럼 같은 토큰으로 함께 다시 부른다
	// (요약을 다시 부르면 load 가 앞 학기를 모두 다시 부른다).
	function retry(key) {
		const keys = retryKeys(key, errors);
		if (!keys.includes('summary')) {
			const again = previousRetryRequests(keys, previousFailed);
			previousFailed = previousFailed.filter((name) => !again.includes(name));
			again.forEach(askPrevious);
		}
		return load(keys);
	}
	// KPI 줄의 '다시 시도'는 누르면 줄째 사라지므로, 포커스를 다시 불러오는 칸들로 옮긴다.
	function retryRow(key, row) {
		row?.focus();
		retry(key);
	}
	let summaryRow;
	// 많이 튼 작곡가·곡·지휘자·오케스트라 카드: 위 KPI 숫자가 그 카드의 표를 연다(openTable).
	// 시대별·장르별 분포 카드: 선곡 다양성의 시대·장르 다양성 %가 그 카드의 표를 연다.
	let cards = {};
	let tilesRow;
	const loadAll = () => {
		timelineBucket = nextTimelineBucket();
		loadDrill();
		return load(CARD_KEYS);
	};

	// 기간이 목록의 학기면 KPI 칸 아래에 바로 앞 학기와 견준 줄을 둔다(학기 결산과 같다).
	// 앞 학기의 요약은 같은 범위·지기·견습 포함으로 요약과 함께 부르고, 실패하면 줄만 없다.
	// 앞 학기의 요청이 하나라도 실패하면 KPI 칸 아래에 그 학기를 밝히고, 실패한 요청만 다시 부르게 한다.
	// 시대·장르의 표도 앞 학기의 비율과 견준다(학기 결산의 mixTable). 실패하면 그 표만 지금과 같다.
	// 선곡 다양성의 칸도 앞 학기의 다양성 응답과 견준다(summary 는 버킷과 무관하므로 월별로 부른다).
	// 많이 튼 표에는 앞 학기 상위 100(WORKS_LIMIT)에서의 순위를 붙인다(학기 결산의 rankChangeTable).
	// 처음 튼 작곡가·곡의 부제에는 앞 학기에 처음 튼 수를 붙인다(같은 firsts 를 kind 별로 부른다).
	let previousSummary = null;
	let previousEras = null;
	let previousGenres = null;
	let previousTiles = null;
	let previousFirstComposers = null;
	let previousFirstWorks = null;
	let previousClubSummary = null; // 개인 범위에서 앞 학기 클럽 전체의 요약(지난 학기의 몫)
	/** @type {Record<string, any>} 순위 카드별 앞 학기의 목록(LIMITS 의 키) */
	let previousRanks = {};
	let previousAsked = null; // 마지막으로 부른 앞 학기 id(없으면 null)
	let previousTarget = null; // 마지막으로 부른 앞 학기
	let previousToken = 0; // 이전 보기의 늦은 응답은 버린다.
	/** @type {string[]} 실패한 앞 학기 요청(엔드포인트). KPI 칸 아래에 다시 시도와 함께 알린다. */
	let previousFailed = [];
	// 이번 학기는 id 가 아닌 날짜 범위라, 그 시작일의 학기보다 앞선 가장 최근 학기와 견준다(statBucket.js).
	const previousOf = (p, list) => {
		if (p === CURRENT) return semesterBefore(semesterOf(startDate), list);
		const chosen = list.find((s) => String(s.id) === p);
		return chosen ? previousSemester(chosen, list) : null;
	};
	// 앞 학기의 시대·장르도 지금 학기의 카드처럼 다양성 응답에서 꺼낸다(요청 하나, stats/eras·genres 와 같은 수).
	// 월별 버킷이면 쓰지 않는 timeline 이 작다.
	const previousRequests = {
		summary: { apply: (result) => (previousSummary = result) },
		// 개인 범위에서만: 지기를 뺀 앞 학기 클럽 전체(withMember: false). 지난 학기의 몫을 잰다.
		clubSummary: {
			endpoint: 'summary',
			withMember: false,
			apply: (result) => (previousClubSummary = result)
		},
		diversity: {
			extra: { bucket: 'month' },
			apply: (result) => {
				previousTiles = diversityTiles(result);
				previousEras = eraDistribution(result);
				previousGenres = genreDistribution(result);
			}
		},
		firstComposers: {
			endpoint: 'firsts',
			extra: { kind: 'composer' },
			apply: (result) => (previousFirstComposers = result)
		},
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
					extra: { limit: WORKS_LIMIT }
				}
			])
		)
	};
	async function askPrevious(endpoint) {
		const id = previousToken;
		// 기록이 endpoint 를 밝히면 그것을 부른다(키가 같은 엔드포인트를 둘이 나눠 쓸 때).
		const {
			apply,
			extra = {},
			endpoint: path = endpoint,
			withMember = true
		} = previousRequests[endpoint];
		try {
			// buildQuery 는 extra 를 마지막에 넣으므로 기간의 semester_id 만 바뀌고 지기는 그대로다.
			const result = await getJson(
				path,
				{ ...extra, semester_id: String(previousTarget.id) },
				withMember,
				requests.signal(id, ['previousSummary'])
			);
			if (requests.isLatest('previousSummary', id)) apply(result);
		} catch (e) {
			if (requests.isLatest('previousSummary', id)) {
				console.error(`통계 로딩 실패 (지난 학기 ${endpoint})`, e);
				previousFailed = [...previousFailed, endpoint];
			}
		}
	}
	async function loadPreviousSummary() {
		previousToken = requests.begin(['previousSummary']);
		const previous = previousOf(period, semesters);
		previousAsked = previous?.id ?? null;
		previousTarget = previous;
		previousFailed = [];
		previousSummary = null;
		previousEras = null;
		previousGenres = null;
		previousTiles = null;
		previousFirstComposers = null;
		previousFirstWorks = null;
		previousClubSummary = null;
		previousRanks = {};
		if (!previous || (scope === 'individual' && !userId)) return;
		const individual = scope === 'individual' && userId;
		await Promise.allSettled(
			Object.keys(previousRequests)
				.filter((key) => key !== 'clubSummary' || individual)
				.map(askPrevious)
		);
	}
	// 개인 범위에서 지기를 고르면 KPI 칸 아래에 같은 기간 클럽 전체에서의 몫을 쓴다('클럽 342곡 중 12.3%').
	// 클럽의 요약은 지기를 뺀 같은 기간으로 요약과 함께 부르고, 실패하면 줄만 없다(statShare.js).
	let clubSummary = null;
	async function loadClubSummary() {
		const id = requests.begin(['clubSummary']);
		clubSummary = null;
		if (scope !== 'individual' || !userId) return;
		try {
			const result = await getJson('summary', {}, false, requests.signal(id, ['clubSummary']));
			if (requests.isLatest('clubSummary', id)) clubSummary = result;
		} catch (e) {
			if (requests.isLatest('clubSummary', id)) console.error('통계 로딩 실패 (클럽 요약)', e);
		}
	}
	// 앞 학기가 있으면 같은 줄 끝 괄호에 그 학기의 몫을 붙인다('(지난 학기 9.8%)'). 불러오는 중이거나
	// 실패했거나 앞 학기에 클럽이 튼 것이 없으면 previous 는 ''이고 괄호를 쓰지 않는다.
	$: clubShares =
		scope === 'individual' && userId
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
	// 지난 학기 수치의 '다시 시도': 실패한 요청만 같은 토큰으로 다시 부른다. 새 토큰(begin)을 쓰면 아직
	// 오지 않은 첫 요청의 응답까지 버려진다. 줄은 누르자마자 사라지므로 포커스를 KPI 칸으로 옮긴다.
	function retryPrevious() {
		summaryRow?.focus();
		const failed = previousFailed;
		previousFailed = [];
		return Promise.allSettled(failed.map(askPrevious));
	}
	// 링크로 연 학기는 학기 목록이 온 뒤에야 앞 학기를 안다. 기간·범위가 바뀔 때는 load 가 이미
	// 불렀으므로, 앞 학기가 마지막으로 부른 것과 다를 때만 부른다.
	$: previousId = previousOf(period, semesters)?.id ?? null;
	$: if (previousId !== previousAsked) loadPreviousSummary();
	// 칸마다 { diff: '+32', before: '지난 학기 280' }. 앞 학기가 없거나 아직 없으면 null.
	$: changes = Object.fromEntries(
		['total_plays', 'sessions', 'requested', 'composers', 'works', 'conductors', 'orchestras'].map(
			(key) => {
				const text = kpiChangeText(summary?.[key], previousSummary?.[key]);
				const [diff, before] = text.split(' · ');
				return [key, text ? { diff, before } : null];
			}
		)
	);
	// 선곡 다양성의 칸도 같은 모양. 다양성은 보이는 정수 %끼리의 차이(%p)다.
	$: tileChanges = Object.fromEntries(
		Object.entries({
			era: evennessChangeText(groupEvenness(tiles?.era), groupEvenness(previousTiles?.era)),
			genre: evennessChangeText(groupEvenness(tiles?.genre), groupEvenness(previousTiles?.genre))
		}).map(([key, text]) => {
			const [diff, before] = text.split(' · ');
			return [key, text ? { diff, before } : null];
		})
	);

	// drill-down: 순위 카드의 막대나 표의 행 → 그 대상의 곡(같은 기간·범위, statDrill.js).
	// 기간·범위가 바뀌면 같은 대상(id)으로 다시 불러온다.
	/** @type {import('$lib/statDrill.js').DrillTarget | null} */
	let drill = null;
	let drillWorks = null;
	let drillLoading = false;
	let drillError = '';
	// 상한(WORKS_LIMIT)까지 실린 패널이면 그 대상의 곡 수(stats/summary 의 works)를 따로 불러 '(150곡 중)'을 붙인다.
	// 그보다 적게 실린 패널은 부르지 않는다. 불러오는 중이거나 실패하면 null('상위 100곡'만).
	/** @type {number | null} */
	let drillTotal = null;
	/** @type {HTMLElement | null} */
	let drillOpener = null; // 패널을 연 표의 단추. 닫으면 포커스를 돌려준다.
	// URL로 연 패널(drill·drill_id): 그 카드가 처음 불러와지면 id 로 항목을 찾아 연다.
	// 그 기간·범위의 항목에 없으면 이름을 알 수 없으므로 열지 않고 URL에서도 지운다.
	let linkedDrill = readDrillQuery($page.url.searchParams);
	// 기간이 앞 학기가 있는 학기면 같은 대상·범위의 앞 학기 곡도 불러 패널의 표에 지난 학기 칸을 붙인다.
	// 실패하면 패널의 표 아래에 알리고, 그 '다시 시도'는 앞 학기만 다시 부른다.
	let previousDrillWorks = null;
	let previousDrillFailed = false;
	let previousDrillFor = null; // 마지막으로 부른 앞 학기 id(없으면 null)

	async function loadPreviousDrill() {
		const id = requests.begin(['previousDrill']);
		const previous = previousOf(period, semesters);
		previousDrillFor = previous?.id ?? null;
		previousDrillWorks = null;
		previousDrillFailed = false;
		if (!drill || !previous || (scope === 'individual' && !userId)) return;
		try {
			// buildQuery 는 extra 를 마지막에 넣으므로 기간의 semester_id 만 바뀌고 지기는 그대로다.
			const result = await getJson(
				'works',
				{ ...drillParams(drill), semester_id: String(previous.id) },
				true,
				requests.signal(id, ['previousDrill'])
			);
			if (requests.isLatest('previousDrill', id)) previousDrillWorks = result;
		} catch (e) {
			if (requests.isLatest('previousDrill', id)) {
				console.error('통계 로딩 실패 (지난 학기 drill works)', e);
				previousDrillFailed = true;
			}
		}
	}
	// 링크로 연 학기는 학기 목록이 온 뒤에야 앞 학기를 안다(요약의 previousId 와 같다).
	$: if (drill && previousId !== previousDrillFor) loadPreviousDrill();

	async function loadDrill() {
		if (!drill || (scope === 'individual' && !userId)) return;
		loadPreviousDrill();
		const id = requests.begin(['drill', 'drillTotal']);
		drillWorks = null;
		drillTotal = null;
		drillLoading = true;
		drillError = '';
		try {
			const result = await getJson(
				'works',
				drillParams(drill),
				true,
				requests.signal(id, ['drill'])
			);
			if (requests.isLatest('drill', id)) {
				drillWorks = result;
				if (result.items.length >= WORKS_LIMIT) loadDrillTotal(drill, id);
			}
		} catch (e) {
			if (requests.isLatest('drill', id)) {
				console.error('통계 로딩 실패 (works)', e);
				drillError = '불러오지 못했습니다';
			}
		} finally {
			if (requests.isLatest('drill', id)) drillLoading = false;
		}
	}
	async function loadDrillTotal(target, id) {
		try {
			// buildQuery 가 기간·지기를 works 요청과 같게 넣는다.
			const result = await getJson(
				'summary',
				{ [target.param]: String(target.id) },
				true,
				requests.signal(id, ['drillTotal'])
			);
			if (requests.isLatest('drillTotal', id)) drillTotal = result.works;
		} catch (e) {
			if (requests.isLatest('drillTotal', id)) console.error('통계 로딩 실패 (drill summary)', e);
		}
	}
	function openDrill(card, index) {
		const target = drillTarget(card, data[card], index);
		if (!target) return;
		const active = document.activeElement;
		drillOpener = active instanceof HTMLElement && active.closest('.card') ? active : null;
		linkedDrill = null; // 링크의 패널이 아직 열리지 않았으면, 지금 고른 것이 이긴다.
		drill = target;
		syncUrl();
		loadDrill();
	}
	function openLinkedDrill(card) {
		if (linkedDrill?.card !== card) return;
		const index = drillItemIndex(data[card], linkedDrill.id);
		linkedDrill = null;
		if (index >= 0) openDrill(card, index);
		else syncUrl();
	}
	// 열린 패널의 대상은 그 카드의 막대(앞 LIMITS 안이면)와 표로 보기의 행에 표시한다. 기간·범위가 바뀌면
	// 새 응답에서 같은 id 를 다시 찾고, 없으면 표시하지 않는다(statDrill.js 의 drillMark).
	$: marks = Object.fromEntries(
		['composers', 'soloists', 'conductors', 'orchestras'].map((card) => [
			card,
			drillMark(drill, card, data[card], LIMITS[card])
		])
	);
	// 막대는 1위가 맨 위에 오도록 뒤집혀 그려진다. 차트는 응답의 앞 LIMITS[card]개만 그린다.
	const openBar = (card, e) =>
		openDrill(
			card,
			barItemIndex(e.detail.dataIndex, Math.min(data[card]?.labels?.length ?? 0, LIMITS[card]))
		);
	async function closeDrill() {
		requests.begin(['drill', 'previousDrill', 'drillTotal']); // 진행 중인 응답은 버린다.
		drill = null;
		drillWorks = null;
		drillTotal = null;
		previousDrillWorks = null;
		previousDrillFailed = false;
		syncUrl();
		await tick();
		if (drillOpener?.isConnected) drillOpener.focus();
		drillOpener = null;
	}

	onMount(loadAll);

	// URL의 카드 해시(#works, 학기 결산의 '통계에서 모두 보기'): 처음 불러온 모든 카드가 끝나면 한 번 그 카드의
	// 표를 연다(openTable). 위 카드들과 KPI 칸 아래의 지난 학기 줄이 다 그려진 뒤라야 스크롤한 자리가 밀리지
	// 않는다. 해시는 브라우저에만 있다.
	/** @type {string | null} */
	let linkedCard = null;
	onMount(() => (linkedCard = readLinkedCard($page.url.hash)));
	$: previousSettled =
		previousId == null || previousSummary != null || previousFailed.includes('summary');
	$: if (linkedCard && previousSettled && CARD_KEYS.every((key) => !loading[key])) openLinkedCard();
	function openLinkedCard() {
		const key = linkedCard;
		linkedCard = null;
		cards[key]?.openTable();
	}

	// 표기 정리의 묶음(catalog/duplicates/, 전체 기간): 기간·지기와 상관없으므로 처음 한 번만 부르고,
	// 많이 튼 작곡가·독주자·지휘자·오케스트라에 한 묶음의 표기가 둘 이상 들면(많이 튼 곡은 작곡가와 작품 번호가
	// 같은 곡이 둘 이상 들면) 그 카드의 줄에 알린다.
	// 종류마다 따로 부르고, 못 받은 종류만 줄을 두지 않는다.
	/** @type {Record<string, any>} */
	let duplicates = {};
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
	onMount(() => ['composer', 'player', 'conductor', 'orchestra', 'music'].forEach(loadDuplicates));
	$: composerSplit = splitSpellingNote(splitSpellings(duplicates.composer, composers));
	$: soloistSplit = splitSpellingNote(splitSpellings(duplicates.player, soloists));
	$: conductorSplit = splitSpellingNote(splitSpellings(duplicates.conductor, conductors));
	$: orchestraSplit = splitSpellingNote(splitSpellings(duplicates.orchestra, orchestras));
	// 곡 이름(작곡가 - 곡)은 길어서 2묶음까지.
	$: worksSplit = splitSpellingNote(splitSpellings(duplicates.music, works), 2, MUSIC_SPLIT_LEAD);
	// 열린 패널의 곡 중 작품 번호가 같은 곡(패널이 보이는 이름으로).
	$: drillSplit = drill ? drillSplitNote(duplicates.music, drillWorks, drill) : '';
	// 카드의 줄: 상위 N위 줄 뒤에 표기 줄을 ' · '로 잇고, 표기 줄이 있으면 그 종류의 표기 정리로 잇는다.
	const withSplit = (capNote, split) => [capNote, split].filter(Boolean).join(' · ');
	const splitLink = (split, kind) =>
		split ? { href: catalogViewHref('', kind), text: '표기 정리' } : null;
	// 처음 튼 작곡가·곡: 다른 표기(곡은 작품 번호가 같은 곡)가 먼저 튼 적이 있을 수 있는 행. 보이는 순서대로
	// 작곡가는 3명, 곡은 이름이 길어 2곡까지.
	$: firstComposerSpelling = firstSpellingNote(
		firstSpellingSplits(duplicates.composer, shownFirstComposers),
		3,
		FIRST_SPELLING_LEAD,
		'명'
	);
	$: firstWorkSpelling = firstSpellingNote(
		firstSpellingSplits(duplicates.music, shownFirstWorks),
		2,
		FIRST_MUSIC_LEAD,
		'곡'
	);

	function onScopeChange(e) {
		scope = e.detail;
		syncUrl();
		loadAll();
	}
	function onMemberChange(e) {
		userId = e.detail.userId;
		includeMentees = e.detail.includeMentees;
		syncUrl();
		loadAll();
	}
	function onPeriodChange(e) {
		period = e.detail;
		appliedFilters = null;
		syncUrl();
		loadAll();
	}
	function setDiversityBucket(b) {
		if (diversityBucket === b) return;
		diversityBucket = b;
		syncUrl();
		// 한 학기 이하면 기간별 선곡 추이도 반대 단위로 바뀌므로 함께 다시 부른다.
		const next = nextTimelineBucket();
		if (next === timelineBucket) load(['diversity']);
		else {
			timelineBucket = next;
			load(['diversity', 'timeline']);
		}
	}

	// 머리말 기간: 백엔드가 돌려준 범위. 아직 없으면 보낼 범위로 짐작한다(학기는 학기 목록의 연도·학기로).
	$: semesterRange = semesterRangeOf(period, semesters);
	// 고른 학기가 아직 진행 중이면 '진행 중 · 2026-11-01까지', 시작 전이면 '시작 전 · 2027-03-01부터'
	// (학기 결산과 같다). endDate 는 처음 연 날이다.
	$: ongoing = ongoingText(semesterRange, endDate);
	$: upcoming = upcomingText(semesterRange, endDate);
	$: periodText = appliedFilters
		? periodRangeText(appliedFilters)
		: period === CURRENT
			? `${startDate} ~ ${endDate}`
			: period === ALL
				? '전체 기간'
				: period === CUSTOM
					? periodRangeText({ start: customStart, end: customEnd })
					: periodRangeText(semesterRange);
	// 직접 지정을 고르면 입력란에 지금 보이는 기간을 채운다(전체 기간이면 이번 학기).
	$: shownRange =
		appliedFilters && (appliedFilters.start || appliedFilters.end)
			? { start: appliedFilters.start ?? '', end: appliedFilters.end ?? '' }
			: semesterRange ?? { start: startDate, end: endDate };
	// 내려받는 파일 이름에 넣을 보기: 머리말의 기간과, 개인이면 지기(statFileName.js).
	let userName = '';
	$: memberText =
		scope === 'individual' ? memberFileText({ userId, name: userName, includeMentees }) : '';
	$: fileTag = [periodText, memberText];
	// 탭 제목에도 보기를 넣는다(기본값인 이번 학기·전체는 빼고): '가상이 · 2025-2학기 · 통계'.
	$: tabTitle = pageTitle(
		memberText,
		periodTitle({ period, start: customStart, end: customEnd }, semesters),
		'통계'
	);
	// 차트 부제: 기간(기간 선택의 이름, 학기 목록 전에는 머리말의 날짜) · 지기(개인) 또는 전체 · 전체 선곡 수.
	// PNG로 저장한 차트, 표로 보기, 화면 낭독기의 차트 이름이 모두 이 보기를 말한다.
	$: periodName =
		(period === CURRENT
			? '이번 학기'
			: periodTitle({ period, start: customStart, end: customEnd }, semesters)) || periodText;
	$: viewLabel = pageTitle(periodName, scope === 'individual' ? memberText : '전체');
	$: subtitleFor = (envelope) =>
		envelope ? `${viewLabel} · 총 ${envelope.total_plays.toLocaleString()}곡` : '';

	// 순위 차트는 상위 LIMITS 개만 그린다(표로 보기·CSV는 응답 전체).
	$: composerOpt =
		composers &&
		horizontalBarOption(
			topOf(composers, LIMITS.composers),
			'많이 튼 작곡가',
			subtitleFor(composers),
			rankNotes(composerTable)?.slice(0, LIMITS.composers)
		);
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
	// 같은 작곡가의 곡이 같은 이름으로 잘리지 않게 이름 칸을 220px로 넓힌다.
	$: worksOpt =
		works &&
		horizontalBarOption(
			topOf(works, LIMITS.works),
			'많이 튼 곡',
			subtitleFor(works),
			rankNotes(worksTable)?.slice(0, LIMITS.works),
			220
		);
	// 취향: 지기의 작곡가 가운데 같은 기간 클럽보다 비중이 큰 작곡가와 그 배율(statTaste.js, 개인 범위만).
	$: taste = composers && data.clubComposers ? tasteComposers(composers, data.clubComposers) : null;
	$: tasteOpt =
		taste &&
		horizontalBarOption(
			taste,
			'취향',
			`${viewLabel} · 클럽보다 ${TASTE_MIN_RATIO}배 이상 자주 튼 작곡가(${TASTE_MIN_PLAYS}번 이상)`,
			tasteBarNotes(taste)
		);
	$: timelineTitle = `${timelineBucketName(timelineBucket)} 선곡 추이`;
	// 화면 낭독기에 알리는 로드 상태(statCards.js)가 읽는 카드 이름, 페이지 순서. 선곡 다양성은 그 절의 제목이다.
	$: cardNames = [
		['summary', '요약'],
		['composers', '많이 튼 작곡가'],
		['soloists', '많이 튼 독주자'],
		['conductors', '많이 튼 지휘자'],
		['orchestras', '많이 튼 오케스트라'],
		['eras', '시대별 분포'],
		['genres', '장르별 분포'],
		['timeline', timelineTitle],
		['works', '많이 튼 곡'],
		// 취향은 개인 범위에만 있고, 지기의 작곡가(많이 튼 작곡가와 같은 요청)와 클럽의 작곡가로 그린다.
		...(scope === 'individual'
			? [
					['clubComposers', '취향'],
					['composers', '취향']
				]
			: []),
		['diversityTiles', '선곡 다양성'],
		['diversity', '선곡 다양성'],
		['firstComposers', '처음 튼 작곡가'],
		['firstWorks', '처음 튼 곡']
	];
	// 개인 범위인데 지기 미선택이면 카드를 부르지 않으므로(load) 알릴 것도 없다.
	// 선곡이 없는 기간이면 다 불러온 뒤 카드 대신 보이는 말을 한다(학기 결산과 같다).
	// 지난 학기 수치가 실패했다는 말은 KPI 칸 아래 줄과 같은 조건으로 붙인다.
	$: loadStatus = withPreviousFailure(
		scope === 'individual' && !userId
			? ''
			: withEmptyPeriod(loadStatusText(loading, errors, cardNames), empty && emptyText),
		previousFailed.length && !errors.summary ? semesterLabel(previousTarget) : ''
	);
	$: timelineData = timeline && timelineView(timeline, endDate);
	$: timelineOpt = timelineData && timelineOption(timelineData, timelineTitle, viewLabel);
	// 선곡이 없어 빠진 주·월·학기 수(bucketGaps.js). '(진행 중)'이 붙기 전의 원래 라벨로 센다.
	$: timelineGapNote =
		timeline && gapNote(timeline.filters?.bucket ?? timelineBucket, timeline.labels);
	$: eraOpt = eras && eraPieOption(eras, '시대별 분포', subtitleFor(eras));
	$: eraNote = unknownEraNote(eras);
	$: genreOpt = genres && eraPieOption(genres, '장르별 분포', subtitleFor(genres));
	// 표로 보기와 CSV 저장은 같은 표다(앞 학기가 있으면 지난 학기·변화 열까지, 학기 결산과 같다).
	$: eraTable =
		eras && (previousEras ? mixTable(eras, previousEras, '시대') : shareTable(eras, '시대'));
	// 표로 보기의 시대 이름은 작곡가 정리의 그 시대로 간다(지난 학기에만 있는 행도).
	$: eraLinks = eraTable ? eraCatalogLinks(eraTable.rows.map((row) => row[0])) : [];
	$: genreTable =
		genres &&
		(previousGenres ? mixTable(genres, previousGenres, '장르') : shareTable(genres, '장르'));
	// 많이 튼 표도 같다: 순위·이름·횟수(앞 학기가 있으면 지난 학기 열까지).
	// 작곡가·곡은 처음 튼 목록이 오면 이 기간에 처음 튼 행을 '첫 선곡'으로 적는다.
	$: composerTable =
		composers &&
		rankChangeTable(
			composers,
			previousRanks.composers,
			'작곡가',
			WORKS_LIMIT,
			firstIdSet(firstComposers)
		);
	$: soloistTable =
		soloists && rankChangeTable(soloists, previousRanks.soloists, '연주자', WORKS_LIMIT);
	$: conductorTable =
		conductors && rankChangeTable(conductors, previousRanks.conductors, '지휘자', WORKS_LIMIT);
	$: orchestraTable =
		orchestras && rankChangeTable(orchestras, previousRanks.orchestras, '오케스트라', WORKS_LIMIT);
	$: worksTable =
		works && rankChangeTable(works, previousRanks.works, '곡', WORKS_LIMIT, firstIdSet(firstWorks));
	// 많이 튼 표의 지난 학기 칸('23위')은 그 순위를 센 앞 학기(previousTarget)를 같은 보기(범위·지기·견습,
	// 처음 튼 '많이 튼 순')와 모든 차트 표로 보기로 연다. previousTarget 은 $: 가 부르는 loadPreviousSummary 가
	// 바꾸므로, 순위(previousRanks)가 올 때 다시 만든다.
	$: previousLink =
		previousRanks && previousTarget && !(scope === 'individual' && !userId)
			? {
					href: statQueryHref(
						new URL(
							firstsByCountHref(
								tableViewHref(`/stat?semester_id=${previousTarget.id}`, true),
								firstsByCount
							),
							'http://localhost'
						),
						{ scope, userId, includeMentees }
					),
					label: semesterLabel(previousTarget)
				}
			: null;
	// 순위인 칸만 같은 카드의 표(#composers)로 가는 링크다(없음·100위 밖·첫 선곡은 글자). 같은 페이지라 새로 불러온다.
	const previousCellLinks = (table, key, title, link) =>
		table && link
			? {
					[table.columns.length - 1]: {
						hrefs: previousRankHrefs(table, cardHref(link.href, key)),
						title: `지난 학기(${link.label})의 ${title} 표 보기`,
						reload: true
					}
				}
			: {};

	// 다양성: 버킷 라벨, 선곡 수 막대, 다양성(고른정도) 추이.
	$: bucketLabel = diversityBucket === 'week' ? '주별' : '월별';
	// 선곡 추이처럼 오늘이 든 주·월에 ' (진행 중)'(statBucket.js); 막대·점의 링크는 원래 라벨로 만든다.
	$: diversityLabels =
		diversity &&
		timelineView({ filters: diversity.filters, labels: diversity.timeline.labels }, endDate).labels;
	$: countData = diversity && {
		labels: diversityLabels,
		values: diversity.timeline.plays
	};
	$: countOpt = countData && countBarOption(countData, `${bucketLabel} 선곡 수`, viewLabel);
	// 선곡 수와 다양성 추이는 같은 답이라 빠진 주·월도 같다: 두 카드에 같은 줄을 붙인다.
	$: diversityGapNote =
		diversity && gapNote(diversity.filters?.bucket ?? diversityBucket, diversity.timeline.labels);
	$: diversityOpt =
		diversity &&
		diversityLineOption(
			diversityLabels,
			[
				{ name: '시대 다양성', values: diversity.timeline.era_evenness },
				{ name: '장르 다양성', values: diversity.timeline.genre_evenness }
			],
			`${bucketLabel} 다양성 추이`,
			'0%=편중 · 100%=고름 (가능한 모든 시대·장르를 고르게 틀수록 100%)'
		);
	// 다양성 추이: 차트의 data(PNG·CSV 저장의 빈 데이터 판단용).
	$: diversityCsvData = diversity && {
		labels: diversityLabels,
		values: diversity.timeline.era_evenness
	};
	// 표로 보기: 다양성 추이는 두 계열을 모두 싣는다(그 밖의 시계열 카드는 data 로 만든다).
	// CSV 는 이 표를 화면 그대로(41%) 저장한다.
	$: diversityTable =
		diversity &&
		seriesTable(diversityLabels, '기간', [
			{ name: '시대 다양성', values: diversity.timeline.era_evenness, format: formatEvenness },
			{ name: '장르 다양성', values: diversity.timeline.genre_evenness, format: formatEvenness }
		]);
	$: pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
	// 머리말의 '선곡 기록' 링크: 같은 기간과(개인 범위면) 같은 지기의 선곡 목록.
	$: historyFilter = {
		period,
		start: customStart,
		end: customEnd,
		q: '',
		userId: scope === 'individual' ? userId : null,
		includeMentees,
		requested: ''
	};
	$: historyLink = historyHref(historyFilter);
	// 머리말의 '학기 결산' 링크: 기간이 학기면 그 학기의, 아니면 가장 최근 학기의 결산(by_count 를 이어 간다).
	// 개인에서 지기를 골랐으면 그 지기(와 견습 포함)의 결산. 지기 없는 개인 결산은 안내뿐이므로 클럽 결산을 연다.
	$: reportLink = statQueryHref(
		new URL(firstsByCountHref(reportHref(period), firstsByCount), 'http://localhost'),
		scope === 'individual' && userId
			? { scope, userId, includeMentees }
			: { scope: 'all', userId: null, includeMentees: false }
	);
	// 신청곡 칸의 숫자: 같은 목록에서 신청곡만.
	$: requestedLink = historyHref({ ...historyFilter, requested: 'true' });
	// 처음·마지막 튼 날 칸의 날짜: 그 하루(직접 지정)의 선곡 기록. 지기는 그대로 둔다(그 지기 기준으로 구한 날짜다).
	$: dayLink = (/** @type {string} */ date) =>
		historyHref({ ...historyFilter, period: CUSTOM, start: date, end: date });
	// drill-down 패널의 'N곡 모두 보기': stats/works 에 보낸 것과 같은 기간·지기·id 필터.
	$: drillHistoryLink =
		drill &&
		historyHref({ ...historyFilter, targets: [{ param: drill.param, id: String(drill.id) }] });
	// 패널의 곡 하나: 같은 기간·지기에서 그 대상이 그 곡을 튼 선곡.
	$: drillWorkLink = (item) =>
		drill && item.id != null
			? historyHref({ ...historyFilter, targets: drillWorkTargets(drill, item.id) })
			: null;
	// 많이 튼 곡의 곡 하나: 같은 기간·지기에서 그 곡을 튼 선곡(표의 이름, 차트의 막대·이름).
	$: worksLinks = works
		? works.items.map((item) =>
				historyHref({ ...historyFilter, targets: [{ param: 'music_id', id: String(item.id) }] })
			)
		: [];
	// 막대는 1위가 맨 위에 오도록 뒤집혀 그려진다. 차트는 앞 LIMITS.works 곡만, 링크는 표의 모든 행.
	function openWork(e) {
		const length = Math.min(worksLinks.length, LIMITS.works);
		const href = worksLinks[barItemIndex(e.detail.dataIndex, length)];
		if (href) goto(href);
	}
	// 처음 튼 작곡가·곡: 이름은 같은 기간·지기의 작곡가 페이지와, 그 곡의 선곡 기록을 연다.
	$: firstsAsked = hasPeriodStart({ period, start: period === CUSTOM ? customStart : startDate });
	$: firstComposers = data.firstComposers;
	$: firstWorks = data.firstWorks;
	// 카드마다 '많이 튼 순'(TableCard). 기간·지기를 바꿔도 남는다. 표와 링크는 같은 보이는 목록에서 만든다.
	// URL의 by_count 에서 읽고, 누르면 URL에 쓴다(처음 그릴 때는 URL과 같으므로 쓰지 않는다).
	let firstsByCount = readFirstsByCount($page.url.searchParams);
	let firstsByCountKey = `${firstsByCount.composers}${firstsByCount.works}`;
	$: {
		const key = `${firstsByCount.composers}${firstsByCount.works}`;
		if (key !== firstsByCountKey) {
			firstsByCountKey = key;
			syncUrl();
		}
	}
	$: shownFirstComposers = firstsByCount.composers ? byCount(firstComposers) : firstComposers;
	$: shownFirstWorks = firstsByCount.works ? byCount(firstWorks) : firstWorks;
	$: firstComposerLinks = shownFirstComposers
		? shownFirstComposers.items.map((item) =>
				firstsByCountHref(
					tableViewHref(
						composerHref(item.id, {
							period,
							start: customStart,
							end: customEnd,
							userId: scope === 'individual' ? userId : null,
							includeMentees
						}),
						allTables
					),
					firstsByCount
				)
			)
		: [];
	$: firstWorkLinks = shownFirstWorks
		? shownFirstWorks.items.map((item) =>
				historyHref({ ...historyFilter, targets: [{ param: 'music_id', id: String(item.id) }] })
			)
		: [];
	// 처음 튼 날마다: 그 날 처음 튼 선곡(지기 없이, statFirsts.js 의 firstDayHref). 보이는 순서의 행마다.
	$: firstComposerDayLinks = shownFirstComposers
		? shownFirstComposers.items.map((item) => firstDayHref('composer', item.id, item.first_played))
		: [];
	$: firstWorkDayLinks = shownFirstWorks
		? shownFirstWorks.items.map((item) => firstDayHref('work', item.id, item.first_played))
		: [];
	const firstDayTitle = '이 날 처음 튼 선곡 보기';
	// 시계열 카드의 주·월·학기마다: 같은 지기의 그 기간 선곡 기록(표의 기간, 차트의 막대·점).
	$: timelineLinks = bucketHistoryLinks(historyFilter, timeline, semesters);
	$: diversityLinks = bucketHistoryLinks(
		historyFilter,
		diversity && { filters: diversity.filters, labels: diversity.timeline.labels }
	);
	function openBucket(links, e) {
		const href = links[e.detail.dataIndex];
		if (href) goto(href);
	}
</script>

<svelte:head>
	<title>{tabTitle}</title>
</svelte:head>

<div class="stat-page">
	<!-- 화면 낭독기에만: 카드를 다 불러왔는지, 어느 카드가 실패했는지(불러오는 동안은 비어 있다) -->
	<p class="sr-only" role="status">{loadStatus}</p>
	<header class="page-header">
		<div class="title-group">
			<h1>통계</h1>
			<span class="period">{periodText}</span>
			{#if ongoing}<span class="period">{ongoing}</span>{/if}
			{#if upcoming}<span class="period">{upcoming}</span>{/if}
			<a class="history-link" href={historyLink}>선곡 기록</a>
			<a class="history-link" href="/stat/composers">작곡가 정리</a>
			<!-- 기간이 학기면 그 학기의, 아니면 가장 최근 학기의 결산(개인이면 그 지기의) -->
			<a class="history-link" href={reportLink}>학기 결산</a>
		</div>
		<div class="controls">
			<PeriodSelect
				bind:period
				bind:start={customStart}
				bind:end={customEnd}
				bind:semesters
				{shownRange}
				on:change={onPeriodChange}
			/>
			<ScopeToggle bind:scope on:change={onScopeChange} />
			{#if scope === 'individual'}
				<MemberSelect bind:userId bind:includeMentees bind:userName on:change={onMemberChange} />
			{/if}
		</div>
	</header>

	{#if scope === 'individual' && !userId}
		<div class="empty-hint">지기를 선택하면 개인 통계를 볼 수 있습니다.</div>
	{:else}
		<!-- KPI 카드 -->
		<div class="kpi-row" bind:this={summaryRow} tabindex="-1">
			<!-- 선곡을 세는 두 칸의 숫자는 그 선곡의 선곡 기록을 연다(0 이면 열 목록이 없어 글자 그대로) -->
			<div class="kpi">
				<div class="kpi-value">
					{#if summary?.total_plays > 0}
						<a
							class="kpi-link"
							href={historyLink}
							title="선곡 기록에서 보기"
							aria-label="총 선곡 {summary.total_plays.toLocaleString()} 곡 선곡 기록에서 보기"
							>{summary.total_plays.toLocaleString()}</a
						>
					{:else}
						{summary ? summary.total_plays.toLocaleString() : '—'}
					{/if}
				</div>
				<div class="kpi-label">총 선곡</div>
				<!-- 개인 범위: 같은 기간 클럽 전체에서의 몫, 괄호에 지난 학기의 몫(한 줄로 넘어간다). 지난 학기 줄보다 위 -->
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
			<!-- sessions·requested 가 없는 예전 백엔드에서는 '—' -->
			<div class="kpi">
				<div class="kpi-value">
					{summary && summary.sessions != null ? summary.sessions.toLocaleString() : '—'}
				</div>
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
				<div class="kpi-value">
					{#if summary?.requested > 0}
						<a
							class="kpi-link"
							href={requestedLink}
							title="선곡 기록에서 보기"
							aria-label="신청곡 {summary.requested.toLocaleString()} 곡 선곡 기록에서 보기"
							>{summary.requested.toLocaleString()}</a
						>
					{:else}
						{summary && summary.requested != null ? summary.requested.toLocaleString() : '—'}
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
				<div class="kpi-value">
					{#if summary?.composers > 0}
						<button
							type="button"
							class="kpi-link kpi-open"
							on:click={() => cards.composers?.openTable()}
							title="많이 튼 작곡가 표로 보기"
							aria-label="작곡가 {summary.composers.toLocaleString()} 명 — 많이 튼 작곡가 표로 보기"
							>{summary.composers.toLocaleString()}</button
						>
					{:else}
						{summary ? summary.composers.toLocaleString() : '—'}
					{/if}
				</div>
				<div class="kpi-label">작곡가</div>
				{#if changes.composers}
					<div class="kpi-change">
						<span>{changes.composers.diff} ·</span>
						<span>{changes.composers.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi">
				<div class="kpi-value">
					{#if summary?.works > 0}
						<button
							type="button"
							class="kpi-link kpi-open"
							on:click={() => cards.works?.openTable()}
							title="많이 튼 곡 표로 보기"
							aria-label="곡 {summary.works.toLocaleString()} 곡 — 많이 튼 곡 표로 보기"
							>{summary.works.toLocaleString()}</button
						>
					{:else}
						{summary ? summary.works.toLocaleString() : '—'}
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
			<div class="kpi">
				<div class="kpi-value">
					{#if summary?.conductors > 0}
						<button
							type="button"
							class="kpi-link kpi-open"
							on:click={() => cards.conductors?.openTable()}
							title="많이 튼 지휘자 표로 보기"
							aria-label="지휘자 {summary.conductors.toLocaleString()} 명 — 많이 튼 지휘자 표로 보기"
							>{summary.conductors.toLocaleString()}</button
						>
					{:else}
						{summary ? summary.conductors.toLocaleString() : '—'}
					{/if}
				</div>
				<div class="kpi-label">지휘자</div>
				{#if changes.conductors}
					<div class="kpi-change">
						<span>{changes.conductors.diff} ·</span>
						<span>{changes.conductors.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi">
				<div class="kpi-value">
					{#if summary?.orchestras > 0}
						<button
							type="button"
							class="kpi-link kpi-open"
							on:click={() => cards.orchestras?.openTable()}
							title="많이 튼 오케스트라 표로 보기"
							aria-label="오케스트라 {summary.orchestras.toLocaleString()} 곳 — 많이 튼 오케스트라 표로 보기"
							>{summary.orchestras.toLocaleString()}</button
						>
					{:else}
						{summary ? summary.orchestras.toLocaleString() : '—'}
					{/if}
				</div>
				<div class="kpi-label">오케스트라</div>
				{#if changes.orchestras}
					<div class="kpi-change">
						<span>{changes.orchestras.diff} ·</span>
						<span>{changes.orchestras.before}</span>
					</div>
				{/if}
			</div>
			<div class="kpi span2">
				<div class="kpi-value small">
					<!-- 좁은 칸에서는 '~' 뒤에서만 줄을 바꾼다. 두 날짜는 저마다 그날의 선곡 기록을 연다 -->
					{#if summary && summary.date_start}
						<span class="date"
							><a
								class="kpi-link"
								href={dayLink(summary.date_start)}
								title="그날의 선곡 기록 보기"
								aria-label="처음 튼 날 {summary.date_start} 선곡 기록에서 보기"
								>{summary.date_start}</a
							></span
						>
						~
						<span class="date"
							><a
								class="kpi-link"
								href={dayLink(summary.date_end)}
								title="그날의 선곡 기록 보기"
								aria-label="마지막으로 튼 날 {summary.date_end} 선곡 기록에서 보기"
								>{summary.date_end}</a
							></span
						>
					{:else}
						—
					{/if}
				</div>
				<div class="kpi-label">처음 튼 날 ~ 마지막으로 튼 날</div>
			</div>
		</div>
		{#if errors.summary}
			<p class="kpi-error">
				요약을 불러오지 못했습니다.
				<button
					class="tool-btn"
					on:click={() => retryRow('summary', summaryRow)}
					aria-label="요약 다시 시도"
				>
					다시 시도
				</button>
			</p>
		{/if}
		<!-- 요약이 실패했으면 그 '다시 시도'가 앞 학기도 다시 부르므로 줄은 하나만 둔다 -->
		{#if previousFailed.length && !errors.summary}
			<p class="kpi-error">
				지난 학기({semesterLabel(previousTarget)})와 견준 수치를 불러오지 못했습니다.
				<button class="tool-btn" on:click={retryPrevious} aria-label="지난 학기 수치 다시 시도">
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

		<!-- 고른 기간에 선곡이 없으면 빈 카드들 대신 한 줄(작곡가 페이지·학기 결산과 같다). 열린 패널과 카드의
		     해시는 숨은 동안 열리지 않는다(패널은 URL에 남아 선곡이 있는 기간에 다시 열린다) -->
		{#if empty}
			<div class="empty-hint">{emptyText}</div>
		{:else}
			<!-- 키보드·화면 낭독기로 모든 차트를 한 번에 표로 읽는다(카드마다 '표로 보기'를 누르지 않고) -->
			<div class="view-row">
				<button
					class="tool-btn"
					class:active={allTables}
					aria-pressed={allTables}
					on:click={() => {
						allTables = !allTables;
						syncUrl();
					}}
					title="모든 차트의 수치를 표로 보기"
				>
					모든 차트 표로 보기
				</button>
			</div>

			<!-- 차트 그리드 -->
			<div class="chart-grid">
				<ChartCard
					bind:this={cards.composers}
					showTable={allTables}
					title="많이 튼 작곡가"
					note={withSplit(
						rankCapNote(composers, WORKS_LIMIT, summary?.composers, ['작곡가', '명']),
						composerSplit
					)}
					noteLink={splitLink(composerSplit, DEFAULT_KIND)}
					chartNote={chartTieNote(composers, LIMITS.composers, WORKS_LIMIT, '작곡가가', '명')}
					option={composerOpt}
					data={composers}
					loading={loading.composers}
					error={errors.composers}
					retry={() => retry('composers')}
					{fileTag}
					rowLabel="곡 보기"
					markedBar={marks.composers.bar}
					markedRow={marks.composers.row}
					on:itemclick={(e) => openBar('composers', e)}
					on:rowselect={(e) => openDrill('composers', e.detail)}
					table={composerTable}
					cellLinks={previousCellLinks(composerTable, 'composers', '많이 튼 작곡가', previousLink)}
					csv={composerTable && tableCsv(composerTable)}
					csvHeaders={['작곡가', '횟수']}
				/>
				<ChartCard
					bind:this={cards.soloists}
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
					rowLabel="곡 보기"
					markedBar={marks.soloists.bar}
					markedRow={marks.soloists.row}
					on:itemclick={(e) => openBar('soloists', e)}
					on:rowselect={(e) => openDrill('soloists', e.detail)}
					table={soloistTable}
					cellLinks={previousCellLinks(soloistTable, 'soloists', '많이 튼 독주자', previousLink)}
					csv={soloistTable && tableCsv(soloistTable)}
					csvHeaders={['연주자', '횟수']}
				/>
				<ChartCard
					bind:this={cards.conductors}
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
					rowLabel="곡 보기"
					markedBar={marks.conductors.bar}
					markedRow={marks.conductors.row}
					on:itemclick={(e) => openBar('conductors', e)}
					on:rowselect={(e) => openDrill('conductors', e.detail)}
					table={conductorTable}
					cellLinks={previousCellLinks(
						conductorTable,
						'conductors',
						'많이 튼 지휘자',
						previousLink
					)}
					csv={conductorTable && tableCsv(conductorTable)}
					csvHeaders={['지휘자', '횟수']}
				/>
				<ChartCard
					bind:this={cards.orchestras}
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
					rowLabel="곡 보기"
					markedBar={marks.orchestras.bar}
					markedRow={marks.orchestras.row}
					on:itemclick={(e) => openBar('orchestras', e)}
					on:rowselect={(e) => openDrill('orchestras', e.detail)}
					table={orchestraTable}
					cellLinks={previousCellLinks(
						orchestraTable,
						'orchestras',
						'많이 튼 오케스트라',
						previousLink
					)}
					csv={orchestraTable && tableCsv(orchestraTable)}
					csvHeaders={['오케스트라', '횟수']}
				/>
				<ChartCard
					bind:this={cards.eras}
					showTable={allTables}
					title="시대별 분포"
					option={eraOpt}
					data={eras}
					loading={loading.eras}
					error={errors.eras}
					retry={() => retry('eras')}
					{fileTag}
					note={eraNote}
					noteLink={{ href: unknownEraHref, text: '작곡가 정리' }}
					table={eraTable}
					links={eraLinks}
					linkTitle="작곡가 정리에서 이 시대의 작곡가 보기 (모든 기간)"
					csv={eraTable && tableCsv(eraTable)}
					csvHeaders={['시대', '횟수']}
				/>
				<ChartCard
					bind:this={cards.genres}
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
					links={timelineLinks}
					on:itemclick={(e) => openBucket(timelineLinks, e)}
					csvHeaders={['기간', '횟수']}
				/>
				<ChartCard
					bind:this={cards.works}
					showTable={allTables}
					title="많이 튼 곡"
					note={withSplit(
						rankCapNote(works, WORKS_LIMIT, summary?.works, ['곡', '곡']),
						worksSplit
					)}
					noteLink={splitLink(worksSplit, 'music')}
					chartNote={chartTieNote(works, LIMITS.works, WORKS_LIMIT, '곡이', '곡')}
					option={worksOpt}
					data={works}
					loading={loading.works}
					error={errors.works}
					retry={() => retry('works')}
					{fileTag}
					links={worksLinks}
					on:itemclick={openWork}
					table={worksTable}
					cellLinks={previousCellLinks(worksTable, 'works', '많이 튼 곡', previousLink)}
					csv={worksTable && tableCsv(worksTable)}
					csvHeaders={['곡', '횟수']}
				/>
				{#if scope === 'individual'}
					<ChartCard
						showTable={allTables}
						title="취향"
						emptyText={TASTE_EMPTY}
						note={tasteNote(taste)}
						option={tasteOpt}
						data={taste}
						loading={loading.composers || loading.clubComposers}
						error={errors.composers || errors.clubComposers}
						retry={retryTaste}
						{fileTag}
						table={taste && tasteTable(taste)}
						csv={taste && tasteCsv(taste)}
					/>
				{/if}
			</div>
			{#if drill}
				{#key drill}
					<DrillPanel
						target={drill}
						works={drillWorks}
						worksTotal={drillTotal}
						previous={previousDrillWorks}
						loading={drillLoading}
						error={drillError}
						retry={loadDrill}
						previousError={previousDrillFailed ? semesterLabel(previousOf(period, semesters)) : ''}
						retryPrevious={loadPreviousDrill}
						scopeLabel={viewLabel}
						{fileTag}
						note={drillSplit}
						noteLink={drillSplit
							? {
									href: catalogViewHref(drill.card === 'composers' ? drill.name : '', 'music'),
									text: '표기 정리'
								}
							: null}
						historyLink={drillHistoryLink}
						workLink={drillWorkLink}
						composerLink={drill.card === 'composers'
							? firstsByCountHref(
									tableViewHref(
										composerHref(drill.id, {
											period,
											start: customStart,
											end: customEnd,
											userId: scope === 'individual' ? userId : null,
											includeMentees
										}),
										allTables
									),
									firstsByCount
								)
							: ''}
						on:close={closeDrill}
					/>
				{/key}
			{:else}
				<p class="drill-hint">
					작곡가·독주자·지휘자·오케스트라의 막대나 이름을 누르면 그 곡들을 봅니다. 곡의 막대나 이름,
					추이 차트의 날짜를 누르면 그 선곡 기록을 엽니다.
				</p>
			{/if}

			<!-- 다양성 섹션 -->
			<div class="section-head">
				<h2>선곡 다양성</h2>
				<div class="bucket-toggle" role="group" aria-label="다양성 집계 단위">
					<button
						class:active={diversityBucket === 'week'}
						aria-pressed={diversityBucket === 'week'}
						on:click={() => setDiversityBucket('week')}
					>
						주별
					</button>
					<button
						class:active={diversityBucket === 'month'}
						aria-pressed={diversityBucket === 'month'}
						on:click={() => setDiversityBucket('month')}
					>
						월별
					</button>
				</div>
			</div>

			<!-- 고유 곡 수는 위의 곡 칸과 같아(같은 선곡의 서로 다른 곡 수) 두지 않는다(학기 결산과 같다) -->
			<div class="kpi-row diversity-kpi" bind:this={tilesRow} tabindex="-1">
				<div class="kpi">
					<div class="kpi-value">
						{#if eraEvenness != null}
							<button
								type="button"
								class="kpi-link kpi-open"
								on:click={() => cards.eras?.openTable()}
								title="시대별 분포 표로 보기"
								aria-label="시대 다양성 {pct(eraEvenness)} — 시대별 분포 표로 보기"
								>{pct(eraEvenness)}</button
							>
						{:else}
							{pct(eraEvenness)}
						{/if}
					</div>
					<div class="kpi-label">시대 다양성</div>
					{#if tileChanges.era}
						<div class="kpi-change">
							<span>{tileChanges.era.diff} ·</span>
							<span>{tileChanges.era.before}</span>
						</div>
					{/if}
				</div>
				<div class="kpi">
					<div class="kpi-value">
						{#if genreEvenness != null}
							<button
								type="button"
								class="kpi-link kpi-open"
								on:click={() => cards.genres?.openTable()}
								title="장르별 분포 표로 보기"
								aria-label="장르 다양성 {pct(genreEvenness)} — 장르별 분포 표로 보기"
								>{pct(genreEvenness)}</button
							>
						{:else}
							{pct(genreEvenness)}
						{/if}
					</div>
					<div class="kpi-label">장르 다양성</div>
					{#if tileChanges.genre}
						<div class="kpi-change">
							<span>{tileChanges.genre.diff} ·</span>
							<span>{tileChanges.genre.before}</span>
						</div>
					{/if}
				</div>
			</div>
			<!-- 칸의 '—'는 잴 것이 없을 때도 쓰므로, 불러오지 못했으면 따로 알린다 -->
			{#if errors.diversityTiles}
				<p class="kpi-error">
					선곡 다양성을 불러오지 못했습니다.
					<button
						class="tool-btn"
						on:click={() => retryRow('diversityTiles', tilesRow)}
						aria-label="선곡 다양성 다시 시도"
					>
						다시 시도
					</button>
				</p>
			{/if}
			<!-- 칸의 %가 무엇인지(학기 결산의 선곡 다양성 카드와 같은 말) -->
			<p class="kpi-note">0%=편중 · 100%=고름 (가능한 모든 시대·장르를 고르게 틀수록 100%)</p>

			<div class="chart-grid">
				<ChartCard
					showTable={allTables}
					title={`${bucketLabel} 선곡 수`}
					headingLevel={3}
					note={diversityGapNote}
					option={countOpt}
					data={countData}
					loading={loading.diversity}
					error={errors.diversity}
					retry={() => retry('diversity')}
					{fileTag}
					links={diversityLinks}
					on:itemclick={(e) => openBucket(diversityLinks, e)}
					csvHeaders={['기간', '선곡수']}
				/>
				<ChartCard
					showTable={allTables}
					title={`${bucketLabel} 다양성 추이`}
					headingLevel={3}
					note={diversityGapNote}
					option={diversityOpt}
					data={diversityCsvData}
					table={diversityTable}
					loading={loading.diversity}
					error={errors.diversity}
					retry={() => retry('diversity')}
					{fileTag}
					links={diversityLinks}
					on:itemclick={(e) => openBucket(diversityLinks, e)}
					csv={diversityTable && tableCsv(diversityTable)}
				/>
			</div>

			<!-- 처음 튼 작곡가·곡: 클럽 전체에서 처음 튼 날이 이 기간에 드는 것(stats/firsts) -->
			<div class="section-head">
				<h2>처음 튼 작곡가·곡</h2>
			</div>
			<div class="chart-grid">
				<!-- 기간의 시작이 없으면(전체 기간, 시작을 비운 직접 지정) 모든 것이 '처음'이므로 묻지 않는다 -->
				<TableCard
					title="처음 튼 작곡가"
					headingLevel={3}
					subtitle={firstsSubtitle(
						viewLabel,
						firstComposers,
						'작곡가',
						'명',
						previousFirstComposers
					)}
					table={shownFirstComposers?.items.length
						? firstsTable(shownFirstComposers, '작곡가')
						: null}
					links={firstComposerLinks}
					cellLinks={{ 1: { hrefs: firstComposerDayLinks, title: firstDayTitle } }}
					sortLabel="많이 튼 순"
					bind:sorted={firstsByCount.composers}
					note={firstComposerSpelling}
					noteLink={splitLink(firstComposerSpelling, DEFAULT_KIND)}
					loading={loading.firstComposers}
					error={errors.firstComposers}
					retry={() => retry('firstComposers')}
					{fileTag}
					emptyText={!firstsAsked
						? '기간의 시작을 정하면 그 뒤에 처음 튼 작곡가를 봅니다'
						: firstComposers?.items.length === 0
							? firstsEmptyText('처음 튼 작곡가', '명', previousFirstComposers)
							: ''}
				/>
				<TableCard
					title="처음 튼 곡"
					headingLevel={3}
					subtitle={firstsSubtitle(viewLabel, firstWorks, '곡', '곡', previousFirstWorks)}
					table={shownFirstWorks?.items.length ? firstsTable(shownFirstWorks, '곡') : null}
					links={firstWorkLinks}
					cellLinks={{ 1: { hrefs: firstWorkDayLinks, title: firstDayTitle } }}
					sortLabel="많이 튼 순"
					bind:sorted={firstsByCount.works}
					note={firstWorkSpelling}
					noteLink={splitLink(firstWorkSpelling, 'music')}
					loading={loading.firstWorks}
					error={errors.firstWorks}
					retry={() => retry('firstWorks')}
					{fileTag}
					emptyText={!firstsAsked
						? '기간의 시작을 정하면 그 뒤에 처음 튼 곡을 봅니다'
						: firstWorks?.items.length === 0
							? firstsEmptyText('처음 튼 곡', '곡', previousFirstWorks)
							: ''}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	.stat-page {
		padding: 24px 32px;
		width: 100%;
		box-sizing: border-box;
	}
	/* 화면 낭독기만 읽는 줄(작곡가 정리와 같다) */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	/* 직접 지정을 열어 한 줄에 다 들어가지 않으면 컨트롤을 다음 줄 오른쪽에 둔다. */
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 16px;
		margin-bottom: 20px;
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
	.period {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.history-link {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		text-underline-offset: 3px;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 12px 16px;
		margin-left: auto;
	}
	.empty-hint {
		text-align: center;
		padding: 80px 0;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.kpi-row {
		display: grid;
		grid-template-columns: repeat(9, 1fr);
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
	.kpi.span2 {
		grid-column: span 2;
	}
	.kpi-value {
		font-family: var(--large-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--large-font-size, 24px);
		font-weight: 700;
		color: var(--primary-primary-800, #6a5134);
	}
	.kpi-value.small {
		font-size: var(--medium-font-size, 16px);
	}
	/* 머리말의 '선곡 기록' 링크처럼 밑줄은 가리키거나 키보드로 고를 때만 */
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
	.kpi-value .date {
		white-space: nowrap;
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
	/* 좁은 칸에서도 '342곡' 같은 낱말 안에서는 줄을 바꾸지 않는다 */
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
	/* 카드(ChartCard)의 단추와 같은 모양 */
	.tool-btn {
		margin-left: 8px;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		background: var(--secondary-secondary-100, #fef9f3);
		border: 1px solid var(--primary-primary-600, #c8ad8f);
		border-radius: 4px;
		padding: 3px 8px;
		cursor: pointer;
	}
	.tool-btn:hover {
		background: var(--secondary-secondary-200, #fdf1e4);
	}
	/* 카드의 '표로 보기'가 눌린 모양과 같다 */
	.tool-btn.active {
		background: var(--action-bg);
		color: var(--action-fg);
	}
	.view-row {
		display: flex;
		justify-content: flex-end;
		margin: -8px 0 8px;
	}
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
	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 28px 0 12px;
	}
	.section-head h2 {
		font-family: var(--large-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--large-font-size, 24px);
		font-weight: 600;
		color: var(--gray-gray-950, #1a1a1a);
		margin: 0;
	}
	.bucket-toggle {
		display: flex;
		gap: 4px;
	}
	.bucket-toggle button {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		background: var(--secondary-secondary-100, #fef9f3);
		border: 1px solid var(--primary-primary-600, #c8ad8f);
		border-radius: 4px;
		padding: 4px 12px;
		cursor: pointer;
	}
	.bucket-toggle button.active {
		background: var(--action-bg);
		color: var(--action-fg);
	}
	.diversity-kpi {
		grid-template-columns: repeat(2, 1fr);
	}

	@page {
		size: A4;
		margin: 12mm;
	}
	@media print {
		/* 학기 결산과 같다: 사이드바·레이아웃의 규칙은 컴포넌트 범위라 !important 로 이겨 A4 폭에 제 크기로 싣는다 */
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
		.stat-page {
			padding: 0 1px 0 0;
		}
		/* 종이에는 고르는 것·누르는 것을 싣지 않는다: 기간·범위·지기 고르기, 머리말 링크, 모든 차트 표로 보기,
		   주별/월별, 막대를 누르라는 안내, 카드·패널의 단추(표로 보기, PNG·CSV 저장, 닫기, 다시 시도)와 패널의 링크.
		   표의 이름 단추(.row-btn)는 이름이므로 남는다 */
		.controls,
		.view-row,
		.bucket-toggle,
		.drill-hint,
		.stat-page :global(.tool-btn),
		.stat-page :global(.history-link) {
			display: none !important;
		}
		/* 학기 결산과 같은 작은 칸: A4 폭의 아홉 칸에서 '오케스트라'가 글자 사이에서 줄을 바꾸지 않게 */
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
		/* 카드는 한 줄에 하나, 쪽 사이에서 자르지 않는다(표가 든 카드는 길면 다음 쪽으로 이어진다) */
		.chart-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.stat-page :global(.card),
		.stat-page :global(.drill-panel) {
			box-shadow: none !important;
		}
		.stat-page :global(.card) {
			break-inside: avoid;
		}
		.stat-page :global(.card:has(.table-view)) {
			break-inside: auto;
		}
		/* 표로 보기는 340px 상자 안에서 스크롤하지 않고 모든 행을 싣는다. 쪽을 넘는 표가 카드 밖으로 넘치지 않도록
		   카드와 표 상자는 flex 를 풀고, 머리줄은 붙이지 않는다(새 쪽마다 브라우저가 머리줄을 다시 싣는다) */
		.stat-page :global(.card:has(.table-view)),
		.stat-page :global(.table-view) {
			display: block !important;
			height: auto !important;
		}
		.stat-page :global(.chart-area:has(.table-view)),
		.stat-page :global(.table-area:has(.table-view)) {
			min-height: 0 !important;
		}
		.stat-page :global(.table-scroll) {
			overflow: visible !important;
		}
		.stat-page :global(.table-scroll thead th) {
			position: static !important;
		}
		/* 펼친 곡 목록의 제목은 위의 단추 줄만큼 비워 두지만, 종이에는 단추가 없으므로 비우지 않는다 */
		.stat-page :global(.drill-panel .table-title),
		.stat-page :global(.drill-panel .panel-title) {
			padding: 0 !important;
		}
		/* 인쇄는 차트를 다시 그리지 않으므로, 넓은 창에서 그린 캔버스가 카드보다 넓으면 비율을 지켜 줄인다 */
		.stat-page :global(.echart > div),
		.stat-page :global(.echart canvas) {
			max-width: 100% !important;
		}
		.stat-page :global(.echart canvas) {
			height: auto !important;
		}
	}
</style>
