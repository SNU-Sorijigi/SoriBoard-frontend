import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	readStatQuery,
	statQueryHref,
	knownUser,
	readTableView,
	writeTableView,
	tableViewHref,
	readFirstsByCount,
	writeFirstsByCount,
	firstsByCountHref
} from '../../src/lib/statQuery.js';
import { composerHref, composerStatHref } from '../../src/lib/composerStats.js';
import { statHref } from '../../src/lib/playHistory.js';

const read = (search) => readStatQuery(new URLSearchParams(search));
const href = (url, state) => statQueryHref(new URL(url, 'http://localhost'), state);
const ALL = { scope: 'all', userId: null, includeMentees: false };

test('no parameters read as the default 전체 view', () => {
	assert.deepEqual(read(''), ALL);
});

test('a linked 개인 view is read back', () => {
	assert.deepEqual(read('scope=individual&user_id=12'), {
		scope: 'individual',
		userId: '12',
		includeMentees: false
	});
	assert.deepEqual(read('scope=individual&user_id=12&include_mentees=true'), {
		scope: 'individual',
		userId: '12',
		includeMentees: true
	});
	assert.deepEqual(read('scope=individual'), {
		scope: 'individual',
		userId: null,
		includeMentees: false
	});
});

test('an invalid scope falls back to 전체 and drops the 지기 keys', () => {
	for (const search of [
		'scope=foo&user_id=12',
		'scope=all&user_id=12',
		'scope=Individual&user_id=12',
		'user_id=12&include_mentees=true'
	]) {
		assert.deepEqual(read(search), ALL, search);
	}
});

test('an invalid user_id is ignored', () => {
	for (const raw of ['abc', '0', '-3', '012', '1.5', '1e3', ' 12', '', '99999999999999999999']) {
		const got = read(`scope=individual&user_id=${encodeURIComponent(raw)}`);
		assert.equal(got.scope, 'individual', raw);
		assert.equal(got.userId, null, raw);
	}
});

test('include_mentees counts only as "true"', () => {
	for (const raw of ['1', 'yes', 'TRUE', 'false', '']) {
		assert.equal(read(`scope=individual&user_id=3&include_mentees=${raw}`).includeMentees, false);
	}
});

test('the default view leaves the URL bare', () => {
	assert.equal(href('/stat', ALL), '/stat');
	assert.equal(href('/stat?scope=individual&user_id=3&include_mentees=true', ALL), '/stat');
	// a 지기 kept while 전체 is shown stays out of the URL
	assert.equal(href('/stat', { scope: 'all', userId: '3', includeMentees: true }), '/stat');
});

test('a 개인 view writes only the keys it uses', () => {
	const ind = (userId, includeMentees) => ({ scope: 'individual', userId, includeMentees });
	assert.equal(href('/stat', ind(null, false)), '/stat?scope=individual');
	assert.equal(href('/stat', ind('12', false)), '/stat?scope=individual&user_id=12');
	assert.equal(href('/stat', ind(12, false)), '/stat?scope=individual&user_id=12');
	assert.equal(
		href('/stat', ind('12', true)),
		'/stat?scope=individual&user_id=12&include_mentees=true'
	);
	assert.equal(
		href('/stat?scope=individual&user_id=12&include_mentees=true', ind('12', false)),
		'/stat?scope=individual&user_id=12'
	);
});

test('other parameters and the hash are kept', () => {
	assert.equal(
		href('/stat?semester_id=4&user_id=9#top', {
			scope: 'individual',
			userId: '2',
			includeMentees: false
		}),
		'/stat?semester_id=4&scope=individual&user_id=2#top'
	);
	assert.equal(href('/stat?semester_id=4&scope=individual', ALL), '/stat?semester_id=4');
});

test('what is written reads back the same', () => {
	for (const state of [
		ALL,
		{ scope: 'individual', userId: null, includeMentees: false },
		{ scope: 'individual', userId: null, includeMentees: true },
		{ scope: 'individual', userId: '7', includeMentees: false },
		{ scope: 'individual', userId: '7', includeMentees: true }
	]) {
		const written = new URL(href('/stat', state), 'http://localhost');
		assert.deepEqual(readStatQuery(written.searchParams), state);
	}
});

test('a 지기 id that is in the 지기 list is kept', () => {
	const users = [{ id: 1 }, { id: 12 }];
	assert.equal(knownUser('12', users), '12');
	assert.equal(knownUser(12, users), 12);
});

