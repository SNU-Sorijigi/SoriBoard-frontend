// 작곡가 페이지(/stat/composer/<id>): 경로의 id, 기간·지기와 URL, 머리말 문구, 학기 라벨, 곡 표, 링크.
// 기간은 통계와 같은 키(statPeriod.js)로 URL에 두지만, 기본값이 전체 기간이다: 전체 기간은
// 아무것도 남기지 않고, 이번 학기는 period=current 로 남긴다. 지기는 선곡 기록과 같은 키
// (user_id, include_mentees)로 두고, 기본값(전체 지기)은 남기지 않는다. 링크는 모두 그 기간·지기를 연다.
import { CURRENT, ALL, CUSTOM, readStatPeriod, readStatRange } from './statPeriod.js';
import { historyHref, bucketHistoryLinks, statHref } from './playHistory.js';
import { DRILL_CARDS, previousWorkValue } from './statDrill.js';
import { competitionRanks, formatCount, formatShare } from './statTable.js';
import { periodTitle } from './statTitle.js';
import { spansSemesters } from './statBucket.js';
import { firstsTable } from './semesterReport.js';
import { tableCsv } from './csvTable.js';

const ID = /^[1-9]\d*$/;
const UNKNOWN_ERA = '미상';

// 경로의 id. 양의 정수가 아니면 null(요청하지 않고 '찾을 수 없음'을 보인다).
/** @param {string | null | undefined} raw */
export function readComposerId(raw) {
	return raw && ID.test(raw) && Number.isSafeInteger(Number(raw)) ? raw : null;
}

/**
 * @typedef {{ period: string, start?: string, end?: string, userId?: string | null,
 *   includeMentees?: boolean }} ComposerPeriod
 */
/** @type {ComposerPeriod} */
const WHOLE = { period: ALL, start: '', end: '' };
const PERIOD_KEYS = ['semester_id', 'period', 'start', 'end'];
const MEMBER_KEYS = ['user_id', 'include_mentees'];

// URL의 기간. 학기, 직접 지정, period=current(이번 학기) 순으로 따르고, 없거나 형식이 틀리면 전체 기간.
/**
 * @param {URLSearchParams} params
 * @returns {{ period: string, start: string, end: string }}
 */
export function readComposerPeriod(params) {
	const period = readStatPeriod(params);
	if (period === CUSTOM) return { period, ...readStatRange(params) };
	// readStatPeriod 는 기간 키가 없으면 이번 학기로 읽는다. 여기서는 period=current 만 이번 학기다.
	const read = period === CURRENT && params.get('period') !== CURRENT ? ALL : period;
	return { period: read, start: '', end: '' };
}

// params 의 기간 키만 filter 에 맞춘다(다른 키는 그대로). 전체 기간은 아무것도 남기지 않는다.
/**
 * @param {URLSearchParams} params
 * @param {ComposerPeriod} [filter]
 */
export function writeComposerPeriod(params, { period, start = '', end = '' } = WHOLE) {
	for (const key of PERIOD_KEYS) params.delete(key);
	if (period === CURRENT) params.set('period', CURRENT);
	else if (period === CUSTOM) {
		if (start) params.set('start', start);
		if (end) params.set('end', end);
	} else if (period !== ALL) params.set('semester_id', String(period));
}

// URL의 지기. 없거나 형식이 틀리면 전체 지기(null). 견습 포함은 지기를 고른 때만 뜻이 있다(선곡 기록과 같다).
/**
 * @param {URLSearchParams} params
 * @returns {{ userId: string | null, includeMentees: boolean }}
 */
export function readComposerMember(params) {
	const userId = readComposerId(params.get('user_id'));
	return { userId, includeMentees: userId !== null && params.get('include_mentees') === 'true' };
}

// params 의 지기 키만 filter 에 맞춘다(다른 키는 그대로). 전체 지기는 아무것도 남기지 않는다.
/**
 * @param {URLSearchParams} params
 * @param {{ userId?: string | null, includeMentees?: boolean }} [filter]
 */
