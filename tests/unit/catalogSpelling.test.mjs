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
	spellingCsv,
	spellingFileParts,
	filterSpellingGroups,
	composerVariants,
	spellingKindOf,
	spellingVariants,
	variantHistoryHref,
	splitSpellings,
	splitSpellingNote,
	MUSIC_SPLIT_LEAD,
	firstSpellingSplits,
	firstSpellingNote,
	FIRST_SPELLING_LEAD,
	FIRST_MUSIC_LEAD,
	normalizeName,
	searchVariants,
	searchCatalogName
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

test('the 표기 정리 CSV has one row per spelling, numbered by its group, values as stored', () => {
	const groups = [
		{
			key: 'jsbach',
			count: 1240,
			rows: [
				{ id: 12, name: 'J.S.  Bach', count: 1234 },
				{ id: 3, name: 'J. S. Bach', count: 6 }
			]
		},
		{ key: 'gfake', count: 0, rows: [{ id: 40, name: 'G. Fake', count: 0 }] }
	];
	assert.deepEqual(spellingCsv('composer', groups), {
		headers: ['묶음', '표기', '선곡 수', 'id'],
		rows: [
			[1, 'J.S.  Bach', 1234, 12],
			[1, 'J. S. Bach', 6, 3],
			[2, 'G. Fake', 0, 40]
		]
	});
	assert.deepEqual(spellingCsv('conductor', groups).headers, ['묶음', '표기', '선곡 수', 'id']);
	assert.deepEqual(spellingCsv('orchestra', []), {
		headers: ['묶음', '표기', '선곡 수', 'id'],
		rows: []
	});
});

test('the 표기 정리 CSV adds the instrument of a player and the composer of a piece', () => {
	const players = [
		{
			key: 'player',
			count: 4,
			rows: [
				{ id: 1, name: 'Pla Yer', count: 3, instrument: 'piano' },
				{ id: 2, name: 'Pla.Yer', count: 1 }
			]
		}
	];
	assert.deepEqual(spellingCsv('player', players), {
		headers: ['묶음', '표기', '악기', '선곡 수', 'id'],
		rows: [
			[1, 'Pla Yer', 'piano', 3, 1],
			[1, 'Pla.Yer', '', 1, 2]
		]
	});
	const pieces = [
		{
			key: 'op9',
			count: 4,
			rows: [
				{ id: 7, name: 'Fake Suite Op. 9', count: 3, composer_id: 1, composer_name: 'G. Fake' },
				{ id: 8, name: 'Fake Suite op.9', count: 1, composer_id: null, composer_name: null }
			]
		}
	];
	assert.deepEqual(spellingCsv('music', pieces), {
		headers: ['묶음', '곡', '작곡가', '선곡 수', 'id'],
		rows: [
			[1, 'Fake Suite Op. 9', 'G. Fake', 3, 7],
			[1, 'Fake Suite op.9', '', 1, 8]
		]
	});
});

test('the 표기 정리 CSV file is named by its kind and search term', () => {
	assert.deepEqual(spellingFileParts('music', ' bach '), ['곡', 'bach']);
	assert.deepEqual(spellingFileParts('composer', ''), ['작곡가']);
	assert.deepEqual(spellingFileParts('player', '   '), ['연주자']);
	assert.deepEqual(spellingFileParts('nope', 'bach'), []);
});

const bach = {
	key: 'jsbach',
	count: 4,
	rows: [
		{ id: 1, name: 'J.S. Bach', count: 3 },
		{ id: 2, name: 'J. S. Bach', count: 1 }
	]
};
const mozart = {
	key: 'wamozart',
	count: 2,
	rows: [
		{ id: 5, name: 'W.A. Mozart', count: 1 },
		{ id: 6, name: 'W. A. Mozart', count: 1 }
	]
};

test('the 표기 정리 search keeps whole groups in which some spelling has the word', () => {
	assert.deepEqual(filterSpellingGroups([bach, mozart], 'bach'), [bach]);
	assert.deepEqual(filterSpellingGroups([bach, mozart], ' BACH '), [bach]);
	// a word in one spelling only still shows the group with all its spellings, in order
	const [group] = filterSpellingGroups([mozart, bach], 'j.s.');
	assert.equal(group, bach);
	assert.deepEqual(
		group.rows.map((row) => row.name),
		['J.S. Bach', 'J. S. Bach']
	);
	assert.deepEqual(filterSpellingGroups([bach, mozart], 'a'), [bach, mozart]);
	assert.deepEqual(filterSpellingGroups([bach, mozart], '바흐'), []);
});

