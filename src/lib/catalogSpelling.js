// 작곡가 정리(/stat/composers)의 '표기 정리': catalog/duplicates/ 가 묶은, 표기만 다른 이름들.
// 보기와 종류는 URL에 둔다: ?view=spelling(&kind=player|conductor|orchestra|music).
// 작곡가 목록(view 없음)과 종류 composer 는 기본값이라 URL에 남기지 않고, 틀린 값은 기본값으로 읽는다.
// 읽기 전용이다: 합치지 않는다.
import { catalogHref } from './composerCatalog.js';
import { composerHref } from './composerStats.js';
import { historyHref, targetHistoryHref } from './playHistory.js';
import { ALL } from './statPeriod.js';
import { pageTitle } from './statTitle.js';

export const SPELLING_VIEW = 'spelling';
export const DEFAULT_KIND = 'composer';

// catalog/duplicates/ 의 kind. param 은 선곡 기록이 그 대상을 거르는 id 필터(표기 정리의 이름 칸은
// 작곡가만 작곡가 페이지로 잇는다: rowLinks).
export const SPELLING_KINDS = [
	{
		kind: 'composer',
		label: '작곡가',
		empty: '표기가 갈린 작곡가가 없습니다',
		param: 'composer_id'
	},
	{ kind: 'player', label: '연주자', empty: '표기가 갈린 연주자가 없습니다', param: 'player_id' },
	{
		kind: 'conductor',
		label: '지휘자',
		empty: '표기가 갈린 지휘자가 없습니다',
		param: 'conductor_id'
	},
	{
		kind: 'orchestra',
		label: '오케스트라',
		empty: '표기가 갈린 오케스트라가 없습니다',
		param: 'orchestra_id'
	},
	{ kind: 'music', label: '곡', empty: '작품 번호가 같은 곡이 없습니다', param: 'music_id' }
];

// 곡(kind=music)의 묶음은 작곡가와 작품 번호가 같은 곡이라, 제목이 표기만 다르다고는 할 수 없다.
export const MUSIC_SPLIT_LEAD = '작품 번호가 같은 곡은';

/**
 * @typedef {{ id: number, name: string, count: number, instrument?: string,
 *   composer_id?: number | null, composer_name?: string | null }} SpellingRow
 * @typedef {{ key: string, count: number, rows: SpellingRow[] }} SpellingGroup
 */

/** @param {string} kind */
const kindSpec = (kind) => SPELLING_KINDS.find((spec) => spec.kind === kind);

// URL의 보기: null = 작곡가 목록, 아니면 표기 정리의 종류.
/**
 * @param {URLSearchParams} params
 * @returns {string | null}
 */
export function readSpellingKind(params) {
	if (params.get('view') !== SPELLING_VIEW) return null;
	const kind = params.get('kind');
	return kind && kindSpec(kind) ? kind : DEFAULT_KIND;
}

// 이 페이지의 탭 제목: 작곡가 목록(null)은 '작곡가 정리', 표기 정리는 '연주자 · 표기 정리'(모르는 종류는 '표기 정리').
/** @param {string | null} kind */
export const catalogPageTitle = (kind) =>
	kind ? pageTitle(kindSpec(kind)?.label, '표기 정리') : '작곡가 정리';

// 검색어와 보기를 담은 이 페이지의 경로. 표기 정리로 가도 목록의 검색어는 남긴다.
/**
 * @param {string} q
 * @param {string | null} kind
 */
export function catalogViewHref(q, kind) {
	const href = catalogHref(q);
	if (!kind) return href;
	const params = new URLSearchParams(href.split('?')[1] ?? '');
	params.set('view', SPELLING_VIEW);
	if (kind !== DEFAULT_KIND && kindSpec(kind)) params.set('kind', kind);
	return `/stat/composers?${params}`;
}

// catalog/duplicates/ 의 쿼리스트링.
/** @param {string} kind */
export const duplicatesSearch = (kind) => `?${new URLSearchParams({ kind })}`;

// 한 행의 링크(이름으로 찾지 않고 id로): 이름 칸(그 표기의 선곡 기록), 곡의 작곡가 칸, 그리고
// 작곡가면 선곡 수 칸(그 표기의 전체 기간 선곡 기록; 0이면 없다). 없으면 null.
/**
 * @param {string} kind
 * @param {SpellingRow} row
 * @returns {{ name: string | null, composer: string | null, count: string | null }}
 */
