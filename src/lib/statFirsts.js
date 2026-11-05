// 통계의 '처음 튼 작곡가·곡'(stats/firsts): 클럽 전체에서 처음 튼 날이 보기의 기간에 드는 작곡가·곡.

import { CURRENT, ALL, CUSTOM, isIsoDate } from './statPeriod.js';
import { historyHref } from './playHistory.js';

// 기간의 시작이 있는가. stats/firsts 는 시작(start)이 있을 때만 '그 뒤에 처음 튼 것'으로 거르고,
// 없으면 지금까지 튼 모든 작곡가·곡을 준다. 그래서 시작이 없는 보기(전체 기간, 시작을 비운 직접 지정)는
// 묻지 않는다. 이번 학기는 통계가 시작 날짜를 보낼 때만(buildQuery), 학기는 언제나 시작이 있다.
/** @param {{ period: string, start?: string }} view */
export function hasPeriodStart({ period, start = '' }) {
	if (period === CURRENT || period === CUSTOM) return Boolean(start);
	return period !== ALL;
}

// 카드 부제(표의 설명): '2025-2학기 · 전체 · 클럽에서 처음 튼 곡 18곡'. 불러오는 동안(firsts 가 없으면)
// 개수를 붙이지 않는다. 학기를 고르면 앞 학기의 같은 목록(previous)의 개수를 덧붙인다:
// '… 18곡 · 지난 학기 12곡'. 앞 학기가 없거나 아직 없거나 실패했으면 붙이지 않는다.
/**
 * @param {string} viewLabel
 * @param {{ items: unknown[] } | null | undefined} firsts
 * @param {string} noun
 * @param {string} unit
 * @param {{ items: unknown[] } | null | undefined} [previous]
 */
export function firstsSubtitle(viewLabel, firsts, noun, unit, previous = null) {
	const before =
		firsts && previous ? ` · 지난 학기 ${previous.items.length.toLocaleString()}${unit}` : '';
	const count = firsts ? ` ${firsts.items.length.toLocaleString()}${unit}${before}` : '';
	const text = `클럽에서 처음 튼 ${noun}${count}`;
	return viewLabel.trim() ? `${viewLabel.trim()} · ${text}` : text;
}

// 목록을 불러왔는데 비었을 때 카드의 자리 문구: '처음 튼 곡 — 이 기간에는 없습니다'. 표가 없으면 부제도
// 보이지 않으므로, 앞 학기의 같은 목록(previous)이 있으면 그 개수를 여기에 덧붙인다:
// '… · 지난 학기 12곡'. 앞 학기가 없거나 아직 없거나 실패했으면 붙이지 않는다.
/**
 * @param {string} title
 * @param {string} unit
 * @param {{ items: unknown[] } | null | undefined} [previous]
 */
export function firstsEmptyText(title, unit, previous = null) {
	const before = previous ? ` · 지난 학기 ${previous.items.length.toLocaleString()}${unit}` : '';
	return `${title} — 이 기간에는 없습니다${before}`;
}

// 카드의 '많이 튼 순': 같은 목록을 횟수가 많은 것부터. 횟수가 같으면 받은 순서(처음 튼 날, 이름 순)를
// 지킨다(정렬은 안정적이다). 받은 목록은 바꾸지 않는다. 표와 이름의 링크는 모두 items 에서 만든다.
/**
 * @template {{ count: number }} T
 * @param {{ items: T[] } | null | undefined} firsts
 * @returns {{ items: T[] } | null}
 */
export function byCount(firsts) {
	if (!firsts) return null;
	return { ...firsts, items: [...firsts.items].sort((a, b) => b.count - a.count) };
}

// 표의 처음 튼 날 → 그 하루, 그 작곡가(composer_id)나 곡(music_id)의 선곡 기록(kind: 'composer' | 'work').
// 처음 튼 날은 클럽 전체의 첫 선곡일이라 지기를 두면 그 선곡이 빠질 수 있으므로, 지기 없이(전체) 연다.
// kind 를 모르거나 id 가 양의 정수가 아니거나 날짜가 YYYY-MM-DD 가 아니면 null(글자 그대로).
/**
 * @param {string} kind
 * @param {unknown} id
 * @param {unknown} date
 * @returns {string | null}
 */
export function firstDayHref(kind, id, date) {
	const param = kind === 'composer' ? 'composer_id' : kind === 'work' ? 'music_id' : null;
	if (!param || !Number.isSafeInteger(id) || Number(id) <= 0) return null;
	if (typeof date !== 'string' || !isIsoDate(date)) return null;
	return historyHref({
		period: CUSTOM,
		start: date,
		end: date,
		q: '',
		userId: null,
		includeMentees: false,
		requested: '',
		targets: [{ param, id: String(id) }]
	});
}
