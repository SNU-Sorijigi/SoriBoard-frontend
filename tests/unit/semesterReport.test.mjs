import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	reportHref,
	pickSemester,
	previousSemester,
	mergeLabels,
	formatChange,
	kpiChangeText,
	evennessChangeText,
	mixTable,
	mixSubtitle,
	rankChangeTable,
	rankNotes,
	tieNote,
	firstIdSet,
	loadWithPrevious,
	firstsTable,
	reportRangeText,
	reportRange,
	ongoingText,
	upcomingText,
	semesterOptionLabel,
	semesterUpcoming,
	eraPair,
	genrePair,
	monthlyTable
} from '../../src/lib/semesterReport.js';
import { rankTable } from '../../src/lib/statTable.js';
import { eraDistribution, genreDistribution } from '../../src/lib/statCards.js';

// sortSemesters 순서(최신 학기 먼저)
const sorted = [
	{ id: 2, year: 2026, semester_num: 2 },
	{ id: 4, year: 2026, semester_num: 1 },
	{ id: 1, year: 2025, semester_num: 2 }
];

test('reportHref links a 학기 id, anything else to the newest 학기', () => {
	assert.equal(reportHref('4'), '/stat/report?semester_id=4');
	assert.equal(reportHref(12), '/stat/report?semester_id=12');
	for (const other of ['current', 'all', 'custom', '', null, undefined, '0', '-1', '1e3']) {
		assert.equal(reportHref(other), '/stat/report', String(other));
	}
});

test('pickSemester finds the URL 학기 or falls back to the newest started one', () => {
	assert.equal(pickSemester('4', sorted), sorted[1]);
	assert.equal(pickSemester(null, sorted), sorted[0]);
	assert.equal(pickSemester('99', sorted), sorted[0]);
	assert.equal(pickSemester('abc', sorted), sorted[0]);
	assert.equal(pickSemester('4', []), null);
	// 다음 학기(2027-1)를 미리 만들어 두면: 링크가 없으면 오늘의 학기까지 중 가장 최근 학기
	const ahead = [
		{ id: 7, year: 2027, semester_num: 1 },
		{ id: 2, year: 2026, semester_num: 2 },
		{ id: 4, year: 2026, semester_num: 1 }
	];
	assert.equal(pickSemester(null, ahead, '2027-02-20'), ahead[1]);
	assert.equal(pickSemester(null, ahead, '2026-11-02'), ahead[1]);
	assert.equal(pickSemester(null, ahead, '2027-03-02'), ahead[0]);
	assert.equal(pickSemester('99', ahead, '2027-02-20'), ahead[1]);
	assert.equal(pickSemester('7', ahead, '2027-02-20'), ahead[0]);
	// 모두 앞으로의 학기면 가장 최근 학기
	const future = [{ id: 7, year: 2027, semester_num: 1 }];
	assert.equal(pickSemester(null, future, '2026-11-02'), future[0]);
	assert.equal(pickSemester(null, [], '2026-11-02'), null);
});

test('previousSemester is the next one in year/semester order', () => {
	assert.equal(previousSemester(sorted[0], sorted), sorted[1]);
	assert.equal(previousSemester(sorted[1], sorted), sorted[2]);
	assert.equal(previousSemester(sorted[2], sorted), null);
	assert.equal(previousSemester({ id: 99 }, sorted), null);
});

test('mergeLabels keeps the shared backend order', () => {
	assert.deepEqual(mergeLabels(['바로크', '낭만'], ['고전', '낭만', '미상']), [
		'바로크',
		'고전',
		'낭만',
		'미상'
	]);
	assert.deepEqual(mergeLabels(['고전', '낭만'], ['중세', '고전']), ['중세', '고전', '낭만']);
	assert.deepEqual(mergeLabels([], ['a', 'b']), ['a', 'b']);
	assert.deepEqual(mergeLabels(['a', 'b'], []), ['a', 'b']);
	// 순서가 엇갈려도 끝나고, 이름은 한 번씩만
	assert.deepEqual(mergeLabels(['a', 'b'], ['b', 'a']), ['a', 'b']);
});

test('formatChange shows a signed %p with one decimal', () => {
	assert.equal(formatChange(8), '+8.0%p');
	assert.equal(formatChange(-8.3), '-8.3%p');
	assert.equal(formatChange(24.6 - 16.6), '+8.0%p');
	assert.equal(formatChange(0), '0.0%p');
	assert.equal(formatChange(-0.04), '0.0%p');
	assert.equal(formatChange(0.05), '+0.1%p');
});

test('kpiChangeText compares a KPI with the previous 학기', () => {
	assert.equal(kpiChangeText(312, 280), '+32 · 지난 학기 280');
	assert.equal(kpiChangeText(41, 46), '-5 · 지난 학기 46');
	assert.equal(kpiChangeText(12, 12), '0 · 지난 학기 12');
	assert.equal(kpiChangeText(1234, 0), '+1,234 · 지난 학기 0');
	assert.equal(kpiChangeText(0, 1234), '-1,234 · 지난 학기 1,234');
	for (const [now, before] of [
		[312, null],
		[312, undefined],
		[null, 280],
		[undefined, 280],
		[null, null],
		[undefined, undefined]
	]) {
		assert.equal(kpiChangeText(now, before), '', `${now}, ${before}`);
	}
});

