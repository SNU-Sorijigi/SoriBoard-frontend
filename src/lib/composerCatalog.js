// 작곡가 정리(/stat/composers): 검색어와 URL, 목록 순서, 시대 칸의 문구, 수정 칸의 값과
// PATCH composers/<id>/ 의 본문 사이의 변환.
// 시대는 백엔드가 era_override(아래 ERAS 중 하나일 때) 또는 출생 연도로 정한다(composers/ 의 era).

import { formatShare } from './statTable.js';

// 백엔드 era_for 의 라벨 순서(stats.py ERA_ORDER). era_override 로 고를 수 있는 값이다.
export const ERAS = ['중세', '바로크', '고전', '낭만', '근현대', '미상'];
export const UNKNOWN_ERA = '미상';
// PATCH 가 받는 가장 이른 출생 연도(가장 늦은 해는 올해).
export const MIN_BIRTH_YEAR = 1000;

/**
 * @typedef {{ id: number, name: string, num_time_music: number, birth_year: number | null,
 *   era_override: string | null, era: string }} CatalogComposer
 * @typedef {{ birthYear: string, era: string }} ComposerDraft
 */

// URL의 검색어. 없으면 ''.
/** @param {URLSearchParams} params */
export const readCatalogQuery = (params) => (params.get('q') ?? '').trim();

// 검색어를 담은 이 페이지의 경로. 빈 검색어는 URL에 남기지 않는다.
/** @param {string} q */
export function catalogHref(q) {
	const term = q.trim();
	return term ? `/stat/composers?${new URLSearchParams({ q: term })}` : '/stat/composers';
}

// composers/ 의 쿼리스트링('?q=…' 또는 '').
/** @param {string} q */
export function composersSearch(q) {
	const term = q.trim();
	return term ? `?${new URLSearchParams({ q: term })}` : '';
}

// 시대 미상을 앞에, 나머지는 받은 순서(많이 튼 순) 그대로.
/** @param {CatalogComposer[]} composers */
export function unknownFirst(composers) {
	const unknown = composers.filter((c) => c.era === UNKNOWN_ERA);
	return [...unknown, ...composers.filter((c) => c.era !== UNKNOWN_ERA)];
}

/** @param {CatalogComposer[]} composers */
export const unknownCount = (composers) => composers.filter((c) => c.era === UNKNOWN_ERA).length;

// 개수 줄의 '작곡가 N명 · ' 다음 말: 시대 미상 작곡가 수와 그들의 선곡 수(선곡 수 칸의 합), 그리고
// 목록 전체 선곡 수에 대한 비율(시대 미상 6명 (선곡 169곡, 31.3%)). 검색 결과의 비율은 오해를 낳으므로
// 검색 중에는 곡 수만, 시대 미상이 없으면 괄호 없이, 전체 선곡이 0이면 비율 없이 쓴다.
/**
 * @param {CatalogComposer[]} composers
 * @param {boolean} searched
 */
export function unknownSummary(composers, searched) {
	const unknown = composers.filter((c) => c.era === UNKNOWN_ERA);
	const head = `시대 미상 ${unknown.length.toLocaleString()}명`;
	if (unknown.length === 0) return head;
	const plays = (/** @type {CatalogComposer[]} */ list) =>
		list.reduce((sum, c) => sum + (c.num_time_music || 0), 0);
	const unknownPlays = plays(unknown);
	const total = plays(composers);
	const share = !searched && total > 0 ? `, ${formatShare((unknownPlays / total) * 100)}` : '';
	return `${head} (선곡 ${unknownPlays.toLocaleString()}곡${share})`;
}

// URL의 시대(?era=바로크). ERAS 밖의 값이나 없으면 '' = 모든 시대.
/** @param {URLSearchParams} params */
export function readCatalogEra(params) {
	const era = params.get('era') ?? '';
	return ERAS.includes(era) ? era : '';
}

// 이 페이지의 경로(catalogHref·catalogViewHref 의 답)에 시대를 담는다. '' 나 ERAS 밖의 값이면 뺀다.
// 다른 파라미터(q, view, kind)는 그대로 둔다.
/**
 * @param {string} href
 * @param {string} era
 */