export function writeComposerMember(params, { userId = null, includeMentees = false } = {}) {
	for (const key of MEMBER_KEYS) params.delete(key);
	if (!userId) return;
	params.set('user_id', String(userId));
	if (includeMentees) params.set('include_mentees', 'true');
}

/**
 * @param {number | string} id
 * @param {ComposerPeriod} [filter] 없으면 전체 기간·전체 지기
 */
export function composerHref(id, filter = WHOLE) {
	const params = new URLSearchParams();
	writeComposerPeriod(params, filter);
	writeComposerMember(params, filter);
	const search = params.toString();
	return `/stat/composer/${id}${search ? `?${search}` : ''}`;
}

// stats/ 요청의 기간 파라미터. 이번 학기는 그 날짜 범위(current)로 보낸다(통계와 같다).
/**
 * @param {ComposerPeriod} filter
 * @param {{ start: string, end: string }} current
 * @returns {Record<string, string>}
 */
export function composerPeriodParams({ period, start = '', end = '' }, current) {
	const range = period === CURRENT ? current : period === CUSTOM ? { start, end } : null;
	if (!range) return period === ALL ? {} : { semester_id: String(period) };
	/** @type {Record<string, string>} */
	const params = {};
	if (range.start) params.start = range.start;
	if (range.end) params.end = range.end;
	return params;
}

// stats/ 요청의 지기 파라미터(통계의 개인 보기와 같다). 전체 지기면 {}.
/**
 * @param {{ userId?: string | null, includeMentees?: boolean }} filter
 * @returns {Record<string, string>}
 */
export function composerMemberParams({ userId = null, includeMentees = false }) {
	if (!userId) return {};
	return includeMentees
		? { user_id: String(userId), include_mentees: 'true' }
		: { user_id: String(userId) };
}

// 보기가 이 작곡가의 전체 기록인가: 전체 기간(또는 날짜가 둘 다 빈 직접 지정)에 전체 지기.
/** @param {ComposerPeriod} filter */
export function composerIsWholeRecord({ period, start = '', end = '', userId = null }) {
	return !userId && (period === ALL || (period === CUSTOM && !start && !end));
}

// 기간에 이 작곡가의 선곡이 없을 때 카드 대신 보이는 말과, '전체 지기에서 보기'(지기만 풀기)를 보일지.
// 선곡 기록의 빈 목록(emptyListText)과 같다: 지기를 골랐고 같은 기간의 클럽 수가 0 이 아니면 보인다.
// 수를 알면 말에 넣고, 모르면(불러오는 중·실패) 수 없이 보인다. 클럽도 0 이면 오늘의 말 그대로이고 보이지 않는다.
/**
 * @param {{ period: string, userId?: number | string | null }} filter
 * @param {number | null | undefined} clubCount 같은 기간(지기·견습 없이) 클럽이 이 작곡가를 튼 선곡 수
 * @returns {{ text: string, widenMember: boolean }}
 */
export function composerEmptyText({ period, userId = null }, clubCount) {
	const text = `${period === ALL ? '아직' : '이 기간에는'} ${userId ? '이 지기가 ' : ''}이 작곡가의 곡을 튼 적이 없습니다`;
	const widenMember = !!userId && clubCount !== 0;
	if (widenMember && typeof clubCount === 'number')
		return { text: `${text} · 클럽 전체 ${clubCount.toLocaleString()}곡`, widenMember };
	return { text: `${text}.`, widenMember };
}

// 처음·마지막 튼 날 칸 아래의 줄: 기간·지기 없는 stats/summary(whole)의 날짜. 보기가 전체 기록이거나
// whole 이 없으면 null(줄이 없다). 날짜가 없으면 ''.
/**
 * @param {ComposerPeriod} filter
 * @param {{ date_start?: string | null, date_end?: string | null } | null | undefined} whole
 * @returns {{ start: string, end: string } | null}
 */