test('evennessChangeText compares the shown percentages with the previous 학기', () => {
	assert.equal(evennessChangeText(0.62, 0.58), '+4%p · 지난 학기 58%');
	// 각각 먼저 반올림한다: 48% − 52%
	assert.equal(evennessChangeText(0.484, 0.516), '-4%p · 지난 학기 52%');
	assert.equal(evennessChangeText(0.621, 0.618), '0%p · 지난 학기 62%');
	// 0 은 값이다(없음이 아니다)
	assert.equal(evennessChangeText(0, 0.5), '-50%p · 지난 학기 50%');
	assert.equal(evennessChangeText(1, 0), '+100%p · 지난 학기 0%');
	for (const [now, before] of [
		[0.62, null],
		[0.62, undefined],
		[null, 0.58],
		[undefined, 0.58],
		[null, null]
	]) {
		assert.equal(evennessChangeText(now, before), '', `${now}, ${before}`);
	}
});

test('mixTable compares each share with the previous 학기', () => {
	const table = mixTable(
		{ labels: ['바로크', '낭만'], values: [1, 3] },
		{ labels: ['고전', '낭만'], values: [1, 1] },
		'시대'
	);
	assert.deepEqual(
		table.columns.map((c) => c.name),
		['시대', '횟수', '비율', '지난 학기', '변화']
	);
	assert.equal(table.rowHeader, 0);
	assert.deepEqual(table.rows, [
		['바로크', '1', '25.0%', '0.0%', '+25.0%p'],
		['고전', '0', '0.0%', '50.0%', '-50.0%p'],
		['낭만', '3', '75.0%', '50.0%', '+25.0%p']
	]);
});

test('mixTable shares add up to 100 and the change uses the shown shares', () => {
	const table = mixTable(
		{ labels: ['a', 'b', 'c'], values: [1, 1, 1] },
		{ labels: ['a', 'b', 'c'], values: [2, 1, 0] },
		'장르'
	);
	const shares = table.rows.map((row) => Number.parseFloat(row[2]));
	assert.equal(Math.round(shares.reduce((x, y) => x + y, 0) * 10) / 10, 100);
	for (const row of table.rows) {
		const diff = Number.parseFloat(row[2]) - Number.parseFloat(row[3]);
		assert.equal(row[4], formatChange(diff));
	}
});

test('mixTable without a previous 학기 drops the comparison', () => {
	const table = mixTable({ labels: ['교향곡'], values: [1234] }, null, '장르');
	assert.deepEqual(
		table.columns.map((c) => c.name),
		['장르', '횟수', '비율']
	);
	assert.deepEqual(table.rows, [['교향곡', '1,234', '100.0%']]);
});

test('mixTable with an empty previous 학기 shows dashes', () => {
	const table = mixTable({ labels: ['고전'], values: [2] }, { labels: [], values: [] }, '시대');
	assert.deepEqual(table.rows, [['고전', '2', '100.0%', '—', '—']]);
});

// 백엔드의 순위 봉투(_top_by): labels·values 와 같은 순서의 items { id, name, count }.
const ranking = (rows, total = rows.reduce((acc, [, , count]) => acc + count, 0)) => ({
	total_plays: total,
	labels: rows.map(([, name]) => name),
	values: rows.map(([, , count]) => count),
	items: rows.map(([id, name, count]) => ({ id, name, count }))
});
// 지난 학기 목록을 limit 길이로 채우는 행(1회씩, id 는 from 부터): 목록이 limit 에서 잘린 경우.
const filler = (n, from = 100) =>
	Array.from({ length: n }, (_, k) => [from + k, `가상 작곡가 ${from + k}`, 1]);

test('rankChangeTable without a previous 학기 is the plain rank table', () => {
	const now = ranking([
		[7, '브람스', 42],
		[3, '바흐', 1234]
	]);
	assert.deepEqual(rankChangeTable(now, null, '작곡가'), rankTable(now, '작곡가'));
	assert.deepEqual(
		rankChangeTable(now, null, '작곡가').columns.map((c) => c.name),
		['순위', '작곡가', '횟수']
	);
});

test('rankChangeTable shows each row’s rank in the previous 학기, ties as 순위 counts them', () => {
	const now = ranking([
		[1, '브람스', 42],
		[2, '바흐', 30],
		[3, '모차르트', 30],
		[4, '하이든', 12],
		[5, '슈만', 9]
	]);
	const before = ranking([
		[4, '하이든', 9],
		[2, '바흐', 7],
		[3, '모차르트', 7],
		[1, '브람스', 5],
		[9, '말러', 4]
	]);
	const table = rankChangeTable(now, before, '작곡가');
	assert.deepEqual(
		table.columns.map((c) => [c.name, Boolean(c.numeric)]),
		[
			['순위', true],
			['작곡가', false],
			['횟수', true],
			['지난 학기', true]
		]
	);
	assert.equal(table.rowHeader, 1);
	assert.deepEqual(table.rows, [
		['1', '브람스', '42', '4위'],
		['2', '바흐', '30', '2위'],
		['2', '모차르트', '30', '2위'],
		['4', '하이든', '12', '1위'],
		// 지난 학기 목록(5개)이 limit 10 보다 짧으니 잘리지 않았다: 슈만은 그 학기에 틀지 않았다.
		['5', '슈만', '9', '없음']
	]);
});

