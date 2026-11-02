import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	DRILL_CARDS,
	WORKS_LIMIT,
	barItemIndex,
	drillTarget,
	drillParams,
	workLabel,
	previousWorkCount,
	previousWorkValue,
	drillWorksTable,
	drillSubtitle,
	drillStatusText,
	readDrillQuery,
	writeDrillQuery,
	drillItemIndex
} from '../../src/lib/statDrill.js';
import { tableCsv } from '../../src/lib/csvTable.js';

const composers = {
	labels: ['가', '나', '다'],
	values: [9, 5, 2],
	items: [
		{ id: 7, name: '가', count: 9 },
		{ id: 3, name: '나', count: 5 },
		{ id: 11, name: '다', count: 2 }
	]
};

test('the four ranking cards drill down by their own id parameter', () => {
	assert.deepEqual(
		Object.fromEntries(Object.entries(DRILL_CARDS).map(([card, spec]) => [card, spec.param])),
		{
			composers: 'composer_id',
			soloists: 'player_id',
			conductors: 'conductor_id',
			orchestras: 'orchestra_id'
		}
	);
});

test('the top bar (last drawn) maps back to the first item', () => {
	assert.equal(barItemIndex(2, 3), 0);
	assert.equal(barItemIndex(0, 3), 2);
	assert.equal(barItemIndex(1, 3), 1);
	assert.equal(barItemIndex(0, 1), 0);
});

test('an index outside the bars maps to nothing', () => {
	for (const dataIndex of [-1, 3, 1.5, undefined, null, '1', NaN]) {
		assert.equal(barItemIndex(dataIndex, 3), -1, String(dataIndex));
	}
	assert.equal(barItemIndex(0, 0), -1);
});

test('a target carries the item id and name, never just the label', () => {
	assert.deepEqual(drillTarget('composers', composers, barItemIndex(2, 3)), {
		card: 'composers',
		param: 'composer_id',
		noun: '작곡가',
		id: 7,
		name: '가'
	});
});

test('two items with the same name keep their own ids', () => {
	const conductors = {
		items: [
			{ id: 5, name: '같은 이름', count: 4 },
			{ id: 6, name: '같은 이름', count: 4 }
		]
	};
	assert.equal(drillTarget('conductors', conductors, 0)?.id, 5);
	assert.equal(drillTarget('conductors', conductors, 1)?.id, 6);
});

test('no target for other cards, missing items or a missing id', () => {
	assert.equal(drillTarget('eras', composers, 0), null);
	assert.equal(drillTarget('composers', null, 0), null);
	assert.equal(drillTarget('composers', { items: [] }, 0), null);
	assert.equal(drillTarget('composers', composers, -1), null);
	assert.equal(drillTarget('composers', composers, 3), null);
	assert.equal(drillTarget('orchestras', { items: [{ id: null, name: '?', count: 1 }] }, 0), null);
});

test('the works request sends the id filter and the largest page', () => {
	const target = drillTarget('soloists', { items: [{ id: 42, name: '연주자 (피아노)' }] }, 0);
	assert.ok(target);
	assert.deepEqual(drillParams(target), { player_id: '42', limit: String(WORKS_LIMIT) });
	assert.equal(WORKS_LIMIT, 100);
});

test("a composer's panel drops the repeated composer name from its works", () => {
	const target = drillTarget('composers', composers, 0);
	assert.ok(target);
	assert.equal(workLabel({ name: '가 - 교향곡 1번', composer_id: 7 }, target), '교향곡 1번');
	// Another composer with a name that starts the same way keeps its label.
	assert.equal(workLabel({ name: '가 - 교향곡 1번', composer_id: 8 }, target), '가 - 교향곡 1번');
	assert.equal(workLabel({ name: '교향곡 1번', composer_id: 7 }, target), '교향곡 1번');
});

test('other panels keep the composer in each work', () => {
	const target = drillTarget('conductors', { items: [{ id: 7, name: '가' }] }, 0);
	assert.ok(target);
	assert.equal(workLabel({ name: '가 - 교향곡 1번', composer_id: 7 }, target), '가 - 교향곡 1번');
});

