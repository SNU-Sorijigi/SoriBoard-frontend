// 통계 drill-down: 순위 카드(작곡가·독주자·지휘자·오케스트라)의 막대나 표의 행에서 그 뒤의 곡으로.
// 막대·행의 위치를 응답의 items[i] 로 되돌리고, 이름이 아니라 id 로 거른다(이름은 겹칠 수 있다).
import { formatCount, rankCapSubtitle, rankTable } from './statTable.js';

/** @typedef {{ card: string, param: string, noun: string, id: number, name: string }} DrillTarget */

// 카드 → stats/works 에 보낼 id 파라미터와 대상을 부르는 말.
/** @type {Record<string, { param: string, noun: string }>} */
export const DRILL_CARDS = {
	composers: { param: 'composer_id', noun: '작곡가' },
	soloists: { param: 'player_id', noun: '연주자' },
	conductors: { param: 'conductor_id', noun: '지휘자' },
	orchestras: { param: 'orchestra_id', noun: '오케스트라' }
};

// 패널에 싣는 곡 수의 상한(백엔드 limit 의 최댓값).
export const WORKS_LIMIT = 100;

// horizontalBarOption 은 1위가 맨 위에 오도록 순서를 뒤집어 그린다.
// 막대(또는 축 이름)의 dataIndex → items 의 위치. 범위 밖이면 -1.
/**
 * @param {unknown} dataIndex
 * @param {number} length
 */
export function barItemIndex(dataIndex, length) {
	if (!Number.isInteger(dataIndex)) return -1;
	const i = /** @type {number} */ (dataIndex);
	return i >= 0 && i < length ? length - 1 - i : -1;
}

// 카드와 그 응답, items 의 위치 → 대상. 카드가 drill-down 을 하지 않거나 항목·id 가 없으면 null.
/**
 * @param {string} card
 * @param {{ items?: { id: number | null, name: string }[] } | null | undefined} envelope
 * @param {number} index
 * @returns {DrillTarget | null}
 */
export function drillTarget(card, envelope, index) {
	const spec = DRILL_CARDS[card];
	const item = spec && index >= 0 ? envelope?.items?.[index] : undefined;
	if (!spec || !item || item.id == null) return null;
	return { card, param: spec.param, noun: spec.noun, id: item.id, name: item.name };
}

// stats/works 에 더할 파라미터. 기간과 범위(지기)는 페이지가 붙인다.
/** @param {DrillTarget} target */
export function drillParams(target) {
	return { [target.param]: String(target.id), limit: String(WORKS_LIMIT) };
}

// 패널의 곡 이름. stats/works 는 '작곡가 - 곡' 으로 주므로, 그 작곡가의 패널에서는 곡 이름만 남긴다.
/**
 * @param {{ name: string, composer_id?: number | null }} item
 * @param {DrillTarget} target
 */
export function workLabel(item, target) {
	const prefix = `${target.name} - `;
	if (target.card === 'composers' && item.composer_id === target.id && item.name.startsWith(prefix))
		return item.name.slice(prefix.length);
	return item.name;
}

// 지난 학기 칸: 그 곡을 앞 학기에 튼 횟수(이름이 아니라 id 로 맞춘다). 앞 학기 목록에 없으면 0.
// 단, 앞 학기 목록이 WORKS_LIMIT 에서 잘렸으면 없는 곡의 횟수는 알 수 없다(null: 표와 CSV 는 '—').
/**
 * @param {{ items: { id: number, count: number }[] }} previous
 * @param {number} id
 * @returns {number | null}
 */
export function previousWorkCount(previous, id) {
	const found = previous.items.find((item) => item.id === id);
	if (found) return found.count;
	return previous.items.length >= WORKS_LIMIT ? null : 0;
}

// 지난 학기 칸의 값. 클럽이 그 곡을 이 학기에 처음 틀었으면(전체 기록의 first_played 가 학기 첫날
// start 이후, YYYY-MM-DD 라 문자열로 비교한다) 앞 학기에 튼 적이 없으므로 0 이나 '—' 대신 '첫 선곡'
// (통계·학기 결산의 많이 튼 곡 표와 같다). start 나 first_played 가 없으면(옛 백엔드) previousWorkCount.
/**
 * @param {{ items: { id: number, count: number }[] }} previous
 * @param {{ id: number, first_played?: string | null }} item
 * @param {string | null | undefined} start
 * @returns {number | null | '첫 선곡'}
 */
export function previousWorkValue(previous, item, start) {
	const first = item.first_played;
	if (typeof start === 'string' && start && typeof first === 'string' && first && first >= start)
		return '첫 선곡';
	return previousWorkCount(previous, item.id);
}

// 패널의 부제(표의 caption·aria-describedby): 대상 · 기간·범위 · 총 N곡, 앞 학기 목록(previous)이 오면
// 그 total_plays 를 '지난 학기 N곡'으로 바로 뒤에 둔다. works 가 아직 없으면(불러오는 중) 대상 · 범위만.
// 상한까지 실렸으면 '상위 100곡', 대상의 곡 수(total, stats/summary 의 works)를 알면 '(150곡 중)'도 붙이고,
// 그 수가 실린 곡 수를 넘지 않으면(잘리지 않았으면) 붙이지 않는다(rankCapSubtitle).
/**
 * @param {{ noun: string }} target
 * @param {string} scopeLabel
 * @param {{ total_plays: number, items: unknown[] } | null} works
 * @param {{ total_plays?: unknown } | null} [previous]
 * @param {number | null} [total]
 */