export function composerWholeDates(filter, whole) {
	if (!whole || composerIsWholeRecord(filter)) return null;
	const text = (/** @type {string | null | undefined} */ date) => (date ? `전체 기록 ${date}` : '');
	return { start: text(whole.date_start), end: text(whole.date_end) };
}

// 카드 부제와 탭 제목에 넣을 기간의 이름. 학기가 목록에 아직 없으면 ''.
/**
 * @param {ComposerPeriod} filter
 * @param {{ id: number, year: number, semester_num: number }[] | null | undefined} semesters
 */
export function composerPeriodName(filter, semesters) {
	return filter.period === CURRENT ? '이번 학기' : periodTitle(filter, semesters);
}

// 같은 기간의 통계(전체 기간이면 period=all). 지기를 고르면 그 지기의 개인 보기.
/** @param {ComposerPeriod} [filter] */
export const composerStatHref = (filter = WHOLE) =>
	statHref(composerHistoryFilter(null, [], filter));

// 이 작곡가의 선곡 기록(filter 의 기간·지기, 없으면 전체 기간·전체 지기). extra 를 주면 그 대상(예: 연주자)과 함께 튼 것만.
/**
 * @param {number | string} id
 * @param {import('./playHistory.js').HistoryTarget[]} [extra]
 * @param {ComposerPeriod} [filter]
 */
export function composerHistoryHref(id, extra = [], filter = WHOLE) {
	return historyHref(composerHistoryFilter(id, extra, filter));
}

// 이 작곡가의 신청곡만 연 선곡 기록(같은 기간·지기). 신청곡 칸의 숫자가 연다(통계와 같다).
/**
 * @param {number | string} id
 * @param {ComposerPeriod} [filter]
 */
export function composerRequestedHref(id, filter = WHOLE) {
	return historyHref({ ...composerHistoryFilter(id, [], filter), requested: 'true' });
}

// 그날 이 작곡가의 선곡 기록: 처음·마지막 튼 날 칸의 날짜가 연다. 기간은 그 하루(직접 지정)로 바꾸고 지기는 filter 의
// 것을 둔다(그 지기 기준으로 구한 날짜다). 전체 기록 줄의 날짜는 filter 없이(지기 없이) 부른다. 날짜가 없으면 ''.
/**
 * @param {number | string} id
 * @param {string | null | undefined} date YYYY-MM-DD
 * @param {ComposerPeriod} [filter]
 */
export function composerDayHref(id, date, { userId = null, includeMentees = false } = WHOLE) {
	if (!date) return '';
	return historyHref(
		composerHistoryFilter(id, [], {
			period: CUSTOM,
			start: date,
			end: date,
			userId,
			includeMentees
		})
	);
}

// 곡 하나의 선곡 기록(같은 기간·지기). 곡의 작곡가는 하나뿐이므로 곡만 거른다.
/**
 * @param {number | string} musicId
 * @param {ComposerPeriod} [filter]
 */
export function composerWorkHref(musicId, filter = WHOLE) {
	return historyHref({
		...composerHistoryFilter(null, [], filter),
		targets: [{ param: 'music_id', id: String(musicId) }]
	});
}

/**
 * @param {number | string | null} id 없으면 작곡가로 거르지 않는다
 * @param {import('./playHistory.js').HistoryTarget[]} [extra]
 * @param {ComposerPeriod} [filter]
 * @returns {import('./playHistory.js').HistoryFilter}
 */
function composerHistoryFilter(
	id,
	extra = [],
	{ period, start = '', end = '', userId = null, includeMentees = false } = WHOLE
) {
	const custom = period === CUSTOM;
	return {
		period,
		start: custom ? start : '',
		end: custom ? end : '',
		q: '',
		userId: userId || null,
		includeMentees: Boolean(userId) && includeMentees,
		requested: '',
		targets: [...(id == null ? [] : [{ param: 'composer_id', id: String(id) }]), ...extra]
	};
}