test('rankChangeTable matches rows by id, not by name', () => {
	const now = ranking([
		[11, '김지휘', 8],
		[12, '김지휘', 6]
	]);
	const before = ranking([
		[30, '이지휘', 9],
		[12, '김지휘', 5],
		[13, '박지휘', 3],
		[11, '김지휘', 2]
	]);
	assert.deepEqual(
		rankChangeTable(now, before, '지휘자').rows.map((row) => row[3]),
		['4위', '2위']
	);
	// 이름만 같은(id 가 다른) 대상은 지난 학기 목록에 없는 것이다(목록이 4개라 잘리지 않았으니 '없음').
	const renamed = ranking([[99, '김지휘', 4]]);
	assert.deepEqual(
		rankChangeTable(renamed, before, '지휘자').rows.map((row) => row[3]),
		['없음']
	);
});

test('rankChangeTable with an empty previous 학기 shows dashes', () => {
	const now = ranking([
		[1, '브람스', 2],
		[2, '바흐', 1]
	]);
	const table = rankChangeTable(now, ranking([], 0), '작곡가');
	assert.equal(table.columns.length, 4);
	assert.deepEqual(table.rows, [
		['1', '브람스', '2', '—'],
		['2', '바흐', '1', '—']
	]);
});

test('rankChangeTable names the list’s length for a row missing from the previous 학기', () => {
	const now = ranking([
		[1, '브람스', 42],
		[2, '바흐', 30]
	]);
	// 지난 학기 목록이 부른 길이(limit)만큼 왔으면 잘린 것이다: 없는 행은 'limit위 밖'.
	const before12 = ranking([[2, '바흐', 7], ...filler(11)]);
	assert.deepEqual(
		rankChangeTable(now, before12, '작곡가', 12).rows.map((row) => row[3]),
		['12위 밖', '1위']
	);
	const before10 = ranking([[2, '바흐', 7], ...filler(9)]);
	assert.deepEqual(
		rankChangeTable(now, before10, '작곡가').rows.map((row) => row[3]),
		['10위 밖', '1위']
	);
	// 더 짧으면 잘리지 않은 목록이다: 없는 행은 그 학기에 틀지 않았으니 '없음'.
	assert.deepEqual(
		rankChangeTable(now, before10, '작곡가', 12).rows.map((row) => row[3]),
		['없음', '1위']
	);
	// 지난 학기에 선곡이 없으면 길이와 상관없이 '—'.
	assert.deepEqual(
		rankChangeTable(now, ranking([], 0), '작곡가', 12).rows.map((row) => row[3]),
		['—', '—']
	);
});

test('rankChangeTable reads 첫 선곡 for a row first played this 학기, not N위 밖', () => {
	const now = ranking([
		[1, '브람스 - 교향곡 제1번', 12],
		[4, '가상 작곡가 - 신곡', 7],
		[6, '모차르트 - 레퀴엠', 5]
	]);
	const top = [
		[9, '말러 - 교향곡 제5번', 8],
		[8, '바흐 - 미사', 6],
		[1, '브람스 - 교향곡 제1번', 4]
	];
	// 지난 학기 목록은 limit 에서 잘렸다(10개, 12개).
	const before = ranking([...top, ...filler(7)]);
	const before12 = ranking([...top, ...filler(9)]);
	const firsts = new Set([4]);
	assert.deepEqual(rankChangeTable(now, before, '곡', 10, firsts).rows, [
		['1', '브람스 - 교향곡 제1번', '12', '3위'],
		['2', '가상 작곡가 - 신곡', '7', '첫 선곡'],
		['3', '모차르트 - 레퀴엠', '5', '10위 밖']
	]);
	assert.deepEqual(
		rankChangeTable(now, before12, '곡', 12, firsts).rows.map((row) => row[3]),
		['3위', '첫 선곡', '12위 밖']
	);
	// 처음 튼 목록이 없으면(아직 오지 않았거나 실패) 지금처럼 'N위 밖'.
	assert.deepEqual(
		rankChangeTable(now, before, '곡', 10, null).rows.map((row) => row[3]),
		['3위', '10위 밖', '10위 밖']
	);
});

