// 작곡가 정리(/stat/composers)의 '표기 정리': catalog/duplicates/ 가 묶은, 표기만 다른 이름들.
// 보기와 종류는 URL에 둔다: ?view=spelling(&kind=player|conductor|orchestra|music).
// 작곡가 목록(view 없음)과 종류 composer 는 기본값이라 URL에 남기지 않고, 틀린 값은 기본값으로 읽는다.
// 읽기 전용이다: 합치지 않는다.
import { catalogHref } from './composerCatalog.js';
import { composerHref } from './composerStats.js';
import { historyHref, targetHistoryHref } from './playHistory.js';
import { ALL } from './statPeriod.js';

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