// 학기별·월별 선곡의 막대마다 → 그 학기·달에 이 작곡가의 곡을 튼 선곡 기록(stats/timeline 의 학기·월 버킷).
// 학기 목록에 있는 학기는 semester_id 로, 없으면(달도) 그 날짜로 연다. 기간이 학기·달의 일부만 덮으면
// 응답의 filters 로 줄인 날짜로 연다(bucketHistoryLinks).
/**
 * @param {number | string | null} id
 * @param {{ filters?: { bucket?: string }, labels: string[] } | null | undefined} timeline
 * @param {{ id: number, year: number, semester_num: number }[] | null} [semesters] /api/semester
 * @param {ComposerPeriod} [filter]
 */
export function composerSemesterLinks(id, timeline, semesters = [], filter = WHOLE) {
	return id ? bucketHistoryLinks(composerHistoryFilter(id, [], filter), timeline, semesters) : [];
}

// 순위 카드(독주자·지휘자)의 항목마다 → 이 작곡가의 곡을 그 대상과 튼 선곡 기록. 이름이 아니라
// id 로 거른다(이름은 겹칠 수 있다). id 가 없는 항목이나 drill-down 카드가 아니면 null.
/**
 * @param {number | string} composerId
 * @param {string} card
 * @param {{ items?: { id: number | null }[] } | null | undefined} envelope
 * @param {ComposerPeriod} [filter]
 * @returns {(string | null)[]}
 */
export function composerRankLinks(composerId, card, envelope, filter = WHOLE) {
	const spec = DRILL_CARDS[card];
	return (envelope?.items ?? []).map((item) =>
		spec && item.id != null
			? composerHistoryHref(composerId, [{ param: spec.param, id: String(item.id) }], filter)
			: null
	);
}

// 많이 튼 작곡가(stats/composers)를 묻는 길이: 백엔드의 상한(limit 최대 100)이다.
export const RANK_LIMIT = 100;

// 많이 튼 작곡가 목록(상위 RANK_LIMIT)에서 이 작곡가의 자리: 같은 횟수는 같은 순위(통계의 표와 같다), 다른
// 작곡가와 같으면 '공동'. 목록을 다 채웠는데 없으면 '100위 밖'(count 는 null), 짧은 목록에 없으면 null.
/**
 * @param {{ items?: { id: number | null, count: number }[] } | null | undefined} envelope
 * @param {number | string} composerId
 * @returns {{ place: string, count: number | null } | null}
 */
function rankPlace(envelope, composerId) {
	const items = envelope?.items ?? [];
	const i = items.findIndex((item) => item.id != null && String(item.id) === String(composerId));
	if (i >= 0) {
		const values = items.map((item) => item.count);
		const tied = values.some((v, j) => j !== i && v === values[i]);
		return { place: `${tied ? '공동 ' : ''}${competitionRanks(values)[i]}위`, count: values[i] };
	}
	return items.length >= RANK_LIMIT ? { place: `${RANK_LIMIT}위 밖`, count: null } : null;
}

/** @param {string} place */
const rankLeadText = (place) => `많이 튼 작곡가 ${place}`;
/** @param {string} place */
const previousRankText = (place) => `지난 학기 ${place}`;

// 순위 줄의 첫머리 '많이 튼 작곡가 3위'(공동이면 '공동 3위'): 통계의 많이 튼 작곡가 표로 가는 링크의 글.
// 이 작곡가가 목록(그 표의 행)에 있을 때만이다. '100위 밖'이거나 목록에 없으면 ''(링크 없이 줄 그대로).
/**
 * @param {{ items?: { id: number | null, count: number }[] } | null | undefined} envelope
 * @param {number | string | null} composerId
 */
export function composerRankLead(envelope, composerId) {
	if (composerId == null) return '';
	const current = rankPlace(envelope, composerId);
	return current && current.count != null ? rankLeadText(current.place) : '';
}