test('rankNotes reads the 지난 학기 column as the bar tooltip’s line, 1위 first', () => {
	const now = ranking([
		[1, '브람스', 12],
		[4, '가상 작곡가', 7],
		[6, '모차르트', 5]
	]);
	const top = [
		[1, '브람스', 9],
		[8, '바흐', 6]
	];
	// 지난 학기 목록이 limit 12 에서 잘렸으면 '12위 밖', 잘리지 않았으면(2개) '없음'.
	const table = rankChangeTable(now, ranking([...top, ...filler(10)]), '작곡가', 12, new Set([4]));
	assert.deepEqual(rankNotes(table), ['지난 학기 1위', '지난 학기 첫 선곡', '지난 학기 12위 밖']);
	assert.deepEqual(rankNotes(rankChangeTable(now, ranking(top), '작곡가', 12, new Set([4]))), [
		'지난 학기 1위',
		'지난 학기 첫 선곡',
		'지난 학기 없음'
	]);
	// 지난 학기에 선곡이 없으면('—') 덧붙일 줄이 없다.
	assert.deepEqual(rankNotes(rankChangeTable(now, ranking([], 0), '작곡가', 12)), ['', '', '']);
	// 지난 학기 칸이 없으면(비교 없음) null: 툴팁은 그대로다.
	assert.equal(rankNotes(rankChangeTable(now, null, '작곡가')), null);
	assert.equal(rankNotes(rankTable(now, '작곡가')), null);
	assert.equal(rankNotes(null), null);
});

test('rankChangeTable keeps a previous rank over 첫 선곡, and dashes for an empty 학기', () => {
	const now = ranking([
		[1, '브람스', 12],
		[4, '가상 작곡가', 7]
	]);
	const before = ranking([[1, '브람스', 4]]);
	// 지난 학기 순위가 있으면 (맞지 않게) firstIds 에 있어도 순위.
	assert.deepEqual(
		rankChangeTable(now, before, '작곡가', 10, new Set([1, 4])).rows.map((row) => row[3]),
		['1위', '첫 선곡']
	);
	// 지난 학기에 선곡이 없으면 firstIds 와 상관없이 '—'.
	assert.deepEqual(
		rankChangeTable(now, ranking([], 0), '작곡가', 10, new Set([1, 4])).rows.map((row) => row[3]),
		['—', '—']
	);
	// 지난 학기가 없으면 칸이 없다.
	assert.deepEqual(
		rankChangeTable(now, null, '작곡가', 10, new Set([1, 4])),
		rankTable(now, '작곡가')
	);
});

test('rankChangeTable gives the true rank in a long previous list, 없음 when it was not cut', () => {
	// 통계는 지난 학기도 WORKS_LIMIT(100)까지 부른다: 30명이 왔으면 그 학기의 작곡가 전부다.
	const previous = ranking(
		Array.from({ length: 30 }, (_, k) => [k + 1, `가상 작곡가 ${k + 1}`, 60 - k])
	);
	const now = ranking([
		[25, '가상 작곡가 25', 9],
		[3, '가상 작곡가 3', 8],
		[177, '가상 작곡가 177', 5]
	]);
	assert.deepEqual(
		rankChangeTable(now, previous, '작곡가', 100).rows.map((row) => row[3]),
		['25위', '3위', '없음']
	);
	// 목록이 100개로 꽉 찼으면 잘렸을 수 있다: 없는 행은 '100위 밖'.
	const full = ranking(
		Array.from({ length: 100 }, (_, k) => [k + 1, `가상 작곡가 ${k + 1}`, 200 - k])
	);
	assert.deepEqual(
		rankChangeTable(now, full, '작곡가', 100).rows.map((row) => row[3]),
		['25위', '3위', '100위 밖']
	);
});

test('rankChangeTable reads 첫 선곡 over 없음 for a row first played this 학기', () => {
	const now = ranking([
		[4, '가상 작곡가 - 신곡', 7],
		[6, '모차르트 - 레퀴엠', 5]
	]);
	// 잘리지 않은 지난 학기 목록(2개 < 100)에 둘 다 없다.
	const before = ranking([
		[9, '말러 - 교향곡 제5번', 8],
		[8, '바흐 - 미사', 6]
	]);
	assert.deepEqual(
		rankChangeTable(now, before, '곡', 100, new Set([4])).rows.map((row) => row[3]),
		['첫 선곡', '없음']
	);
});

test('firstIdSet collects the ids of a firsts list, or null without one', () => {
	assert.equal(firstIdSet(null), null);
	assert.equal(firstIdSet(undefined), null);
	const ids = firstIdSet({ items: [{ id: 3 }, { id: 9 }] });
	assert.ok(ids instanceof Set);
	assert.deepEqual(
		[...ids].sort((a, b) => a - b),
		[3, 9]
	);
	assert.equal(firstIdSet({ items: [] }).size, 0);
});

test('firstsTable lists name, first play and count in backend order', () => {
	const table = firstsTable(
		{
			items: [
				{ id: 21, name: 'H - 협주곡', count: 3, first_played: '2026-09-07' },
				{ id: 22, name: 'A - 모음곡', count: 1200, first_played: '2026-09-14' }
			]
		},
		'곡'
	);
	assert.deepEqual(
		table.columns.map((c) => [c.name, Boolean(c.numeric)]),
		[
			['곡', false],
			['처음 튼 날', true],
			['횟수', true]
		]
	);
	assert.equal(table.rowHeader, 0);
	assert.deepEqual(table.rows, [
		['H - 협주곡', '2026-09-07', '3'],
		['A - 모음곡', '2026-09-14', '1,200']
	]);
});