export function rowLinks(kind, row) {
	if (kind === 'composer') {
		const count = row.count > 0 ? targetHistoryHref('composer_id', row.id) : null;
		return { name: composerHref(row.id), composer: null, count };
	}
	const composer = kind === 'music' && row.composer_id ? composerHref(row.composer_id) : null;
	const param = kindSpec(kind)?.param;
	if (!param) return { name: null, composer, count: null };
	const name = historyHref({
		period: ALL,
		start: '',
		end: '',
		q: '',
		userId: null,
		includeMentees: false,
		requested: '',
		targets: [{ param, id: String(row.id) }]
	});
	return { name, composer, count: null };
}

// 묶음의 머리: 가장 많이 튼 표기와 '표기 N개 · 선곡 M회'.
// (백엔드의 key 는 비교용으로 다듬은 꼴이라 보이지 않는다.)
/** @param {SpellingGroup} group */
export function groupHeading(group) {
	return {
		title: group.rows[0]?.name ?? group.key,
		meta: `표기 ${group.rows.length.toLocaleString()}개 · 선곡 ${group.count.toLocaleString()}회`
	};
}

// 결과 줄: '2묶음 · 표기 5개'.
/** @param {SpellingGroup[]} groups */
export function spellingSummary(groups) {
	const rows = groups.reduce((sum, group) => sum + group.rows.length, 0);
	return `${groups.length.toLocaleString()}묶음 · 표기 ${rows.toLocaleString()}개`;
}

// 표기 정리의 검색: 어느 행의 이름(곡이면 작곡가도)에 검색어가 든 묶음만, 그 묶음은 모든 행 그대로.
// 대소문자를 가리지 않는다(작곡가 목록의 name__icontains 처럼). 검색어가 비었으면 받은 묶음 그대로.
/**
 * @param {SpellingGroup[] | null | undefined} groups
 * @param {string | null | undefined} q
 * @returns {SpellingGroup[]}
 */
export function filterSpellingGroups(groups, q) {
	const list = Array.isArray(groups) ? groups : [];
	const term = (q ?? '').trim().toLowerCase();
	if (!term) return list;
	/** @param {unknown} text */
	const hit = (text) => typeof text === 'string' && text.toLowerCase().includes(term);
	return list.filter((group) =>
		(Array.isArray(group?.rows) ? group.rows : []).some(
			(row) => hit(row?.name) || hit(row?.composer_name)
		)
	);
}

// 선곡 기록의 id 필터(composer_id 등) → 그 catalog/duplicates/ 의 kind. 없으면 null.
/**
 * @param {string | null | undefined} param
 * @returns {string | null}
 */
export const spellingKindOf = (param) =>
	(param && SPELLING_KINDS.find((spec) => spec.param === param)?.kind) || null;

// 백엔드의 행 순서: 가장 많이 튼 것부터, 그다음 이름, 그다음 id.
/**
 * @param {SpellingRow} a
 * @param {SpellingRow} b
 */
