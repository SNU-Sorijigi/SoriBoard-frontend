import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	SPELLING_KINDS,
	DEFAULT_KIND,
	readSpellingKind,
	catalogViewHref,
	duplicatesSearch,
	rowLinks,
	groupHeading,
	spellingSummary,
	composerVariants
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
