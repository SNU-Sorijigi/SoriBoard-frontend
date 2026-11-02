import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	requestGroups,
	genreDistribution,
	diversityTiles,
	DERIVED_CARDS,
	retryKeys,
	previousRetryRequests,
	loadStatusText,
	withPreviousFailure,
	withFailedLines
} from '../../src/lib/statCards.js';

test('the genre card is drawn from the diversity answer', () => {
	assert.equal(DERIVED_CARDS.genres, 'diversity');
});

test('a full load asks for diversity once, for both its cards', () => {
	assert.deepEqual(requestGroups(['summary', 'eras', 'diversity', 'genres']), [
		['summary', ['summary']],
		['eras', ['eras']],
		['diversity', ['diversity', 'genres']]
	]);
});

test('a derived card listed first still groups under its request', () => {
	assert.deepEqual(requestGroups(['genres', 'summary', 'diversity']), [
		['diversity', ['genres', 'diversity']],
		['summary', ['summary']]
	]);
});

test('a diversity-only reload does not cover the genre card', () => {
	assert.deepEqual(requestGroups(['diversity']), [['diversity', ['diversity']]]);
});

test('the genre card alone still asks for diversity', () => {
	assert.deepEqual(requestGroups(['genres']), [['diversity', ['genres']]]);
});

test('cards with no derived entry ask for themselves', () => {
	assert.deepEqual(requestGroups(['a', 'b'], {}), [
		['a', ['a']],
		['b', ['b']]
	]);
});

test('genreDistribution takes summary.genre and the answer total and filters', () => {
	const diversity = {
		filters: { start: '2026-09-01', end: '2026-10-26', bucket: 'week' },
		total_plays: 134,
		summary: {
			distinct_works: 18,
			era: { labels: ['바로크'], values: [134], unknown_share: 0, entropy: 0, evenness: 0 },
			genre: { labels: ['교향곡', '기타'], values: [100, 34], entropy: 0.56, evenness: 0.31 }
		},
		timeline: { bucket: 'week', labels: [], plays: [] }
	};
	assert.deepEqual(genreDistribution(diversity), {
		filters: { start: '2026-09-01', end: '2026-10-26', bucket: 'week' },
		total_plays: 134,
		labels: ['교향곡', '기타'],
		values: [100, 34]
	});
});

test('genreDistribution of an empty answer has no labels', () => {
	const empty = genreDistribution({
		filters: {},
		total_plays: 0,
		summary: { genre: { labels: [], values: [] } }
	});
	assert.deepEqual(empty.labels, []);
	assert.equal(empty.total_plays, 0);
});

test('the 선곡 다양성 tiles are drawn from the diversity answer', () => {
	assert.equal(DERIVED_CARDS.diversityTiles, 'diversity');
});

test('a full load asks for diversity once, for the tiles too', () => {
	assert.deepEqual(requestGroups(['summary', 'diversity', 'genres', 'diversityTiles']), [
		['summary', ['summary']],
		['diversity', ['diversity', 'genres', 'diversityTiles']]
	]);
});

test('a 주별/월별 reload covers neither the genre card nor the tiles', () => {
	assert.deepEqual(requestGroups(['diversity', 'timeline']), [
		['diversity', ['diversity']],
		['timeline', ['timeline']]
	]);
});

test('diversityTiles takes the summary, which does not depend on the bucket', () => {
	const summary = {
		distinct_works: 18,
		era: { labels: ['바로크'], values: [134], unknown_share: 0, entropy: 0, evenness: 0 },
		genre: { labels: ['교향곡', '기타'], values: [100, 34], entropy: 0.56, evenness: 0.31 }
	};
	const answer = (bucket) => ({
		filters: { bucket },
		total_plays: 134,
		summary,
		timeline: { bucket, labels: [], plays: [] }
	});
	assert.equal(diversityTiles(answer('week')), summary);
	assert.deepEqual(diversityTiles(answer('week')), diversityTiles(answer('month')));
});

test('retryKeys: a card with its own request retries only itself', () => {
	const errors = { eras: '불러오지 못했습니다', composers: '불러오지 못했습니다' };
	assert.deepEqual(retryKeys('eras', errors), ['eras']);
});

test('retryKeys: the genre card retries every failed card of the diversity request', () => {
	const errors = {
		diversity: '불러오지 못했습니다',
		genres: '불러오지 못했습니다',
		diversityTiles: '불러오지 못했습니다',
		eras: '불러오지 못했습니다'
	};
	const keys = retryKeys('genres', errors);
	assert.deepEqual(keys, ['diversity', 'genres', 'diversityTiles']);
	// one fetch for all three
	assert.deepEqual(requestGroups(keys), [['diversity', keys]]);
	assert.deepEqual(retryKeys('diversity', errors), keys);
	assert.deepEqual(retryKeys('diversityTiles', errors), keys);
});