const byCount = (a, b) =>
	(b.count ?? 0) - (a.count ?? 0) ||
	(a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
	a.id - b.id;

// '표기만 다른 이름'(작곡가 페이지, 선곡 기록): 응답(catalog/duplicates/)에서 그 id 가 든 모든 묶음의
// 다른 행들. 이름은 한 묶음에만 들지만 곡은 작품 번호마다 한 묶음이라 둘 이상에 들 수 있어, 같은 id 는
// 한 번만 두고 백엔드의 순서(가장 많이 튼 것부터)로 합친다. 경로의 id 는 문자열이고 응답의 id 는 수라
// 문자열로 견준다. 응답이 없거나 틀렸거나, 묶음에 없거나 혼자면 [].
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {number | string | null | undefined} id
 * @returns {SpellingRow[]}
 */
export function spellingVariants(response, id) {
	const groups = response?.groups;
	if (id == null || !Array.isArray(groups)) return [];
	const wanted = String(id);
	/** @type {Map<string, SpellingRow>} */
	const others = new Map();
	for (const group of groups) {
		const rows = Array.isArray(group?.rows) ? group.rows : [];
		if (!rows.some((row) => String(row?.id) === wanted)) continue;
		for (const row of rows) {
			const key = String(row?.id);
			if (row && key !== wanted && !others.has(key)) others.set(key, row);
		}
	}
	return [...others.values()].sort(byCount);
}

// 작곡가 페이지의 '표기만 다른 이름': 그 작곡가가 든 묶음의 다른 표기들.
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {number | string | null | undefined} composerId
 * @returns {SpellingRow[]}
 */
export const composerVariants = (response, composerId) => spellingVariants(response, composerId);

// 선곡 기록의 '표기만 다른 이름' 링크: 같은 목록(기간, 지기, 검색어, 신청곡, 다른 id 필터 그대로)에서
// 그 필터(target 과 같은 param)의 id 만 바꾼다.
/**
 * @param {import('./playHistory.js').HistoryFilter} filter
 * @param {import('./playHistory.js').HistoryTarget} target
 * @param {number | string} id
 */
export function variantHistoryHref(filter, target, id) {
	const targets = (filter.targets ?? []).map((t) =>
		t.param === target.param ? { param: t.param, id: String(id) } : t
	);
	return historyHref({ ...filter, targets });
}

/**
 * @typedef {{ id: number | string, name: string, count: number }} SplitRow
 * @typedef {{ rows: SplitRow[], count: number }} SplitGroup
 */

// 통계의 많이 튼 작곡가: 한 순위 응답(items: id·name·count, 상위 100까지)에 같은 표기 정리 묶음의 이름이
// 둘 이상 들어 수가 갈린 묶음들. 행은 이 보기의 이름과 수를 응답의 순서(많이 튼 것부터)로, 묶음의 count 는
// 그 합(이름을 합쳤다면 막대가 될 수). 합이 큰 묶음부터(같으면 응답에서 먼저 나온 묶음). id 는 문자열로
// 견준다. 이 보기에 한 표기만 든 묶음은 수가 갈리지 않으므로 뺀다. 응답이 없거나 틀렸으면 [].
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} duplicates
 * @param {{ items?: SplitRow[] | null } | null | undefined} envelope
 * @returns {SplitGroup[]}
 */
export function splitSpellings(duplicates, envelope) {
	const groups = duplicates?.groups;
	const items = envelope?.items;
	if (!Array.isArray(groups) || !Array.isArray(items)) return [];
	/** @type {Map<string, number>} 응답의 id → 그 위치 */
	const position = new Map();
	items.forEach((item, i) => {
		const key = String(item?.id);
		if (item?.id != null && !position.has(key)) position.set(key, i);
	});
	/** @type {Set<number>} 한 행은 한 묶음에만 */
	const used = new Set();
	/** @type {{ rows: SplitRow[], count: number, first: number }[]} */
	const split = [];
	for (const group of groups) {
		const rows = Array.isArray(group?.rows) ? group.rows : [];
		const found = [
			...new Set(
				rows.map((row) => position.get(String(row?.id))).filter((i) => i != null && !used.has(i))
			)
		].sort((a, b) => a - b);
		if (found.length < 2) continue;
		found.forEach((i) => used.add(i));
		const members = found.map((i) => {
			const { id, name, count } = items[i];
			return { id, name, count: Number(count) || 0 };
		});
		const count = members.reduce((sum, row) => sum + row.count, 0);
		split.push({ rows: members, count, first: found[0] });
	}
	split.sort((a, b) => b.count - a.count || a.first - b.first);
	return split.map(({ rows, count }) => ({ rows, count }));
}

// 그 묶음들을 카드의 한 줄로: '표기만 다른 이름은 따로 셉니다: ‘A’ 40회 + ‘B’ 12회; ‘C’ 5회 + ‘D’ 2회'.
// max 묶음까지 적고 나머지는 ' 외 N묶음'. 없으면 ''. lead 는 '따로 셉니다' 앞의 말(곡은 MUSIC_SPLIT_LEAD).
/**
 * @param {SplitGroup[]} groups
 * @param {number} [max]
 * @param {string} [lead]
 */
export function splitSpellingNote(groups, max = 3, lead = '표기만 다른 이름은') {
	if (!groups?.length) return '';
	const shown = groups
		.slice(0, max)
		.map((group) =>
			group.rows.map((row) => `‘${row.name}’ ${row.count.toLocaleString()}회`).join(' + ')
		)
		.join('; ');
	const rest = groups.length - Math.min(groups.length, max);
	return `${lead} 따로 셉니다: ${shown}${rest > 0 ? ` 외 ${rest.toLocaleString()}묶음` : ''}`;
}

