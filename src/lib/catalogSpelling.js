// 작곡가 정리(/stat/composers)의 '표기 정리': catalog/duplicates/ 가 묶은, 표기만 다른 이름들.
// 보기와 종류는 URL에 둔다: ?view=spelling(&kind=player|conductor|orchestra|music).
// 작곡가 목록(view 없음)과 종류 composer 는 기본값이라 URL에 남기지 않고, 틀린 값은 기본값으로 읽는다.
// 읽기 전용이다: 합치지 않는다.
import { catalogEraHref, catalogHref, catalogSortHref } from './composerCatalog.js';
import { composerHref } from './composerStats.js';
import { historyHref, targetHistoryHref } from './playHistory.js';
import { workLabel } from './statDrill.js';
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
// 보이는 묶음마다 모든 행의 이름이 똑같으면(이름은 유일하지 않아 같은 이름의 행이 둘일 수 있다) 표기가 다른 것이 아니다.
export const SAME_NAME_LEAD = '이름이 같은 항목은';

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

// 거기에 작곡가 목록의 시대와 순서까지 담은 경로(catalogEraHref·catalogSortHref 가 틀린 값은 뺀다). 페이지를 새로
// 불러도(새 탭, 검색 중의 클릭) 표기 정리에서 작곡가 목록으로 돌아오면 같은 시대와 순서다.
/**
 * @param {string} q
 * @param {string | null} kind
 * @param {string} era
 * @param {string} sort
 */
export const catalogStateHref = (q, kind, era, sort) =>
	catalogSortHref(catalogEraHref(catalogViewHref(q, kind), era), sort);

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

// CSV 저장: 보이는 묶음을 그 순서로, 표기마다 한 줄. 묶음은 보이는 순서의 번호(1, 2, …; 곡은 두 묶음의 제목이
// 같을 수 있어 이름 대신 번호)로 그 묶음의 모든 줄에 같다. 묶음 안은 받은 순서(가장 많이 튼 것부터). 이름은 저장된
// 그대로(띄어쓰기·점이 다른 것이 요점이다), 악기·작곡가가 없으면 빈 칸(화면의 '—' 는 눈을 위한 것), 선곡 수는
// 천 단위 쉼표 없는 수, id 는 '#' 없는 수. 열은 표와 같다.
/**
 * @param {string} kind
 * @param {SpellingGroup[]} groups
 * @returns {{ headers: string[], rows: unknown[][] }}
 */
export function spellingCsv(kind, groups) {
	const extra = kind === 'player' ? 'instrument' : kind === 'music' ? 'composer_name' : '';
	const headers = ['묶음', kind === 'music' ? '곡' : '표기'];
	if (extra) headers.push(kind === 'music' ? '작곡가' : '악기');
	headers.push('선곡 수', 'id');
	const rows = groups.flatMap((group, i) =>
		(Array.isArray(group?.rows) ? group.rows : []).map((row) => [
			i + 1,
			String(row.name ?? ''),
			...(extra ? [row[extra] ?? ''] : []),
			Number(row.count) || 0,
			row.id
		])
	);
	return { headers, rows };
}

// CSV 파일 이름의 보기 조각: 종류('곡'), 검색어. 검색어가 비었으면 종류만, 모르는 종류는 [].
/**
 * @param {string} kind
 * @param {string | null | undefined} q
 * @returns {string[]}
 */
export function spellingFileParts(kind, q) {
	const label = kindSpec(kind)?.label;
	if (!label) return [];
	const term = (q ?? '').trim();
	return term ? [label, term] : [label];
}

// 표기 정리의 검색: 어느 행의 이름(곡이면 작곡가도)에 검색어가 든 묶음만, 그 묶음은 모든 행 그대로.
// 묶음처럼 띄어쓰기·점·줄표·대소문자를 가리지 않는다: 쓴 그대로 들거나, 둘 다 normalizeName 꼴로 들면
// 찾는다('림스키코르사코프' → 림스키-코르사코프). 점·줄표·공백뿐인 검색어는 쓴 그대로만 견준다(모든 묶음이
// 나오지 않게). 검색 표시(MarkedText 의 loose, looseMatchParts)도 다듬은 꼴로만 든 곳까지 원래 글자 위에
// 칠한다. 검색어가 비었으면 받은 묶음 그대로.
/**
 * @param {SpellingGroup[] | null | undefined} groups
 * @param {string | null | undefined} q
 * @returns {SpellingGroup[]}
 */
export function filterSpellingGroups(groups, q) {
	const list = Array.isArray(groups) ? groups : [];
	const term = (q ?? '').trim().toLowerCase();
	if (!term) return list;
	const key = normalizeName(term);
	/** @param {unknown} text */
	const hit = (text) =>
		typeof text === 'string' &&
		(text.toLowerCase().includes(term) || (!!key && normalizeName(text).includes(key)));
	return list.filter((group) =>
		(Array.isArray(group?.rows) ? group.rows : []).some(
			(row) => hit(row?.name) || hit(row?.composer_name)
		)
	);
}