test('previousWorkCount: the count by id, 0 when absent, unknown when the list was cut', () => {
	const previous = {
		items: [
			{ id: 7, count: 4 },
			{ id: 8, count: 1 }
		]
	};
	assert.equal(previousWorkCount(previous, 7), 4);
	assert.equal(previousWorkCount(previous, 9), 0);
	assert.equal(previousWorkCount({ total_plays: 0, items: [] }, 7), 0);
	const cut = { items: Array.from({ length: WORKS_LIMIT }, (_, i) => ({ id: 100 + i, count: 1 })) };
	assert.equal(previousWorkCount(cut, 100), 1);
	assert.equal(previousWorkCount(cut, 7), null);
});

test('drillWorksTable: 순위, 곡, 횟수, 처음, 마지막, with the composer dropped from its own panel', () => {
	const target = drillTarget('composers', { items: [{ id: 7, name: '가' }] }, 0);
	assert.ok(target);
	const works = {
		items: [
			{
				id: 1,
				name: '가 - 교향곡 1번',
				count: 1234,
				composer_id: 7,
				first_played: '2019-03-04',
				last_played: '2026-10-30'
			},
			{
				id: 2,
				name: '가 - 소품',
				count: 3,
				composer_id: 7,
				first_played: '2025-09-01',
				last_played: '2026-05-12'
			},
			{
				id: 3,
				name: '나 - 소품',
				count: 3,
				composer_id: 8,
				first_played: '2026-01-02',
				last_played: '2026-01-02'
			}
		]
	};
	assert.deepEqual(drillWorksTable(works, target), {
		columns: [
			{ name: '순위', numeric: true },
			{ name: '곡' },
			{ name: '횟수', numeric: true },
			{ name: '처음', numeric: true },
			{ name: '마지막', numeric: true }
		],
		rowHeader: 1,
		rows: [
			['1', '교향곡 1번', '1,234', '2019-03-04', '2026-10-30'],
			['2', '소품', '3', '2025-09-01', '2026-05-12'],
			['2', '나 - 소품', '3', '2026-01-02', '2026-01-02']
		]
	});
	const conductor = drillTarget('conductors', { items: [{ id: 7, name: '가' }] }, 0);
	assert.ok(conductor);
	assert.deepEqual(
		drillWorksTable(works, conductor).rows.map((row) => row[1]),
		['가 - 교향곡 1번', '가 - 소품', '나 - 소품']
	);
	assert.deepEqual(drillWorksTable({ items: [] }, target).rows, []);
});

test('drillWorksTable: a missing date shows as —, and the CSV keeps the dates as text', () => {
	const target = drillTarget('conductors', { items: [{ id: 5, name: '지휘자' }] }, 0);
	assert.ok(target);
	const works = {
		items: [
			{
				id: 1,
				name: 'A - 교향곡',
				count: 1200,
				composer_id: 1,
				first_played: '2020-03-02',
				last_played: '2026-10-29'
			},
			{ id: 2, name: 'B - 소품', count: 2, composer_id: 2, first_played: null, last_played: null },
			{ id: 3, name: 'C - 서곡', count: 1, composer_id: 3 }
		]
	};
	const table = drillWorksTable(works, target);
	assert.deepEqual(
		table.rows.map((row) => row.slice(3)),
		[
			['2020-03-02', '2026-10-29'],
			['—', '—'],
			['—', '—']
		]
	);
	assert.deepEqual(tableCsv(table), {
		headers: ['순위', '곡', '횟수', '처음', '마지막'],
		rows: [
			['1', 'A - 교향곡', '1200', '2020-03-02', '2026-10-29'],
			['2', 'B - 소품', '2', '—', '—'],
			['3', 'C - 서곡', '1', '—', '—']
		]
	});
	const previous = { items: [{ id: 1, count: 1500 }] };
	assert.deepEqual(tableCsv(drillWorksTable(works, target, previous)), {
		headers: ['순위', '곡', '횟수', '처음', '마지막', '지난 학기'],
		rows: [
			['1', 'A - 교향곡', '1200', '2020-03-02', '2026-10-29', '1500'],
			['2', 'B - 소품', '2', '—', '—', '0'],
			['3', 'C - 서곡', '1', '—', '—', '0']
		]
	});
});

