import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	competitionRanks,
	sharePercents,
	rankTable,
	shareTable,
	formatShare,
	seriesTable,
	formatCount,
	formatEvenness,
	groupEvenness,
	chartLabel,
	tableRegionLabel,
	placeholderText,
	PERFORMER_EMPTY,
	unknownEraNote,
	topOf,
	rankCapNote,
	rankCapSubtitle
} from '../../src/lib/statTable.js';

test('equal counts share a rank and the next rank skips', () => {
	assert.deepEqual(competitionRanks([28, 24, 24, 21, 21, 21, 18]), [1, 2, 2, 4, 4, 4, 7]);
	assert.deepEqual(competitionRanks([5, 5]), [1, 1]);
	assert.deepEqual(competitionRanks([]), []);
});

test('shares add up to 100 and round as the pie does (largest remainder)', () => {
	// 1/3 each: plain rounding gives 33.33 × 3 = 99.99; the pie gives one slice 33.34.
	const thirds = sharePercents([1, 1, 1]);
	assert.deepEqual(thirds, [33.34, 33.33, 33.33]);
	assert.equal(Math.round(thirds.reduce((a, b) => a + b) * 100), 10000);
	assert.deepEqual(sharePercents([21, 20, 18, 23, 34]), [18.1, 17.24, 15.52, 19.83, 29.31]);
	assert.deepEqual(sharePercents([0, 4]), [0, 100]);
	assert.deepEqual(sharePercents([0, 0]), [0, 0]);
});

test('a ranking table has 순위, the name as row header, and 횟수', () => {
	const table = rankTable(
		{ labels: ['가상 A', '가상 B', '가상 C'], values: [1200, 14, 14] },
		'연주자'
	);
	assert.deepEqual(
		table.columns.map((c) => c.name),
		['순위', '연주자', '횟수']
	);
	assert.equal(table.rowHeader, 1);
	assert.deepEqual(table.rows, [
		['1', '가상 A', '1,200'],
		['2', '가상 B', '14'],
		['2', '가상 C', '14']
	]);
	assert.deepEqual(
		table.columns.map((c) => Boolean(c.numeric)),
		[true, false, true]
	);
});

test('a share table gives the count and the pie percentage', () => {
	const table = shareTable({ labels: ['바로크', '미상'], values: [3, 1] }, '시대');
	assert.deepEqual(
		table.columns.map((c) => c.name),
		['시대', '횟수', '비율']
	);
	assert.equal(table.rowHeader, 0);
	assert.deepEqual(table.rows, [
		['바로크', '3', '75.0%'],
		['미상', '1', '25.0%']
	]);
});

test('share tables give one fixed decimal, so equal counts read the same', () => {
	// 이번 학기 장르: two decimals read 39.85% · 30.08% · 30.07%.
	const table = shareTable({ labels: ['교향곡', '협주곡', '기타'], values: [53, 40, 40] }, '장르');
	assert.deepEqual(
		table.rows.map((row) => row[2]),
		['39.8%', '30.1%', '30.1%']
	);
	assert.equal(formatShare(16), '16.0%');
	assert.equal(formatShare(22.6), '22.6%');
});

// The 미상 cell of the era card's table (shareTable), for the note to match.
const unknownCell = (eras) => shareTable(eras, '시대').rows.find((row) => row[0] === '미상')[2];

test('the 시대 미상 note gives the share as the table does, with one decimal', () => {
	// 201 plays, 47 미상: the backend's unknown_share is round(47 / 201, 4).
	const eras = {
		labels: ['중세', '바로크', '고전', '낭만', '미상'],
		values: [40, 50, 45, 19, 47],
		unknown_share: 0.2338
	};
	assert.equal(unknownEraNote(eras), '시대 미상 비율 23.4% — 일부 작곡가 데이터 미반영');
	assert.equal(unknownCell(eras), '23.4%');
});

test('the 시대 미상 note follows the table when the pie rounding moves 미상', () => {
	// 3 / 7 = 42.857…%, but the largest remainders go to the other slices: the table reads 42.8%.
	const eras = {
		labels: ['바로크', '고전', '낭만', '미상'],
		values: [1, 1, 2, 3],
		unknown_share: 0.4286
	};
	assert.equal(unknownCell(eras), '42.8%');
	assert.equal(unknownEraNote(eras), '시대 미상 비율 42.8% — 일부 작곡가 데이터 미반영');
});

test('there is no 시대 미상 note at 20% or less, or without an answer', () => {
	const eras = { labels: ['낭만', '미상'], values: [4, 1], unknown_share: 0.2 };
	assert.equal(unknownEraNote(eras), '');
	assert.equal(unknownEraNote({ labels: ['낭만'], values: [5], unknown_share: 0 }), '');
	assert.equal(unknownEraNote(null), '');
	assert.equal(unknownEraNote(undefined), '');
});