/** @typedef {{ kind: string, label: string, count: number }} SpellingHit */

// 표기 정리의 검색이 보이는 종류(kind)에서 아무 묶음도 찾지 못했을 때: 이미 받은 다른 종류의 답(answers: 종류 →
// catalog/duplicates/ 의 답) 가운데 그 검색어에 맞는 묶음이 있는 종류와 그 수, SPELLING_KINDS 의 순서로.
// 보이는 종류, 받지 않았거나 groups 가 없는 답, 맞는 묶음이 없는 종류는 뺀다. 검색어가 비었으면 [].
/**
 * @param {Record<string, { groups?: SpellingGroup[] | null } | null | undefined> | null | undefined} answers
 * @param {string} kind
 * @param {string | null | undefined} term
 * @returns {SpellingHit[]}
 */
export function otherSpellingHits(answers, kind, term) {
	if (!(term ?? '').trim()) return [];
	return SPELLING_KINDS.flatMap(({ kind: other, label }) => {
		const groups = answers?.[other]?.groups;
		if (other === kind || !Array.isArray(groups)) return [];
		const count = filterSpellingGroups(groups, term).length;
		return count > 0 ? [{ kind: other, label, count }] : [];
	});
}

// 그 빈 목록의 줄: 다른 종류에 맞는 묶음이 없으면 지금 그대로('가상바흐'에 맞는 묶음이 없습니다), 있으면 보이는
// 종류와 그 수를 덧붙인다: '가상바흐'에 맞는 작곡가 묶음이 없습니다 · 곡 1묶음 · 지휘자 2묶음.
/**
 * @param {string} kind
 * @param {string} term
 * @param {SpellingHit[]} hits
 */
export function searchEmptyText(kind, term, hits) {
	if (!hits?.length) return `'${term}'에 맞는 묶음이 없습니다`;
	const label = kindSpec(kind)?.label ?? '';
	const counts = hits.map((hit) => `${hit.label} ${hit.count.toLocaleString()}묶음`).join(' · ');
	return `'${term}'에 맞는 ${label ? `${label} ` : ''}묶음이 없습니다 · ${counts}`;
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

// 그 id 의 행이 묶음에 적힌 이름(곡은 제목만): 그 줄의 '표기 정리' 링크가 찾을 이름. id 는
// spellingVariants 처럼 문자열로 견준다. 응답이 없거나 틀렸거나, 묶음에 없거나 이름이 글자가 아니면 ''.
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {number | string | null | undefined} id
 */
export function spellingNameOf(response, id) {
	const groups = response?.groups;
	if (id == null || !Array.isArray(groups)) return '';
	const wanted = String(id);
	for (const group of groups) {
		const rows = Array.isArray(group?.rows) ? group.rows : [];
		const row = rows.find((row) => row && String(row.id) === wanted);
		if (row) return typeof row.name === 'string' ? row.name : '';
	}
	return '';
}

// 백엔드가 이름을 견주는 꼴(catalog.py 의 normalize_name): NFKC, 소문자, 공백·마침표·줄표(모든 Pd) 없이.
// 파이썬의 casefold 와 달리 ß 같은 몇 글자는 그대로 남는다(그런 묶음은 찾지 못할 뿐, 잘못 찾지는 않는다).
/** @param {string | null | undefined} text */
export const normalizeName = (text) =>
	String(text ?? '')
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\s.\p{Pd}]/gu, '');

// 선곡 기록의 검색(plays/ 의 q, icontains)이 놓칠 수 있는 표기: 다듬은 검색어가 key 에 든 묶음(이름 종류의
// 묶음은 다듬은 이름이 key 다)에서, 이름에 검색어가 글자 그대로 들지 않고 선곡이 있는 행. 각 행과 그 묶음.
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {string | null | undefined} q
 * @returns {{ row: SpellingRow, group: SpellingGroup }[]}
 */
function searchMisses(response, q) {
	const groups = response?.groups;
	const term = (q ?? '').trim().toLowerCase();
	const key = normalizeName(term);
	if (!key || !Array.isArray(groups)) return [];
	/** @type {{ row: SpellingRow, group: SpellingGroup }[]} */
	const missed = [];
	for (const group of groups) {
		if (typeof group?.key !== 'string' || !group.key.includes(key)) continue;
		for (const row of Array.isArray(group.rows) ? group.rows : []) {
			if (typeof row?.name !== 'string' || !(Number(row.count) > 0)) continue;
			if (!row.name.toLowerCase().includes(term)) missed.push({ row, group });
		}
	}
	return missed.sort((a, b) => byCount(a.row, b.row));
}

// 그 행들(한 종류의 응답에서), 가장 많이 튼 것부터. 자르지 않는다. 응답이 없거나 틀렸거나 검색어가 비었으면 [].
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {string | null | undefined} q
 * @returns {SpellingRow[]}
 */