test('loadWithPrevious keeps this 학기 when only the previous one fails', async () => {
	const now = { total_plays: 551 };
	const before = { total_plays: 610 };
	const boom = new Error('eras 500');
	assert.deepEqual(
		await loadWithPrevious(
			async () => now,
			async () => before
		),
		{ current: now, previous: before, previousError: null }
	);
	assert.deepEqual(await loadWithPrevious(async () => now, null), {
		current: now,
		previous: null,
		previousError: null
	});
	assert.deepEqual(
		await loadWithPrevious(
			async () => now,
			async () => {
				throw boom;
			}
		),
		{ current: now, previous: null, previousError: boom }
	);
	await assert.rejects(
		loadWithPrevious(
			async () => {
				throw boom;
			},
			async () => before
		),
		boom
	);
});

test('loadWithPrevious sends both requests at once', async () => {
	const started = [];
	let release;
	const gate = new Promise((resolve) => (release = resolve));
	const pending = loadWithPrevious(
		async () => {
			started.push('now');
			await gate;
			return 1;
		},
		async () => {
			started.push('before');
			return 2;
		}
	);
	assert.deepEqual(started, ['now', 'before']);
	release();
	assert.deepEqual(await pending, { current: 1, previous: 2, previousError: null });
});

test('mixSubtitle names both 학기, a missing one, or a failed one', () => {
	const current = { total_plays: 1903 };
	assert.equal(mixSubtitle(null, '2025-2학기', '2025-1학기'), '2025-2학기');
	assert.equal(mixSubtitle(null, '', ''), '');
	assert.equal(
		mixSubtitle({ current, previous: { total_plays: 610 } }, '2025-2학기', '2025-1학기'),
		'2025-2학기 총 1,903곡 · 지난 학기(2025-1학기) 총 610곡'
	);
	assert.equal(
		mixSubtitle({ current, previous: null, previousError: null }, '2024-1학기', ''),
		'2024-1학기 총 1,903곡 · 지난 학기 없음'
	);
	assert.equal(
		mixSubtitle(
			{ current, previous: null, previousError: new Error('x') },
			'2025-2학기',
			'2025-1학기'
		),
		'2025-2학기 총 1,903곡 · 지난 학기(2025-1학기)를 불러오지 못했습니다'
	);
});

test('reportRangeText shows the echoed range, else the 학기 dates from the list', () => {
	const spring = { id: 4, year: 2026, semester_num: 1 };
	const autumn = { id: 1, year: 2025, semester_num: 2 };
	const echoed = { filters: { semester_id: '4', start: '2026-03-01', end: '2026-08-31' } };
	assert.equal(reportRangeText(echoed, spring), '2026-03-01 ~ 2026-08-31');
	// The echo wins over the guess.
	const odd = { filters: { start: '2026-03-02', end: '2026-08-30' } };
	assert.equal(reportRangeText(odd, spring), '2026-03-02 ~ 2026-08-30');
	// Before the summary answers, or when it failed: the 학기's own dates.
	assert.equal(reportRangeText(null, spring), '2026-03-01 ~ 2026-08-31');
	assert.equal(reportRangeText(undefined, autumn), '2025-09-01 ~ 2026-02-28');
	assert.equal(
		reportRangeText(null, { id: 9, year: 2027, semester_num: 2 }),
		'2027-09-01 ~ 2028-02-29'
	);
	// No 학기 yet, or one the rule does not know: no dates.
	assert.equal(reportRangeText(null, null), '');
	assert.equal(reportRangeText(null, { id: 7, year: 2026, semester_num: 3 }), '');
});

test('reportRange returns the echoed filters, else the guessed 학기 dates', () => {
	const spring = { id: 4, year: 2026, semester_num: 1 };
	const filters = { semester_id: '4', start: '2026-03-01', end: '2026-08-31' };
	assert.equal(reportRange({ filters }, spring), filters);
	assert.deepEqual(reportRange({ filters: { start: '2026-03-02', end: '2026-08-30' } }, spring), {
		start: '2026-03-02',
		end: '2026-08-30'
	});
	assert.deepEqual(reportRange(null, { id: 3, year: 2026, semester_num: 2 }), {
		start: '2026-09-01',
		end: '2027-02-28'
	});
	assert.deepEqual(reportRange(undefined, spring), { start: '2026-03-01', end: '2026-08-31' });
	assert.equal(reportRange(null, null), null);
	assert.equal(reportRange(null, { id: 7, year: 2026, semester_num: 3 }), null);
});

test('ongoingText says 진행 중 only from the first to the last day of the range', () => {
	const autumn = { start: '2026-09-01', end: '2027-02-28' };
	assert.equal(ongoingText(autumn, '2026-11-01'), '진행 중 · 2026-11-01까지');
	assert.equal(ongoingText(autumn, '2026-09-01'), '진행 중 · 2026-09-01까지');
	assert.equal(ongoingText(autumn, '2027-02-28'), '진행 중 · 2027-02-28까지');
	// Not started yet, or over.
	assert.equal(ongoingText(autumn, '2026-08-31'), '');
	assert.equal(ongoingText(autumn, '2027-03-01'), '');
	assert.equal(ongoingText({ start: '2026-03-01', end: '2026-08-31' }, '2026-11-01'), '');
	// No range, or a range without an end or a start.
	assert.equal(ongoingText(null, '2026-11-01'), '');
	assert.equal(ongoingText(undefined, '2026-11-01'), '');
	assert.equal(ongoingText({ start: '2026-09-01' }, '2026-11-01'), '');
	assert.equal(ongoingText({ end: '2027-02-28' }, '2026-11-01'), '');
	assert.equal(ongoingText({ start: '2026-09-01', end: '' }, '2026-11-01'), '');
});

