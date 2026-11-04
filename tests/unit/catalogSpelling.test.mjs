import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	SPELLING_KINDS,
	DEFAULT_KIND,
	readSpellingKind,
	catalogViewHref,
	catalogPageTitle,
	duplicatesSearch,
	rowLinks,
	groupHeading,
	spellingSummary,
	composerVariants,
	spellingKindOf,
	spellingVariants,
	variantHistoryHref,
	splitSpellings,
	splitSpellingNote
} from '../../src/lib/catalogSpelling.js';
import { readHistoryQuery } from '../../src/lib/playHistory.js';
import { readCatalogQuery } from '../../src/lib/composerCatalog.js';

const params = (search) => new URLSearchParams(search);
const urlOf = (href) => new URL(href, 'http://x');

test('the view is read from the URL: the list by default, a known kind or composer', () => {
	assert.equal(readSpellingKind(params('')), null);
	assert.equal(readSpellingKind(params('kind=player')), null);
	assert.equal(readSpellingKind(params('view=other&kind=player')), null);
	assert.equal(readSpellingKind(params('view=spelling')), DEFAULT_KIND);
	assert.equal(readSpellingKind(params('view=spelling&kind=music')), 'music');
	assert.equal(readSpellingKind(params('view=spelling&kind=work')), DEFAULT_KIND);
	assert.equal(readSpellingKind(params('view=spelling&kind=')), DEFAULT_KIND);
});

test('the view is written to the URL, defaults left out, the search term kept', () => {
	assert.equal(catalogViewHref('', null), '/stat/composers');
	assert.equal(catalogViewHref('바흐', null), `/stat/composers?q=${encodeURIComponent('바흐')}`);
	assert.equal(catalogViewHref('', 'composer'), '/stat/composers?view=spelling');
	assert.equal(catalogViewHref('', 'unknown'), '/stat/composers?view=spelling');
	for (const { kind } of SPELLING_KINDS) {
		for (const q of ['', ' a&b ']) {
			const url = urlOf(catalogViewHref(q, kind));
			assert.equal(url.pathname, '/stat/composers');
			assert.equal(readSpellingKind(url.searchParams), kind);
			assert.equal(readCatalogQuery(url.searchParams), q.trim());
			assert.equal(url.searchParams.has('kind'), kind !== DEFAULT_KIND);
		}
	}
});

test('the request names the kind', () => {
	assert.equal(duplicatesSearch('player'), '?kind=player');
	assert.equal(params(duplicatesSearch('a&b')).get('kind'), 'a&b');
});

test('rows link by id: composers to their page, others to their plays of all time', () => {
	assert.deepEqual(rowLinks('composer', { id: 7, name: 'A', count: 1 }), {
		name: '/stat/composer/7',
		composer: null,
		count: '/stat/history?period=all&composer_id=7'
	});
	for (const [kind, param] of [
		['player', 'player_id'],
		['conductor', 'conductor_id'],
		['orchestra', 'orchestra_id'],
		['music', 'music_id']
	]) {
		const links = rowLinks(kind, { id: 12, name: '같은 이름', count: 3 });
		assert.equal(links.composer, null);
		const url = urlOf(links.name);
		assert.equal(url.pathname, '/stat/history');
		const filter = readHistoryQuery(url.searchParams);
		assert.equal(filter.period, 'all');
		assert.deepEqual(filter.targets, [{ param, id: '12' }]);
		assert.equal(url.searchParams.has('q'), false, 'never by name');
	}
});

test('a work links its plays and its composer', () => {
	const work = { id: 4, name: '교향곡 Op. 67', count: 2, composer_id: 9, composer_name: '가' };
	const plays = '/stat/history?period=all&music_id=4';
	assert.deepEqual(rowLinks('music', work), {
		name: plays,
		composer: '/stat/composer/9',
		count: null
	});
	assert.deepEqual(rowLinks('music', { ...work, composer_id: null }), {
		name: plays,
		composer: null,
		count: null
	});
	assert.deepEqual(rowLinks('unknown', work), { name: null, composer: null, count: null });
});

