// 학기 결산의 상위 10: 표기만 다른 이름이 한 카드의 응답(상위 100)에 둘 이상 들면 표 아래에 알리는 줄.
// 페이지는 카드 → 종류를 spellingKindOf(DRILL_CARDS[card].param) 로 정하고, 표의 10 행이 아니라
// 이 학기의 응답 전체로 splitSpellingNote(splitSpellings(...)) 를 센다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRILL_CARDS } from '../../src/lib/statDrill.js';
import {
	spellingKindOf,
	splitSpellings,
	splitSpellingNote
} from '../../src/lib/catalogSpelling.js';
import { topOf } from '../../src/lib/statTable.js';

const kindOf = (card) => spellingKindOf(DRILL_CARDS[card].param);
const noteOf = (duplicates, envelope) => splitSpellingNote(splitSpellings(duplicates, envelope));

// 이 학기의 상위 100 응답(30행): 'Gasang Kim'이 2위, 그 다른 표기가 14위(표의 10 행 밖).
const items = Array.from({ length: 30 }, (_, i) => ({
	id: 100 + i,
	name: `가상 작곡가 ${i + 1}`,
	count: 60 - i * 2
}));
items[1] = { id: 7, name: 'Gasang Kim', count: 38 };
items[13] = { id: 8, name: 'Gasang  Kim.', count: 14 };
const current = {
	total_plays: 900,
	labels: items.map((item) => item.name),
	values: items.map((item) => item.count),
	items
};

test('the four 상위 10 cards map to their 표기 정리 kinds; 많이 튼 곡 has none', () => {
	assert.deepEqual(
		Object.fromEntries(Object.keys(DRILL_CARDS).map((card) => [card, kindOf(card)])),
		{ composers: 'composer', soloists: 'player', conductors: 'conductor', orchestras: 'orchestra' }
	);
	assert.equal(DRILL_CARDS.works, undefined);
});

test('a spelling outside the 10-row table still gives the note, with this 학기 counts', () => {
	const duplicates = {
		groups: [
			{
				key: 'gasangkim',
				count: 120,
				rows: [
					{ id: 7, name: 'Gasang Kim', count: 90 },
					{ id: 8, name: 'Gasang  Kim.', count: 30 }
				]
			}
		]
	};
	// 표의 10 행에는 한 표기만 있다.
	const shown = topOf(current, 10).items.map((item) => item.id);
	assert.ok(shown.includes(7));
	assert.ok(!shown.includes(8));
	assert.equal(
		noteOf(duplicates, current),
		'표기만 다른 이름은 따로 셉니다: ‘Gasang Kim’ 38회 + ‘Gasang  Kim.’ 14회'
	);
});

test('a group with only one spelling in this 학기 answer gives no note', () => {
	const duplicates = {
		groups: [
			{
				key: 'gasangkim',
				count: 50,
				rows: [
					{ id: 7, name: 'Gasang Kim', count: 40 },
					{ id: 999, name: 'Gasang-Kim', count: 10 }
				]
			}
		]
	};
	assert.equal(noteOf(duplicates, current), '');
	// 응답이 없거나(불러오는 중·실패) 표기 정리를 못 받았으면 줄도 없다.
	assert.equal(noteOf(duplicates, undefined), '');
	assert.equal(noteOf(undefined, current), '');
});