test('upcomingText says 시작 전 only before the first day of the range', () => {
	const spring = { start: '2027-03-01', end: '2027-08-31' };
	assert.equal(upcomingText(spring, '2027-02-28'), '시작 전 · 2027-03-01부터');
	assert.equal(upcomingText(spring, '2026-11-02'), '시작 전 · 2027-03-01부터');
	// Started (from the first day), or over.
	assert.equal(upcomingText(spring, '2027-03-01'), '');
	assert.equal(upcomingText(spring, '2027-05-01'), '');
	assert.equal(upcomingText(spring, '2027-09-01'), '');
	// Never together with 진행 중.
	const days = ['2026-11-02', '2027-02-28', '2027-03-01', '2027-05-01', '2027-08-31', '2027-09-01'];
	for (const day of days) {
		assert.ok(!(upcomingText(spring, day) && ongoingText(spring, day)), day);
	}
	// No range, no start, or no today; the end is not needed.
	assert.equal(upcomingText(null, '2026-11-02'), '');
	assert.equal(upcomingText(undefined, '2026-11-02'), '');
	assert.equal(upcomingText({ end: '2027-08-31' }, '2026-11-02'), '');
	assert.equal(upcomingText(spring, ''), '');
	assert.equal(upcomingText({ start: '2027-03-01' }, '2026-11-02'), '시작 전 · 2027-03-01부터');
});

test('semesterUpcoming is true only before the first day of the 학기', () => {
	const spring = { year: 2027, semester_num: 1 };
	assert.equal(semesterUpcoming(spring, '2026-11-03'), true);
	assert.equal(semesterUpcoming(spring, '2027-02-28'), true);
	assert.equal(semesterUpcoming(spring, '2027-03-01'), false);
	assert.equal(semesterUpcoming(spring, '2027-05-01'), false);
	const autumn = { year: 2026, semester_num: 2 };
	assert.equal(semesterUpcoming(autumn, '2026-08-31'), true);
	assert.equal(semesterUpcoming(autumn, '2026-09-01'), false);
	assert.equal(semesterUpcoming({ year: 2025, semester_num: 2 }, '2026-11-03'), false);
	// No today, or a 학기 the range rule does not know: not upcoming.
	assert.equal(semesterUpcoming(spring, ''), false);
	assert.equal(semesterUpcoming(spring, null), false);
	assert.equal(semesterUpcoming(spring, undefined), false);
	assert.equal(semesterUpcoming({ year: 2027, semester_num: 3 }, '2026-11-03'), false);
});

test('semesterOptionLabel marks a 학기 not yet begun with (시작 전)', () => {
	const spring = { year: 2027, semester_num: 1 };
	assert.equal(semesterOptionLabel(spring, '2026-11-02'), '2027-1학기 (시작 전)');
	assert.equal(semesterOptionLabel(spring, '2027-02-28'), '2027-1학기 (시작 전)');
	assert.equal(semesterOptionLabel(spring, '2027-03-01'), '2027-1학기');
	const autumn = { year: 2026, semester_num: 2 };
	assert.equal(semesterOptionLabel(autumn, '2026-08-31'), '2026-2학기 (시작 전)');
	assert.equal(semesterOptionLabel(autumn, '2026-09-01'), '2026-2학기');
	assert.equal(semesterOptionLabel(autumn, '2026-11-02'), '2026-2학기');
	// A past 학기, no today, or a 학기 the range rule does not know: the bare label.
	assert.equal(semesterOptionLabel({ year: 2025, semester_num: 2 }, '2026-11-02'), '2025-2학기');
	assert.equal(semesterOptionLabel(spring, ''), '2027-1학기');
	assert.equal(semesterOptionLabel({ year: 2027, semester_num: 3 }, '2026-11-02'), '2027-3학기');
});

// 다양성 응답(stats/diversity?bucket=month)의 모양: summary.genre 와 응답의 total_plays.
const diversityAnswer = (start, total, labels, values) => ({
	filters: { start, end: '2026-12-31', bucket: 'month' },
	total_plays: total,
	timeline: [],
	summary: {
		era: { labels: ['낭만'], values: [total] },
		genre: { labels, values },
		unique_works: 3
	}
});
const nowDiv = diversityAnswer('2026-09-01', 24, ['교향곡', '협주곡', '기타'], [3, 7, 14]);
const beforeDiv = diversityAnswer('2026-03-01', 29, ['교향곡', '독주곡'], [4, 25]);