test("a composer spelling's play count links its plays of all time, unless it has none", () => {
	const url = urlOf(rowLinks('composer', { id: 7, name: 'J. S. Bach', count: 3 }).count);
	assert.equal(url.href, 'http://x/stat/history?period=all&composer_id=7');
	const filter = readHistoryQuery(url.searchParams);
	assert.equal(filter.period, 'all');
	assert.deepEqual(filter.targets, [{ param: 'composer_id', id: '7' }]);
	assert.equal(filter.q, '');
	assert.equal(filter.userId, null);
	assert.equal(filter.requested, '');
	for (const key of ['q', 'user_id', 'requested']) assert.equal(url.searchParams.has(key), false);
	assert.equal(rowLinks('composer', { id: 7, name: 'J. S. Bach', count: 0 }).count, null);
	for (const kind of ['player', 'conductor', 'orchestra', 'music']) {
		assert.equal(rowLinks(kind, { id: 12, name: '같은 이름', count: 3 }).count, null, kind);
	}
});

test('a group is headed by its most played spelling, with its spellings and plays', () => {
	const group = {
		key: 'jsbach',
		count: 1234,
		rows: [
			{ id: 2, name: 'J.S. Bach', count: 1230 },
			{ id: 1, name: 'J. S. Bach', count: 4 }
		]
	};
	assert.deepEqual(groupHeading(group), {
		title: 'J.S. Bach',
		meta: '표기 2개 · 선곡 1,234회'
	});
	assert.equal(groupHeading({ key: 'op12', count: 0, rows: [] }).title, 'op12');
});

test('the summary counts groups and spellings', () => {
	assert.equal(spellingSummary([]), '0묶음 · 표기 0개');
	const rows = (n) => Array.from({ length: n }, (_, id) => ({ id, name: 'x', count: 0 }));
	assert.equal(
		spellingSummary([
			{ key: 'a', count: 0, rows: rows(3) },
			{ key: 'b', count: 0, rows: rows(2) }
		]),
		'2묶음 · 표기 5개'
	);
});

test('every kind has a label and an empty text', () => {
	assert.deepEqual(
		SPELLING_KINDS.map((s) => s.kind),
		['composer', 'player', 'conductor', 'orchestra', 'music']
	);
	for (const spec of SPELLING_KINDS) {
		assert.ok(spec.label && spec.empty.endsWith('없습니다'));
	}
});

const variantsResponse = {
	kind: 'composer',
	groups: [
		{
			key: 'jsbach',
			count: 45,
			rows: [
				{ id: 5, name: 'J. S. Bach', count: 40 },
				{ id: 2, name: 'J.S. Bach', count: 3 },
				{ id: 9, name: 'Bach, J.S.', count: 2 }
			]
		},
		{
			key: '바흐',
			count: 1,
			rows: [
				{ id: 7, name: '바흐', count: 1 },
				{ id: 8, name: '바 흐', count: 0 }
			]
		}
	]
};

test("a composer's other spellings: its group without it, in the response's order", () => {
	assert.deepEqual(
		composerVariants(variantsResponse, 2).map((row) => row.id),
		[5, 9]
	);
	assert.deepEqual(composerVariants(variantsResponse, 5), [
		{ id: 2, name: 'J.S. Bach', count: 3 },
		{ id: 9, name: 'Bach, J.S.', count: 2 }
	]);
	assert.deepEqual(composerVariants(variantsResponse, 8), [{ id: 7, name: '바흐', count: 1 }]);
});

test("the page's id is a string, the backend's a number", () => {
	assert.deepEqual(
		composerVariants(variantsResponse, '2').map((row) => row.id),
		[5, 9]
	);
	assert.deepEqual(composerVariants(variantsResponse, '02'), []);
});

test('no group, no answer or a malformed one gives no spellings', () => {
	assert.deepEqual(composerVariants(variantsResponse, 3), []);
	assert.deepEqual(composerVariants(variantsResponse, null), []);
	for (const response of [null, undefined, {}, { groups: null }, { groups: {} }]) {
		assert.deepEqual(composerVariants(response, 2), []);
	}
	assert.deepEqual(composerVariants({ groups: [null, { key: 'x' }, { rows: null }] }, 2), []);
});

test('a group with only that composer gives no spellings', () => {
	const alone = { groups: [{ key: 'a', count: 3, rows: [{ id: 2, name: 'A', count: 3 }] }] };
	assert.deepEqual(composerVariants(alone, 2), []);
});