test('the 표기 정리 search matches a piece by its composer too', () => {
	const fifth = {
		key: 'op67',
		count: 4,
		rows: [
			{ id: 10, name: '교향곡 5번 Op. 67', count: 3, composer_id: 7, composer_name: '베토벤' },
			{ id: 11, name: '교향곡 제5번 op.67', count: 1, composer_id: 7, composer_name: '베토벤' }
		]
	};
	const orphan = {
		key: 'k525',
		count: 2,
		rows: [
			{ id: 12, name: '세레나데 K. 525', count: 1, composer_id: null, composer_name: null },
			{ id: 13, name: '세레나데 KV 525', count: 1 }
		]
	};
	assert.deepEqual(filterSpellingGroups([fifth, orphan], '베토벤'), [fifth]);
	assert.deepEqual(filterSpellingGroups([fifth, orphan], 'OP.67'), [fifth]);
	// a row without a composer (null or missing) does not throw
	assert.deepEqual(filterSpellingGroups([fifth, orphan], 'kv'), [orphan]);
});

test('the 표기 정리 search ignores spaces, periods, dashes and case, as the groups do', () => {
	const rimsky = {
		key: '림스키코르사코프',
		count: 15,
		rows: [
			{ id: 20, name: '림스키-코르사코프', count: 12 },
			{ id: 21, name: '림스키 코르사코프', count: 3 }
		]
	};
	const names = [rimsky, bach, mozart];
	for (const q of ['림스키코르사코프', '림스키 코르사코프', '림스키-코르사코프', '키코르']) {
		assert.deepEqual(filterSpellingGroups(names, q), [rimsky], q);
	}
	for (const q of ['JS Bach', 'jsbach', 'J.S.Bach', 'j s  bach']) {
		assert.deepEqual(filterSpellingGroups(names, q), [bach], q);
	}
	const fifth = {
		key: 'op67',
		count: 4,
		rows: [
			{ id: 10, name: '교향곡 5번 Op. 67', count: 3, composer_id: 7, composer_name: '베토벤' },
			{ id: 11, name: '교향곡 제5번 op.67', count: 1, composer_id: 7, composer_name: '베토벤' }
		]
	};
	const suite = {
		key: 'bwv1007',
		count: 2,
		rows: [
			{ id: 14, name: '무반주 첼로 모음곡 1번 BWV 1007', count: 1, composer_name: '바흐' },
			{ id: 15, name: '무반주 첼로 모음곡 제1번 BWV1007', count: 1, composer_name: '바흐' }
		]
	};
	assert.deepEqual(filterSpellingGroups([fifth, suite], 'op 67'), [fifth]);
	assert.deepEqual(filterSpellingGroups([fifth, suite], 'bwv1007'), [suite]);
	assert.deepEqual(filterSpellingGroups([fifth, suite], '베토벤'), [fifth]);
	// a composer's name is matched the same way
	assert.deepEqual(filterSpellingGroups([fifth, suite], '베 토 벤'), [fifth]);
	// a search of only periods, dashes or spaces keeps the typed match: not every group
	assert.deepEqual(filterSpellingGroups(names, '.'), [bach, mozart]);
	assert.deepEqual(filterSpellingGroups(names, '-'), [rimsky]);
	assert.deepEqual(filterSpellingGroups(names, ' . '), [bach, mozart]);
	assert.deepEqual(filterSpellingGroups(names, '-.-'), []);
	assert.deepEqual(filterSpellingGroups(names, '바흐'), []);
	assert.deepEqual(filterSpellingGroups(names, 'jsmozart'), []);
});

