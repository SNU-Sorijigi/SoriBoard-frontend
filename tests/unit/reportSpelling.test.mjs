// 학기 결산의 상위 10: 표기만 다른 이름이 한 카드의 응답(상위 100)에 둘 이상 들면 표 아래에 알리는 줄.
// 페이지는 카드 → 종류를 spellingKindOf(DRILL_CARDS[card].param) 로 정하고, 표의 10 행이 아니라
// 이 학기의 응답 전체로 splitSpellingNote(splitSpellings(...)) 를 센다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRILL_CARDS } from '../../src/lib/statDrill.js';
import {
	MUSIC_SPLIT_LEAD,
	spellingKindOf,
	splitSpellings,
	splitSpellingNote
} from '../../src/lib/catalogSpelling.js';
import { composerWorkName } from '../../src/lib/composerStats.js';
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

// 많이 튼 곡(학기 결산의 상위 10, 작곡가 페이지): 작품 번호가 같은 곡(kind=music)의 묶음을 두 묶음까지.
const worksNoteOf = (duplicates, envelope) =>
	splitSpellingNote(splitSpellings(duplicates, envelope), 2, MUSIC_SPLIT_LEAD);
const musicGroup = (key, rows) => ({
	key,
	count: rows.reduce((sum, row) => sum + row.count, 0),
	rows: rows.map(([id, name, count]) => ({
		id,
		name,
		count,
		composer_id: 1,
		composer_name: '가상 A'
	}))
});

test('학기 결산 많이 튼 곡: a piece split outside the 10 rows gives the 작품 번호 note, 2 groups + 외 N묶음', () => {
	const works = Array.from({ length: 30 }, (_, i) => ({
		id: 500 + i,
		name: `가상 B - 소품 ${i + 1}번`,
		count: 40 - i
	}));
	works[0] = { id: 21, name: '가상 A - 교향곡 1번 Op. 21', count: 40 };
	works[13] = { id: 22, name: '가상 A - 교향곡 1번 op.21', count: 27 };
	works[4] = { id: 31, name: '가상 A - 소나타 Op. 5', count: 36 };
	works[20] = { id: 32, name: '가상 A - 소나타 op.5', count: 20 };
	works[25] = { id: 41, name: '가상 A - 사중주 Op. 9', count: 15 };
	works[29] = { id: 42, name: '가상 A - 사중주 Op.9', count: 11 };
	const current = {
		total_plays: 900,
		labels: works.map((item) => item.name),
		values: works.map((item) => item.count),
		items: works
	};
	const duplicates = {
		kind: 'music',
		groups: [
			// 전체 기간의 순서: 이 학기의 합(사중주 26, 교향곡 67, 소나타 56)과 다르다.
			[
				'op9',
				[
					[41, '사중주 Op. 9', 90],
					[42, '사중주 Op.9', 50]
				]
			],
			[
				'op21',
				[
					[21, '교향곡 1번 Op. 21', 60],
					[22, '교향곡 1번 op.21', 30]
				]
			],
			[
				'op5',
				[
					[31, '소나타 Op. 5', 40],
					[32, '소나타 op.5', 20],
					[33, '소나타 Op 5', 5]
				]
			]
		].map(([key, rows]) => musicGroup(key, rows))
	};
	const shown = topOf(current, 10).items.map((item) => item.id);
	assert.ok(shown.includes(21) && !shown.includes(22));
	assert.equal(
		worksNoteOf(duplicates, current),
		'작품 번호가 같은 곡은 따로 셉니다: ‘가상 A - 교향곡 1번 Op. 21’ 40회 + ‘가상 A - 교향곡 1번 op.21’ 27회; ' +
			'‘가상 A - 소나타 Op. 5’ 36회 + ‘가상 A - 소나타 op.5’ 20회 외 1묶음'
	);
});

test('작곡가 페이지 많이 튼 곡: the note names pieces as the table does, without the composer', () => {
	const composer = { id: 3, name: '가상 C' };
	const works = {
		items: [
			{ id: 61, name: '가상 C - 교향곡 1번 Op. 21', count: 9, composer_id: 3 },
			{ id: 70, name: '가상 C - 미뉴에트', count: 6, composer_id: 3 },
			// 같은 이름이 앞에 붙었지만 다른 작곡가(composer_id)의 곡: 이름을 그대로 둔다.
			{ id: 81, name: '가상 C - 세레나데 K. 550', count: 5, composer_id: 4 },
			{ id: 62, name: '가상 C - 교향곡 1번 op.21', count: 4, composer_id: 3 },
			{ id: 82, name: '가상 C - 세레나데 KV 550', count: 2, composer_id: 4 }
		]
	};
	const duplicates = {
		kind: 'music',
		groups: [
			musicGroup('op21', [
				[61, '교향곡 1번 Op. 21', 30],
				[62, '교향곡 1번 op.21', 12]
			]),
			musicGroup('k550', [
				[81, '세레나데 K. 550', 8],
				[82, '세레나데 KV 550', 3]
			])
		]
	};
	const named = {
		...works,
		items: works.items.map((item) => ({ ...item, name: composerWorkName(item, composer) }))
	};
	assert.equal(
		worksNoteOf(duplicates, named),
		'작품 번호가 같은 곡은 따로 셉니다: ‘교향곡 1번 Op. 21’ 9회 + ‘교향곡 1번 op.21’ 4회; ' +
			'‘가상 C - 세레나데 K. 550’ 5회 + ‘가상 C - 세레나데 KV 550’ 2회'
	);
	// 작곡가를 아직 못 받았으면 응답의 이름 그대로.
	assert.match(worksNoteOf(duplicates, works), /‘가상 C - 교향곡 1번 Op\. 21’ 9회/);
});
