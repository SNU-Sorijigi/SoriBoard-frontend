import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looseMatchParts, matchParts } from '../../src/lib/textMatch.js';

const join = (parts) => parts.map((part) => part.text).join('');

test('a blank search leaves the text as one unmarked part', () => {
	for (const q of ['', '   ', undefined, null]) {
		assert.deepEqual(matchParts('가상 교향곡', q), [{ text: '가상 교향곡', hit: false }]);
	}
});

test('no match leaves the text as one unmarked part', () => {
	assert.deepEqual(matchParts('가상 교향곡', '협주곡'), [{ text: '가상 교향곡', hit: false }]);
});

test('an empty text has no parts', () => {
	assert.deepEqual(matchParts('', '첼로'), []);
	assert.deepEqual(matchParts('', ''), []);
});

test('marks a hit at the start, in the middle and at the end', () => {
	assert.deepEqual(matchParts('첼로: 가상 연주자', '첼로'), [
		{ text: '첼로', hit: true },
		{ text: ': 가상 연주자', hit: false }
	]);
	assert.deepEqual(matchParts('2악장 봄밤 외', '봄밤'), [
		{ text: '2악장 ', hit: false },
		{ text: '봄밤', hit: true },
		{ text: ' 외', hit: false }
	]);
	assert.deepEqual(matchParts('피아노: 가상 연주자 가', '연주자 가'), [
		{ text: '피아노: 가상 ', hit: false },
		{ text: '연주자 가', hit: true }
	]);
});

test('marks a text that is only the search word', () => {
	assert.deepEqual(matchParts('첼로', '첼로'), [{ text: '첼로', hit: true }]);
});

test('marks every hit, left to right, without overlaps', () => {
	assert.deepEqual(matchParts('첼로: 가 · 첼로: 나', '첼로'), [
		{ text: '첼로', hit: true },
		{ text: ': 가 · ', hit: false },
		{ text: '첼로', hit: true },
		{ text: ': 나', hit: false }
	]);
	assert.deepEqual(matchParts('aaaa', 'aa'), [
		{ text: 'aa', hit: true },
		{ text: 'aa', hit: true }
	]);
	assert.deepEqual(matchParts('aaa', 'aa'), [
		{ text: 'aa', hit: true },
		{ text: 'a', hit: false }
	]);
});

test('ignores case and keeps the text as written', () => {
	assert.deepEqual(matchParts('Op. 7 가상 소나타 op. 3', 'op.'), [
		{ text: 'Op.', hit: true },
		{ text: ' 7 가상 소나타 ', hit: false },
		{ text: 'op.', hit: true },
		{ text: ' 3', hit: false }
	]);
	assert.deepEqual(matchParts('가상 Zed Composer', 'ZED'), [
		{ text: '가상 ', hit: false },
		{ text: 'Zed', hit: true },
		{ text: ' Composer', hit: false }
	]);
});

test('treats the search word literally, not as a pattern', () => {
	assert.deepEqual(matchParts('BWV 1007 (첼로)', '(첼로)'), [
		{ text: 'BWV 1007 ', hit: false },
		{ text: '(첼로)', hit: true }
	]);
	assert.deepEqual(matchParts('Op. 7', '.*'), [{ text: 'Op. 7', hit: false }]);
});

test('a search word longer than the text does not match', () => {
	assert.deepEqual(matchParts('첼로', '첼로 협주곡'), [{ text: '첼로', hit: false }]);
});

test('the parts always join back to the text', () => {
	const cases = [
		['가상 작곡가 가', '가'],
		['Op. 7 가상 소나타', 'op'],
		['첼로: 가 · 첼로: 나 · 지휘: 가상', ' · '],
		['abcabcab', 'ab'],
		['가상 교향곡', 'x']
	];
	for (const [text, q] of cases) assert.equal(join(matchParts(text, q)), text);
});

test('marks nothing when lowercasing changes the length', () => {
	// 'İ'.toLowerCase() is two code units, so positions in the lowercased text would be off by one.
	assert.deepEqual(matchParts('İstanbul Op. 1', 'op.'), [{ text: 'İstanbul Op. 1', hit: false }]);
	assert.deepEqual(matchParts('Op. 1', 'İ'), [{ text: 'Op. 1', hit: false }]);
	assert.equal(join(matchParts('İİ op', 'op')), 'İİ op');
});

// looseMatchParts: 표기 정리's search ignores spaces, periods, dashes and case (normalizeName).
const loose = (text, q) => {
	const parts = looseMatchParts(text, q);
	assert.equal(join(parts), text, `parts of ${JSON.stringify(text)} join back`);
	return parts;
};