test('retryKeys: when only the genre card failed, it retries the genre card alone', () => {
	assert.deepEqual(retryKeys('genres', { diversity: '', genres: '불러오지 못했습니다' }), [
		'genres'
	]);
});

test('retryKeys never includes a card without an error', () => {
	const errors = { diversity: '', genres: '불러오지 못했습니다', diversityTiles: '' };
	assert.deepEqual(retryKeys('diversity', errors), ['genres']);
	assert.deepEqual(retryKeys('eras', errors), []);
	assert.deepEqual(retryKeys('summary', {}), []);
});

test('previousRetryRequests: the tiles retry re-asks the failed previous diversity only', () => {
	assert.deepEqual(previousRetryRequests(['diversityTiles'], ['summary', 'diversity', 'eras']), [
		'diversity'
	]);
});

test('previousRetryRequests: the cards of one request re-ask it once', () => {
	assert.deepEqual(
		previousRetryRequests(['diversity', 'genres', 'diversityTiles'], ['diversity']),
		['diversity']
	);
});

test("previousRetryRequests: a card never re-asks another card's previous request", () => {
	assert.deepEqual(previousRetryRequests(['eras'], ['diversity']), []);
	assert.deepEqual(previousRetryRequests(['works'], ['works', 'firstWorks']), ['works']);
	assert.deepEqual(previousRetryRequests(['firstComposers'], ['firstComposers', 'firstWorks']), [
		'firstComposers'
	]);
});

test('previousRetryRequests: nothing failed, nothing re-asked', () => {
	assert.deepEqual(previousRetryRequests(['diversity', 'genres', 'eras'], []), []);
	assert.deepEqual(previousRetryRequests([], ['diversity']), []);
});

// 페이지 순서의 [카드, 이름]. 선곡 다양성의 칸과 다양성 차트는 같은 이름으로 읽는다.
const CARDS = [
	['summary', '요약'],
	['eras', '시대별 분포'],
	['genres', '장르별 분포'],
	['works', '많이 튼 곡'],
	['diversityTiles', '선곡 다양성'],
	['diversity', '선곡 다양성']
];
const settled = {
	summary: false,
	eras: false,
	genres: false,
	works: false,
	diversityTiles: false,
	diversity: false
};
const AGAIN = '각 카드의 다시 시도로 다시 부를 수 있습니다.';

test('loadStatusText: silent while any card is loading', () => {
	assert.equal(loadStatusText({ ...settled, works: true }, {}, CARDS), '');
	assert.equal(
		loadStatusText({ ...settled, works: true }, { eras: '불러오지 못했습니다' }, CARDS),
		''
	);
});

test('loadStatusText: every card loaded', () => {
	assert.equal(loadStatusText(settled, {}, CARDS), '모든 카드를 불러왔습니다.');
	assert.equal(
		loadStatusText(settled, { eras: '', works: '' }, CARDS),
		'모든 카드를 불러왔습니다.'
	);
});

test('loadStatusText: one failed card is named', () => {
	assert.equal(
		loadStatusText(settled, { works: '불러오지 못했습니다' }, CARDS),
		`카드 1개를 불러오지 못했습니다: 많이 튼 곡. ${AGAIN}`
	);
});

test('loadStatusText: failed cards in page order, a shared name once', () => {
	const errors = {
		diversity: '불러오지 못했습니다',
		diversityTiles: '불러오지 못했습니다',
		genres: '불러오지 못했습니다'
	};
	assert.equal(
		loadStatusText(settled, errors, CARDS),
		`카드 2개를 불러오지 못했습니다: 장르별 분포, 선곡 다양성. ${AGAIN}`
	);
	assert.equal(
		loadStatusText(settled, { works: 'x', summary: 'x', eras: 'x' }, CARDS),
		`카드 3개를 불러오지 못했습니다: 요약, 시대별 분포, 많이 튼 곡. ${AGAIN}`
	);
});

test('loadStatusText: one request drawing several cards names each of them (학기 결산)', () => {
	const cards = [
		['eras', '시대별 분포'],
		['diversity', '장르별 분포'],
		['diversity', '선곡 다양성']
	];
	assert.equal(
		loadStatusText({ eras: false, diversity: false }, { diversity: '불러오지 못했습니다' }, cards),
		`카드 2개를 불러오지 못했습니다: 장르별 분포, 선곡 다양성. ${AGAIN}`
	);
	assert.equal(loadStatusText({ eras: false, diversity: true }, {}, cards), '');
});

test('loadStatusText: an error on an unlisted card is ignored', () => {
	assert.equal(
		loadStatusText(settled, { drill: '불러오지 못했습니다' }, CARDS),
		'모든 카드를 불러왔습니다.'
	);
});