test("선곡 기록's id filters name their catalog/duplicates kind", () => {
	assert.equal(spellingKindOf('composer_id'), 'composer');
	assert.equal(spellingKindOf('player_id'), 'player');
	assert.equal(spellingKindOf('conductor_id'), 'conductor');
	assert.equal(spellingKindOf('orchestra_id'), 'orchestra');
	assert.equal(spellingKindOf('music_id'), 'music');
	for (const param of ['user_id', '', undefined, null]) assert.equal(spellingKindOf(param), null);
});

test('spellings of a name kind are those of composerVariants', () => {
	for (const id of [2, 5, 8, '9', 3]) {
		assert.deepEqual(
			spellingVariants(variantsResponse, id),
			composerVariants(variantsResponse, id)
		);
	}
	assert.deepEqual(
		spellingVariants(variantsResponse, '5').map((row) => row.id),
		[2, 9]
	);
});

// A title with two catalog numbers is in two groups (Op. 10 and Op. 11).
const musicResponse = {
	kind: 'music',
	groups: [
		{
			key: 'op11',
			count: 9,
			rows: [
				{ id: 7, name: 'Suite op 11', count: 4 },
				{ id: 5, name: 'Suites Op. 10 & Op. 11', count: 3 },
				{ id: 4, name: 'Suite Op.11', count: 2 }
			]
		},
		{
			key: 'op10',
			count: 8,
			rows: [
				{ id: 5, name: 'Suites Op. 10 & Op. 11', count: 3 },
				{ id: 6, name: 'Suite op.10', count: 3 },
				{ id: 3, name: 'Suite Op 10', count: 2 }
			]
		},
		{
			key: 'op67',
			count: 2,
			rows: [
				{ id: 1, name: 'Sym. Op. 67', count: 2 },
				{ id: 2, name: 'Sym. op.67', count: 0 }
			]
		}
	]
};

test("a piece in two groups gives both groups' other rows, once each, most played first", () => {
	assert.deepEqual(
		spellingVariants(musicResponse, 5).map((row) => row.id),
		[7, 6, 3, 4]
	);
	// Ties on count go by name, then id.
	const tied = {
		groups: [
			{
				rows: [
					{ id: 1, name: 'b', count: 1 },
					{ id: 9, name: 'x', count: 1 }
				]
			},
			{
				rows: [
					{ id: 9, name: 'x', count: 1 },
					{ id: 4, name: 'a', count: 1 },
					{ id: 2, name: 'a', count: 1 }
				]
			}
		]
	};
	assert.deepEqual(
		spellingVariants(tied, 9).map((row) => row.id),
		[2, 4, 1]
	);
	// A row of the piece's own group only.
	assert.deepEqual(
		spellingVariants(musicResponse, 6).map((row) => row.id),
		[5, 3]
	);
	assert.deepEqual(spellingVariants(musicResponse, '1'), [{ id: 2, name: 'Sym. op.67', count: 0 }]);
});

test('no group, no answer or a malformed one gives no other rows', () => {
	for (const response of [null, undefined, {}, { groups: null }, { groups: {} }]) {
		assert.deepEqual(spellingVariants(response, 5), []);
	}
	assert.deepEqual(spellingVariants({ groups: [{ key: 'x' }, null, { rows: null }] }, 5), []);
	assert.deepEqual(spellingVariants(musicResponse, 99), []);
	assert.deepEqual(spellingVariants(musicResponse, null), []);
	assert.deepEqual(
		spellingVariants({ groups: [{ rows: [{ id: 5, name: 'A', count: 1 }] }] }, 5),
		[]
	);
});

const historyFilter = (over = {}) => ({
	period: '3',
	start: '',
	end: '',
	q: '교향곡',
	userId: '4',
	includeMentees: true,
	requested: 'true',
	targets: [
		{ param: 'player_id', id: '12' },
		{ param: 'music_id', id: '20' }
	],
	...over
});

test('a spelling link is the same list with only that filter swapped', () => {
	const filter = historyFilter();
	const href = variantHistoryHref(filter, filter.targets[1], 21);
	assert.equal(urlOf(href).pathname, '/stat/history');
	assert.equal(urlOf(href).searchParams.get('semester_id'), '3');
	assert.deepEqual(readHistoryQuery(urlOf(href).searchParams), {
		...filter,
		targets: [
			{ param: 'player_id', id: '12' },
			{ param: 'music_id', id: '21' }
		]
	});
	const player = readHistoryQuery(
		urlOf(variantHistoryHref(filter, { param: 'player_id', id: '12' }, '13')).searchParams
	);
	assert.deepEqual(player.targets, [
		{ param: 'player_id', id: '13' },
		{ param: 'music_id', id: '20' }
	]);
	// The filter given is not changed.
	assert.deepEqual(filter, historyFilter());
});