// 순위 줄 괄호 안의 '지난 학기 5위'(공동이면 '공동 5위'): 통계의 그 학기 많이 튼 작곡가 표로 가는 링크의 글.
// previous(지난 학기의 같은 목록)에 선곡이 있고 이 작곡가가 그 목록(표의 행)에 있을 때만이다. 그 학기에 틀지
// 않았거나 '100위 밖'이거나, 앞 학기의 목록이 없으면 ''(링크 없이 줄 그대로).
/**
 * @param {{ total_plays?: number, items?: { id: number | null, count: number }[] } | null | undefined} previous
 * @param {number | string | null} composerId
 */
export function composerPreviousRankLead(previous, composerId) {
	if (composerId == null || !previous?.total_plays) return '';
	const last = rankPlace(previous, composerId);
	return last && last.count != null ? previousRankText(last.place) : '';
}

// KPI 칸 아래의 순위 줄: 같은 기간·지기의 많이 튼 작곡가에서 이 작곡가의 자리(rankPlace)와 기간 선곡 중 몫.
// '100위 밖'의 횟수는 이 페이지의 요약 plays. 선곡이 없거나, 짧은 목록에 없으면(요약과 어긋난 답) ''(줄이 없다).
// previous(지난 학기의 같은 목록, 같은 지기)에 선곡이 있으면 자리 뒤에 '(지난 학기 3위)'를 붙인다. 그 짧은
// 목록에 없으면 그 학기에는 틀지 않았다. 앞 학기가 없거나, 아직 오지 않았거나, 실패했으면(null) 붙이지 않는다.
/**
 * @param {{ total_plays?: number, items?: { id: number | null, count: number }[] } | null | undefined} envelope
 * @param {number | string | null} composerId
 * @param {number | null | undefined} plays
 * @param {{ total_plays?: number, items?: { id: number | null, count: number }[] } | null | undefined} [previous]
 */
export function composerRankNote(envelope, composerId, plays, previous = null) {
	const total = envelope?.total_plays;
	if (!plays || !total || composerId == null) return '';
	const current = rankPlace(envelope, composerId);
	if (!current) return '';
	const count = current.count ?? plays;
	let before = '';
	if (previous?.total_plays) {
		const last = rankPlace(previous, composerId);
		before = ` (${last ? previousRankText(last.place) : '지난 학기에는 틀지 않음'})`;
	}
	const share = formatShare((count / total) * 100);
	return `${rankLeadText(current.place)}${before} · 이 기간 선곡 ${formatCount(total)}곡 중 ${formatCount(count)}곡 (${share})`;
}

// 머리말의 '시대 · 출생 연도'. composers/<id>/ 의 era 는 출생 연도와 보정값으로 정한 시대다.
/** @param {{ era?: string | null, birth_year?: number | null } | null | undefined} composer */
export function composerFacts(composer) {
	if (!composer) return '';
	const era = composer.era && composer.era !== UNKNOWN_ERA ? composer.era : '시대 미상';
	const born = composer.birth_year != null ? `${composer.birth_year}년생` : '출생 연도 미상';
	return `${era} · ${born}`;
}

// 선곡 카드의 stats/timeline bucket: 기간이 여러 학기에 걸치면(전체 기간, 학기를 넘는 직접 지정) 학기별,
// 한 학기 안이면(학기, 이번 학기, 한 학기 안의 직접 지정) 월별. 한 작곡가의 한 학기 선곡은 적어서 주별은 쓰지 않는다.
/**
 * @param {ComposerPeriod} filter
 * @param {{ start: string, end: string }} current 이번 학기(end 가 오늘)
 * @returns {'semester' | 'month'}
 */
export function composerTimelineBucket({ period, start = '', end = '' }, current) {
	if (period === ALL) return 'semester';
	if (period === CUSTOM && spansSemesters({ start, end }, current.end)) return 'semester';
	return 'month';
}