test('loose: marks a spelling found only without spaces and periods, dots and spaces included', () => {
	assert.deepEqual(loose('J. S. Bach', 'js bach'), [{ text: 'J. S. Bach', hit: true }]);
	assert.deepEqual(loose('J.S. Bach', 'JSBach'), [{ text: 'J.S. Bach', hit: true }]);
	assert.deepEqual(loose('Johann Sebastian Bach', 'js bach'), [
		{ text: 'Johann Sebastian Bach', hit: false }
	]);
});

test('loose: a hit neither starts nor ends on a dropped character', () => {
	assert.deepEqual(loose('J. S. Bach', 'sbach'), [
		{ text: 'J. ', hit: false },
		{ text: 'S. Bach', hit: true }
	]);
	assert.deepEqual(loose('Z. Q. Fakename', 'qfake'), [
		{ text: 'Z. ', hit: false },
		{ text: 'Q. Fake', hit: true },
		{ text: 'name', hit: false }
	]);
});

test('loose: marks a Korean name across its dash or space', () => {
	assert.deepEqual(loose('림스키-코르사코프', '림스키코르사코프'), [
		{ text: '림스키-코르사코프', hit: true }
	]);
	assert.deepEqual(loose('림스키 코르사코프', '림스키코르사코프'), [
		{ text: '림스키 코르사코프', hit: true }
	]);
});

test('loose: an exact hit wins and is marked as matchParts marks it', () => {
	assert.deepEqual(loose('J. S. Bach', 'bach'), matchParts('J. S. Bach', 'bach'));
	assert.deepEqual(loose('J. S. Bach', 'bach'), [
		{ text: 'J. S. ', hit: false },
		{ text: 'Bach', hit: true }
	]);
	assert.deepEqual(loose('가상-작곡가', '가상'), matchParts('가상-작곡가', '가상'));
});

test('loose: marks every occurrence, without overlaps, leaving what lies between', () => {
	assert.deepEqual(loose('A-B A B', 'ab'), [
		{ text: 'A-B', hit: true },
		{ text: ' ', hit: false },
		{ text: 'A B', hit: true }
	]);
	assert.deepEqual(loose('a.a.a', 'aa'), [
		{ text: 'a.a', hit: true },
		{ text: '.a', hit: false }
	]);
});

test('loose: no hit, a blank search or one of only dots, dashes and spaces marks nothing', () => {
	assert.deepEqual(loose('J. S. Bach', 'mozart'), [{ text: 'J. S. Bach', hit: false }]);
	for (const q of ['', '  ', undefined, null, '.-', ' - ']) {
		assert.deepEqual(loose('가상 작곡가', q), [{ text: '가상 작곡가', hit: false }]);
	}
	// A literal dash is still marked as typed.
	assert.deepEqual(loose('가상-작곡가', '-'), matchParts('가상-작곡가', '-'));
});

test('loose: an empty text has no parts', () => {
	assert.deepEqual(looseMatchParts('', 'js bach'), []);
	assert.deepEqual(looseMatchParts('', ''), []);
});

test('loose: marks nothing when characters normalize differently together than alone', () => {
	// Decomposed jamo compose into 가 only as a pair, so no character range maps to the hit.
	const jamo = '\u1100\u1161';
	assert.deepEqual(loose(jamo, '가'), [{ text: jamo, hit: false }]);
	assert.deepEqual(loose(`가상 ${jamo}`, '상가'), [{ text: `가상 ${jamo}`, hit: false }]);
	// Final sigma: 'Σ' lowercases to ς at a word's end but to σ alone, so character by character
	// 'ΑΣ' would hold 'ασ', which normalizeName('ΑΣ') ('ας') and the filter do not.
	assert.deepEqual(loose('ΑΣ', 'ασ'), [{ text: 'ΑΣ', hit: false }]);
	assert.deepEqual(loose('Α.ΣΣ', 'ασσ'), [{ text: 'Α.ΣΣ', hit: false }]);
});

test('loose: one character that normalizes to several still maps to itself', () => {
	// NFKC turns ﬁ into fi: the hit covers the whole ligature.
	assert.deepEqual(loose('ﬁ-ne', 'fine'), [{ text: 'ﬁ-ne', hit: true }]);
	assert.deepEqual(loose('a ﬁ', 'af'), [{ text: 'a ﬁ', hit: true }]);
});