export function drillSubtitle(target, scopeLabel, works, previous = null, total = null) {
	if (!works) return `${target.noun} · ${scopeLabel}`;
	const count = works.items.length;
	const before = previous?.total_plays;
	return (
		`${target.noun} · ${scopeLabel} · 총 ${works.total_plays.toLocaleString()}곡` +
		(typeof before === 'number' && Number.isFinite(before)
			? ` · 지난 학기 ${before.toLocaleString()}곡`
			: '') +
		rankCapSubtitle(works, WORKS_LIMIT, total, '곡') +
		(count > 0 ? ' · 처음·마지막은 전체 기록 기준' : '')
	);
}

// 화면 낭독기에 알리는 패널의 로드 상태(role="status"): 불러오는 중이면 빈 줄, 다 오면 곡 수·없음·실패를
// 한 문장으로. 지난 학기 횟수를 못 불렀으면(previousError: 그 학기 이름) 표가 있을 때만 덧붙인다(그 알림이
// 표 아래에만 보인다). works 가 없고 불러오는 중도 실패도 아니면(개인 범위에 지기 미선택) 빈 줄.
// 제목 '…의 곡'은 늘 '곡'으로 끝나므로 조사는 '을'이다. 부제처럼 잘렸으면 '상위 100개', 대상의 곡 수(total)를
// 알면 '(150곡 중)'도 붙인다.
/**
 * @param {string} name
 * @param {{ loading?: boolean, error?: string, works?: { items: unknown[] } | null, previousError?: string,
 *   total?: number | null }} state
 */
export function drillStatusText(name, { loading, error, works, previousError, total = null }) {
	const title = `${name}의 곡`;
	if (loading) return '';
	if (error) return `${title}을 불러오지 못했습니다. 다시 시도로 다시 부를 수 있습니다.`;
	if (!works) return '';
	const count = works.items.length;
	if (count === 0) return `${title}: 이 기간에는 선곡이 없습니다.`;
	// 부제와 같은 판단: 꼬리가 붙으면 잘린 목록이다.
	const cut = rankCapSubtitle(works, WORKS_LIMIT, total, '곡') !== '';
	const known = typeof total === 'number' && Number.isFinite(total);
	return (
		(cut
			? `${title} 상위 ${count.toLocaleString()}개를 불러왔습니다` +
				(known ? ` (${formatCount(total)}곡 중).` : '.')
			: `${title} ${count.toLocaleString()}개를 불러왔습니다.`) +
		(previousError ? ` 지난 학기(${previousError}) 횟수를 불러오지 못했습니다.` : '')
	);
}

// 패널의 표: 순위, 곡, 횟수, 처음, 마지막(작곡가 페이지의 곡 표와 같다). 날짜는 기간·대상과 상관없이
// 그 곡의 전체 선곡 기준(stats/works 의 first_played·last_played), 없으면 '—'.
// 앞 학기의 같은 대상·범위의 목록(previous)을 주면 마지막에 지난 학기 칸을 둔다(previousWorkValue:
// 이 학기(works.filters.start)에 처음 튼 곡은 '첫 선곡').
/**
 * @param {{ filters?: { start?: string }, items: { id: number, name: string, count: number,
 *   composer_id?: number | null, first_played?: string | null, last_played?: string | null }[] }} works
 * @param {DrillTarget} target
 * @param {{ items: { id: number, count: number }[] } | null} [previous]
 * @returns {import('./statTable.js').Table}
 */
export function drillWorksTable(works, target, previous = null) {
	const { items } = works;
	const table = rankTable(
		{ labels: items.map((item) => workLabel(item, target)), values: items.map((i) => i.count) },
		'곡'
	);
	const columns = [
		...table.columns,
		{ name: '처음', numeric: true },
		{ name: '마지막', numeric: true }
	];
	const rows = table.rows.map((row, i) => [
		...row,
		items[i].first_played ?? '—',
		items[i].last_played ?? '—'
	]);
	if (!previous) return { ...table, columns, rows };
	const start = works.filters?.start;
	return {
		...table,
		columns: [...columns, { name: '지난 학기', numeric: true }],
		rows: rows.map((row, i) => {
			const value = previousWorkValue(previous, items[i], start);
			return [...row, typeof value === 'string' ? value : formatCount(value)];
		})
	};
}

// 열린 패널은 URL의 drill(카드)·drill_id 에 둔다(링크로 같은 패널을 연다). 이름은 싣지 않는다:
// 링크로 열면 그 카드의 응답에서 id 로 항목을 찾는다(drillItemIndex). 형식이 틀린 값은 없음(null).
const DRILL_KEYS = ['drill', 'drill_id'];
const ID = /^[1-9]\d*$/;

/**
 * @param {URLSearchParams} params
 * @returns {{ card: string, id: number } | null}
 */
export function readDrillQuery(params) {
	const card = params.get('drill');
	const raw = params.get('drill_id');
	if (!card || !Object.keys(DRILL_CARDS).includes(card) || !raw || !ID.test(raw)) return null;
	const id = Number(raw);
	return Number.isSafeInteger(id) ? { card, id } : null;
}

// 패널이 없으면(null) 두 키를 지운다. 다른 파라미터는 그대로 둔다.
/**
 * @param {URLSearchParams} params
 * @param {{ card: string, id: number } | null} target
 */
export function writeDrillQuery(params, target) {
	for (const key of DRILL_KEYS) params.delete(key);
	if (!target) return;
	params.set('drill', target.card);
	params.set('drill_id', String(target.id));
}

// 카드 응답의 items 에서 그 id 의 위치. 없으면 -1.
/**
 * @param {{ items?: { id: number | null }[] } | null | undefined} envelope
 * @param {number} id
 */
export function drillItemIndex(envelope, id) {
	return envelope?.items?.findIndex((item) => item.id === id) ?? -1;
}