test('loadStatusText: a card missing from loading counts as settled', () => {
	assert.equal(loadStatusText({ summary: false }, {}, CARDS), '모든 카드를 불러왔습니다.');
	assert.equal(
		loadStatusText({}, { eras: '불러오지 못했습니다' }, CARDS),
		`카드 1개를 불러오지 못했습니다: 시대별 분포. ${AGAIN}`
	);
});

const PREVIOUS =
	'지난 학기(2025-2학기)와 견준 수치를 불러오지 못했습니다. 지난 학기 수치 다시 시도로 다시 부를 수 있습니다.';

test('withPreviousFailure: an empty status stays empty (cards still loading)', () => {
	assert.equal(withPreviousFailure('', '2025-2학기'), '');
});

test('withPreviousFailure: no failed 지난 학기 leaves the status as it is', () => {
	assert.equal(withPreviousFailure('모든 카드를 불러왔습니다.', ''), '모든 카드를 불러왔습니다.');
});

test('withPreviousFailure: the success sentence, then the 지난 학기 sentence', () => {
	assert.equal(
		withPreviousFailure('모든 카드를 불러왔습니다.', '2025-2학기'),
		`모든 카드를 불러왔습니다. ${PREVIOUS}`
	);
});

test('withPreviousFailure: failed cards first, then the 지난 학기 sentence', () => {
	const cards = loadStatusText(settled, { works: '불러오지 못했습니다' }, CARDS);
	assert.equal(
		withPreviousFailure(cards, '2025-2학기'),
		`카드 1개를 불러오지 못했습니다: 많이 튼 곡. ${AGAIN} ${PREVIOUS}`
	);
});

const ALL_LOADED = '모든 카드를 불러왔습니다.';
const COMPOSER_LINE = ['작곡가 정보를 불러오지 못했습니다.', '작곡가 정보 다시 시도'];
const WHOLE_LINE = ['전체 기록의 처음·마지막 날을 불러오지 못했습니다.', '전체 기록 다시 시도'];
const COMPOSER_SENTENCE =
	'작곡가 정보를 불러오지 못했습니다. 작곡가 정보 다시 시도로 다시 부를 수 있습니다.';
const WHOLE_SENTENCE =
	'전체 기록의 처음·마지막 날을 불러오지 못했습니다. 전체 기록 다시 시도로 다시 부를 수 있습니다.';

test('withFailedLines: an empty status stays empty even with failed lines', () => {
	assert.equal(withFailedLines('', { lead: [COMPOSER_LINE], tail: [WHOLE_LINE] }), '');
});

test('withFailedLines: no failed lines leave the status as it is', () => {
	assert.equal(withFailedLines(ALL_LOADED, {}), ALL_LOADED);
	assert.equal(withFailedLines(ALL_LOADED), ALL_LOADED);
	assert.equal(withFailedLines(ALL_LOADED, { lead: [false, ''], tail: [null] }), ALL_LOADED);
});

test('withFailedLines: a lead line goes before the status', () => {
	assert.equal(
		withFailedLines(ALL_LOADED, { lead: [COMPOSER_LINE] }),
		`${COMPOSER_SENTENCE} ${ALL_LOADED}`
	);
});

test('withFailedLines: a tail line goes after the status and any 지난 학기 sentence', () => {
	assert.equal(
		withFailedLines(withPreviousFailure(ALL_LOADED, '2025-2학기'), { tail: [WHOLE_LINE] }),
		`${ALL_LOADED} ${PREVIOUS} ${WHOLE_SENTENCE}`
	);
});

test('withFailedLines: several lines keep their order, falsy ones are skipped', () => {
	assert.equal(
		withFailedLines('상태.', {
			lead: [['가.', '가 다시 시도'], false, ['나.', '나 다시 시도']],
			tail: [
				['다.', '다 다시 시도'],
				['라.', '라 다시 시도']
			]
		}),
		'가. 가 다시 시도로 다시 부를 수 있습니다. 나. 나 다시 시도로 다시 부를 수 있습니다. 상태. ' +
			'다. 다 다시 시도로 다시 부를 수 있습니다. 라. 라 다시 시도로 다시 부를 수 있습니다.'
	);
});

test('withFailedLines: 작곡가 정보 and 전체 기록 both failed around loaded cards', () => {
	assert.equal(
		withFailedLines(ALL_LOADED, { lead: [COMPOSER_LINE], tail: [WHOLE_LINE] }),
		'작곡가 정보를 불러오지 못했습니다. 작곡가 정보 다시 시도로 다시 부를 수 있습니다. ' +
			'모든 카드를 불러왔습니다. ' +
			'전체 기록의 처음·마지막 날을 불러오지 못했습니다. 전체 기록 다시 시도로 다시 부를 수 있습니다.'
	);
});