test('a spelling link keeps 직접 지정, 이번 학기 and 전체 기간', () => {
	const target = { param: 'composer_id', id: '2' };
	const custom = historyFilter({
		period: 'custom',
		start: '2026-03-02',
		end: '2026-04-30',
		q: '',
		userId: null,
		includeMentees: false,
		requested: '',
		targets: [target]
	});
	const read = readHistoryQuery(urlOf(variantHistoryHref(custom, target, 5)).searchParams);
	assert.deepEqual(read, { ...custom, targets: [{ param: 'composer_id', id: '5' }] });

	const current = { ...custom, period: 'current', start: '', end: '' };
	const href = variantHistoryHref(current, target, 5);
	assert.equal(href, '/stat/history?composer_id=5');
	assert.deepEqual(readHistoryQuery(urlOf(href).searchParams), {
		...current,
		targets: [{ param: 'composer_id', id: '5' }]
	});
	assert.equal(
		variantHistoryHref({ ...current, period: 'all' }, target, 5),
		'/stat/history?period=all&composer_id=5'
	);
});

test('the tab title names the 표기 정리 view and its kind, never the search word', () => {
	assert.equal(catalogPageTitle(null), '작곡가 정리');
	for (const { kind, label } of SPELLING_KINDS) {
		assert.equal(catalogPageTitle(kind), `${label} · 표기 정리`);
	}
	assert.equal(catalogPageTitle('player'), '연주자 · 표기 정리');
	assert.equal(catalogPageTitle('music'), '곡 · 표기 정리');
	assert.equal(catalogPageTitle('band'), '표기 정리');
	const titleOf = (href) => catalogPageTitle(readSpellingKind(urlOf(href).searchParams));
	for (const { kind, label } of SPELLING_KINDS) {
		assert.equal(titleOf(catalogViewHref('가상', kind)), `${label} · 표기 정리`);
	}
	assert.equal(titleOf(catalogViewHref('가상', null)), '작곡가 정리');
});

// catalog/duplicates/ 의 묶음(전체 기간 수)과 통계의 많이 튼 작곡가 응답(이 보기의 수).
const dupGroups = {
	kind: 'composer',
	groups: [
		{
			key: 'beethoven',
			count: 90,
			rows: [
				{ id: 1, name: 'Beethoven', count: 70 },
				{ id: 2, name: '베토벤', count: 20 }
			]
		},
		{
			key: 'bach',
			count: 50,
			rows: [
				{ id: 3, name: 'J.S. Bach', count: 30 },
				{ id: 4, name: 'J. S. Bach', count: 20 }
			]
		},
		{
			key: 'mozart',
			count: 9,
			rows: [
				{ id: 5, name: 'Mozart', count: 8 },
				{ id: 6, name: 'mozart', count: 1 }
			]
		}
	]
};
const envelopeOf = (items) => ({
	labels: items.map((item) => item.name),
	values: items.map((item) => item.count),
	items
});

test('a group with two names in the answer is split, with this view’s names and counts', () => {
	const composers = envelopeOf([
		{ id: 1, name: 'Beethoven', count: 40 },
		{ id: 9, name: 'Brahms', count: 30 },
		{ id: 2, name: '베토벤', count: 12 },
		{ id: 5, name: 'Mozart', count: 3 }
	]);
	assert.deepEqual(splitSpellings(dupGroups, composers), [
		{
			rows: [
				{ id: 1, name: 'Beethoven', count: 40 },
				{ id: 2, name: '베토벤', count: 12 }
			],
			count: 52
		}
	]);
});

test('a group with only one name in the answer does not split this view', () => {
	const composers = envelopeOf([
		{ id: 2, name: '베토벤', count: 12 },
		{ id: 3, name: 'J.S. Bach', count: 5 }
	]);
	assert.deepEqual(splitSpellings(dupGroups, composers), []);
	assert.deepEqual(splitSpellings({ groups: [] }, composers), []);
});

