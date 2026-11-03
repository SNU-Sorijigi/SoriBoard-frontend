import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	ERAS,
	readCatalogQuery,
	catalogHref,
	composersSearch,
	unknownFirst,
	unknownCount,
	unknownSummary,
	hasOverride,
	eraCell,
	draftOf,
	birthYearError,
	composerPatch,
	patchErrorText,
	replaceComposer
} from '../../src/lib/composerCatalog.js';

const composer = (id, era, extra = {}) => ({
	id,
	name: `작곡가 ${id}`,
	num_time_music: 10 - id,
	birth_year: null,
	era_override: null,
	era,
	...extra
});

test('the search term is read from and written to the URL, empty left out', () => {
	assert.equal(readCatalogQuery(new URLSearchParams('q=%20바흐%20')), '바흐');
	assert.equal(readCatalogQuery(new URLSearchParams('')), '');
	assert.equal(catalogHref(''), '/stat/composers');
	assert.equal(catalogHref('  '), '/stat/composers');
	const href = catalogHref(' 바 흐&1 ');
	assert.equal(readCatalogQuery(new URL(href, 'http://x').searchParams), '바 흐&1');
	assert.equal(composersSearch(''), '');
	assert.equal(new URLSearchParams(composersSearch('a&b')).get('q'), 'a&b');
});

test('시대 미상 comes first; each group keeps the backend order', () => {
	const list = [composer(1, '낭만'), composer(2, '미상'), composer(3, '고전'), composer(4, '미상')];
	assert.deepEqual(
		unknownFirst(list).map((c) => c.id),
		[2, 4, 1, 3]
	);
	assert.equal(unknownCount(list), 2);
	assert.deepEqual(
		list.map((c) => c.id),
		[1, 2, 3, 4],
		'input untouched'
	);
});

// 18명, 많이 튼 순; 2·5·8·11·14·17번이 시대 미상(90+44+22+9+2+1 = 169곡, 전체 540곡).
const PLAYS = [120, 90, 75, 60, 44, 40, 31, 22, 18, 12, 9, 7, 5, 3, 2, 1, 1, 0];
const UNKNOWN_IDS = [2, 5, 8, 11, 14, 17];
const measured = () =>
	unknownFirst(
		PLAYS.map((plays, i) =>
			composer(i + 1, UNKNOWN_IDS.includes(i + 1) ? '미상' : '낭만', { num_time_music: plays })
		)
	);

test('the 시대 미상 summary gives their plays and share of every listed play', () => {
	const list = measured();
	assert.equal(unknownSummary(list, false), '시대 미상 6명 (선곡 169곡, 31.3%)');
	// 가장 많이 튼 미상 작곡가(90곡)를 낭만으로 저장하면 곧바로 줄어든다.
	const saved = replaceComposer(list, { ...list[0], birth_year: 1810, era: '낭만' });
	assert.equal(unknownSummary(saved, false), '시대 미상 5명 (선곡 79곡, 14.6%)');
});

test('the 시대 미상 summary leaves out the share while searching', () => {
	assert.equal(unknownSummary(measured(), true), '시대 미상 6명 (선곡 169곡)');
});

test('the 시대 미상 summary has no parenthesis when no composer is 미상', () => {
	const list = [composer(1, '낭만'), composer(2, '고전')];
	assert.equal(unknownSummary(list, false), '시대 미상 0명');
	assert.equal(unknownSummary(list, true), '시대 미상 0명');
	assert.equal(unknownSummary([], false), '시대 미상 0명');
});

test('the 시대 미상 summary says 0곡 and 0.0% when the 미상 composers were never played', () => {
	const list = [
		composer(1, '낭만', { num_time_music: 5 }),
		composer(2, '미상', { num_time_music: 0 }),
		composer(3, '미상', { num_time_music: 0 })
	];
	assert.equal(unknownSummary(list, false), '시대 미상 2명 (선곡 0곡, 0.0%)');
});

test('the 시대 미상 summary has no share when no listed composer was played', () => {
	const list = [
		composer(1, '낭만', { num_time_music: 0 }),
		composer(2, '미상', { num_time_music: 0 })
	];
	assert.equal(unknownSummary(list, false), '시대 미상 1명 (선곡 0곡)');
});