test('a 지기 id that is not in the 지기 list falls back to no 지기', () => {
	assert.equal(knownUser('9999', [{ id: 1 }, { id: 12 }]), null);
	assert.equal(knownUser('12', []), null);
});

test('no 지기, or no 지기 list, is left as it is', () => {
	assert.equal(knownUser(null, [{ id: 1 }]), null);
	assert.equal(knownUser('12', null), '12');
	assert.equal(knownUser('12', { message: 'Error' }), '12');
});

const tableView = (search) => readTableView(new URLSearchParams(search));

test('모든 차트 표로 보기 is read only from view=table', () => {
	assert.equal(tableView('view=table'), true);
	assert.equal(tableView('semester_id=3&view=table'), true);
	assert.equal(tableView(''), false);
	assert.equal(tableView('view=chart'), false);
	assert.equal(tableView('view=TABLE'), false);
	assert.equal(tableView('view='), false);
});

test('모든 차트 표로 보기 writes view=table, removes it when off, and keeps the other keys', () => {
	const params = new URLSearchParams('semester_id=3&scope=individual&user_id=12&drill=composers:5');
	writeTableView(params, true);
	assert.equal(params.get('view'), 'table');
	assert.equal(params.get('semester_id'), '3');
	assert.equal(params.get('scope'), 'individual');
	assert.equal(params.get('drill'), 'composers:5');
	writeTableView(params, true);
	assert.deepEqual(params.getAll('view'), ['table']);
	writeTableView(params, false);
	assert.equal(params.has('view'), false);
	assert.equal(params.toString(), 'semester_id=3&scope=individual&user_id=12&drill=composers%3A5');
	writeTableView(params, false);
	assert.equal(params.has('view'), false);
});

const firstsByCount = (search) => readFirstsByCount(new URLSearchParams(search));
const NONE = { composers: false, works: false };

test('처음 튼 많이 튼 순 is read from by_count, either order', () => {
	assert.deepEqual(firstsByCount(''), NONE);
	assert.deepEqual(firstsByCount('by_count=works'), { composers: false, works: true });
	assert.deepEqual(firstsByCount('by_count=composers'), { composers: true, works: false });
	assert.deepEqual(firstsByCount('by_count=composers,works'), { composers: true, works: true });
	assert.deepEqual(firstsByCount('by_count=works,composers'), { composers: true, works: true });
	assert.deepEqual(firstsByCount('view=table&by_count=works'), { composers: false, works: true });
	assert.deepEqual(firstsByCount('semester_id=3&by_count=works&view=table'), {
		composers: false,
		works: true
	});
});

test('처음 튼 많이 튼 순 ignores unknown and repeated names', () => {
	assert.deepEqual(firstsByCount('by_count=foo'), NONE);
	assert.deepEqual(firstsByCount('by_count='), NONE);
	assert.deepEqual(firstsByCount('by_count=works,works,foo'), { composers: false, works: true });
	assert.deepEqual(firstsByCount('by_count=foo,works,works'), { composers: false, works: true });
	assert.deepEqual(firstsByCount('by_count=WORKS'), NONE);
	assert.deepEqual(firstsByCount('by_count=works%20'), NONE);
});

test('처음 튼 많이 튼 순 writes by_count as composers,works and removes it when both are off', () => {
	const params = new URLSearchParams('semester_id=3&view=table');
	writeFirstsByCount(params, NONE);
	assert.equal(params.toString(), 'semester_id=3&view=table');
	writeFirstsByCount(params, { composers: false, works: true });
	assert.equal(params.get('by_count'), 'works');
	writeFirstsByCount(params, { composers: true, works: false });
	assert.equal(params.get('by_count'), 'composers');
	writeFirstsByCount(params, { composers: true, works: true });
	assert.deepEqual(params.getAll('by_count'), ['composers,works']);
	assert.equal(params.get('semester_id'), '3');
	assert.equal(params.get('view'), 'table');
	writeFirstsByCount(params, NONE);
	assert.equal(params.has('by_count'), false);
	assert.equal(params.toString(), 'semester_id=3&view=table');
	const messy = new URLSearchParams('by_count=foo,works,works&semester_id=3');
	writeFirstsByCount(messy, firstsByCount(messy.toString()));
	assert.equal(messy.get('by_count'), 'works');
});

test('처음 튼 많이 튼 순 reads back what it writes', () => {
	for (const composers of [false, true]) {
		for (const works of [false, true]) {
			const params = new URLSearchParams('semester_id=3');
			writeFirstsByCount(params, { composers, works });
			assert.deepEqual(readFirstsByCount(params), { composers, works });
		}
	}
});

