import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchParts } from '../../src/lib/textMatch.js';

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