test('without a 미상 label, the 시대 미상 note uses unknown_share', () => {
	const eras = { labels: ['바로크', '낭만'], values: [3, 1], unknown_share: 0.2338 };
	assert.equal(unknownEraNote(eras), '시대 미상 비율 23.4% — 일부 작곡가 데이터 미반영');
});

test('a series table has one column per series, each with its own format', () => {
	const table = seriesTable(['2026-09', '2026-10'], '기간', [
		{ name: '시대 다양성', values: [0.8432, null], format: formatEvenness },
		{ name: '장르 다양성', values: [0.6, 0.61], format: formatEvenness }
	]);
	assert.deepEqual(
		table.columns.map((c) => c.name),
		['기간', '시대 다양성', '장르 다양성']
	);
	assert.deepEqual(table.rows, [
		['2026-09', '84%', '60%'],
		['2026-10', '—', '61%']
	]);
});

test('evenness reads in whole percents, as the 선곡 다양성 tiles and 학기 결산 do', () => {
	assert.equal(formatEvenness(0), '0%');
	assert.equal(formatEvenness(1), '100%');
	assert.equal(formatEvenness(0.005), '1%');
	assert.equal(formatEvenness(0.4096), '41%');
	assert.equal(formatEvenness(null), '—');
	assert.equal(formatEvenness(undefined), '—');
});

test('a diversity group with counted plays keeps its evenness, even 0', () => {
	assert.equal(
		groupEvenness({ labels: ['고전', '근현대'], values: [1, 2], evenness: 0.3955 }),
		0.3955
	);
	// one genre only: fully concentrated, a real 0
	assert.equal(groupEvenness({ labels: ['교향곡'], values: [1], evenness: 0 }), 0);
});

test('a diversity group with nothing counted has no evenness', () => {
	// no plays in the range
	assert.equal(groupEvenness({ labels: [], values: [], evenness: 0 }), null);
	// every play 시대 미상: summary.era is empty, the backend still says 0
	assert.equal(groupEvenness({ labels: [], values: [], unknown_share: 1, evenness: 0 }), null);
	assert.equal(groupEvenness({ labels: ['고전'], values: [0], evenness: 0 }), null);
	assert.equal(groupEvenness(null), null);
	assert.equal(groupEvenness(undefined), null);
});

test('a series without a format counts', () => {
	const table = seriesTable(['2025-1학기'], '기간', [{ name: '횟수', values: [1908] }]);
	assert.deepEqual(table.rows, [['2025-1학기', '1,908']]);
	assert.equal(formatCount(null), '—');
	assert.equal(formatCount(0), '0');
});

test('a chart is named by its title and subtitle and points to the table', () => {
	assert.equal(
		chartLabel('많이 튼 작곡가', '전체 · 총 120곡'),
		"많이 튼 작곡가 차트 — 전체 · 총 120곡. 수치는 '표로 보기'에서 볼 수 있습니다."
	);
	assert.equal(
		chartLabel(' 월별 선곡 수 ', '  '),
		"월별 선곡 수 차트. 수치는 '표로 보기'에서 볼 수 있습니다."
	);
	assert.equal(chartLabel('', ''), "차트. 수치는 '표로 보기'에서 볼 수 있습니다.");
});

test('a table area is named by its title and 표, apart from the card that has that title', () => {
	assert.equal(tableRegionLabel('많이 튼 곡'), '많이 튼 곡 표');
	assert.equal(tableRegionLabel(' 가상스키의 곡 '), '가상스키의 곡 표');
	assert.equal(tableRegionLabel(''), '표');
	assert.equal(tableRegionLabel('  '), '표');
	for (const t of ['많이 튼 곡', ' 가상스키의 곡 ', '시대별 분포', '', '  ']) {
		assert.notEqual(tableRegionLabel(t), t.trim());
	}
});

test('a card without a chart names itself, except while it loads', () => {
	assert.equal(placeholderText('많이 튼 지휘자', { loading: true }), '불러오는 중...');
	assert.equal(
		placeholderText('많이 튼 지휘자', { loading: true, error: '불러오지 못했습니다' }),
		'불러오는 중...'
	);
	assert.equal(
		placeholderText('많이 튼 지휘자', { error: '불러오지 못했습니다' }),
		'많이 튼 지휘자 — 불러오지 못했습니다'
	);
	assert.equal(placeholderText('많이 튼 지휘자'), '많이 튼 지휘자 — 데이터가 없습니다');
	assert.equal(
		placeholderText(' 월별 선곡 수 ', { error: '' }),
		'월별 선곡 수 — 데이터가 없습니다'
	);
	assert.equal(placeholderText(''), '데이터가 없습니다');
});