test('a missing or malformed answer splits nothing', () => {
	const composers = envelopeOf([
		{ id: 1, name: 'Beethoven', count: 40 },
		{ id: 2, name: '베토벤', count: 12 }
	]);
	for (const bad of [null, undefined, {}, { groups: null }, { groups: 'x' }, { message: 'x' }]) {
		assert.deepEqual(splitSpellings(bad, composers), []);
	}
	for (const bad of [null, undefined, {}, { items: null }, { items: 'x' }]) {
		assert.deepEqual(splitSpellings(dupGroups, bad), []);
	}
	assert.deepEqual(
		splitSpellings({ groups: [null, { key: 'x' }, { rows: [null, { name: 'a' }] }] }, composers),
		[]
	);
});

test('string and number ids match', () => {
	const composers = envelopeOf([
		{ id: '2', name: '베토벤', count: 12 },
		{ id: 1, name: 'Beethoven', count: 4 }
	]);
	const strings = {
		groups: [
			{
				key: 'b',
				count: 2,
				rows: [
					{ id: '1', name: 'Beethoven', count: 1 },
					{ id: 2, name: '베토벤', count: 1 }
				]
			}
		]
	};
	const split = splitSpellings(strings, composers);
	assert.equal(split.length, 1);
	assert.deepEqual(
		split[0].rows.map((row) => row.name),
		['베토벤', 'Beethoven']
	);
	assert.equal(split[0].count, 16);
});

test('groups come most combined plays first, rows in the answer’s order', () => {
	const composers = envelopeOf([
		{ id: 3, name: 'J.S. Bach', count: 30 },
		{ id: 1, name: 'Beethoven', count: 20 },
		{ id: 5, name: 'Mozart', count: 18 },
		{ id: 6, name: 'mozart', count: 17 },
		{ id: 2, name: '베토벤', count: 16 },
		{ id: 4, name: 'J. S. Bach', count: 2 }
	]);
	const split = splitSpellings(dupGroups, composers);
	assert.deepEqual(
		split.map((group) => [group.count, group.rows.map((row) => row.id)]),
		[
			[36, [1, 2]],
			[35, [5, 6]],
			[32, [3, 4]]
		]
	);
});

const groupOf = (...pairs) => ({
	rows: pairs.map(([name, count], i) => ({ id: i, name, count })),
	count: pairs.reduce((sum, [, count]) => sum + count, 0)
});

test('the note names each split group with this view’s counts', () => {
	assert.equal(splitSpellingNote([]), '');
	assert.equal(splitSpellingNote(undefined), '');
	assert.equal(
		splitSpellingNote([groupOf(['Beethoven', 40], ['베토벤', 12])]),
		'표기만 다른 이름은 따로 셉니다: ‘Beethoven’ 40회 + ‘베토벤’ 12회'
	);
	assert.equal(
		splitSpellingNote([
			groupOf(['Beethoven', 1200], ['베토벤', 12]),
			groupOf(['J.S. Bach', 5], ['J. S. Bach', 3], ['J S Bach', 1]),
			groupOf(['Mozart', 2], ['mozart', 1])
		]),
		'표기만 다른 이름은 따로 셉니다: ‘Beethoven’ 1,200회 + ‘베토벤’ 12회; ' +
			'‘J.S. Bach’ 5회 + ‘J. S. Bach’ 3회 + ‘J S Bach’ 1회; ‘Mozart’ 2회 + ‘mozart’ 1회'
	);
});

test('the note lists three groups, then how many more', () => {
	const groups = [5, 4, 3, 2, 1].map((n) => groupOf([`A${n}`, n], [`B${n}`, 1]));
	assert.equal(
		splitSpellingNote(groups),
		'표기만 다른 이름은 따로 셉니다: ‘A5’ 5회 + ‘B5’ 1회; ‘A4’ 4회 + ‘B4’ 1회; ‘A3’ 3회 + ‘B3’ 1회 외 2묶음'
	);
	assert.equal(
		splitSpellingNote(groups, 4),
		'표기만 다른 이름은 따로 셉니다: ‘A5’ 5회 + ‘B5’ 1회; ‘A4’ 4회 + ‘B4’ 1회; ‘A3’ 3회 + ‘B3’ 1회; ‘A2’ 2회 + ‘B2’ 1회 외 1묶음'
	);
});
