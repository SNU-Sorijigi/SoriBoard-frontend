<script>
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import EChart from '$lib/components/stat/EChart.svelte';
	import ReportTable from '$lib/components/stat/ReportTable.svelte';
	import ScopeToggle from '$lib/components/stat/ScopeToggle.svelte';
	import MemberSelect from '$lib/components/stat/MemberSelect.svelte';
	import { eraPieOption } from '$lib/chartOptions.js';
	import {
		formatCount,
		groupEvenness,
		unknownEraNote,
		topOf,
		PERFORMER_EMPTY
	} from '$lib/statTable.js';
	import {
		readStatQuery,
		statQueryHref,
		tableViewHref,
		readFirstsByCount,
		writeFirstsByCount,
		firstsByCountHref,
		cardHref
	} from '$lib/statQuery.js';
	import { sortSemesters, semesterLabel, currentSemesterRange } from '$lib/statPeriod.js';
	import { composerHref, composerMemberParams } from '$lib/composerStats.js';
	import {
		historyHref,
		workHistoryHref,
		targetHistoryHref,
		bucketHistoryLinks
	} from '$lib/playHistory.js';
	import { DRILL_CARDS, WORKS_LIMIT } from '$lib/statDrill.js';
	import { loadStatusText, withPreviousFailure } from '$lib/statCards.js';
	import { pageTitle } from '$lib/statTitle.js';
	import { clubShareText } from '$lib/statShare.js';
	import { downloadCsvTable, tableCsv } from '$lib/csvTable.js';
	import { downloadName, memberFileText } from '$lib/statFileName.js';
	import { todayStamp } from '$lib/csv.js';
	import { byCount, firstDayHref } from '$lib/statFirsts.js';
	import {
		splitSpellings,
		splitSpellingNote,
		spellingKindOf,
		duplicatesSearch,
		catalogViewHref,
		MUSIC_SPLIT_LEAD,
		firstSpellingSplits,
		firstSpellingNote,
		FIRST_SPELLING_LEAD,
		FIRST_MUSIC_LEAD
	} from '$lib/catalogSpelling.js';
	import {
		reportHref,
		pickSemester,
		previousSemester,
		mixTable,
		mixSubtitle,
		rankChangeTable,
		previousRankHrefs,
		tieNote,
		moreRowsText,
		firstIdSet,
		loadWithPrevious,
		firstsTable,
		reportRangeText,
		reportRange,
		ongoingText,
		upcomingText,
		semesterOptionLabel,
		semesterUpcoming,
		kpiChangeText,
		evennessChangeText,
		eraPair,
		genrePair,
		monthlyTable
	} from '$lib/semesterReport.js';

	// 한 학기의 결산(클럽 전체, 또는 개인이면 한 지기). 학기는 URL(semester_id)에 두고, 없으면 가장 최근의
	// 시작한 학기다. 카드는 따로 불러오고, 실패하면 그 카드에만 오류를 띄운다.
	const initialId = $page.url.searchParams.get('semester_id');
	// 범위·지기·견습 포함은 통계와 같은 키(scope, user_id, include_mentees, statQuery.js)로 URL에 둔다.
	// 개인에서 지기를 고르지 않았으면 카드 대신 안내 문구를 두고 아무것도 부르지 않는다.
	const initialView = readStatQuery($page.url.searchParams);
	let scope = initialView.scope;
	let userId = initialView.userId;
	let includeMentees = initialView.includeMentees;
	// 고른 지기의 이름(MemberSelect 가 채운다. 목록을 받기 전에는 '').
	let userName = '';
	// 카드의 요청과 링크가 거르는 지기: 개인이면 그 지기(와 견습 포함), 전체면 없음(userId null).
	// $: member 도 이것으로 만든다(요청은 바꾼 그 자리에서 부르므로 $: 를 기다리지 않고 이것을 부른다).
	const memberOf = (scope, userId, includeMentees) =>
		scope === 'individual' && userId
			? { userId, includeMentees }
			: { userId: null, includeMentees: false };

	/** @type {{ id: number, year: number, semester_num: number }[]} */
	let semesters = [];
	let semestersLoaded = false;
	let semestersError = '';
	/** @type {{ id: number, year: number, semester_num: number } | null} */
	let semester = null;
	/** @type {{ id: number, year: number, semester_num: number } | null} */
	let previous = null;

	// 지기 파라미터는 여기서 붙인다: 이 학기·지난 학기·다시 시도가 모두 같은 지기를 부른다.
	const getJson = async (endpoint, id, extra = {}) => {
		const params = new URLSearchParams({
			semester_id: String(id),
			...composerMemberParams(memberOf(scope, userId, includeMentees)),
			...extra
		});
		const res = await fetch(`/api/stats/${endpoint}?${params}`);
		if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
		return res.json();
	};
	// 개인에서 지기를 고르면 총 선곡·타임·신청곡 칸 아래에 같은 학기 클럽 전체에서의 몫을 쓴다(통계와 같다,
	// '클럽 342곡 중 12.3%'). 클럽의 요약은 지기 파라미터 없이 부르고, 실패하면 줄만 없다(오류 줄은 없다).
	// 요약의 '다시 시도'가 그때 함께 다시 부른다(clubFailed).
	let clubSummary = null;
	let clubFailed = false;
	function loadClubSummary(gen) {
		clubFailed = false;
		const params = new URLSearchParams({ semester_id: String(semester.id) });
		fetch(`/api/stats/summary?${params}`)
			.then((res) => {
				if (!res.ok) throw new Error(`summary ${res.status}`);
				return res.json();
			})
			.then((result) => {
				if (gen === generation) clubSummary = result;
			})
			.catch((e) => {
				if (gen !== generation) return;
				console.error('학기 결산 로딩 실패 (클럽 요약)', e);
				clubFailed = true;
			});
	}
	const CLUB_UNITS = { total_plays: '곡', sessions: '타임', requested: '곡' };
	// 요약·상위 10·시대·장르·처음 튼 작곡가·곡은 지난 학기와 견준다(지난 학기가 없으면 previous 는 null).
	// 지난 학기는 previousExtra 로 부른다(상위 10 은 지난 학기의 상위 100, 아래 compared).
	// 지난 학기만 실패하면 이 학기만으로 그리고, KPI 칸 아래 줄(previousFailed)이 그렇다고 알린다.
	// 그 줄의 '다시 시도'(retryPrevious)는 실패한 카드의 지난 학기 쪽만 다시 부른다.
	const withPrevious = async (endpoint, extra = {}, previousExtra = extra) => {
		const before = previous;
		const pair = await loadWithPrevious(
			() => getJson(endpoint, semester.id, extra),
			before && (() => getJson(endpoint, before.id, previousExtra))
		);
		if (pair.previousError) {
			console.error(`학기 결산 지난 학기 로딩 실패 (${endpoint})`, pair.previousError);
		}
		return pair;
	};
	// 지난 학기와 견주는 카드의 요청: [엔드포인트, 덧붙일 인자, 지난 학기에 덧붙일 인자(없으면 같은 것)].
	// 상위 10 은 이 학기와 지난 학기 모두 상위 100(WORKS_LIMIT, 통계와 같은 길이)을 부른다.
	// 표는 이 학기의 앞 10 행만 싣고, 그 뒤에 10 번째와 같은 횟수가 있으면 표 아래에 적는다(tieNote).
	// 지난 학기 칸은 그래서 '10위 밖' 대신 '23위'·'없음'을 적는다(rankChangeTable).
	// 시대·장르별 분포는 따로 부르지 않고 다양성 응답의 summary.era·genre 로 그린다(통계처럼).
	const TOP = 10;
	const top100 = { limit: String(WORKS_LIMIT) };
	/** @type {Record<string, [string, Record<string, string>?, Record<string, string>?]>} */
	const compared = {
		summary: ['summary'],
		composers: ['composers', top100],
		soloists: ['soloists', top100],
		works: ['works', top100],
		conductors: ['conductors', top100],
		orchestras: ['orchestras', top100],
		// 선곡 다양성·시대·장르별 분포는 summary 를, 월별 선곡은 달마다 센 timeline 을 쓴다.
		diversity: ['diversity', { bucket: 'month' }],
		firstComposers: ['firsts', { kind: 'composer' }],
		firstWorks: ['firsts', { kind: 'work' }]
	};
	const cardRequests = Object.fromEntries(
		Object.keys(compared).map((key) => [key, () => withPrevious(...compared[key])])
	);
	const CARD_KEYS = Object.keys(cardRequests);

	/** @type {Record<string, any>} */
	let data = {};
	/** @type {Record<string, boolean>} */
	let loading = Object.fromEntries(CARD_KEYS.map((key) => [key, true]));
	/** @type {Record<string, string>} */
	let errors = {};
	$: eras = eraPair(data.diversity);
	$: genres = genrePair(data.diversity);
	// 처음 튼 작곡가·곡: 이 학기의 목록과, 부제에 개수만 쓰는 지난 학기의 목록.
	$: firstComposers = data.firstComposers?.current;
	$: firstWorks = data.firstWorks?.current;
	$: previousFirstComposers = data.firstComposers?.previous;
	$: previousFirstWorks = data.firstWorks?.previous;
	// 상위 10 은 이 학기의 목록 앞 10 행을 그리고, 지난 학기의 상위 100 과 견준 칸을 붙인다(rankChangeTable).
	// 표와 이름 링크는 같은 10 행이다. 작곡가·곡은 처음 튼 목록이 오면 이 학기에 처음 튼 행을 '첫 선곡'으로 적는다.
	$: composers = topOf(data.composers?.current, TOP);
	$: soloists = topOf(data.soloists?.current, TOP);
	$: works = topOf(data.works?.current, TOP);
	$: conductors = topOf(data.conductors?.current, TOP);
	$: orchestras = topOf(data.orchestras?.current, TOP);
	// 10 행이 동점을 잘랐을 때 표 아래의 말과 링크: 통계의 그 학기를 모든 차트 표로 보기로(표가 응답 전체를 싣는다).
	const cutNote = (envelope, noun, unit) => tieNote(envelope, TOP, WORKS_LIMIT, noun, unit);
	// 동점이 없어도 목록이 10 행보다 길면 표 아래에 같은 링크를 둔다: '통계에서 모두 보기 (작곡가 30명)'.
	const restNote = (envelope, noun, unit) => moreRowsText(envelope, TOP, WORKS_LIMIT, noun, unit);
	$: fullListHref = semester
		? statViewHref(
				firstsByCountHref(tableViewHref(`/stat?semester_id=${semester.id}`, true), statFirsts),
				view
			)
		: '';
	// 상위 10 표의 지난 학기 칸('23위')은 지난 학기(previous, 그 칸을 셈한 학기)의 같은 목록을 연다.
	$: previousListHref = previous
		? statViewHref(
				firstsByCountHref(tableViewHref(`/stat?semester_id=${previous.id}`, true), statFirsts),
				view
			)
		: '';
	// KPI 칸은 이 학기의 요약, 그 아래 줄은 지난 학기의 요약과 견준다(없거나 실패하면 줄을 뺀다).
	$: summary = data.summary?.current;
	$: previousSummary = data.summary?.previous;
	// 개인(지기를 골랐을 때)의 KPI 칸 아래 몫의 줄. 두 요약 중 하나라도 없으면(불러오는 중·실패) ''.
	$: clubShares =
		scope === 'individual' && userId
			? Object.fromEntries(
					Object.entries(CLUB_UNITS).map(([key, unit]) => [
						key,
						clubShareText(summary?.[key], clubSummary?.[key], unit)
					])
				)
			: {};
	// 선곡 다양성의 칸: 이 학기와 지난 학기의 다양성 응답의 summary(통계의 칸과 같은 값).
	$: diversity = data.diversity?.current?.summary;
	$: previousDiversity = data.diversity?.previous?.summary;
	// 월별 선곡: 이 학기의 다양성 응답의 timeline(선곡이 있는 달만).
	$: monthly = data.diversity?.current;

	// 다른 학기·범위·지기로 바꾸면 이전 보기의 늦은 응답은 버린다.
	let generation = 0;

	function loadCard(key, gen) {
		cardRequests[key]()
			.then((result) => {
				if (gen === generation) data[key] = result;
			})
			.catch((e) => {
				if (gen !== generation) return;
				console.error(`학기 결산 로딩 실패 (${key})`, e);
				errors[key] = '불러오지 못했습니다';
			})
			.finally(() => {
				if (gen === generation) loading[key] = false;
			});
	}

	function loadAll() {
		const gen = ++generation;
		data = {};
		errors = {};
		loading = Object.fromEntries(CARD_KEYS.map((key) => [key, true]));
		clubSummary = null;
		clubFailed = false;
		// 개인에서 지기를 고르지 않았으면 부르지 않는다(카드 대신 안내 문구).
		if (scope === 'individual' && !userId) return;
		for (const key of CARD_KEYS) loadCard(key, gen);
		if (scope === 'individual') loadClubSummary(gen);
	}

	// 범위·지기·견습 포함을 바꾸면 URL 을 고치고(통계처럼) 이 학기를 다시 부른다(generation 이 늘어
	// 이전 지기의 늦은 응답은 버린다).
	function onScopeChange(e) {
		scope = e.detail;
		onViewChange();
	}
	function onMemberChange(e) {
		userId = e.detail.userId;
		includeMentees = e.detail.includeMentees;
		onViewChange();
	}
	function onViewChange() {
		goto(statQueryHref($page.url, { scope, userId, includeMentees }), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
		if (semester) loadAll();
	}

	// '다시 시도': 그 카드만 다시 부른다. generation 은 그대로 두어 다른 카드의 요청을 살리고,
	// 그 사이 학기를 바꾸면(loadAll) 이 요청의 늦은 응답도 버린다.
	// 단추는 사라지므로, 단추에 있던 포커스는 먼저 target(카드의 section, 요약은 KPI 줄)으로 옮긴다.
	let kpiRow;
	function retry(key, e, target) {
		if (document.activeElement === e.currentTarget) target?.focus();
		loading[key] = true;
		errors[key] = '';
		loadCard(key, generation);
		if (key === 'summary' && clubFailed) loadClubSummary(generation);
	}

	// 지난 학기 쪽만 실패한 카드(학기를 바꾸면 data 와 함께 비워진다). 다시 부르는 동안은 줄에서 뺀다.
	$: previousFailed = Object.keys(compared).filter(
		(key) => data[key]?.previousError && !data[key].retryingPrevious
	);
	// 지난 학기 수치의 '다시 시도': 실패한 카드의 지난 학기만 다시 부르고, 이 학기의 표는 그대로 둔다.
	// 그 사이 학기를 바꾸거나 카드의 '다시 시도'가 새 짝(current)을 받았으면 늦은 응답은 버린다.
	// 부르는 동안 previousError 는 두어, 분포 카드의 부제가 '지난 학기 없음'으로 바뀌지 않게 한다.
	function retryPrevious() {
		kpiRow?.focus();
		for (const key of previousFailed) {
			const gen = generation;
			const before = previous;
			const { current } = data[key];
			const [endpoint, extra, previousExtra = extra] = compared[key];
			const still = () => gen === generation && data[key]?.current === current;
			data[key] = { ...data[key], retryingPrevious: true };
			getJson(endpoint, before.id, previousExtra)
				.then((result) => {
					if (still()) data[key] = { current, previous: result, previousError: null };
				})
				.catch((e) => {
					if (!still()) return;
					console.error(`학기 결산 지난 학기 로딩 실패 (${endpoint})`, e);
					data[key] = { current, previous: null, previousError: e };
				});
		}
	}

	function choose(next) {
		semester = next;
		// 시작 전인 학기는 견줄 것이 없다: 지난 학기를 부르지 않고 KPI 아래 비교 줄도 두지 않는다.
		// today 는 아래에서 정한다(choose 는 onMount 뒤에만 불린다).
		previous = semesterUpcoming(next, today) ? null : previousSemester(next, semesters);
		loadAll();
	}

	async function loadSemesters() {
		try {
			const res = await fetch('/api/semester');
			if (!res.ok) throw new Error(`semester ${res.status}`);
			semesters = sortSemesters(await res.json());
		} catch (e) {
			console.error('학기 목록을 불러오지 못했습니다.', e);
			semestersError = '학기 목록을 불러오지 못했습니다.';
		}
		semestersLoaded = true;
		// today 는 아래에서 정한다(onMount 에서 부르므로 이미 있다).
		const picked = pickSemester(initialId, semesters, today);
		if (!picked) return;
		// 링크의 학기가 목록에 없으면 가장 최근의 시작한 학기를 보이고, URL 에서 그 id 를 뺀다.
		if (initialId != null && String(picked.id) !== initialId) {
			goto(reportUrl(null), { replaceState: true, keepFocus: true, noScroll: true });
		}
		choose(picked);
	}

	onMount(loadSemesters);

	// 학기 목록의 '다시 시도': 다시 부르는 동안 포커스는 안내 문구(semestersHint)에 두고,
	// 학기를 고르면 학기 select 로 옮긴다(불러오기 전에는 select 가 꺼져 있어 포커스를 받지 못한다).
	let semestersHint;
	let semesterSelect;
	let semestersRetrying = false;
	async function retrySemesters(e) {
		const hadFocus = document.activeElement === e.currentTarget;
		if (hadFocus) semestersHint?.focus();
		semestersError = '';
		semestersLoaded = false;
		semestersRetrying = true;
		await loadSemesters();
		semestersRetrying = false;
		if (!hadFocus || !semester) return;
		await tick();
		semesterSelect?.focus();
	}

	// 학기를 보이고 URL 의 semester_id 를 바꾼다(학기 select 와 '… 결산 보기' 단추).
	function show(next) {
		goto(reportUrl(next.id), { replaceState: true, keepFocus: true, noScroll: true });
		choose(next);
	}

	function onSelect(e) {
		const next = semesters.find((s) => String(s.id) === e.currentTarget.value);
		if (!next || next === semester) return;
		show(next);
	}

	$: label = semester ? semesterLabel(semester) : '';
	$: previousLabel = previous ? semesterLabel(previous) : '';
	// 요약을 받기 전(또는 받지 못하면)에는 학기 목록의 연도·학기로 짐작한 날짜(semesterReport.js).
	$: rangeText = reportRangeText(summary, semester);
	// 오늘(브라우저의 날짜, 이번 학기와 같은 규칙)이 학기 안이면 아직 끝나지 않은 학기다: 머리말에
	// '진행 중 · 오늘까지'를, KPI 아래에 지난 학기 수치는 학기 전체라는 문장을 둔다. 페이지를 열 때 한 번 정한다.
	// 오늘이 학기의 시작일 전이면 머리말에 '시작 전 · 시작일부터'를 둔다.
	const today = currentSemesterRange().end;
	$: ongoing = ongoingText(reportRange(summary, semester), today);
	$: upcoming = upcomingText(reportRange(summary, semester), today);
	const total = (envelope) => (envelope ? `총 ${envelope.total_plays.toLocaleString()}곡` : '');
	const count = (v) => (v == null ? '—' : formatCount(v));
	$: empty = summary && summary.total_plays === 0;
	// 시작 전인 학기의 빈 결산에 두는 '2026-2학기 결산 보기': 가장 최근의 시작한 학기(목록의 학기가
	// 모두 시작 전이면 단추가 없다). 단추는 사라지므로 포커스는 먼저 학기 select 로 옮긴다.
	const startedOf = (list) => {
		const s = pickSemester(null, list, today);
		return s && !semesterUpcoming(s, today) ? s : null;
	};
	$: started = semester && semesterUpcoming(semester, today) ? startedOf(semesters) : null;
	function showStarted() {
		semesterSelect?.focus();
		show(started);
	}
	// 개인 보기의 빈 결산에 두는 '전체 결산 보기': 머리말의 '전체'와 같이 바꾼다. 단추는 사라지므로
	// 포커스는 먼저 KPI 줄로 옮긴다.
	function showAll() {
		kpiRow?.focus();
		scope = 'all';
		onViewChange();
	}

	// 순위 표(상위 10). 작곡가 이름은 이 학기를 고른 작곡가 페이지로, 독주자·지휘자·오케스트라·곡
	// 이름은 이 학기에 그 대상·곡을 튼 선곡 기록으로 간다. 작곡가 페이지에는 처음 튼 작곡가·곡의
	// '많이 튼 순'(composers, works)을 잇는다. $: 블록이 누름에 따라 다시 만들도록 값을 인자로 받는다.
	// member: 개인 보기의 지기({ userId, includeMentees }). 링크도 그 지기를 고른 채로 연다.
	const linksOf = (envelope, semesterId, composersByCount, worksByCount, member) =>
		envelope && semesterId
			? envelope.items.map((item) =>
					firstsByCountHref(
						composerHref(item.id, { period: semesterId, start: '', end: '', ...member }),
						{ composers: composersByCount, works: worksByCount }
					)
				)
			: [];
	const workLinksOf = (envelope, semesterId, member) =>
		envelope && semesterId
			? envelope.items.map((item) => workHistoryHref(item.id, semesterId, member))
			: [];
	// card: 'soloists' | 'conductors' | 'orchestras' (선곡 기록의 id 필터는 DRILL_CARDS 의 것).
	const performerLinksOf = (card, envelope, semesterId, member) =>
		envelope && semesterId
			? envelope.items.map((item) =>
					targetHistoryHref(DRILL_CARDS[card].param, item.id, semesterId, member)
				)
			: [];
	$: semesterId = semester ? String(semester.id) : '';
	// 보기(범위·지기·견습 포함)와, 카드의 링크가 거르는 지기(요청과 같다).
	$: view = { scope, userId, includeMentees };
	$: member = memberOf(scope, userId, includeMentees);
	// 통계로 가는 링크(머리의 통계, 통계에서 모두 보기)는 개인 보기의 지기를 잇는다.
	const statViewHref = (href, state) => statQueryHref(new URL(href, 'http://localhost'), state);
	// 개인 보기의 지기: 머리말(인쇄에도 남는다), 탭 제목, CSV 이름에 둔다. 전체면 ''.
	$: memberText =
		scope === 'individual' ? memberFileText({ userId, name: userName, includeMentees }) : '';
	// 머리말의 '선곡 기록' 링크와 총 선곡 칸의 숫자: 이 학기의(개인이면 그 지기의) 선곡 목록(통계와 같은 링크).
	// 신청곡 칸의 숫자는 같은 목록에서 신청곡만. 학기가 없으면(목록을 불러오는 중·실패) 링크도 없다.
	$: historyFilter = semester && {
		period: String(semester.id),
		start: '',
		end: '',
		q: '',
		userId: member.userId,
		includeMentees: member.includeMentees,
		requested: ''
	};
	$: kpiLinks = historyFilter
		? {
				total_plays: historyHref(historyFilter),
				requested: historyHref({ ...historyFilter, requested: 'true' })
			}
		: {};
	// 작곡가·곡·지휘자·오케스트라의 숫자(통계의 KPI 칸처럼)와 시대·장르 다양성은 아래의 그 카드로 간다:
	// 카드(제목으로 이름이 붙은 section)를 위로 올리고 포커스를 둔다. [카드 제목, 단위]
	const KPI_CARDS = {
		composers: ['많이 튼 작곡가', '명'],
		works: ['많이 튼 곡', '곡'],
		conductors: ['많이 튼 지휘자', '명'],
		orchestras: ['많이 튼 오케스트라', '곳']
	};
	/** @type {Record<string, HTMLElement>} */
	let cardEls = {};
	function openCard(key) {
		cardEls[key]?.scrollIntoView({ block: 'start' });
		cardEls[key]?.focus({ preventScroll: true });
	}
	// 표기 정리의 묶음(catalog/duplicates/, 전체 기간): 학기와 상관없으므로 처음 한 번만 부르고(통계처럼),
	// 많이 튼 작곡가·독주자·지휘자·오케스트라의 응답(상위 100 전체, 표의 10 행만이 아니다)에 한 묶음의
	// 표기가 둘 이상 들면 그 카드의 표 아래에 알린다. 많이 튼 곡은 작품 번호가 같은 곡(kind=music)으로 같다.
	// 종류마다 따로 부르고, 못 받은 종류만 줄을 두지 않는다.
	/** @type {Record<string, string>} 카드 → catalog/duplicates/ 의 kind */
	const SPLIT_KINDS = Object.fromEntries(
		Object.keys(DRILL_CARDS).map((card) => [card, spellingKindOf(DRILL_CARDS[card].param)])
	);
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
	onMount(() => [...Object.values(SPLIT_KINDS), 'music'].forEach(loadDuplicates));
	// 학기를 바꾸면 다시 부르지 않고 이 학기의 응답으로 줄만 다시 센다.
	$: splits = Object.fromEntries(
		Object.entries(SPLIT_KINDS).map(([card, kind]) => [
			card,
			splitSpellingNote(splitSpellings(duplicates[kind], data[card]?.current))
		])
	);
	$: worksSplit = splitSpellingNote(
		splitSpellings(duplicates.music, data.works?.current),
		2,
		MUSIC_SPLIT_LEAD
	);
	$: topCards = [
		{
			key: 'composers',
			title: '많이 튼 작곡가',
			table: composers?.labels.length
				? rankChangeTable(
						composers,
						data.composers.previous,
						'작곡가',
						WORKS_LIMIT,
						firstIdSet(firstComposers)
					)
				: null,
			links: linksOf(
				composers,
				semesterId,
				firstsByCount.firstComposers,
				firstsByCount.firstWorks,
				member
			),
			note: cutNote(data.composers?.current, '작곡가가', '명'),
			more: restNote(data.composers?.current, '작곡가', '명'),
			split: splits.composers,
			splitKind: SPLIT_KINDS.composers
		},
		{
			key: 'soloists',
			title: '많이 튼 독주자',
			table: soloists?.labels.length
				? rankChangeTable(soloists, data.soloists.previous, '연주자', WORKS_LIMIT)
				: null,
			links: performerLinksOf('soloists', soloists, semesterId, member),
			note: cutNote(data.soloists?.current, '독주자가', '명'),
			more: restNote(data.soloists?.current, '독주자', '명'),
			split: splits.soloists,
			splitKind: SPLIT_KINDS.soloists,
			empty: PERFORMER_EMPTY.soloists
		},
		{
			key: 'works',
			title: '많이 튼 곡',
			table: works?.labels.length
				? rankChangeTable(works, data.works.previous, '곡', WORKS_LIMIT, firstIdSet(firstWorks))
				: null,
			links: workLinksOf(works, semesterId, member),
			note: cutNote(data.works?.current, '곡이', '곡'),
			more: restNote(data.works?.current, '곡', '곡'),
			split: worksSplit,
			splitKind: 'music',
			wide: true
		},
		{
			key: 'conductors',
			title: '많이 튼 지휘자',
			table: conductors?.labels.length
				? rankChangeTable(conductors, data.conductors.previous, '지휘자', WORKS_LIMIT)
				: null,
			links: performerLinksOf('conductors', conductors, semesterId, member),
			note: cutNote(data.conductors?.current, '지휘자가', '명'),
			more: restNote(data.conductors?.current, '지휘자', '명'),
			split: splits.conductors,
			splitKind: SPLIT_KINDS.conductors,
			empty: PERFORMER_EMPTY.conductors
		},
		{
			key: 'orchestras',
			title: '많이 튼 오케스트라',
			table: orchestras?.labels.length
				? rankChangeTable(orchestras, data.orchestras.previous, '오케스트라', WORKS_LIMIT)
				: null,
			links: performerLinksOf('orchestras', orchestras, semesterId, member),
			note: cutNote(data.orchestras?.current, '오케스트라가', '곳'),
			more: restNote(data.orchestras?.current, '오케스트라', '곳'),
			split: splits.orchestras,
			splitKind: SPLIT_KINDS.orchestras,
			empty: PERFORMER_EMPTY.orchestras
		}
	].map((card) => ({
		...card,
		cellLinks: previousCellLinks(card, previousListHref, previousLabel)
	}));
	// 상위 10 표의 지난 학기 칸: 순위('23위')인 칸만 통계의 지난 학기, 같은 카드의 표로 가는 링크(없음·첫 선곡은 글자).
	const previousCellLinks = (card, listHref, prevLabel) =>
		card.table && listHref
			? {
					[card.table.columns.length - 1]: {
						hrefs: previousRankHrefs(card.table, cardHref(listHref, card.key)),
						title: `통계에서 지난 학기(${prevLabel})의 ${card.title} 표 보기`
					}
				}
			: {};

	// 시대·장르: 작은 도넛(크기 고정, 인쇄에서도 같은 크기)과 지난 학기와 견준 표.
	// 수치는 옆의 표에 있으므로 도넛은 이름표 없이 범례만 둔다.
	const pieOption = (envelope) => {
		const option = eraPieOption(envelope, '', '');
		const [series] = option.series;
		return {
			...option,
			animation: false,
			series: [
				{
					...series,
					center: ['50%', '40%'],
					radius: ['36%', '62%'],
					label: { show: false },
					labelLine: { show: false }
				}
			]
		};
	};
	// 학기 이름은 인자로 받는다: $: 는 함수 안에서 읽는 변수를 따라가지 않는다.
	// source: 카드를 그리는 요청(불러오는 중·오류·다시 시도는 그 요청의 것). 시대·장르는 다양성 응답으로 그린다.
	const mixCard = (key, source, title, pair, nameHeader, now, before) => ({
		key,
		source,
		title,
		pair,
		table: pair?.current.labels.length ? mixTable(pair.current, pair.previous, nameHeader) : null,
		subtitle: mixSubtitle(pair, now, before),
		// 통계의 시대별 분포 카드와 같은 경고: 이번 학기의 시대 미상이 20%를 넘으면 그 비율(표의 '미상' 칸과 같은 수)
		note: key === 'eras' ? unknownEraNote(pair?.current) : ''
	});
	$: mixCards = [
		mixCard('eras', 'diversity', '시대별 분포', eras, '시대', label, previousLabel),
		mixCard('genres', 'diversity', '장르별 분포', genres, '장르', label, previousLabel)
	];

	// 선곡 다양성: 통계의 시대·장르 다양성 칸과 같은 정수 %와 지난 학기와 견준 줄(%p).
	const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
	// key: 숫자가 여는 분포 카드(mixCards). [칸 이름, 카드 제목]
	const TILE_NAMES = {
		eras: ['시대 다양성', '시대별 분포'],
		genres: ['장르 다양성', '장르별 분포']
	};
	const diversityTile = (key, now, before) => ({
		key,
		name: TILE_NAMES[key][0],
		title: TILE_NAMES[key][1],
		value: pct(groupEvenness(now)),
		change: evennessChangeText(groupEvenness(now), groupEvenness(before))
	});
	$: diversityTiles = [
		diversityTile('eras', diversity?.era, previousDiversity?.era),
		diversityTile('genres', diversity?.genre, previousDiversity?.genre)
	];

	// 처음 튼 작곡가·곡: 클럽 전체에서 처음 튼 날이 이 학기인 것. 부제는 그 개수와, 지난 학기의
	// 같은 목록(before)을 받았으면 그 개수(통계의 부제처럼 '… 18곡 · 지난 학기 12곡').
	// 카드마다 '많이 튼 순'(통계와 같다): 눌리면(sorted) 표와 링크를 횟수가 많은 것부터의 같은 목록에서
	// 만들고, 부제 끝에 ' · 많이 튼 순' 을 붙인다. CSV 저장은 card.table 을 읽으므로 보이는 순서 그대로다.
	const firstsCard = (key, title, firsts, before, nameHeader, unit, semesterId, sorted, member) => {
		const shown = sorted ? byCount(firsts) : firsts;
		return {
			key,
			title,
			sorted,
			shown,
			// 표기 정리의 종류: 처음 튼 곡은 작품 번호가 같은 곡(kind=music)
			spellingKind: nameHeader === '작곡가' ? 'composer' : 'music',
			table: shown?.items.length ? firstsTable(shown, nameHeader) : null,
			links:
				nameHeader === '작곡가'
					? linksOf(
							shown,
							semesterId,
							firstsByCount.firstComposers,
							firstsByCount.firstWorks,
							member
						)
					: workLinksOf(shown, semesterId, member),
			// 처음 튼 날마다: 그 날 처음 튼 선곡(지기 없이, statFirsts.js 의 firstDayHref). 보이는 순서의 행마다.
			cellLinks: {
				1: {
					hrefs: shown
						? shown.items.map((item) =>
								firstDayHref(
									nameHeader === '작곡가' ? 'composer' : 'work',
									item.id,
									item.first_played
								)
							)
						: [],
					title: '이 날 처음 튼 선곡 보기'
				}
			},
			subtitle:
				`클럽에서 이 학기에 처음 튼 ${nameHeader}` +
				(firsts ? ` · ${firsts.items.length.toLocaleString()}${unit}` : '') +
				(firsts && before ? ` · 지난 학기 ${before.items.length.toLocaleString()}${unit}` : '') +
				(sorted ? ' · 많이 튼 순' : '')
		};
	};
	// 통계처럼 URL 의 by_count(composers, works)에 둔다. 학기를 바꿔도 남는다(reportUrl).
	// $: firstsCards 가 이 객체를 읽으므로 누르면 다시 만든다.
	const urlFirsts = readFirstsByCount($page.url.searchParams);
	let firstsByCount = { firstComposers: urlFirsts.composers, firstWorks: urlFirsts.works };
	// 통계로 가는 링크(머리의 통계, 동점 메모의 전체 목록)는 둘 다 잇는다.
	$: statFirsts = { composers: firstsByCount.firstComposers, works: firstsByCount.firstWorks };
	/** @param {URLSearchParams} params */
	const writeFirsts = (params) =>
		writeFirstsByCount(params, {
			composers: firstsByCount.firstComposers,
			works: firstsByCount.firstWorks
		});
	// 학기의 URL(reportHref 는 semester_id 만 쓴다)에 by_count 와 보기(범위·지기·견습 포함)를 잇는다.
	function reportUrl(id) {
		const url = new URL(reportHref(id), $page.url);
		writeFirsts(url.searchParams);
		return statQueryHref(url, { scope, userId, includeMentees });
	}
	// 누르면 지금 URL 의 by_count 만 고친다.
	function toggleFirstsByCount(key) {
		firstsByCount[key] = !firstsByCount[key];
		const url = new URL($page.url);
		writeFirsts(url.searchParams);
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}
	$: firstsCards = [
		firstsCard(
			'firstComposers',
			'처음 튼 작곡가',
			firstComposers,
			previousFirstComposers,
			'작곡가',
			'명',
			semesterId,
			firstsByCount.firstComposers,
			member
		),
		firstsCard(
			'firstWorks',
			'처음 튼 곡',
			firstWorks,
			previousFirstWorks,
			'곡',
			'곡',
			semesterId,
			firstsByCount.firstWorks,
			member
		)
	];
	// 처음 튼 작곡가·곡의 표 아래 줄(통계와 같다): 다른 표기(곡은 작품 번호가 같은 곡)가 먼저 튼 적이 있을 수
	// 있는 행을 보이는 순서대로, 작곡가는 3명, 곡은 이름이 길어 2곡까지. 표기 정리를 못 받았으면 ''.
	$: firstsSpelling = Object.fromEntries(
		firstsCards.map((card) => [
			card.key,
			card.spellingKind === 'music'
				? firstSpellingNote(
						firstSpellingSplits(duplicates.music, card.shown),
						2,
						FIRST_MUSIC_LEAD,
						'곡'
					)
				: firstSpellingNote(
						firstSpellingSplits(duplicates.composer, card.shown),
						3,
						FIRST_SPELLING_LEAD,
						'명'
					)
		])
	);

	// 월별 선곡: 달마다 선곡 수와 곡 수. 진행 중인 달은 통계의 차트처럼 '(진행 중)' 을 붙이고,
	// 달 이름은 통계의 월별 막대처럼 그 달의 선곡 기록을 연다(링크는 '(진행 중)' 없는 라벨로 만든다).
	// 부제의 총 선곡은 표와 같은 응답의 것이다(요약 요청이 늦거나 실패해도 행의 합과 맞다).
	$: monthlyCard = {
		key: 'monthly',
		title: '월별 선곡',
		table: monthlyTable(monthly, today),
		links:
			monthly && historyFilter
				? bucketHistoryLinks(historyFilter, {
						filters: monthly.filters,
						labels: monthly.timeline.labels
					})
				: [],
		subtitle: [total(monthly), '선곡이 있는 달만'].filter(Boolean).join(' · ')
	};

	// 'CSV 저장': 카드의 표를 보이는 그대로(횟수만 쉼표 없이) 내려받는다. 파일 이름은 통계처럼
	// 학기결산_2025-2학기_많이 튼 작곡가_20261030.csv, 개인이면 학기 뒤에 지기(학기결산_2025-2학기_가상이_…).
	function saveCsv(card) {
		if (!card.table) return;
		const { headers, rows } = tableCsv(card.table);
		downloadCsvTable(
			downloadName(['학기결산', label, memberText, card.title, todayStamp()], 'csv'),
			headers,
			rows
		);
	}

	const KPIS = [
		['total_plays', '총 선곡'],
		['sessions', '타임'],
		['requested', '신청곡'],
		['composers', '작곡가'],
		['works', '곡'],
		['conductors', '지휘자'],
		['orchestras', '오케스트라']
	];

	// 선곡이 없는 학기에 카드 대신 보이는 말. 화면 낭독기의 로드 상태도 같은 말을 한다.
	// 개인에서는 그 지기의 선곡만 센 요약이므로, 학기가 아니라 이 지기가 튼 곡이 없다고 한다(통계와 같은 말).
	$: emptyText = upcoming
		? '아직 시작하지 않은 학기입니다.'
		: scope === 'individual' && userId
			? `이 학기에 이 지기가 ${includeMentees ? '지기·견습으로 ' : ''}튼 곡이 없습니다.`
			: '이 학기에는 선곡이 없습니다.';
	// 로드 상태에 이름을 대는 카드(페이지 순서). 한 요청이 여러 카드를 그린다: 다양성 응답은
	// 시대·장르별 분포·선곡 다양성·월별 선곡이 함께 쓰고, 넷 다 제 오류와 다시 시도를 띄운다.
	const cardNames = [
		['summary', '요약'],
		['composers', '많이 튼 작곡가'],
		['soloists', '많이 튼 독주자'],
		['works', '많이 튼 곡'],
		['conductors', '많이 튼 지휘자'],
		['orchestras', '많이 튼 오케스트라'],
		['diversity', '시대별 분포'],
		['diversity', '장르별 분포'],
		['diversity', '선곡 다양성'],
		['diversity', '월별 선곡'],
		['firstComposers', '처음 튼 작곡가'],
		['firstWorks', '처음 튼 곡']
	];
	// 화면 낭독기에 알릴 로드 상태(통계와 같다): 학기 목록이 실패하면 그 말을, 학기를 고르기 전과
	// 카드를 불러오는 동안은 비우고, 다 끝나면 실패한 카드의 이름이나 다 불러왔음을, 선곡이 없는
	// 학기면 빈 결산의 말을 한다. 지난 학기 수치가 실패했다는 말은 KPI 칸 아래 줄과 같은 조건으로 붙인다.
	$: loadStatus = withPreviousFailure(
		semestersError
			? semestersError
			: !semester || CARD_KEYS.some((k) => loading[k])
				? ''
				: empty
					? emptyText
					: loadStatusText(loading, errors, cardNames),
		previousFailed.length ? previousLabel : ''
	);
</script>

<svelte:head>
	<title>{pageTitle(memberText, label, '학기 결산')}</title>
</svelte:head>

<div class="report-page">
	<p class="sr-only" role="status">{loadStatus}</p>
	<header class="page-header">
		<div class="title-group">
			<h1>학기 결산</h1>
			{#if semester}
				<span class="semester">{label}</span>
				{#if memberText}<span class="semester">{memberText}</span>{/if}
				<span class="range">{rangeText}</span>
				{#if ongoing}<span class="range">{ongoing}</span>{/if}
				{#if upcoming}<span class="range">{upcoming}</span>{/if}
			{/if}
		</div>
		<div class="controls">
			{#if semester}
				<a
					class="page-link"
					href={statViewHref(
						firstsByCountHref(`/stat?semester_id=${semester.id}`, statFirsts),
						view
					)}>통계</a
				>
				<a class="page-link" href={kpiLinks.total_plays}>선곡 기록</a>
			{:else}
				<a class="page-link" href="/stat">통계</a>
			{/if}
			<select
				aria-label="학기"
				bind:this={semesterSelect}
				value={semester ? String(semester.id) : ''}
				on:change={onSelect}
				disabled={!semester}
			>
				{#each semesters as s}
					<option value={String(s.id)}>{semesterOptionLabel(s, today)}</option>
				{/each}
			</select>
			<ScopeToggle bind:scope label="학기 결산 범위" on:change={onScopeChange} />
			{#if scope === 'individual'}
				<MemberSelect bind:userId bind:includeMentees bind:userName on:change={onMemberChange} />
			{/if}
			<button class="print-btn" on:click={() => window.print()} disabled={!semester}> 인쇄 </button>
		</div>
	</header>

	{#if semestersError || semestersRetrying}
		<div class="empty-hint" class:error={semestersError} tabindex="-1" bind:this={semestersHint}>
			{#if semestersError}
				{semestersError}
				<button class="tool-btn" on:click={retrySemesters} aria-label="학기 목록 다시 시도">
					다시 시도
				</button>
			{:else}
				불러오는 중...
			{/if}
		</div>
	{:else if semestersLoaded && !semester}
		<div class="empty-hint">학기가 없습니다.</div>
	{:else if semester && scope === 'individual' && !userId}
		<div class="empty-hint">지기를 선택하면 개인 결산을 볼 수 있습니다.</div>
	{:else if semester}
		<div class="kpi-row" tabindex="-1" bind:this={kpiRow}>
			<!-- 총 선곡·신청곡의 숫자는 그 선곡의 선곡 기록을 연다(0 이나 '—' 이면 글자 그대로) -->
			<!-- 작곡가·곡·지휘자·오케스트라의 숫자는 아래의 많이 튼 … 카드로 간다(타임은 세는 카드가 없다) -->
			{#each KPIS as [key, name]}
				{@const change = kpiChangeText(summary?.[key], previousSummary?.[key])}
				<div class="kpi">
					<div class="kpi-value">
						{#if kpiLinks[key] && summary?.[key] > 0}
							<a
								class="kpi-link"
								href={kpiLinks[key]}
								title="선곡 기록에서 보기"
								aria-label="{name} {count(summary[key])} 곡 선곡 기록에서 보기"
								>{count(summary[key])}</a
							>
						{:else if KPI_CARDS[key] && summary?.[key] > 0}
							{@const [title, unit] = KPI_CARDS[key]}
							<button
								type="button"
								class="kpi-link kpi-open"
								on:click={() => openCard(key)}
								title="{title} 보기"
								aria-label="{name} {count(summary[key])} {unit} — {title} 보기"
								>{count(summary[key])}</button
							>
						{:else}
							{count(summary?.[key])}
						{/if}
					</div>
					<div class="kpi-label">{name}</div>
					<!-- 개인: 같은 학기 클럽 전체에서의 몫(통계와 같다). 지난 학기 줄보다 위 -->
					{#if clubShares[key]}
						<div class="kpi-change kpi-share">{clubShares[key]}</div>
					{/if}
					{#if change}
						{@const [diff, before] = change.split(' · ')}
						<!-- 좁은 칸(인쇄)에서는 · 뒤에서만 줄을 바꾼다 -->
						<div class="kpi-change">
							<span>{diff} ·</span>
							<span>{before}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		{#if errors.summary}
			<p class="kpi-error">
				요약을 불러오지 못했습니다.
				<button
					class="tool-btn"
					on:click={(e) => retry('summary', e, kpiRow)}
					aria-label="요약 다시 시도"
				>
					다시 시도
				</button>
			</p>
		{/if}
		<!-- 인쇄에서도 문장은 남고(비교가 빠졌다는 것), 단추만 숨는다 -->
		{#if previousFailed.length && previousLabel}
			<p class="kpi-error">
				지난 학기({previousLabel})와 견준 수치를 불러오지 못했습니다.
				<button class="tool-btn" on:click={retryPrevious} aria-label="지난 학기 수치 다시 시도">
					다시 시도
				</button>
			</p>
		{/if}
		<!-- 진행 중인 학기는 지난 학기 전체와 견주므로 줄어든 것처럼 보인다: 그렇다고 쓴다(인쇄에도 남는다) -->
		{#if ongoing && previousLabel && !empty}
			<p class="kpi-note">
				진행 중인 학기입니다. 지난 학기({previousLabel}) 수치는 학기 전체입니다.
			</p>
		{/if}

		{#if empty}
			<!-- 인쇄에서는 문장만 남고 단추는 숨는다(.tool-btn) -->
			<div class="empty-hint">
				{emptyText}
				{#if upcoming && started}
					<button class="tool-btn" on:click={showStarted}>
						{semesterLabel(started)} 결산 보기
					</button>
				{:else if !upcoming && scope === 'individual' && userId}
					<button class="tool-btn" on:click={showAll}>전체 결산 보기</button>
				{/if}
			</div>
		{:else}
			<div class="grid">
				{#each topCards as card}
					<section
						class="card"
						class:wide={card.wide}
						tabindex="-1"
						aria-labelledby={`report-${card.key}`}
						bind:this={cardEls[card.key]}
					>
						<button
							class="tool-btn csv-btn"
							on:click={() => saveCsv(card)}
							disabled={!!(loading[card.key] || errors[card.key] || !card.table)}
							title="표를 CSV로 저장"
							aria-label={`${card.title} CSV 저장`}
						>
							CSV 저장
						</button>
						<h2 id={`report-${card.key}`}>{card.title}</h2>
						<p class="subtitle" id={`report-${card.key}-sub`}>
							{['상위 10', total(data[card.key]?.current)].filter(Boolean).join(' · ')}
						</p>
						{#if loading[card.key]}
							<div class="placeholder">불러오는 중...</div>
						{:else if errors[card.key]}
							<div class="placeholder error">
								{card.title} — {errors[card.key]}
								<button
									class="tool-btn"
									on:click={(e) => retry(card.key, e, e.currentTarget.closest('section'))}
									aria-label={`${card.title} 다시 시도`}
								>
									다시 시도
								</button>
							</div>
						{:else if !card.table}
							<div class="placeholder">{card.empty ?? '데이터가 없습니다'}</div>
						{:else}
							<ReportTable
								table={card.table}
								links={card.links}
								cellLinks={card.cellLinks}
								labelledby={`report-${card.key}`}
								describedby={`report-${card.key}-sub`}
							/>
							{#if card.more && !card.note}
								<p class="more-note">
									<a href={cardHref(fullListHref, card.key)}>통계에서 모두 보기 ({card.more})</a>
								</p>
							{/if}
							{#if card.note}
								<p class="mix-note">
									{card.note}<span class="note-link"
										>&nbsp;· <a href={cardHref(fullListHref, card.key)}>통계에서 모두 보기</a></span
									>
								</p>
							{/if}
							{#if card.split}
								<p class="mix-note">
									{card.split}<span class="note-link"
										>&nbsp;· <a href={catalogViewHref('', card.splitKind)}>표기 정리</a></span
									>
								</p>
							{/if}
						{/if}
					</section>
				{/each}

				{#each mixCards as card}
					<section
						class="card wide"
						tabindex="-1"
						aria-labelledby={`report-${card.key}`}
						bind:this={cardEls[card.key]}
					>
						<button
							class="tool-btn csv-btn"
							on:click={() => saveCsv(card)}
							disabled={!!(loading[card.source] || errors[card.source] || !card.table)}
							title="표를 CSV로 저장"
							aria-label={`${card.title} CSV 저장`}
						>
							CSV 저장
						</button>
						<h2 id={`report-${card.key}`}>{card.title}</h2>
						<p class="subtitle" id={`report-${card.key}-sub`}>{card.subtitle}</p>
						{#if loading[card.source]}
							<div class="placeholder">불러오는 중...</div>
						{:else if errors[card.source]}
							<div class="placeholder error">
								{card.title} — {errors[card.source]}
								<button
									class="tool-btn"
									on:click={(e) => retry(card.source, e, e.currentTarget.closest('section'))}
									aria-label={`${card.title} 다시 시도`}
								>
									다시 시도
								</button>
							</div>
						{:else if !card.table}
							<div class="placeholder">데이터가 없습니다</div>
						{:else}
							<div class="mix">
								<!-- 같은 수치가 옆의 표에 있다 -->
								<div class="pie" aria-hidden="true">
									<EChart option={pieOption(card.pair.current)} />
								</div>
								<div class="mix-table">
									<ReportTable
										table={card.table}
										labelledby={`report-${card.key}`}
										describedby={`report-${card.key}-sub`}
									/>
								</div>
							</div>
							{#if card.note}
								<p class="mix-note">
									{card.note}<span class="note-link"
										>&nbsp;· <a href="/stat/composers">작곡가 정리</a></span
									>
								</p>
							{/if}
						{/if}
					</section>
				{/each}

				<!-- 위의 두 분포를 한 숫자로: 통계의 선곡 다양성 칸(고유 곡 수는 위의 곡 칸과 같아 뺀다) -->
				<section class="card wide" tabindex="-1" aria-labelledby="report-diversity">
					<h2 id="report-diversity">선곡 다양성</h2>
					<p class="subtitle">0%=편중 · 100%=고름 (가능한 모든 시대·장르를 고르게 틀수록 100%)</p>
					{#if loading.diversity}
						<div class="placeholder">불러오는 중...</div>
					{:else if errors.diversity}
						<div class="placeholder error">
							선곡 다양성 — {errors.diversity}
							<button
								class="tool-btn"
								on:click={(e) => retry('diversity', e, e.currentTarget.closest('section'))}
								aria-label="선곡 다양성 다시 시도"
							>
								다시 시도
							</button>
						</div>
					{:else}
						<div class="kpi-row diversity-row">
							{#each diversityTiles as tile}
								<div class="kpi">
									<!-- 다양성 % 는 위의 시대별·장르별 분포 카드로 간다('—' 이면 글자 그대로) -->
									<div class="kpi-value">
										{#if tile.value !== '—'}
											<button
												type="button"
												class="kpi-link kpi-open"
												on:click={() => openCard(tile.key)}
												title="{tile.title} 보기"
												aria-label="{tile.name} {tile.value} — {tile.title} 보기"
												>{tile.value}</button
											>
										{:else}
											{tile.value}
										{/if}
									</div>
									<div class="kpi-label">{tile.name}</div>
									{#if tile.change}
										{@const [diff, before] = tile.change.split(' · ')}
										<div class="kpi-change">
											<span>{diff} ·</span>
											<span>{before}</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- 백엔드는 선곡이 없는 달을 빼고 보낸다: 부제가 그렇다고 알린다 -->
				<section class="card wide" tabindex="-1" aria-labelledby="report-monthly">
					<button
						class="tool-btn csv-btn"
						on:click={() => saveCsv(monthlyCard)}
						disabled={!!(loading.diversity || errors.diversity || !monthlyCard.table)}
						title="표를 CSV로 저장"
						aria-label="월별 선곡 CSV 저장"
					>
						CSV 저장
					</button>
					<h2 id="report-monthly">월별 선곡</h2>
					<p class="subtitle" id="report-monthly-sub">{monthlyCard.subtitle}</p>
					{#if loading.diversity}
						<div class="placeholder">불러오는 중...</div>
					{:else if errors.diversity}
						<div class="placeholder error">
							월별 선곡 — {errors.diversity}
							<button
								class="tool-btn"
								on:click={(e) => retry('diversity', e, e.currentTarget.closest('section'))}
								aria-label="월별 선곡 다시 시도"
							>
								다시 시도
							</button>
						</div>
					{:else if !monthlyCard.table}
						<div class="placeholder">데이터가 없습니다</div>
					{:else}
						<ReportTable
							table={monthlyCard.table}
							links={monthlyCard.links}
							labelledby="report-monthly"
							describedby="report-monthly-sub"
						/>
					{/if}
				</section>

				{#each firstsCards as card}
					<section class="card wide breakable" tabindex="-1" aria-labelledby={`report-${card.key}`}>
						<!-- 표가 보일 때만(불러오는 중·실패·빈 카드에는 없다). 인쇄에서는 숨고 부제가 순서를 밝힌다 -->
						{#if !loading[card.key] && !errors[card.key] && card.table}
							<button
								class="tool-btn sort-btn"
								class:active={card.sorted}
								aria-pressed={card.sorted}
								on:click={() => toggleFirstsByCount(card.key)}
								title="많이 튼 순으로 보기"
								aria-label={`${card.title} 많이 튼 순으로 보기`}
							>
								많이 튼 순
							</button>
						{/if}
						<button
							class="tool-btn csv-btn"
							on:click={() => saveCsv(card)}
							disabled={!!(loading[card.key] || errors[card.key] || !card.table)}
							title="표를 CSV로 저장"
							aria-label={`${card.title} CSV 저장`}
						>
							CSV 저장
						</button>
						<h2 id={`report-${card.key}`}>{card.title}</h2>
						<p class="subtitle" id={`report-${card.key}-sub`}>{card.subtitle}</p>
						{#if loading[card.key]}
							<div class="placeholder">불러오는 중...</div>
						{:else if errors[card.key]}
							<div class="placeholder error">
								{card.title} — {errors[card.key]}
								<button
									class="tool-btn"
									on:click={(e) => retry(card.key, e, e.currentTarget.closest('section'))}
									aria-label={`${card.title} 다시 시도`}
								>
									다시 시도
								</button>
							</div>
						{:else if !card.table}
							<div class="placeholder">없습니다</div>
						{:else}
							<ReportTable
								table={card.table}
								links={card.links}
								cellLinks={card.cellLinks}
								labelledby={`report-${card.key}`}
								describedby={`report-${card.key}-sub`}
							/>
							{#if firstsSpelling[card.key]}
								<p class="mix-note">
									{firstsSpelling[card.key]}<span class="note-link"
										>&nbsp;· <a href={catalogViewHref('', card.spellingKind)}>표기 정리</a></span
									>
								</p>
							{/if}
						{/if}
					</section>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* 통계 페이지와 같은 여백·머리말·KPI·카드 */
	.report-page {
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
	/* 개인 보기의 지기 목록까지 한 줄에 다 들어가지 않으면 컨트롤을 다음 줄 오른쪽에 둔다(통계와 같다). */
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
	.semester {
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: 700;
		color: var(--primary-primary-800, #6a5134);
	}
	.range {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 12px 16px;
		margin-left: auto;
	}
	.page-link {
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--primary-primary-800, #6a5134);
		text-underline-offset: 3px;
	}
	/* 통계의 기간 select(PeriodSelect)·전체/개인 단추(ScopeToggle)와 같은 모양 */
	select {
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
		padding: 6px 10px;
		border: 1px solid var(--control-border);
		border-radius: 6px;
		background: var(--secondary-secondary-50, #fffdfc);
		color: var(--gray-gray-950, #1a1a1a);
	}
	.print-btn {
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
		padding: 6px 18px;
		border: 1px solid var(--primary-primary-600, #c8ad8f);
		border-radius: 6px;
		background: var(--secondary-secondary-50, #fffdfc);
		color: var(--primary-primary-800, #6a5134);
		cursor: pointer;
	}
	.print-btn:disabled {
		color: var(--gray-gray-500);
		border-color: var(--gray-gray-400);
		cursor: default;
	}
	.empty-hint {
		text-align: center;
		padding: 80px 0;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.empty-hint.error,
	.placeholder.error,
	.kpi-error {
		color: var(--secondary-secondary-800, #95560d);
	}
	/* 다른 통계 페이지(SpellingVariants.svelte)의 단추와 같은 모양 */
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
	.tool-btn:hover:not(:disabled) {
		background: var(--secondary-secondary-200, #fdf1e4);
	}
	.tool-btn:disabled {
		color: var(--gray-gray-500);
		border-color: var(--gray-gray-400);
		background: var(--secondary-secondary-50);
		cursor: default;
	}
	.empty-hint .tool-btn,
	.kpi-error .tool-btn {
		margin-left: 8px;
	}
	.kpi-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
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
	/* 통계의 KPI 칸처럼 밑줄은 가리키거나 키보드로 고를 때만 */
	.kpi-link {
		color: inherit;
		text-decoration: none;
		text-underline-offset: 3px;
	}
	.kpi-link:hover,
	.kpi-link:focus-visible {
		text-decoration: underline;
	}
	/* 카드로 가는 숫자(단추)도 옆 링크와 같은 모양(통계의 .kpi-open) */
	.kpi-open {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
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
	/* 좁은 칸(인쇄)에서도 '342곡' 같은 낱말 안에서는 줄을 바꾸지 않는다 */
	.kpi-share {
		word-break: keep-all;
	}
	.diversity-row {
		grid-template-columns: repeat(2, 1fr);
		margin-bottom: 0;
	}
	.kpi-error,
	.kpi-note {
		margin: -8px 0 16px;
		text-align: center;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
	}
	.kpi-note {
		color: var(--gray-gray-600, #7c7c7c);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
	/* ChartCard 와 같은 카드 */
	.card {
		background: var(--secondary-secondary-50, #fffdfc);
		border: 1px solid var(--gray-gray-300, #d4d4d4);
		border-radius: 8px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.08);
		padding: 12px;
		min-width: 0;
		position: relative;
	}
	.card.wide {
		grid-column: span 2;
	}
	/* ChartCard 의 저장 단추와 같은 자리·크기(카드 오른쪽 위) */
	.csv-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 3px 8px;
	}
	/* 처음 튼 카드의 '많이 튼 순': TableCard 의 .view-toggle 과 같은 자리(왼쪽 위)·모양. 눌린 상태는
	   포인터가 올라가 있어도 유지한다 */
	.sort-btn {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 3px 8px;
	}
	.sort-btn.active,
	.sort-btn.active:hover:not(:disabled) {
		background: var(--action-bg);
		color: var(--action-fg);
	}
	/* 차트 제목·부제(chartOptions.js 의 titleBlock)와 같은 글꼴·색 */
	h2 {
		margin: 2px 0 0;
		text-align: center;
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: 18px;
		font-weight: 700;
		color: var(--gray-gray-950, #1a1a1a);
	}
	.subtitle {
		margin: 4px 0 12px;
		text-align: center;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: 12px;
		color: var(--gray-gray-600, #7c7c7c);
	}
	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		height: 120px;
		color: var(--gray-gray-500, #9f9f9f);
		font-family: var(--medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--medium-font-size, 16px);
	}
	.mix {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}
	/* 화면과 인쇄에서 같은 크기: 인쇄할 때 캔버스를 다시 그릴 필요가 없다 */
	.pie {
		flex: none;
		width: 240px;
		height: 240px;
	}
	.pie :global(.echart) {
		min-height: 0;
	}
	.mix-table {
		flex: 1;
		min-width: 0;
	}
	/* 통계 ChartCard 의 .note 와 같은 모양 */
	.mix-note {
		margin: 4px 0 0;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--secondary-secondary-800, #95560d);
		text-align: center;
	}
	.mix-note a {
		color: inherit;
		text-underline-offset: 3px;
	}
	/* 표 아래의 길잡이 링크: .mix-note 의 자리와 글꼴, 경고색이 아닌 흐린 색 */
	.more-note {
		margin: 4px 0 0;
		font-family: var(--small-medium-font-family, 'Noto Sans KR', sans-serif);
		font-size: var(--small-medium-font-size, 13px);
		color: var(--gray-gray-600, #7c7c7c);
		text-align: center;
	}
	.more-note a {
		color: inherit;
		text-underline-offset: 3px;
	}

	@page {
		size: A4;
		margin: 12mm;
	}
	@media print {
		/* 사이드바·레이아웃의 규칙은 컴포넌트 범위(.side-bar.svelte-…)라 !important 로 이긴다 */
		:global(.side-bar) {
			display: none !important;
		}
		:global(html),
		:global(body),
		:global(.screen),
		:global(.app) {
			min-width: 0 !important;
		}
		.report-page {
			padding: 0;
		}
		.controls,
		.tool-btn,
		.note-link,
		.more-note {
			display: none;
		}
		.card {
			box-shadow: none;
			break-inside: avoid;
		}
		.card.breakable {
			break-inside: auto;
		}
		.kpi-row {
			gap: 6px;
		}
		.kpi {
			padding: 10px 4px;
		}
		.kpi-value {
			font-size: 20px;
		}
	}
</style>