test('the 시대 미상 summary groups large counts', () => {
	const list = [
		composer(1, '미상', { num_time_music: 1234 }),
		composer(2, '낭만', { num_time_music: 766 })
	];
	assert.equal(unknownSummary(list, false), '시대 미상 1명 (선곡 1,234곡, 61.7%)');
	assert.equal(unknownSummary(list, true), '시대 미상 1명 (선곡 1,234곡)');
});

test('the era cell says when an override decides it, or is ignored', () => {
	assert.deepEqual(eraCell(composer(1, '낭만', { birth_year: 1810 })), { era: '낭만', note: '' });
	assert.deepEqual(eraCell(composer(1, '미상', { era_override: '미상', birth_year: 1900 })), {
		era: '미상',
		note: '보정'
	});
	assert.deepEqual(eraCell(composer(1, '낭만', { era_override: '19세기', birth_year: 1840 })), {
		era: '낭만',
		note: '저장된 ‘19세기’ 무시됨'
	});
	assert.equal(eraCell(composer(1, '')).era, '미상');
	assert.equal(hasOverride({ era_override: '' }), false);
	assert.equal(hasOverride({}), false);
	assert.deepEqual(ERAS, ['중세', '바로크', '고전', '낭만', '근현대', '미상']);
});

test('the draft starts from the stored values; an ignored override starts empty', () => {
	assert.deepEqual(draftOf(composer(1, '고전', { birth_year: 1756 })), {
		birthYear: '1756',
		era: ''
	});
	assert.deepEqual(draftOf(composer(1, '바로크', { era_override: '바로크' })), {
		birthYear: '',
		era: '바로크'
	});
	assert.deepEqual(draftOf(composer(1, '낭만', { birth_year: 1840, era_override: '19세기' })), {
		birthYear: '1840',
		era: ''
	});
});

test('a birth year is empty or a whole number from 1000 to this year', () => {
	for (const ok of ['', '  ', '1000', '1756', '2026', ' 1810 ']) {
		assert.equal(birthYearError(ok, 2026), '', ok);
	}
	for (const bad of ['999', '2027', '17.5', '-1700', 'abc', '1e3', '１７５６']) {
		assert.match(birthYearError(bad, 2026), /1000부터 2026까지/, bad);
	}
});

test('the PATCH body holds only the changed fields, empty as null', () => {
	const c = composer(1, '고전', { birth_year: 1756 });
	assert.equal(composerPatch(c, { birthYear: '1756', era: '' }), null);
	assert.equal(composerPatch(c, { birthYear: ' 1756 ', era: '' }), null);
	assert.deepEqual(composerPatch(c, { birthYear: '1770', era: '' }), { birth_year: 1770 });
	assert.deepEqual(composerPatch(c, { birthYear: '', era: '' }), { birth_year: null });
	assert.deepEqual(composerPatch(c, { birthYear: '1756', era: '낭만' }), {
		era_override: '낭만'
	});
	const forced = composer(2, '바로크', { era_override: '바로크' });
	assert.deepEqual(composerPatch(forced, { birthYear: '1600', era: '' }), {
		birth_year: 1600,
		era_override: null
	});
	// An ignored free-text override is left alone unless a 시대 is chosen.
	const free = composer(3, '낭만', { birth_year: 1840, era_override: '19세기' });
	assert.deepEqual(composerPatch(free, { birthYear: '1841', era: '' }), { birth_year: 1841 });
});

test('a backend 400 names the refused field', () => {
	assert.equal(
		patchErrorText({ birth_year: ['Ensure this value is less than or equal to 2026.'] }),
		'출생 연도 값을 저장하지 못했습니다.'
	);
	assert.equal(
		patchErrorText({ era_override: ['x'], birth_year: ['y'] }),
		'출생 연도·시대 값을 저장하지 못했습니다.'
	);
	for (const body of [null, undefined, 'x', { non_field_errors: ['x'] }]) {
		assert.equal(patchErrorText(body), '저장하지 못했습니다.');
	}
});

test('a saved composer replaces its row in place', () => {
	const list = [composer(1, '미상'), composer(2, '낭만')];
	const saved = { ...composer(1, '고전'), birth_year: 1756 };
	const next = replaceComposer(list, saved);
	assert.deepEqual(
		next.map((c) => [c.id, c.era]),
		[
			[1, '고전'],
			[2, '낭만']
		]
	);
	assert.equal(next[1], list[1]);
	assert.equal(list[0].era, '미상');
});
