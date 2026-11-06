// 글에서 검색어가 든 곳을 나눈다(대소문자 무시). 선곡 기록이 검색어를 표에 표시할 때 쓴다.

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