test('drillWorksTable with the previous 학기 adds 지난 학기, matched by id', () => {
	const target = drillTarget('soloists', { items: [{ id: 4, name: '연주자' }] }, 0);
	assert.ok(target);
	// 이름이 같은 두 곡(id 2, 3): 지난 학기 칸은 id 로 맞춘다.
	const works = {
		items: [
			{
				id: 2,
				name: 'C - 가',
				count: 5,
				composer_id: 1,
				first_played: '2024-03-05',
				last_played: '2026-10-01'
			},
			{
				id: 3,
				name: 'C - 가',
				count: 4,
				composer_id: 1,
				first_played: '2025-04-01',
				last_played: '2026-09-30'
			},
			{
				id: 9,
				name: 'D - 나',
				count: 1,
				composer_id: 2,
				first_played: '2026-09-15',
				last_played: '2026-09-15'
			}
		]
	};
	const previous = {
		items: [
			{ id: 3, count: 1234 },
			{ id: 2, count: 1 }
		]
	};
	const table = drillWorksTable(works, target, previous);
	assert.deepEqual(table.columns.at(-1), { name: '지난 학기', numeric: true });
	assert.deepEqual(
		table.columns.map((column) => column.name),
		['순위', '곡', '횟수', '처음', '마지막', '지난 학기']
	);
	assert.deepEqual(table.rows, [
		['1', 'C - 가', '5', '2024-03-05', '2026-10-01', '1'],
		['2', 'C - 가', '4', '2025-04-01', '2026-09-30', '1,234'],
		['3', 'D - 나', '1', '2026-09-15', '2026-09-15', '0']
	]);
	// 앞 학기 목록이 WORKS_LIMIT 에서 잘렸으면 그 안에 없는 곡은 알 수 없다.
	const cut = { items: Array.from({ length: WORKS_LIMIT }, (_, i) => ({ id: 100 + i, count: 1 })) };
	assert.deepEqual(
		drillWorksTable(works, target, cut).rows.map((row) => row[5]),
		['—', '—', '—']
	);
	assert.deepEqual(drillWorksTable(works, target, null), drillWorksTable(works, target));
});

const read = (search) => readDrillQuery(new URLSearchParams(search));
const written = (search, target) => {
	const params = new URLSearchParams(search);
	writeDrillQuery(params, target);
	return params.toString();
};

test('an open panel is kept as its card and id', () => {
	assert.deepEqual(read('drill=composers&drill_id=7'), { card: 'composers', id: 7 });
	assert.deepEqual(read('scope=all&drill=orchestras&drill_id=12&bucket=week'), {
		card: 'orchestras',
		id: 12
	});
	for (const card of Object.keys(DRILL_CARDS)) {
		assert.deepEqual(read(`drill=${card}&drill_id=3`), { card, id: 3 }, card);
	}
});

test('no panel without both keys or with an invalid value', () => {
	for (const search of [
		'',
		'drill=composers',
		'drill_id=7',
		'drill=eras&drill_id=7',
		'drill=toString&drill_id=7',
		'drill=Composers&drill_id=7',
		'drill=composers&drill_id=0',
		'drill=composers&drill_id=-7',
		'drill=composers&drill_id=07',
		'drill=composers&drill_id=7.5',
		'drill=composers&drill_id=abc',
		'drill=composers&drill_id=99999999999999999999'
	]) {
		assert.equal(read(search), null, search);
	}
});

test('writing a panel sets both keys and keeps the other parameters', () => {
	assert.equal(
		written('scope=individual&user_id=2', { card: 'conductors', id: 5 }),
		'scope=individual&user_id=2&drill=conductors&drill_id=5'
	);
	// A target from drillTarget (with param, noun and name) writes only the card and id.
	const target = drillTarget('composers', composers, 0);
	assert.equal(written('bucket=week', target), 'bucket=week&drill=composers&drill_id=7');
	assert.deepEqual(read(written('', target)), { card: 'composers', id: 7 });
});