// stats/works 는 곡을 '작곡가 - 곡' 으로 주므로, 이 작곡가의 곡이면 곡 이름만 남긴다.
/**
 * @param {{ name: string, composer_id?: number | null }} item
 * @param {{ id: number, name: string }} composer
 */
export function composerWorkName(item, composer) {
	const prefix = `${composer.name} - `;
	if (item.composer_id === composer.id && item.name.startsWith(prefix)) {
		return item.name.slice(prefix.length);
	}
	return item.name;
}

// 곡 표: 순위, 곡, 횟수, 처음 튼 날, 마지막으로 튼 날(날짜는 기간과 상관없이 그 곡의 전체 선곡 기준).
// 앞 학기의 목록(previous)을 주면 마지막에 지난 학기 칸을 둔다. 없으면(null) 칸을 두지 않는다.
// 이 학기(works.filters.start)에 클럽이 처음 튼 곡은 그 칸이 '첫 선곡'(statDrill.js 의 previousWorkValue).
/**
 * @param {{ filters?: { start?: string }, items: { id: number, name: string, count: number,
 *   composer_id?: number | null, first_played?: string | null, last_played?: string | null }[] }} works
 * @param {{ id: number, name: string } | null} composer
 * @param {{ items: { id: number, count: number }[] } | null} [previous]
 * @returns {import('./statTable.js').Table}
 */
export function composerWorksTable(works, composer, previous = null) {
	const ranks = competitionRanks(works.items.map((item) => item.count));
	const start = works.filters?.start;
	const columns = [
		{ name: '순위', numeric: true },
		{ name: '곡' },
		{ name: '횟수', numeric: true },
		{ name: '처음', numeric: true },
		{ name: '마지막', numeric: true }
	];
	return {
		columns: previous ? [...columns, { name: '지난 학기', numeric: true }] : columns,
		rowHeader: 1,
		rows: works.items.map((item, i) => {
			const row = [
				String(ranks[i]),
				composer ? composerWorkName(item, composer) : item.name,
				formatCount(item.count),
				item.first_played ?? '—',
				item.last_played ?? '—'
			];
			if (!previous) return row;
			const value = previousWorkValue(previous, item, start);
			return [...row, typeof value === 'string' ? value : formatCount(value)];
		})
	};
}

// 처음 튼 곡(stats/firsts, 이 작곡가로 거른 것): 통계의 표와 같고, 곡 이름에서 작곡가를 뺀다(항목에 composer_id 는 없다).
/**
 * @param {{ items: { id: number, name: string, count: number, first_played: string }[] }} firsts
 * @param {{ id: number, name: string } | null} composer
 * @returns {import('./statTable.js').Table}
 */
export function composerFirstsTable(firsts, composer) {
	const items = composer
		? firsts.items.map((item) => ({
				...item,
				name: composerWorkName({ ...item, composer_id: composer.id }, composer)
			}))
		: firsts.items;
	return firstsTable({ items }, '곡');
}

// 곡 표의 CSV: 표로 보기에 보이는 그대로(csvTable.js 의 tableCsv), 통계의 차트 카드·drill-down 패널의 CSV 처럼.
// 순위(동점은 같은 순위)도 두고, 수치 칸의 천 단위 쉼표만 빼며(1,234 → 1234), 없는 날짜나 알 수 없는
// 지난 학기 횟수는 '—', 이 학기에 처음 튼 곡은 '첫 선곡' 그대로다.
/**
 * @param {{ filters?: { start?: string }, items: { id: number, name: string, count: number,
 *   composer_id?: number | null, first_played?: string | null, last_played?: string | null }[] }} works
 * @param {{ id: number, name: string } | null} composer
 * @param {{ items: { id: number, count: number }[] } | null} [previous]
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function composerWorksCsv(works, composer, previous = null) {
	return tableCsv(composerWorksTable(works, composer, previous));
}