test('genrePair turns both 다양성 answers into 장르 envelopes', () => {
	const pair = genrePair({ current: nowDiv, previous: beforeDiv, previousError: null });
	assert.deepEqual(pair, {
		current: genreDistribution(nowDiv),
		previous: genreDistribution(beforeDiv),
		previousError: null
	});
	assert.deepEqual(pair.current.labels, ['교향곡', '협주곡', '기타']);
	assert.deepEqual(pair.current.values, [3, 7, 14]);
	assert.equal(pair.current.total_plays, 24);
	assert.deepEqual(pair.previous.labels, ['교향곡', '독주곡']);
	assert.equal(pair.previous.total_plays, 29);
	assert.equal(
		mixSubtitle(pair, '2026-2학기', '2026-1학기'),
		'2026-2학기 총 24곡 · 지난 학기(2026-1학기) 총 29곡'
	);
});

test('genrePair keeps a failed previous 학기 and its retry', () => {
	const error = new Error('diversity 500');
	const failed = genrePair({ current: nowDiv, previous: null, previousError: error });
	assert.equal(failed.previous, null);
	assert.equal(failed.previousError, error);
	assert.equal(
		mixSubtitle(failed, '2026-2학기', '2026-1학기'),
		'2026-2학기 총 24곡 · 지난 학기(2026-1학기)를 불러오지 못했습니다'
	);
	const retrying = genrePair({
		current: nowDiv,
		previous: null,
		previousError: error,
		retryingPrevious: true
	});
	assert.equal(retrying.retryingPrevious, true);
	assert.equal(retrying.previousError, error);
	assert.equal(
		mixSubtitle(retrying, '2026-2학기', '2026-1학기'),
		'2026-2학기 총 24곡 · 지난 학기(2026-1학기)를 불러오지 못했습니다'
	);
});

test('genrePair: no answer yet gives null, the oldest 학기 has no previous', () => {
	assert.equal(genrePair(null), null);
	assert.equal(genrePair(undefined), null);
	assert.equal(mixSubtitle(genrePair(undefined), '2026-2학기', ''), '2026-2학기');
	const oldest = genrePair({ current: nowDiv, previous: null, previousError: null });
	assert.equal(oldest.previous, null);
	assert.equal(mixSubtitle(oldest, '2025-2학기', ''), '2025-2학기 총 24곡 · 지난 학기 없음');
});

// 시대 카드도 다양성 응답의 짝으로 그린다(summary.era + 총계에서 모자란 '미상', stats/eras 와 같은 수).
const eraDiv = (start, total, labels, values, share) => ({
	...diversityAnswer(start, total, ['교향곡'], [total]),
	summary: {
		era: { labels, values, unknown_share: share },
		genre: { labels: ['교향곡'], values: [total] },
		unique_works: 3
	}
});
const nowEras = eraDiv('2026-09-01', 24, ['바로크', '낭만'], [6, 12], 0.25);
const beforeEras = eraDiv('2026-03-01', 29, ['고전', '낭만'], [9, 20], 0);

test('eraPair turns both 다양성 answers into 시대 envelopes', () => {
	const pair = eraPair({ current: nowEras, previous: beforeEras, previousError: null });
	assert.deepEqual(pair, {
		current: eraDistribution(nowEras),
		previous: eraDistribution(beforeEras),
		previousError: null
	});
	assert.deepEqual(pair.current.labels, ['바로크', '낭만', '미상']);
	assert.deepEqual(pair.current.values, [6, 12, 6]);
	assert.equal(pair.current.unknown_share, 0.25);
	assert.deepEqual(pair.previous.labels, ['고전', '낭만']);
	assert.deepEqual(pair.previous.values, [9, 20]);
	assert.equal(
		mixSubtitle(pair, '2026-2학기', '2026-1학기'),
		'2026-2학기 총 24곡 · 지난 학기(2026-1학기) 총 29곡'
	);
	assert.deepEqual(
		mixTable(pair.current, pair.previous, '시대').rows.map((row) => row[0]),
		['바로크', '고전', '낭만', '미상']
	);
});

test('eraPair keeps a failed previous 학기 and the oldest 학기 has no previous', () => {
	const error = new Error('diversity 500');
	const failed = eraPair({ current: nowEras, previous: null, previousError: error });
	assert.equal(failed.previous, null);
	assert.equal(failed.previousError, error);
	assert.equal(
		mixSubtitle(failed, '2026-2학기', '2026-1학기'),
		'2026-2학기 총 24곡 · 지난 학기(2026-1학기)를 불러오지 못했습니다'
	);
	const retrying = eraPair({
		current: nowEras,
		previous: null,
		previousError: error,
		retryingPrevious: true
	});
	assert.equal(retrying.retryingPrevious, true);
	const oldest = eraPair({ current: nowEras, previous: null, previousError: null });
	assert.equal(oldest.previous, null);
	assert.equal(mixSubtitle(oldest, '2025-2학기', ''), '2025-2학기 총 24곡 · 지난 학기 없음');
});

test('eraPair: no answer yet gives null', () => {
	assert.equal(eraPair(null), null);
	assert.equal(eraPair(undefined), null);
	assert.equal(mixSubtitle(eraPair(undefined), '2026-2학기', ''), '2026-2학기');
});

// 다양성 응답(bucket=month)의 모양: 선곡이 있는 달만, 오래된 달부터.
const monthly = (end) => ({
	filters: { scope: 'all', semester_id: '3', start: '2026-09-01', end, bucket: 'month' },
	total_plays: 1250,
	timeline: {
		bucket: 'month',
		labels: ['2026-09', '2026-10', '2026-11'],
		plays: [1234, 10, 6],
		distinct_works: [987, 9, 1]
	}
});