test('a closed panel removes both keys', () => {
	assert.equal(written('drill=composers&drill_id=7&bucket=week', null), 'bucket=week');
	assert.equal(written('semester_id=3', null), 'semester_id=3');
	assert.equal(
		written('drill=composers&drill_id=7', { card: 'soloists', id: 4 }),
		'drill=soloists&drill_id=4'
	);
});

test('a linked id is found among the card items by id, not by name', () => {
	assert.equal(drillItemIndex(composers, 7), 0);
	assert.equal(drillItemIndex(composers, 11), 2);
	const conductors = {
		items: [
			{ id: 5, name: '같은 이름', count: 4 },
			{ id: 6, name: '같은 이름', count: 4 }
		]
	};
	assert.equal(drillItemIndex(conductors, 6), 1);
	assert.deepEqual(drillTarget('conductors', conductors, drillItemIndex(conductors, 6)), {
		card: 'conductors',
		param: 'conductor_id',
		noun: '지휘자',
		id: 6,
		name: '같은 이름'
	});
});

test('a linked id that is not among the items is not found', () => {
	assert.equal(drillItemIndex(composers, 8), -1);
	assert.equal(drillItemIndex({ items: [] }, 7), -1);
	assert.equal(drillItemIndex({ items: [{ id: null, name: '?' }] }, 7), -1);
	assert.equal(drillItemIndex(null, 7), -1);
	assert.equal(drillItemIndex({}, 7), -1);
	assert.equal(drillTarget('composers', composers, drillItemIndex(composers, 8)), null);
});

test('previousWorkValue: 첫 선곡 for a piece first played on or after the 학기 start, else the count', () => {
	const previous = { items: [{ id: 7, count: 6 }] };
	const start = '2026-03-01';
	// 학기 첫날도 이 학기다.
	assert.equal(
		previousWorkValue(previous, { id: 1, first_played: '2026-03-01' }, start),
		'첫 선곡'
	);
	assert.equal(
		previousWorkValue(previous, { id: 1, first_played: '2026-05-02' }, start),
		'첫 선곡'
	);
	assert.equal(previousWorkValue(previous, { id: 1, first_played: '2026-02-28' }, start), 0);
	assert.equal(previousWorkValue(previous, { id: 7, first_played: '2025-09-02' }, start), 6);
	// first_played 가 없으면(옛 백엔드) 표시하지 않는다.
	assert.equal(previousWorkValue(previous, { id: 1, first_played: null }, start), 0);
	assert.equal(previousWorkValue(previous, { id: 1 }, start), 0);
	assert.equal(previousWorkValue(previous, { id: 1, first_played: '' }, start), 0);
	// start 가 없으면 지금처럼 횟수.
	for (const none of [undefined, null, ''])
		assert.equal(previousWorkValue(previous, { id: 1, first_played: '2026-05-02' }, none), 0);
	// 앞 학기 목록이 잘렸어도 이 학기에 처음 튼 곡은 앞 학기에 없었다: '—' 가 아니라 '첫 선곡'.
	const cut = { items: Array.from({ length: WORKS_LIMIT }, (_, i) => ({ id: 100 + i, count: 1 })) };
	assert.equal(previousWorkValue(cut, { id: 1, first_played: '2026-03-01' }, start), '첫 선곡');
	assert.equal(previousWorkValue(cut, { id: 1, first_played: '2026-02-28' }, start), null);
	assert.equal(previousWorkValue(cut, { id: 100, first_played: '2020-01-01' }, start), 1);
});