test('a link with 모든 차트 표로 보기 off is left exactly as it is', () => {
	for (const href of [
		'/stat/composer/5',
		'/stat/composer/5?semester_id=3&user_id=12&include_mentees=true',
		'/stat?period=all'
	]) {
		assert.equal(tableViewHref(href, false), href);
	}
});

test('a link with 모든 차트 표로 보기 on carries view=table and keeps its other keys', () => {
	assert.equal(tableViewHref('/stat/composer/5', true), '/stat/composer/5?view=table');
	assert.equal(tableViewHref('/stat', true), '/stat?view=table');
	assert.equal(
		tableViewHref('/stat/composer/5?semester_id=3&user_id=12', true),
		'/stat/composer/5?semester_id=3&user_id=12&view=table'
	);
	assert.equal(tableViewHref('/stat?view=table&period=all', true), '/stat?view=table&period=all');
	assert.equal(tableViewHref('/stat?view=chart', true), '/stat?view=table');
	assert.equal(tableViewHref('/stat?period=all#kpi', true), '/stat?period=all&view=table#kpi');
	const url = new URL(tableViewHref('/stat/composer/5?semester_id=3', true), 'http://localhost');
	assert.deepEqual(url.searchParams.getAll('view'), ['table']);
	assert.equal(readTableView(url.searchParams), true);
});

test('the 작곡가 page and 통계 links keep their 기간 and 지기 through the view', () => {
	const filter = { period: '7', userId: '12', includeMentees: true };
	const range = { period: 'custom', start: '2025-10-01', end: '2025-11-30' };
	for (const href of [
		composerHref(5, filter),
		composerHref(5, range),
		composerStatHref(filter),
		composerStatHref(),
		statHref({ period: 'current', userId: '12', includeMentees: false })
	]) {
		assert.equal(tableViewHref(href, false), href);
		const [path, search = ''] = href.split('?');
		const on = tableViewHref(href, true);
		assert.equal(on, `${path}?${search ? `${search}&` : ''}view=table`);
	}
	assert.equal(
		tableViewHref(composerHref(5, filter), true),
		'/stat/composer/5?semester_id=7&user_id=12&include_mentees=true&view=table'
	);
	assert.equal(
		tableViewHref(composerStatHref(filter), true),
		'/stat?semester_id=7&scope=individual&user_id=12&include_mentees=true&view=table'
	);
});

test('통계, 학기 결산 and 작곡가 links keep the 처음 튼 많이 튼 순 (by_count)', () => {
	const none = { composers: false, works: false };
	const works = { composers: false, works: true };
	const both = { composers: true, works: true };
	for (const href of [
		'/stat/report?semester_id=3',
		'/stat?semester_id=3&view=table',
		'/stat/composer/5?semester_id=3&user_id=12&include_mentees=true'
	]) {
		assert.equal(firstsByCountHref(href, none), href);
	}
	assert.equal(firstsByCountHref('/stat/composer/5', works), '/stat/composer/5?by_count=works');
	assert.equal(
		firstsByCountHref('/stat/report?semester_id=3', works),
		'/stat/report?semester_id=3&by_count=works'
	);
	const on = firstsByCountHref('/stat?semester_id=3', both);
	assert.equal(on, '/stat?semester_id=3&by_count=composers%2Cworks');
	assert.deepEqual(readFirstsByCount(new URL(on, 'http://localhost').searchParams), both);
	// 이미 있는 by_count 는 고쳐 쓴다(하나만 남는다).
	const replaced = new URL(
		firstsByCountHref('/stat/report?semester_id=3&by_count=composers', works),
		'http://localhost'
	);
	assert.deepEqual(replaced.searchParams.getAll('by_count'), ['works']);
	// 모든 차트 표로 보기와 어느 순서로 감싸도 같은 쿼리다.
	const href = composerHref(5, { period: '3', userId: '12', includeMentees: true });
	const params = (h) => [...new URL(h, 'http://localhost').searchParams].sort();
	const outer = firstsByCountHref(tableViewHref(href, true), works);
	const inner = tableViewHref(firstsByCountHref(href, works), true);
	assert.equal(
		outer,
		'/stat/composer/5?semester_id=3&user_id=12&include_mentees=true&view=table&by_count=works'
	);
	assert.deepEqual(params(outer), params(inner));
	assert.deepEqual(params(outer), [
		['by_count', 'works'],
		['include_mentees', 'true'],
		['semester_id', '3'],
		['user_id', '12'],
		['view', 'table']
	]);
});