test('monthlyTable is null without an answer or without months', () => {
	assert.equal(monthlyTable(null, '2026-11-01'), null);
	assert.equal(monthlyTable(undefined), null);
	const none = monthly('2027-02-28');
	none.timeline = { bucket: 'month', labels: [], plays: [], distinct_works: [] };
	assert.equal(monthlyTable(none, '2026-11-01'), null);
});

test('monthlyTable has a row per month: 월 | 선곡 | 곡', () => {
	const table = monthlyTable(monthly('2026-10-31'), '2026-11-01');
	assert.deepEqual(
		table.columns.map((c) => [c.name, Boolean(c.numeric)]),
		[
			['월', false],
			['선곡', true],
			['곡', true]
		]
	);
	assert.equal(table.rowHeader, 0);
	assert.deepEqual(table.rows, [
		['2026-09', '1,234', '987'],
		['2026-10', '10', '9'],
		['2026-11', '6', '1']
	]);
});

test('monthlyTable marks the month holding today while the 학기 runs', () => {
	assert.deepEqual(
		monthlyTable(monthly('2027-02-28'), '2026-11-01').rows.map((r) => r[0]),
		['2026-09', '2026-10', '2026-11 (진행 중)']
	);
	// 오늘이 학기의 마지막 날이어도 진행 중이다.
	assert.deepEqual(
		monthlyTable(monthly('2026-11-01'), '2026-11-01').rows.map((r) => r[0]),
		['2026-09', '2026-10', '2026-11 (진행 중)']
	);
	// 끝난 학기: 오늘이 마지막 달 안이어도 표시하지 않는다.
	assert.deepEqual(
		monthlyTable(monthly('2026-10-31'), '2026-11-15').rows.map((r) => r[0]),
		['2026-09', '2026-10', '2026-11']
	);
	// 오늘이 없으면 표시하지 않는다.
	assert.deepEqual(
		monthlyTable(monthly('2027-02-28')).rows.map((r) => r[0]),
		['2026-09', '2026-10', '2026-11']
	);
});

// 상위 10 의 동점 줄: 백엔드의 순위 응답(values 는 횟수, 내림차순)에서 보인 10 행 뒤의 같은 횟수.
const counts = (values) => ({ values });

test('tieNote is empty when the row after the cut has a smaller count', () => {
	assert.equal(
		tieNote(counts([13, 12, 11, 11, 10, 10, 10, 9, 9, 9, 8, 8]), 10, 100, '작곡가가', '명'),
		''
	);
});

test('tieNote is empty when the list has no more rows than are shown', () => {
	assert.equal(tieNote(counts([5, 4, 4]), 10, 100, '작곡가가', '명'), '');
	assert.equal(tieNote(counts([5, 4, 4, 3, 3, 3, 2, 2, 2, 2]), 10, 100, '작곡가가', '명'), '');
});

test('tieNote is empty without a list', () => {
	assert.equal(tieNote(null, 10, 100, '작곡가가', '명'), '');
	assert.equal(tieNote(undefined, 10, 100, '곡이', '곡'), '');
});

test('tieNote counts the composers the cut leaves out, with their shared rank', () => {
	// 2026-2학기 시드: 8~11번째가 모두 9회, 10 행에서 하나가 빠진다.
	assert.equal(
		tieNote(counts([13, 12, 11, 11, 10, 10, 10, 9, 9, 9, 9, 8]), 10, 100, '작곡가가', '명'),
		'9회로 공동 8위인 작곡가가 1명 더 있습니다'
	);
});

test("tieNote counts two hidden pieces with each card's noun and unit", () => {
	assert.equal(
		tieNote(counts([12, 10, 9, 8, 8, 8, 7, 7, 7, 7, 7, 7, 6]), 10, 100, '곡이', '곡'),
		'7회로 공동 7위인 곡이 2곡 더 있습니다'
	);
	assert.equal(
		tieNote(counts([9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1]), 10, 100, '오케스트라가', '곳'),
		'1회로 공동 10위인 오케스트라가 2곳 더 있습니다'
	);
});

test('tieNote says 이상 when the tie runs to the end of a list cut at the cap', () => {
	const full = [20, 15, 10, 5, ...Array(96).fill(2)];
	assert.equal(
		tieNote(counts(full), 10, 100, '곡이', '곡'),
		'2회로 공동 5위인 곡이 90곡 이상 더 있습니다'
	);
	// 상한보다 짧은 목록의 끝까지 이어지면 그것이 전부다.
	assert.equal(
		tieNote(counts(full.slice(0, 40)), 10, 100, '곡이', '곡'),
		'2회로 공동 5위인 곡이 30곡 더 있습니다'
	);
});

test('tieNote writes counts of 1,000 or more with a comma', () => {
	const values = [...Array(12).fill(1234)];
	assert.equal(
		tieNote(counts(values), 10, 100, '작곡가가', '명'),
		'1,234회로 공동 1위인 작곡가가 2명 더 있습니다'
	);
});