test('drillWorksTable: 지난 학기 says 첫 선곡 for pieces first played in this 학기, and the CSV keeps it', () => {
	const target = drillTarget('composers', { items: [{ id: 7, name: '가' }] }, 0);
	assert.ok(target);
	const items = [
		{ id: 1, name: '가 - 교향곡', count: 8, composer_id: 7, first_played: '2025-09-08' },
		{ id: 2, name: '가 - 신곡', count: 4, composer_id: 7, first_played: '2026-05-02' },
		{ id: 3, name: '가 - 서곡', count: 2, composer_id: 7, first_played: '2026-02-28' },
		{ id: 4, name: '가 - 개막곡', count: 1, composer_id: 7, first_played: '2026-03-01' },
		{ id: 5, name: '가 - 소품', count: 1, composer_id: 7, first_played: null },
		{ id: 6, name: '가 - 소곡', count: 1, composer_id: 7 }
	];
	const works = { filters: { semester_id: '3', start: '2026-03-01' }, items };
	const previous = { items: [{ id: 1, count: 6 }] };
	const table = drillWorksTable(works, target, previous);
	assert.deepEqual(
		table.rows.map((row) => row.at(-1)),
		['6', '첫 선곡', '0', '첫 선곡', '0', '0']
	);
	assert.deepEqual(
		tableCsv(table).rows.map((row) => row.at(-1)),
		['6', '첫 선곡', '0', '첫 선곡', '0', '0']
	);
	// 앞 학기 목록이 잘렸으면: 이 학기에 처음 튼 곡은 '첫 선곡', 나머지 없는 곡은 '—'.
	const cut = { items: Array.from({ length: WORKS_LIMIT }, (_, i) => ({ id: 100 + i, count: 1 })) };
	assert.deepEqual(
		drillWorksTable(works, target, cut).rows.map((row) => row.at(-1)),
		['—', '첫 선곡', '—', '첫 선곡', '—', '—']
	);
	// filters 나 start 가 없으면 지금처럼 횟수만.
	for (const other of [{ items }, { filters: { scope: 'all' }, items }])
		assert.deepEqual(
			drillWorksTable(other, target, previous).rows.map((row) => row.at(-1)),
			['6', '0', '0', '0', '0', '0']
		);
	// 앞 학기가 없으면 칸이 없다.
	assert.equal(drillWorksTable(works, target).columns.length, 5);
});

test('drillSubtitle: 대상 · 범위 · 총 N곡, with 지난 학기 N곡 right after it once the previous 학기 has loaded', () => {
	const target = { noun: '작곡가' };
	const scope = '2025-2학기 · 전체';
	const works = (total, n) => ({
		total_plays: total,
		items: Array.from({ length: n }, (_, i) => ({ id: i + 1, count: 1 }))
	});
	const dates = ' · 처음·마지막은 전체 기록 기준';
	// still loading: the target and the scope only, with or without the previous 학기
	assert.equal(drillSubtitle(target, scope, null), '작곡가 · 2025-2학기 · 전체');
	assert.equal(
		drillSubtitle(target, scope, null, { total_plays: 21, items: [] }),
		'작곡가 · 2025-2학기 · 전체'
	);
	// no previous 학기: as before
	assert.equal(drillSubtitle(target, scope, works(0, 0)), '작곡가 · 2025-2학기 · 전체 · 총 0곡');
	assert.equal(
		drillSubtitle(target, scope, works(34, 3)),
		`작곡가 · 2025-2학기 · 전체 · 총 34곡${dates}`
	);
	assert.equal(
		drillSubtitle(target, scope, works(412, WORKS_LIMIT), null),
		`작곡가 · 2025-2학기 · 전체 · 총 412곡 · 상위 ${WORKS_LIMIT}곡${dates}`
	);
	// the previous 학기's total, 0 included
	assert.equal(
		drillSubtitle(target, scope, works(34, 3), { total_plays: 21, items: [] }),
		`작곡가 · 2025-2학기 · 전체 · 총 34곡 · 지난 학기 21곡${dates}`
	);
	assert.equal(
		drillSubtitle({ noun: '작곡가' }, '2025-2학기 · 가상이', works(5, 2), {
			total_plays: 0,
			items: []
		}),
		`작곡가 · 2025-2학기 · 가상이 · 총 5곡 · 지난 학기 0곡${dates}`
	);
	assert.equal(
		drillSubtitle(target, scope, works(412, WORKS_LIMIT), { total_plays: 300, items: [] }),
		`작곡가 · 2025-2학기 · 전체 · 총 412곡 · 지난 학기 300곡 · 상위 ${WORKS_LIMIT}곡${dates}`
	);
	// empty panel (opened from a link): no 처음·마지막 clause
	assert.equal(
		drillSubtitle(target, scope, works(0, 0), { total_plays: 12, items: [] }),
		'작곡가 · 2025-2학기 · 전체 · 총 0곡 · 지난 학기 12곡'
	);
	// thousands on both sides
	assert.equal(
		drillSubtitle(target, scope, works(1234, 3), { total_plays: 1234, items: [] }),
		`작곡가 · 2025-2학기 · 전체 · 총 1,234곡 · 지난 학기 1,234곡${dates}`
	);
	// a previous answer without a numeric total adds nothing
	for (const previous of [{}, { total_plays: null }, { total_plays: '21' }, { total_plays: NaN }])
		assert.equal(
			drillSubtitle(target, scope, works(34, 3), previous),
			`작곡가 · 2025-2학기 · 전체 · 총 34곡${dates}`
		);
});