test('an empty performer card says why it is empty, but loading and errors still win', () => {
	const empty = PERFORMER_EMPTY.conductors;
	assert.equal(
		placeholderText('많이 튼 지휘자', { empty }),
		'많이 튼 지휘자 — 지휘자가 적힌 선곡이 없습니다'
	);
	assert.equal(placeholderText('많이 튼 지휘자', { loading: true, empty }), '불러오는 중...');
	assert.equal(
		placeholderText('많이 튼 지휘자', { error: '불러오지 못했습니다', empty }),
		'많이 튼 지휘자 — 불러오지 못했습니다'
	);
	assert.equal(
		placeholderText('많이 튼 지휘자', { empty: undefined }),
		'많이 튼 지휘자 — 데이터가 없습니다'
	);
	assert.equal(
		placeholderText('많이 튼 지휘자', { empty: '' }),
		'많이 튼 지휘자 — 데이터가 없습니다'
	);
	assert.equal(placeholderText('', { empty }), '지휘자가 적힌 선곡이 없습니다');
	assert.deepEqual(Object.keys(PERFORMER_EMPTY).sort(), ['conductors', 'orchestras', 'soloists']);
	assert.equal(
		placeholderText('많이 튼 오케스트라', { empty: PERFORMER_EMPTY.orchestras }),
		'많이 튼 오케스트라 — 오케스트라가 적힌 선곡이 없습니다'
	);
	assert.equal(PERFORMER_EMPTY.soloists, '독주자가 적힌 선곡이 없습니다');
});

// 지어낸 순위 응답: n명, 많은 순.
const envelope = (n) => ({
	labels: Array.from({ length: n }, (_, i) => `가상 작곡가 ${i + 1}`),
	values: Array.from({ length: n }, (_, i) => 100 - i),
	items: Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `가상 작곡가 ${i + 1}` })),
	total_plays: 396,
	filters: { semester_id: 1 }
});

test('the chart takes the first n of a ranking, the rest of the answer stays as it is', () => {
	const full = envelope(45);
	const before = structuredClone(full);
	const top = topOf(full, 12);
	assert.deepEqual(top.labels, full.labels.slice(0, 12));
	assert.deepEqual(top.values, full.values.slice(0, 12));
	assert.deepEqual(top.items, full.items.slice(0, 12));
	assert.equal(top.labels[11], '가상 작곡가 12');
	assert.equal(top.total_plays, 396);
	assert.deepEqual(top.filters, { semester_id: 1 });
	assert.deepEqual(full, before);
	assert.deepEqual(topOf(envelope(5), 12), envelope(5));
	assert.equal(topOf(null, 12), null);
});

test('a ranking table says it stops at the cap only when it reaches it', () => {
	assert.equal(rankCapNote(envelope(99), 100), '');
	assert.equal(rankCapNote(envelope(100), 100), '표로 보기·CSV는 상위 100위까지');
	assert.equal(rankCapNote(null, 100), '');
});

test('a capped ranking table says out of how many, from the summary total', () => {
	const cap = '표로 보기·CSV는 상위 100위까지';
	assert.equal(rankCapNote(envelope(100), 100, 312, ['작곡가', '명']), `${cap} (작곡가 312명 중)`);
	assert.equal(rankCapNote(envelope(100), 100, 1204, ['곡', '곡']), `${cap} (곡 1,204곡 중)`);
	assert.equal(
		rankCapNote(envelope(100), 100, 118, ['오케스트라', '곳']),
		`${cap} (오케스트라 118곳 중)`
	);
	// 표에 모두 있으면(전체가 줄 수보다 많지 않으면) 적지 않는다.
	assert.equal(rankCapNote(envelope(100), 100, 100, ['작곡가', '명']), '');
	assert.equal(rankCapNote(envelope(100), 100, 99, ['작곡가', '명']), '');
	// 전체를 모르면(요약을 불러오는 중, 실패, 그 칸이 없는 응답) 지금의 문구.
	assert.equal(rankCapNote(envelope(100), 100, undefined, ['작곡가', '명']), cap);
	assert.equal(rankCapNote(envelope(100), 100, null, ['작곡가', '명']), cap);
	// 상한에 닿지 않았거나 응답이 없으면 없다.
	assert.equal(rankCapNote(envelope(99), 100, 312, ['작곡가', '명']), '');
	assert.equal(rankCapNote(null, 100, 312, ['작곡가', '명']), '');
});

test("a 작곡가 page's capped 많이 튼 곡 subtitle says out of how many", () => {
	assert.equal(rankCapSubtitle(envelope(100), 100, 212, '곡'), ' · 상위 100곡 (212곡 중)');
	assert.equal(rankCapSubtitle(envelope(100), 100, 1204, '곡'), ' · 상위 100곡 (1,204곡 중)');
	assert.equal(rankCapSubtitle(envelope(100), 100, undefined, '곡'), ' · 상위 100곡');
	assert.equal(rankCapSubtitle(envelope(100), 100, null, '곡'), ' · 상위 100곡');
	assert.equal(rankCapSubtitle(envelope(100), 100, 100, '곡'), '');
	assert.equal(rankCapSubtitle(envelope(99), 100, 212, '곡'), '');
	assert.equal(rankCapSubtitle(null, 100, 212, '곡'), '');
});