export function catalogEraHref(href, era) {
	const [path, search = ''] = href.split('?');
	const params = new URLSearchParams(search);
	if (ERAS.includes(era)) params.set('era', era);
	else params.delete('era');
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

// URL의 순서(?sort=birth): 'birth' = 출생 연도 순, 없거나 다른 값이면 '' = 받은 순서.
/** @param {URLSearchParams} params */
export const readCatalogSort = (params) => (params.get('sort') === 'birth' ? 'birth' : '');

// 이 페이지의 경로에 순서를 담는다. 'birth' 가 아니면 뺀다. 다른 파라미터는 그대로 둔다.
/**
 * @param {string} href
 * @param {string} sort
 */
export function catalogSortHref(href, sort) {
	const [path, search = ''] = href.split('?');
	const params = new URLSearchParams(search);
	if (sort === 'birth') params.set('sort', 'birth');
	else params.delete('sort');
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

// 출생 연도가 이른 순의 새 배열. 같은 해와 연도 없는 작곡가는 주어진 순서(많이 튼 순) 그대로,
// 연도 없는 작곡가는 끝에 둔다.
/** @param {CatalogComposer[]} composers */
export function byBirthYear(composers) {
	const known = composers.filter((c) => c.birth_year != null);
	const unknown = composers.filter((c) => c.birth_year == null);
	// Array.prototype.sort 는 안정 정렬이다.
	known.sort((a, b) => /** @type {number} */ (a.birth_year) - /** @type {number} */ (b.birth_year));
	return [...known, ...unknown];
}

// 통계 시대별 분포 표의 행마다 그 시대의 작곡가 정리 주소(?era=바로크). ERAS 밖의 이름은 null(글자 그대로).
/** @param {string[]} labels */
export const eraCatalogLinks = (labels) =>
	labels.map((label) => (ERAS.includes(label) ? catalogEraHref('/stat/composers', label) : null));

// 시대 고르기의 항목: ERAS 순서로 시대마다 받은 목록의 작곡가 수(0명도 둔다).
/** @param {CatalogComposer[]} composers */
export const eraOptions = (composers) =>
	ERAS.map((era) => ({ era, count: composers.filter((c) => c.era === era).length }));

// 고른 시대의 작곡가만, 받은 순서 그대로. keep 의 id 는 시대가 달라도 남긴다(저장해 시대가 바뀐 줄을
// 시대나 검색이 바뀔 때까지 그 자리에 둔다). era '' = 모두.
/**
 * @param {CatalogComposer[]} composers
 * @param {string} era
 * @param {Set<number>} [keep]
 */
export function filterEra(composers, era, keep = new Set()) {
	if (!era) return composers;
	return composers.filter((c) => c.era === era || keep.has(c.id));
}

// 문구 속 시대 이름: 미상은 '시대 미상'.
/** @param {string} era */
export const eraLabel = (era) => (era === UNKNOWN_ERA ? '시대 미상' : era);

// 시대를 골랐을 때의 개수 줄: '바로크 작곡가 12명 (140명 중) · 선곡 320곡, 25.0%'. 비율은 받은 목록
// 전체 선곡 수(선곡 수 칸의 합)에 대한 것이고, unknownSummary 처럼 검색 중이거나 전체가 0이면 뺀다.
/**
 * @param {CatalogComposer[]} composers
 * @param {string} era
 * @param {boolean} searched
 */
export function eraSummary(composers, era, searched) {
	const plays = (/** @type {CatalogComposer[]} */ list) =>
		list.reduce((sum, c) => sum + (c.num_time_music || 0), 0);
	const matching = composers.filter((c) => c.era === era);
	const eraPlays = plays(matching);
	const total = plays(composers);
	const share = !searched && total > 0 ? `, ${formatShare((eraPlays / total) * 100)}` : '';
	return (
		`${eraLabel(era)} 작곡가 ${matching.length.toLocaleString()}명 ` +
		`(${composers.length.toLocaleString()}명 중) · 선곡 ${eraPlays.toLocaleString()}곡${share}`
	);
}

// era_override 가 시대를 정하는가(ERAS 밖의 자유 입력은 백엔드가 무시한다).
/** @param {{ era_override?: string | null }} composer */
export const hasOverride = (composer) => ERAS.includes(composer.era_override ?? '');

// 시대 칸: 시대와, 보정값이 정했으면 '보정', 무시되는 보정값이 있으면 그 사실.
/** @param {CatalogComposer} composer */
export function eraCell(composer) {
	const stored = composer.era_override;
	let note = '';
	if (hasOverride(composer)) note = '보정';
	else if (stored) note = `저장된 ‘${stored}’ 무시됨`;
	return { era: composer.era || UNKNOWN_ERA, note };
}

// 수정 칸의 처음 값. 시대 '' = 출생 연도로 정함(보정 없음).
/**
 * @param {CatalogComposer} composer
 * @returns {ComposerDraft}
 */
export function draftOf(composer) {
	return {
		birthYear: composer.birth_year == null ? '' : String(composer.birth_year),
		era: hasOverride(composer) ? /** @type {string} */ (composer.era_override) : ''
	};
}

// 출생 연도 입력의 오류 문구. 비우면(연도 없음) 괜찮다.
/**
 * @param {string} raw
 * @param {number} thisYear
 */
export function birthYearError(raw, thisYear) {
	const value = raw.trim();
	if (!value) return '';
	const year = Number(value);
	if (/^\d+$/.test(value) && year >= MIN_BIRTH_YEAR && year <= thisYear) return '';
	return `출생 연도는 ${MIN_BIRTH_YEAR}부터 ${thisYear}까지의 숫자로 적어 주세요.`;
}

// PATCH 본문: 바뀐 칸만, 빈 값은 null(보정 없음, 연도 없음). 바뀐 것이 없으면 null.
/**
 * @param {CatalogComposer} composer
 * @param {ComposerDraft} draft
 */
export function composerPatch(composer, draft) {
	const before = draftOf(composer);
	/** @type {{ birth_year?: number | null, era_override?: string | null }} */
	const body = {};
	const birthYear = draft.birthYear.trim();
	if (birthYear !== before.birthYear) body.birth_year = birthYear ? Number(birthYear) : null;
	if (draft.era !== before.era) body.era_override = draft.era || null;
	return Object.keys(body).length > 0 ? body : null;
}

const FIELD_NAMES = { birth_year: '출생 연도', era_override: '시대' };

// 백엔드의 400 본문({ birth_year: ['…'] } 등) → 한 줄 문구.
/** @param {unknown} body */
export function patchErrorText(body) {
	if (body && typeof body === 'object') {
		const fields = Object.keys(FIELD_NAMES).filter((key) => key in body);
		if (fields.length > 0) {
			return `${fields.map((key) => FIELD_NAMES[key]).join('·')} 값을 저장하지 못했습니다.`;
		}
	}
	return '저장하지 못했습니다.';
}

// 저장한 뒤 목록의 그 작곡가를 백엔드의 답으로 바꾼다(자리는 그대로).
/**
 * @param {CatalogComposer[]} composers
 * @param {CatalogComposer} saved
 */
export const replaceComposer = (composers, saved) =>
	composers.map((c) => (c.id === saved.id ? { ...c, ...saved } : c));