test('a blank 표기 정리 search keeps every group', () => {
	const groups = [bach, mozart];
	assert.equal(filterSpellingGroups(groups, ''), groups);
	assert.equal(filterSpellingGroups(groups, '  '), groups);
	assert.equal(filterSpellingGroups(groups, undefined), groups);
	assert.deepEqual(filterSpellingGroups(null, 'bach'), []);
	assert.deepEqual(filterSpellingGroups(undefined, ''), []);
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

test('a player group splits 많이 튼 독주자 with its labels and counts, not the catalog names', () => {
	const players = {
		kind: 'player',
		groups: [
			{
				key: '가상독주자001',
				count: 29,
				rows: [
					{ id: 1, name: '가상 독주자 001', count: 24, instrument: '피아노' },
					{ id: 106, name: '가상독주자 001', count: 5, instrument: '피아노' }
				]
			}
		]
	};
	const soloists = envelopeOf([
		{ id: 1, name: '가상 독주자 001 (피아노)', count: 14 },
		{ id: 7, name: '가상 독주자 007 (첼로)', count: 9 },
		{ id: 106, name: '가상독주자 001 (피아노)', count: 5 }
	]);
	const split = splitSpellings(players, soloists);
	assert.deepEqual(split, [
		{
			rows: [
				{ id: 1, name: '가상 독주자 001 (피아노)', count: 14 },
				{ id: 106, name: '가상독주자 001 (피아노)', count: 5 }
			],
			count: 19
		}
	]);
	assert.equal(
		splitSpellingNote(split),
		'표기만 다른 이름은 따로 셉니다: ‘가상 독주자 001 (피아노)’ 14회 + ‘가상독주자 001 (피아노)’ 5회'
	);
});

test('a conductor group with string ids matches a ranking with number ids', () => {
	const conductors = {
		kind: 'conductor',
		groups: [
			{
				key: '가상지휘자002',
				count: 25,
				rows: [
					{ id: '2', name: '가상 지휘자 002', count: 22 },
					{ id: '122', name: '가상 지휘자-002', count: 3 }
				]
			}
		]
	};
	const ranking = envelopeOf([
		{ id: 122, name: '가상 지휘자-002', count: 3 },
		{ id: 2, name: '가상 지휘자 002', count: 6 }
	]);
	assert.equal(
		splitSpellingNote(splitSpellings(conductors, ranking)),
		'표기만 다른 이름은 따로 셉니다: ‘가상 지휘자-002’ 3회 + ‘가상 지휘자 002’ 6회'
	);
});

// 곡(kind=music): 묶음은 작곡가와 작품 번호가 같은 곡(행의 name 은 제목), 많이 튼 곡의 응답은 '작곡가 - 곡'.
const musicRow = (id, title, count, composer_id, composer_name) => ({
	id,
	name: title,
	count,
	composer_id,
	composer_name
});

test('a music group splits 많이 튼 곡 with its labels and counts, not the catalog titles', () => {
	const music = {
		kind: 'music',
		groups: [
			{
				key: 'op21',
				count: 30,
				rows: [
					musicRow(301, 'Symphony No. 3, Op. 21', 20, 501, 'Gasang Kim'),
					musicRow(302, '교향곡 3번 op.21', 10, 501, 'Gasang Kim')
				]
			},
			{
				key: 'bwv2002',
				count: 12,
				rows: [
					musicRow(303, 'Cello Suite No. 2, BWV 2002', 9, 502, 'Nara Park'),
					musicRow(304, '무반주 첼로 모음곡 2번 BWV2002', 3, 502, 'Nara Park')
				]
			}
		]
	};
	const works = envelopeOf([
		{ id: 301, name: 'Gasang Kim - Symphony No. 3, Op. 21', count: 9, composer_id: 501 },
		{ id: 303, name: 'Nara Park - Cello Suite No. 2, BWV 2002', count: 7, composer_id: 502 },
		{ id: 302, name: 'Gasang Kim - 교향곡 3번 op.21', count: 4, composer_id: 501 }
	]);
	const split = splitSpellings(music, works);
	assert.deepEqual(split, [
		{
			rows: [
				{ id: 301, name: 'Gasang Kim - Symphony No. 3, Op. 21', count: 9 },
				{ id: 302, name: 'Gasang Kim - 교향곡 3번 op.21', count: 4 }
			],
			count: 13
		}
	]);
	assert.equal(
		splitSpellingNote(split, 2, MUSIC_SPLIT_LEAD),
		'작품 번호가 같은 곡은 따로 셉니다: ‘Gasang Kim - Symphony No. 3, Op. 21’ 9회 + ‘Gasang Kim - 교향곡 3번 op.21’ 4회'
	);
});

test('a work with two catalog numbers joins only the first group it splits', () => {
	const both = musicRow(310, 'Sonata Op. 5 (K. 550)', 6, 503, 'Dana Lee');
	const music = {
		kind: 'music',
		groups: [
			{ key: 'op5', count: 10, rows: [both, musicRow(311, '소나타 op.5', 4, 503, 'Dana Lee')] },
			{ key: 'k550', count: 8, rows: [both, musicRow(312, 'Serenade KV 550', 2, 503, 'Dana Lee')] }
		]
	};
	const all = envelopeOf([
		{ id: 310, name: 'Dana Lee - Sonata Op. 5 (K. 550)', count: 6 },
		{ id: 311, name: 'Dana Lee - 소나타 op.5', count: 4 },
		{ id: 312, name: 'Dana Lee - Serenade KV 550', count: 2 }
	]);
	assert.deepEqual(
		splitSpellings(music, all).map((group) => group.rows.map((row) => row.id)),
		[[310, 311]]
	);
	// op.5 의 다른 곡이 이 보기에 없으면 첫 묶음은 갈리지 않으므로, 그 곡은 K. 550 묶음에 든다.
	const without = envelopeOf(all.items.filter((item) => item.id !== 311));
	assert.deepEqual(
		splitSpellings(music, without).map((group) => group.rows.map((row) => row.id)),
		[[310, 312]]
	);
});

test('the 곡 note leads with 작품 번호가 같은 곡은, lists two groups, then how many more', () => {
	const groups = [5, 4, 3, 2].map((n) => groupOf([`A${n}`, n], [`B${n}`, 1]));
	assert.equal(MUSIC_SPLIT_LEAD, '작품 번호가 같은 곡은');
	assert.equal(
		splitSpellingNote(groups, 2, MUSIC_SPLIT_LEAD),
		'작품 번호가 같은 곡은 따로 셉니다: ‘A5’ 5회 + ‘B5’ 1회; ‘A4’ 4회 + ‘B4’ 1회 외 2묶음'
	);
	assert.equal(splitSpellingNote([], 2, MUSIC_SPLIT_LEAD), '');
});

// 처음 튼 작곡가·곡(stats/firsts)의 표기 줄
const firstsOf = (...items) => ({
	items: items.map(([id, name, count, first_played]) => ({ id, name, count, first_played }))
});
const composerGroups = (...groups) => ({
	kind: 'composer',
	groups: groups.map((rows) => ({
		key: rows[0][1],
		count: rows.reduce((sum, [, , count]) => sum + count, 0),
		rows: rows.map(([id, name, count]) => ({ id, name, count }))
	}))
});

test('a first whose other spelling is not in the list may not be new', () => {
	const duplicates = composerGroups([
		[40, '가상 작곡가 40', 5],
		[41, '가상작곡가 40', 3]
	]);
	const firsts = firstsOf(
		[7, '가상 작곡가 7', 2, '2026-09-01'],
		[41, '가상작곡가 40', 3, '2026-10-06']
	);
	const rows = firstSpellingSplits(duplicates, firsts);
	assert.deepEqual(rows, [
		{ name: '가상작곡가 40', variant: { name: '가상 작곡가 40', count: 5 }, more: 0 }
	]);
	assert.equal(
		firstSpellingNote(rows),
		'표기만 다른 이름이 있어 처음이 아닐 수 있습니다: ‘가상작곡가 40’(‘가상 작곡가 40’ 5회)'
	);
});

test('a spelling first played later in the list does not count against the earlier one', () => {
	const duplicates = composerGroups([
		[32, '가상 작곡가 32', 6],
		[37, '가상작곡가 32', 1]
	]);
	const firsts = firstsOf(
		[32, '가상 작곡가 32', 6, '2026-09-02'],
		[37, '가상작곡가 32', 1, '2026-09-29']
	);
	assert.deepEqual(firstSpellingSplits(duplicates, firsts), [
		{ name: '가상작곡가 32', variant: { name: '가상 작곡가 32', count: 6 }, more: 0 }
	]);
	// 목록의 순서가 바뀌어도(많이 튼 순) 날짜로 가린다.
	const reversed = { items: [...firsts.items].reverse() };
	assert.deepEqual(
		firstSpellingSplits(duplicates, reversed).map((row) => row.name),
		['가상작곡가 32']
	);
});

test('spellings first played the same day count both ways', () => {
	const duplicates = composerGroups([
		[1, 'A. Kim', 2],
		[2, 'A Kim', 1]
	]);
	const firsts = firstsOf([2, 'A Kim', 1, '2026-09-02'], [1, 'A. Kim', 2, '2026-09-02']);
	assert.deepEqual(firstSpellingSplits(duplicates, firsts), [
		{ name: 'A Kim', variant: { name: 'A. Kim', count: 2 }, more: 0 },
		{ name: 'A. Kim', variant: { name: 'A Kim', count: 1 }, more: 0 }
	]);
});

test('a spelling never played does not make a first less new', () => {
	const duplicates = composerGroups([
		[34, '가상 작곡가 34', 5],
		[38, '가상작곡가 34', 0]
	]);
	const firsts = firstsOf([34, '가상 작곡가 34', 5, '2026-09-04']);
	assert.deepEqual(firstSpellingSplits(duplicates, firsts), []);
	assert.equal(firstSpellingNote(firstSpellingSplits(duplicates, firsts)), '');
});

test('the most played counted spelling is named, the others counted in more', () => {
	const duplicates = composerGroups([
		[1, 'J. S. Kim', 1],
		[2, 'J.S. Kim', 9],
		[3, 'JS Kim', 4],
		[4, 'J S Kim', 0]
	]);
	const firsts = firstsOf([1, 'J. S. Kim', 1, '2026-09-10'], [3, 'JS Kim', 4, '2026-09-20']);
	assert.deepEqual(firstSpellingSplits(duplicates, firsts), [
		// 3 은 이 목록에서 1 보다 늦게 처음 튼 것이라 1 에는 세지 않는다.
		{ name: 'J. S. Kim', variant: { name: 'J.S. Kim', count: 9 }, more: 0 },
		{ name: 'JS Kim', variant: { name: 'J.S. Kim', count: 9 }, more: 1 }
	]);
});

test('a work in two groups gives one variant, the most played, written 작곡가 - 곡', () => {
	const both = musicRow(310, 'Sonata Op. 5 (K. 550)', 1, 503, 'Dana Lee');
	const music = {
		kind: 'music',
		groups: [
			{ key: 'op5', count: 5, rows: [musicRow(311, '소나타 op.5', 4, 503, 'Dana Lee'), both] },
			{ key: 'k550', count: 7, rows: [musicRow(312, 'Serenade KV 550', 6, 503, 'Dana Lee'), both] }
		]
	};
	const firsts = firstsOf([310, 'Dana Lee - Sonata Op. 5 (K. 550)', 1, '2026-10-01']);
	const rows = firstSpellingSplits(music, firsts);
	assert.deepEqual(rows, [
		{
			name: 'Dana Lee - Sonata Op. 5 (K. 550)',
			variant: { name: 'Dana Lee - Serenade KV 550', count: 6 },
			more: 1
		}
	]);
	assert.equal(FIRST_MUSIC_LEAD, '작품 번호가 같은 곡이 있어 처음이 아닐 수 있습니다:');
	assert.equal(
		firstSpellingNote(rows, 2, FIRST_MUSIC_LEAD, '곡'),
		'작품 번호가 같은 곡이 있어 처음이 아닐 수 있습니다: ‘Dana Lee - Sonata Op. 5 (K. 550)’(‘Dana Lee - Serenade KV 550’ 6회)'
	);
});

test('a work without a composer is written as its title, as stats/firsts writes it', () => {
	const music = {
		kind: 'music',
		groups: [
			{
				key: 'bwv1',
				count: 3,
				rows: [
					musicRow(1, 'Prelude BWV 1', 2, null, null),
					musicRow(2, 'Prelude BWV.1', 1, null, null)
				]
			}
		]
	};
	const firsts = firstsOf([2, 'Prelude BWV.1', 1, '2026-10-01']);
	assert.deepEqual(firstSpellingSplits(music, firsts)[0].variant, {
		name: 'Prelude BWV 1',
		count: 2
	});
});

test('the line names rows in the list’s order up to the cap, then how many more', () => {
	const rows = ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({
		name,
		variant: { name: `${name}′`, count: 1000 + i },
		more: 0
	}));
	assert.equal(FIRST_SPELLING_LEAD, '표기만 다른 이름이 있어 처음이 아닐 수 있습니다:');
	assert.equal(
		firstSpellingNote(rows),
		'표기만 다른 이름이 있어 처음이 아닐 수 있습니다: ‘A’(‘A′’ 1,000회), ‘B’(‘B′’ 1,001회), ‘C’(‘C′’ 1,002회) 외 2명'
	);
	assert.equal(
		firstSpellingNote(rows.slice(0, 3), 2, FIRST_MUSIC_LEAD, '곡'),
		'작품 번호가 같은 곡이 있어 처음이 아닐 수 있습니다: ‘A’(‘A′’ 1,000회), ‘B’(‘B′’ 1,001회) 외 1곡'
	);
	assert.equal(firstSpellingNote(rows.slice(0, 3)).endsWith('1,002회)'), true);
});

test('string and number ids match between the list and the groups', () => {
	const duplicates = composerGroups([
		[40, '가상 작곡가 40', 5],
		[41, '가상작곡가 40', 3]
	]);
	const firsts = {
		items: [{ id: '41', name: '가상작곡가 40', count: 3, first_played: '2026-10-06' }]
	};
	assert.equal(firstSpellingSplits(duplicates, firsts).length, 1);
});

test('no answer, a malformed one or an empty one gives no rows and no line', () => {
	const duplicates = composerGroups([
		[40, '가상 작곡가 40', 5],
		[41, '가상작곡가 40', 3]
	]);
	const firsts = firstsOf([41, '가상작곡가 40', 3, '2026-10-06']);
	for (const [dup, list] of [
		[null, firsts],
		[undefined, firsts],
		[{}, firsts],
		[{ groups: 'x' }, firsts],
		[{ groups: [] }, firsts],
		[{ groups: [null, { rows: null }] }, firsts],
		[duplicates, null],
		[duplicates, {}],
		[duplicates, { items: 'x' }],
		[duplicates, { items: [] }],
		[duplicates, { items: [null, { name: 'no id' }] }]
	]) {
		assert.deepEqual(firstSpellingSplits(dup, list), []);
	}
	assert.equal(firstSpellingNote([]), '');
	assert.equal(firstSpellingNote(null), '');
	assert.equal(firstSpellingNote(undefined), '');
});

test('names are normalized as the backend compares them', () => {
	assert.equal(normalizeName('J. S. Bach'), 'jsbach');
	assert.equal(normalizeName('Wiener\u2013Philharmoniker'), 'wienerphilharmoniker');
	assert.equal(normalizeName('Wiener-Philharmoniker'), 'wienerphilharmoniker');
	assert.equal(normalizeName('\uFF21\uFF22\uFF23'), 'abc');
	assert.equal(normalizeName('가상\u3000작곡가'), '가상작곡가');
	assert.equal(normalizeName(''), '');
	assert.equal(normalizeName('  '), '');
	assert.equal(normalizeName(' . - '), '');
	assert.equal(normalizeName(null), '');
	assert.equal(normalizeName(undefined), '');
});

const searchAnswer = {
	kind: 'composer',
	groups: [
		{
			key: 'jsbach',
			count: 16,
			rows: [
				{ id: 2, name: 'J. S. Bach', count: 12 },
				{ id: 1, name: 'J.S. Bach', count: 4 },
				{ id: 3, name: 'Bach J S', count: 0 }
			]
		}
	]
};
const names = (rows) => rows.map((row) => row.name);

test('a search misses the spellings that do not contain it, played ones only', () => {
	assert.deepEqual(names(searchVariants(searchAnswer, 'J.S. Bach')), ['J. S. Bach']);
	assert.deepEqual(names(searchVariants(searchAnswer, '  j.s. bach ')), ['J. S. Bach']);
	assert.deepEqual(names(searchVariants(searchAnswer, 'JS Bach')), ['J. S. Bach', 'J.S. Bach']);
	assert.deepEqual(names(searchVariants(searchAnswer, 'J. S. Bach')), ['J.S. Bach']);
	// 'J S' contains neither 'J. S.' nor 'J.S.' letter for letter
	assert.deepEqual(names(searchVariants(searchAnswer, 'J S')), ['J. S. Bach', 'J.S. Bach']);
});

test('a search every spelling contains, or no group key contains, misses nothing', () => {
	assert.deepEqual(searchVariants(searchAnswer, 'bach'), []);
	assert.deepEqual(searchVariants(searchAnswer, 'Bach'), []);
	assert.deepEqual(searchVariants(searchAnswer, 'Händel'), []);
	assert.deepEqual(searchVariants(searchAnswer, 'Bach JS'), []);
});

test('no search, no answer or a malformed one misses nothing', () => {
	for (const q of ['', '   ', ' . ', null, undefined]) {
		assert.deepEqual(searchVariants(searchAnswer, q), []);
		assert.equal(searchCatalogName(searchAnswer, q), '');
	}
	for (const answer of [
		null,
		undefined,
		{},
		{ groups: 'x' },
		{ groups: [] },
		{ groups: [null, { rows: null }, { key: 3, rows: [{ id: 1, name: 'x', count: 1 }] }] },
		{ groups: [{ key: 'jsbach', rows: [null, { id: 9, count: 2 }] }] }
	]) {
		assert.deepEqual(searchVariants(answer, 'JS Bach'), [], JSON.stringify(answer));
		assert.equal(searchCatalogName(answer, 'JS Bach'), '');
	}
});

test('two matching groups give the rows of both, most played first', () => {
	const answer = {
		groups: [
			searchAnswer.groups[0],
			{
				key: 'jsbachgesellschaft',
				count: 9,
				rows: [
					{ id: 5, name: 'J.S.Bach Gesellschaft', count: 6 },
					{ id: 6, name: 'J. S. Bach-Gesellschaft', count: 3 }
				]
			},
			{ key: 'cpebach', count: 2, rows: [{ id: 7, name: 'C.P.E. Bach', count: 2 }] }
		]
	};
	assert.deepEqual(names(searchVariants(answer, 'JS Bach')), [
		'J. S. Bach',
		'J.S.Bach Gesellschaft',
		'J.S. Bach',
		'J. S. Bach-Gesellschaft'
	]);
	assert.deepEqual(names(searchVariants(answer, 'J.S. Bach')), [
		'J. S. Bach',
		'J.S.Bach Gesellschaft',
		'J. S. Bach-Gesellschaft'
	]);
});

test('rows of the same count come by name, and the list is not capped', () => {
	const rows = [
		'Z Y Wolke',
		'Z.Y. Wolke',
		'Z. Y. Wolke',
		'Z-Y Wolke',
		'Z.Y Wolke',
		'Z.Y.Wolke',
		'ZY Wolke'
	];
	const answer = {
		groups: [{ key: 'zywolke', rows: rows.map((name, i) => ({ id: i + 1, name, count: 2 })) }]
	};
	assert.deepEqual(names(searchVariants(answer, 'ZY Wolke')), [
		'Z Y Wolke',
		'Z-Y Wolke',
		'Z. Y. Wolke',
		'Z.Y Wolke',
		'Z.Y. Wolke',
		'Z.Y.Wolke'
	]);
});

test('표기 정리 is searched for the most played spelling of the most played missed row’s group', () => {
	assert.equal(searchCatalogName(searchAnswer, 'J.S. Bach'), 'J. S. Bach');
	assert.equal(searchCatalogName(searchAnswer, 'JS Bach'), 'J. S. Bach');
	assert.equal(searchCatalogName(searchAnswer, 'J. S. Bach'), 'J. S. Bach');
	assert.equal(searchCatalogName(searchAnswer, 'bach'), '');
	const answer = {
		groups: [
			{
				key: 'jsbach',
				rows: [
					{ id: 2, name: 'J. S. Bach', count: 12 },
					{ id: 1, name: 'J.S. Bach', count: 4 }
				]
			},
			{
				key: 'jsbachgesellschaft',
				rows: [
					{ id: 5, name: 'J.S.Bach Gesellschaft', count: 20 },
					{ id: 6, name: 'J. S. Bach Gesellschaft', count: 6 }
				]
			}
		]
	};
	// 'J. S. Bach' misses 'J.S. Bach' (4) and 'J.S.Bach Gesellschaft' (20): the latter's group leads.
	assert.equal(searchCatalogName(answer, 'J. S. Bach'), 'J.S.Bach Gesellschaft');
	// and the 표기 정리 link opens that kind searched for it
	assert.equal(
		catalogViewHref(searchCatalogName(answer, 'J. S. Bach'), 'player'),
		'/stat/composers?q=J.S.Bach+Gesellschaft&view=spelling&kind=player'
	);
});
