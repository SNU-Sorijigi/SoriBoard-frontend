// 글에서 검색어가 든 곳을 나눈다(대소문자 무시). 선곡 기록이 검색어를 표에 표시할 때 쓴다.

import { normalizeName } from './catalogSpelling.js';

/**
 * text 를 차례대로 덮는 조각들. hit 은 검색어와 같은 조각이다(겹치지 않게, 앞에서부터).
 * 검색어가 비었거나 없으면 글 전체 한 조각, 글이 비었으면 []. 소문자로 바꾸면 길이가 달라지는
 * 글자(İ 등)가 있으면 엉뚱한 곳을 표시하지 않도록 표시하지 않는다.
 * @param {string} text
 * @param {string} q
 * @returns {{ text: string, hit: boolean }[]}
 */
export function matchParts(text, q) {
	if (!text) return [];
	const whole = [{ text, hit: false }];
	const lowerText = text.toLowerCase();
	const lowerQ = (q ?? '').toLowerCase();
	if (!lowerQ.trim() || lowerText.length !== text.length || lowerQ.length !== q.length)
		return whole;

	/** @type {{ text: string, hit: boolean }[]} */
	const parts = [];
	let from = 0;
	let at = lowerText.indexOf(lowerQ);
	while (at !== -1) {
		if (at > from) parts.push({ text: text.slice(from, at), hit: false });
		parts.push({ text: text.slice(at, at + lowerQ.length), hit: true });
		from = at + lowerQ.length;
		at = lowerText.indexOf(lowerQ, from);
	}
	if (from === 0) return whole;
	if (from < text.length) parts.push({ text: text.slice(from), hit: false });
	return parts;
}

// 표기 정리의 검색(filterSpellingGroups)처럼 띄어쓰기·점·줄표·대소문자를 가리지 않고 든 곳을 나눈다.
/**
 * 검색어가 글자 그대로 들면 matchParts 그대로. 아니면 둘 다 normalizeName 꼴로 견주어, 든 곳을 원래 글의
 * 글자들로 칠한다(가운데 점·공백·줄표도 함께, 앞뒤의 버린 글자는 빼고). 'js bach' → 'J. S. Bach' 전체.
 * 다듬은 꼴이 비는 검색어(점·줄표·공백뿐)는 글자 그대로만 견준다. 글자마다 다듬어 이은 꼴이 글 전체를
 * 다듬은 꼴과 다르면(글자끼리 합쳐지는 경우 등) 엉뚱한 곳을 칠하지 않도록 표시하지 않는다.
 * @param {string} text
 * @param {string} q
 * @returns {{ text: string, hit: boolean }[]}
 */
export function looseMatchParts(text, q) {
	if (!text) return [];
	const exact = matchParts(text, q);
	if (exact.some((part) => part.hit)) return exact;
	const whole = [{ text, hit: false }];
	const key = normalizeName(q);
	if (!key) return whole;

	// 다듬은 꼴의 단위마다 그것이 나온 원래 글자의 [시작, 끝).
	let joined = '';
	/** @type {[number, number][]} */
	const source = [];
	let at = 0;
	for (const char of text) {
		const normalized = normalizeName(char);
		for (let i = 0; i < normalized.length; i++) source.push([at, at + char.length]);
		joined += normalized;
		at += char.length;
	}
	if (joined !== normalizeName(text)) return whole;

	/** @type {{ text: string, hit: boolean }[]} */
	const parts = [];
	let from = 0;
	let unit = joined.indexOf(key);
	while (unit !== -1) {
		const start = source[unit][0];
		const end = source[unit + key.length - 1][1];
		if (start > from) parts.push({ text: text.slice(from, start), hit: false });
		parts.push({ text: text.slice(start, end), hit: true });
		from = end;
		// 다음은 이 글자 뒤에서부터 찾는다(한 글자가 여러 단위로 다듬어져도 겹치지 않게).
		let next = unit + key.length;
		while (next < source.length && source[next][0] < from) next++;
		unit = joined.indexOf(key, next);
	}
	if (parts.length === 0) return whole;
	if (from < text.length) parts.push({ text: text.slice(from), hit: false });
	return parts;
}