// 통계의 처음 튼 작곡가·곡 줄의 머리. 곡은 작곡가와 작품 번호가 같은 곡이라 '표기만 다른'이라고 하지 않는다.
export const FIRST_SPELLING_LEAD = '표기만 다른 이름이 있어 처음이 아닐 수 있습니다:';
export const FIRST_MUSIC_LEAD = '작품 번호가 같은 곡이 있어 처음이 아닐 수 있습니다:';

/**
 * @typedef {{ id: number | string, name: string, count?: number, first_played?: string }} FirstItem
 * @typedef {{ name: string, variant: { name: string, count: number }, more: number }} FirstSplit
 */

// 표기 정리의 행을 처음 튼 목록처럼 쓴다: 곡은 '작곡가 - 곡'(작곡가가 없으면 곡만, 백엔드의 stats/firsts 와 같다).
/** @param {SpellingRow} row */
const listedName = (row) =>
	row.composer_name ? `${row.composer_name} - ${row.name}` : String(row.name ?? '');

// 통계의 처음 튼 작곡가·곡(stats/firsts: items 의 id·name·count·first_played): 이 목록의 행 X 마다, X 가 든
// 표기 정리 묶음의 다른 행 Y 중 처음이 아닐 수 있게 하는 것. Y 는 선곡이 있어야 하고(count > 0), 같은 목록에
// 있으면서 X 보다 늦게 처음 튼 Y 는 세지 않는다(X 가 진짜 처음이다). 같은 날이거나 더 이른 Y, 이 목록에 없는 Y
// (기간 밖에서, 또는 개인이면 다른 지기가 튼 것)는 센다. 행은 목록의 순서대로(보이는 순서: 많이 튼 순이면 그
// 순서), variant 는 그런 Y 중 첫째(백엔드의 순서: 가장 많이 튼 것)의 이름과 전체 기간 선곡 수, more 는 그 밖의
// Y 수. 응답이 없거나 틀렸으면 [].
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} duplicates
 * @param {{ items?: FirstItem[] | null } | null | undefined} firsts
 * @returns {FirstSplit[]}
 */
export function firstSpellingSplits(duplicates, firsts) {
	const items = firsts?.items;
	if (!Array.isArray(duplicates?.groups) || !Array.isArray(items)) return [];
	/** @type {Map<string, string>} 목록의 id → 처음 튼 날 */
	const firstDay = new Map();
	for (const item of items) {
		if (item?.id != null && !firstDay.has(String(item.id)))
			firstDay.set(String(item.id), String(item.first_played ?? ''));
	}
	/** @type {FirstSplit[]} */
	const rows = [];
	for (const item of items) {
		if (item?.id == null) continue;
		const day = firstDay.get(String(item.id)) ?? '';
		const counted = spellingVariants(duplicates, item.id).filter((row) => {
			if (!(Number(row.count) > 0)) return false;
			const other = firstDay.get(String(row.id));
			// 날짜를 모르면(어느 쪽이든) 처음이 아닐 수 있다고 본다.
			return !(other && day && other > day);
		});
		if (!counted.length) continue;
		const [first] = counted;
		rows.push({
			name: String(item.name ?? ''),
			variant: { name: listedName(first), count: Number(first.count) },
			more: counted.length - 1
		});
	}
	return rows;
}

// 그 행들을 카드의 한 줄로: '표기만 다른 이름이 있어 처음이 아닐 수 있습니다: ‘X’(‘Y’ 6회), ‘Z’(‘W’ 2회)'.
// max 행까지 적고 나머지는 ' 외 N명'(unit, 곡은 '곡'). 없으면 ''.
/**
 * @param {FirstSplit[]} rows
 * @param {number} [max]
 * @param {string} [lead]
 * @param {string} [unit]
 */
export function firstSpellingNote(rows, max = 3, lead = FIRST_SPELLING_LEAD, unit = '명') {
	if (!rows?.length) return '';
	const shown = rows
		.slice(0, max)
		.map(({ name, variant }) => `‘${name}’(‘${variant.name}’ ${variant.count.toLocaleString()}회)`)
		.join(', ');
	const rest = rows.length - Math.min(rows.length, max);
	return `${lead} ${shown}${rest > 0 ? ` 외 ${rest.toLocaleString()}${unit}` : ''}`;
}