export const searchVariants = (response, q) => searchMisses(response, q).map(({ row }) => row);

// 그 줄의 '표기 정리' 링크가 찾을 이름: 가장 많이 튼 놓친 행이 든 묶음의, 가장 많이 튼 표기. 없으면 ''.
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} response
 * @param {string | null | undefined} q
 */
export function searchCatalogName(response, q) {
	const [first] = searchMisses(response, q);
	return first ? String(first.group.rows[0]?.name ?? first.row.name) : '';
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
// 바로 앞 행과 이름이 똑같은(===) 행은 이름을 다시 따옴표로 적지 않고 '같은 이름 N회'.
// lead 를 주지 않았고 보이는 묶음마다 모든 행의 이름이 같으면 머리는 SAME_NAME_LEAD.
/**
 * @param {SplitGroup[]} groups
 * @param {number} [max]
 * @param {string} [lead]
 */
export function splitSpellingNote(groups, max = 3, lead) {
	if (!groups?.length) return '';
	const visible = groups.slice(0, max);
	const shown = visible
		.map((group) =>
			group.rows
				.map((row, i) =>
					i > 0 && row.name === group.rows[i - 1].name
						? `같은 이름 ${row.count.toLocaleString()}회`
						: `‘${row.name}’ ${row.count.toLocaleString()}회`
				)
				.join(' + ')
		)
		.join('; ');
	const sameNames =
		visible.length > 0 &&
		visible.every((group) => group.rows.every((row) => row.name === group.rows[0].name));
	const head = lead ?? (sameNames ? SAME_NAME_LEAD : '표기만 다른 이름은');
	const rest = groups.length - Math.min(groups.length, max);
	return `${head} 따로 셉니다: ${shown}${rest > 0 ? ` 외 ${rest.toLocaleString()}묶음` : ''}`;
}

// 통계의 drill-down 패널(그 대상의 stats/works): 많이 튼 곡 카드와 같은 줄을, 패널의 표가 보이는 곡 이름으로
// (작곡가의 패널이면 '작곡가 - ' 없이: workLabel). 2묶음까지 적고 나머지는 ' 외 N묶음'. 대상이나 응답이 없으면 ''.
/**
 * @param {{ groups?: SpellingGroup[] | null } | null | undefined} duplicates
 * @param {{ items?: (SplitRow & { composer_id?: number | null })[] | null } | null | undefined} works
 * @param {import('./statDrill.js').DrillTarget | null | undefined} target
 */
export function drillSplitNote(duplicates, works, target) {
	if (!target || !Array.isArray(works?.items)) return '';
	const items = works.items.map((item) => ({ ...item, name: workLabel(item, target) }));
	return splitSpellingNote(splitSpellings(duplicates, { items }), 2, MUSIC_SPLIT_LEAD);
}

// 통계의 처음 튼 작곡가·곡 줄의 머리. 곡은 작곡가와 작품 번호가 같은 곡이라 '표기만 다른'이라고 하지 않는다.
export const FIRST_SPELLING_LEAD = '표기만 다른 이름이 있어 처음이 아닐 수 있습니다:';
export const FIRST_MUSIC_LEAD = '작품 번호가 같은 곡이 있어 처음이 아닐 수 있습니다:';
// 보이는 행마다 다른 항목의 이름이 똑같으면(같은 이름의 두 작곡가) '표기만 다른'이 아니다.
export const FIRST_SAME_NAME_LEAD = '이름이 같은 항목이 있어 처음이 아닐 수 있습니다:';

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
// 다른 항목의 이름이 행의 이름과 똑같으면(===) 이름을 다시 적지 않고 ‘X’(같은 이름 6회).
// lead 가 FIRST_SPELLING_LEAD 이고 보이는 행이 모두 그렇다면 머리는 FIRST_SAME_NAME_LEAD(곡의 머리는 그대로).
/**
 * @param {FirstSplit[]} rows
 * @param {number} [max]
 * @param {string} [lead]
 * @param {string} [unit]
 */
export function firstSpellingNote(rows, max = 3, lead = FIRST_SPELLING_LEAD, unit = '명') {
	if (!rows?.length) return '';
	const visible = rows.slice(0, max);
	const same = ({ name, variant }) => variant.name === name;
	const shown = visible
		.map(
			(row) =>
				`‘${row.name}’(${same(row) ? '같은 이름' : `‘${row.variant.name}’`} ${row.variant.count.toLocaleString()}회)`
		)
		.join(', ');
	const head =
		lead === FIRST_SPELLING_LEAD && visible.length > 0 && visible.every(same)
			? FIRST_SAME_NAME_LEAD
			: lead;
	const rest = rows.length - Math.min(rows.length, max);
	return `${head} ${shown}${rest > 0 ? ` 외 ${rest.toLocaleString()}${unit}` : ''}`;
}