test('drillStatusText is empty while the panel loads', () => {
	const works = { items: [{ id: 1 }] };
	assert.equal(drillStatusText('브람스', { loading: true, error: '', works: null }), '');
	// a retry keeps the old answer until it settles: still empty
	assert.equal(drillStatusText('브람스', { loading: true, error: '', works }), '');
});

test('drillStatusText names the panel that failed and its 다시 시도', () => {
	assert.equal(
		drillStatusText('브람스', { loading: false, error: '불러오지 못했습니다', works: null }),
		'브람스의 곡을 불러오지 못했습니다. 다시 시도로 다시 부를 수 있습니다.'
	);
});

test("drillStatusText counts the table's rows once loaded", () => {
	const works = (n) => ({
		total_plays: n * 3,
		items: Array.from({ length: n }, (_, i) => ({ id: i }))
	});
	assert.equal(
		drillStatusText('브람스', { loading: false, error: '', works: works(12) }),
		'브람스의 곡 12개를 불러왔습니다.'
	);
	assert.equal(
		drillStatusText('가상 관현악단 01', { works: works(1) }),
		'가상 관현악단 01의 곡 1개를 불러왔습니다.'
	);
	assert.equal(
		drillStatusText('브람스', { works: works(1200) }),
		`브람스의 곡 ${(1200).toLocaleString()}개를 불러왔습니다.`
	);
});

test('drillStatusText says when the period has no plays', () => {
	assert.equal(
		drillStatusText('브람스', { loading: false, error: '', works: { total_plays: 0, items: [] } }),
		'브람스의 곡: 이 기간에는 선곡이 없습니다.'
	);
});

test('drillStatusText adds the failed 지난 학기 under a loaded table only', () => {
	const works = { items: [{ id: 1 }, { id: 2 }] };
	const previousError = '2026-1학기';
	assert.equal(
		drillStatusText('브람스', { loading: false, error: '', works, previousError }),
		'브람스의 곡 2개를 불러왔습니다. 지난 학기(2026-1학기) 횟수를 불러오지 못했습니다.'
	);
	// the 지난 학기 note shows only under a table (DrillPanel.svelte)
	assert.equal(drillStatusText('브람스', { loading: true, works, previousError }), '');
	assert.equal(
		drillStatusText('브람스', { error: '불러오지 못했습니다', works: null, previousError }),
		'브람스의 곡을 불러오지 못했습니다. 다시 시도로 다시 부를 수 있습니다.'
	);
	assert.equal(
		drillStatusText('브람스', { works: { items: [] }, previousError }),
		'브람스의 곡: 이 기간에는 선곡이 없습니다.'
	);
	// 다시 시도 on the note clears previousError: the clause goes
	assert.equal(
		drillStatusText('브람스', { works, previousError: '' }),
		'브람스의 곡 2개를 불러왔습니다.'
	);
});

test('drillStatusText is empty with no answer, no load and no error', () => {
	// 개인 범위에 지기를 고르지 않으면 패널은 부르지 않는다.
	assert.equal(drillStatusText('브람스', { loading: false, error: '', works: null }), '');
	assert.equal(drillStatusText('브람스', { works: null, previousError: '2026-1학기' }), '');
});
