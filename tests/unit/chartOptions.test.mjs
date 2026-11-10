import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	timelineOption,
	countBarOption,
	diversityLineOption,
	eraPieOption,
	horizontalBarOption,
	markBar
} from '../../src/lib/chartOptions.js';
import { shareTable, SHARE_PRECISION } from '../../src/lib/statTable.js';

const labels = ['2025-1학기', '2025-2학기', '2026-1학기', '2026-2학기'];
const series = [
	{ name: '시대 다양성', values: [0.8, 0.7, 0.9, 0.6] },
	{ name: '장르 다양성', values: [0.5, 0.6, 0.6, 0.4] }
];

test('line charts keep their first and last x labels inside the canvas', () => {
	for (const option of [
		timelineOption({ labels, values: [3, 1, 4, 1] }, '학기별 선곡 추이', '전체'),
		diversityLineOption(labels, series, '월별 다양성 추이', '0=편중 · 1=고름')
	]) {
		assert.equal(option.xAxis.boundaryGap, false);
		assert.equal(option.xAxis.axisLabel.alignMinLabel, 'left');
		assert.equal(option.xAxis.axisLabel.alignMaxLabel, 'right');
	}
});

test('a running or cut bucket is drawn on two lines, its mark under its date', () => {
	const marked = ['2026-10-19', '2026-10-26 (진행 중)'];
	for (const option of [
		timelineOption({ labels: marked, values: [3, 1] }, '주별 선곡 추이', '이번 학기'),
		countBarOption({ labels: marked, values: [3, 1] }, '주별 선곡 수', '이번 학기'),
		diversityLineOption(marked, series, '주별 다양성 추이', '0=편중 · 1=고름')
	]) {
		const name = option.xAxis.axisLabel.formatter;
		assert.equal(name('2026-10-26 (진행 중)'), '2026-10-26\n(진행 중)');
		assert.equal(name('2026-2학기 (진행 중)'), '2026-2학기\n(진행 중)');
		assert.equal(name('2026-11 (진행 중)'), '2026-11\n(진행 중)');
		// 기간이 자른 버킷(timelineView)도 같은 자리에
		assert.equal(name('2026-04 (4/15부터)'), '2026-04\n(4/15부터)');
		assert.equal(name('2026-08-31 (8/31까지)'), '2026-08-31\n(8/31까지)');
		assert.equal(name('2026-04-13 (4/15~4/17)'), '2026-04-13\n(4/15~4/17)');
		assert.equal(name('2026-2학기 (10/14까지)'), '2026-2학기\n(10/14까지)');
		for (const plain of ['2026-10-19', '2026-1학기', '2026-09']) assert.equal(name(plain), plain);
		// 카테고리 값(툴팁, 표로 보기, CSV 가 읽는 것)은 한 줄 그대로
		assert.deepEqual(option.xAxis.data, marked);
	}
});

test('time charts always name their newest bucket, and the bar chart keeps every name inside', () => {
	const bar = countBarOption({ labels, values: [3, 1, 4, 1] }, '월별 선곡 수', '전체');
	for (const option of [
		timelineOption({ labels, values: [3, 1, 4, 1] }, '학기별 선곡 추이', '전체'),
		bar,
		diversityLineOption(labels, series, '월별 다양성 추이', '0=편중 · 1=고름')
	]) {
		assert.equal(option.xAxis.axisLabel.showMaxLabel, true);
	}
	// 막대 밑 가운데에 놓이는 첫·마지막 이름이 캔버스 밖으로 나가지 않도록: 어림(containLabel)이 아니라
	// 그려진 축 이름을 모두 재는 outerBounds
	assert.equal(bar.grid.outerBoundsMode, 'same');
	assert.equal(bar.grid.outerBoundsContain, 'axisLabel');
	assert.equal('containLabel' in bar.grid, false);
});

test('line charts always name their first bucket too, leaving out a neighbour it would collide with', () => {
	for (const option of [
		timelineOption({ labels, values: [3, 1, 4, 1] }, '주별 선곡 추이', '2026-03-03 ~ 2026-06-28'),
		diversityLineOption(labels, series, '주별 다양성 추이', '0%=편중 · 100%=고름')
	]) {
		const axisLabel = option.xAxis.axisLabel;
		assert.equal(axisLabel.showMinLabel, true);
		assert.equal(axisLabel.hideOverlap, true);
		// 첫 이름은 첫 점 밑에 왼쪽 정렬, 마지막 이름도 그대로
		assert.equal(axisLabel.alignMinLabel, 'left');
		assert.equal(axisLabel.showMaxLabel, true);
	}
	// 막대 차트는 그대로(이름을 모두 재는 outerBounds 로 이미 첫 버킷을 그린다)
	const bar = countBarOption({ labels, values: [3, 1, 4, 1] }, '주별 선곡 수', '전체');
	assert.equal('showMinLabel' in bar.xAxis.axisLabel, false);
});

test('diversity legend sits below the subtitle, and the plot below the legend', () => {
	const option = diversityLineOption(labels, series, '월별 다양성 추이', '0=편중 · 1=고름');
	// 부제는 위에서 약 45~62px 를 차지한다(범례가 48 이면 그 위에 겹쳤다).
	assert.ok(option.legend.top >= 64, `legend.top ${option.legend.top}`);
	assert.ok(option.grid.top - option.legend.top >= 38, `grid.top ${option.grid.top}`);
});

test('the diversity chart keeps its 0~1 data but reads in %, as the tiles above it', () => {
	const option = diversityLineOption(labels, series, '월별 다양성 추이', '0%=편중 · 100%=고름');
	assert.equal(option.yAxis.min, 0);
	assert.equal(option.yAxis.max, 1);
	const axis = option.yAxis.axisLabel.formatter;
	assert.deepEqual(
		[0, 0.4, 0.6000000000000001, 1].map((v) => axis(v)),
		['0%', '40%', '60%', '100%']
	);
	const tip = option.tooltip.valueFormatter;
	assert.equal(tip(0.4096), '41%');
	assert.equal(tip(0), '0%');
	assert.equal(tip(null), '—');
	assert.equal(tip(undefined), '—');
	assert.equal(tip('-'), '—');
	assert.equal(option.tooltip.trigger, 'axis');
	assert.deepEqual(option.series[0].data, [0.8, 0.7, 0.9, 0.6]);
});

test('without a subtitle the diversity legend stays right under the title', () => {
	const option = diversityLineOption(labels, series, '월별 다양성 추이', '');
	assert.equal(option.legend.top, 34);
	assert.equal(option.grid.top, 72);
});

test('pie slice labels fit between the subtitle and the legend of a 340px card', () => {
	const option = eraPieOption(
		{ labels: ['바로크', '고전', '낭만'], values: [3, 1, 6] },
		'시대별 분포',
		'전체 · 총 10곡'
	);
	const [series] = option.series;
	const pct = (s) => Number.parseFloat(s) / 100;
	// 카드 캔버스 340px: 부제는 ~60px 에서 끝나고 범례는 ~320px 에서 시작한다.
	// 맨 위·맨 아래 조각의 이름표는 인출선(ECharts 기본 15px) 끝에 두 줄(~26px)로 놓인다.
	const height = 340;
	const outer = (pct(series.radius[1]) * height) / 2;
	const cy = pct(series.center[1]) * height;
	const reach = outer + 15 + 13;
	assert.ok(cy - reach >= 60, `labels reach up to ${cy - reach}px`);
	assert.ok(cy + reach <= 320, `labels reach down to ${cy + reach}px`);
	assert.equal(option.legend.bottom, 0);
});

test('pie labels and tooltips print the share as the table does (one decimal)', () => {
	const data = { labels: ['바로크', '고전'], values: [3, 1] };
	const option = eraPieOption(data, '시대별 분포', '전체 · 총 4곡');
	const [series] = option.series;
	// ECharts 가 percentPrecision 자리로 나눈 비율(percent)을 넘긴다.
	assert.equal(series.percentPrecision, SHARE_PRECISION);
	const rows = shareTable(data, '시대').rows;
	assert.equal(series.label.formatter({ name: '바로크', percent: 75 }), `바로크\n${rows[0][2]}`);
	assert.equal(
		option.tooltip.formatter({ name: '고전', value: 1, percent: 25 }),
		`고전: 1곡 (${rows[1][2]})`
	);
	assert.equal(series.label.formatter({ name: '고전', percent: 18.8 }), '고전\n18.8%');
});

test('pie tooltips escape the name, as the string template did', () => {
	const option = eraPieOption({ labels: ['<b>&'], values: [1] }, '', '');
	assert.equal(
		option.tooltip.formatter({ name: '<b>&', value: 1, percent: 100 }),
		'&#60;b&#62;&#38;: 1곡 (100.0%)'
	);
});

test('pie slices and their labels show the arrow (they open nothing); bars keep the hand', () => {
	const pie = eraPieOption({ labels: ['바로크', '고전'], values: [3, 1] }, '시대별 분포', '');
	const [slices] = pie.series;
	// zrender 의 기본 커서는 'pointer' 다. 이름표는 따로 그려지는 글자라 silent 여야 한다.
	assert.equal(slices.cursor, 'default');
	assert.equal(slices.label.silent, true);
	// 막대와 막대 이름은 drill-down 을 열므로 손가락 커서 그대로.
	const bar = horizontalBarOption(
		{ labels: ['바흐'], values: [1] },
		'많이 튼 작곡가',
		'2026-1학기 · 전체'
	);
	assert.equal(bar.series[0].cursor, undefined);
	assert.equal(bar.yAxis.triggerEvent, true);
});

test('time charts open a bucket from its date too, as a bar opens from its name', () => {
	// 날짜 이름의 클릭은 그 점·막대와 같은 dataIndex(카테고리 순서)로 itemclick 이 된다.
	for (const option of [
		timelineOption({ labels, values: [3, 1, 4, 1] }, '학기별 선곡 추이', '전체'),
		countBarOption({ labels, values: [3, 1, 4, 1] }, '월별 선곡 수', '전체'),
		diversityLineOption(labels, series, '월별 다양성 추이', '0%=편중 · 100%=고름')
	]) {
		assert.equal(option.xAxis.triggerEvent, true, option.title.text);
		// 값 축의 숫자는 아무것도 열지 않으므로 그대로 둔다.
		assert.equal(option.yAxis.triggerEvent, undefined, option.title.text);
	}
	// 도넛(#96)은 그대로 화살표다.
	const pie = eraPieOption({ labels: ['바로크', '고전'], values: [3, 1] }, '시대별 분포', '');
	assert.equal(pie.series[0].cursor, 'default');
});

// 막대 툴팁의 글자들(태그를 떼고 줄마다). ECharts 축 툴팁은 params 를 배열로 준다.
// ECharts 는 { value, itemStyle } 항목(markBar)의 툴팁에도 그 value 만 넘긴다.
const tooltipLines = (option, dataIndex) => {
	const { data } = option.yAxis;
	const item = option.series[0].data[dataIndex];
	const html = option.tooltip.formatter([
		{ name: data[dataIndex], value: item?.value ?? item, dataIndex, marker: '<i></i>' }
	]);
	return html
		.split(/<[^>]+>/)
		.map((part) => part.trim())
		.filter(Boolean);
};
const bars = { labels: ['브람스 <1>', '바흐', '가상 작곡가'], values: [1234, 5, 3] };

test('bar tooltips stay ECharts’ default without notes', () => {
	const option = horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체');
	assert.equal(option.tooltip.trigger, 'axis');
	assert.equal('formatter' in option.tooltip, false);
});

test('bar tooltips add each bar’s note under its name and count, 1위 on the top bar', () => {
	const notes = ['지난 학기 3위', '', '지난 학기 첫 선곡'];
	const option = horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체', notes);
	assert.equal(option.tooltip.trigger, 'axis');
	// 막대는 뒤집혀 있다: 마지막 dataIndex 가 맨 위의 1위.
	assert.deepEqual(tooltipLines(option, 2), ['브람스 &#60;1&#62;', '1,234', '지난 학기 3위']);
	assert.deepEqual(tooltipLines(option, 1), ['바흐', '5']);
	assert.deepEqual(tooltipLines(option, 0), ['가상 작곡가', '3', '지난 학기 첫 선곡']);
	const html = option.tooltip.formatter([
		{ name: '브람스 <1>', value: 1234, dataIndex: 2, marker: '<i class="m"></i>' }
	]);
	assert.ok(html.includes('<i class="m"></i>'), html);
	assert.ok(!html.includes('<1>'), html);
});

test('많이 튼 bars stay as thin as a 7-name card’s (22 px inside the outline), however few names', () => {
	const few = horizontalBarOption(bars, '많이 튼 오케스트라', '2026-1학기 · 전체');
	// ECharts 의 막대 폭은 1px 윤곽선까지 잰다: 25px 이면 안쪽 색은 22px.
	assert.equal(few.series[0].barMaxWidth, 25);
	// 굵기를 고정하지 않는다: 이름이 많은 카드는 지금처럼 더 가늘게 그려진다.
	assert.equal(few.series[0].barWidth, undefined);
});

test('선곡 수 columns stay at most 58 px wide, however few buckets', () => {
	// 한 학기만 튼 작곡가의 학기별 선곡은 막대 하나다: 카드만큼 넓지 않게 묶는다.
	const one = countBarOption({ labels: ['2026-2학기'], values: [12] }, '학기별 선곡', '전체 기간');
	assert.equal(one.series[0].barMaxWidth, 58);
	// 굵기를 고정하지 않는다: 칸이 많은 차트(한 학기 월별, 주별)는 지금처럼 더 가늘게 그려진다.
	assert.equal(one.series[0].barWidth, undefined);
	const count = countBarOption({ labels, values: [3, 1, 4, 1] }, '월별 선곡 수', '전체');
	assert.equal(count.series[0].barMaxWidth, 58);
	// 가로 많이 튼 막대의 묶음은 그대로.
	assert.equal(horizontalBarOption(bars, '많이 튼 작곡가', '전체').series[0].barMaxWidth, 25);
});

test('bar names are cut at 160 px, or at the nameWidth given (많이 튼 곡: 220)', () => {
	const plain = horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체');
	assert.equal(plain.yAxis.axisLabel.width, 160);
	assert.equal(plain.yAxis.axisLabel.overflow, 'truncate');
	const wide = horizontalBarOption(bars, '많이 튼 곡', '2026-1학기 · 전체', null, 220);
	assert.equal(wide.yAxis.axisLabel.width, 220);
	assert.equal(wide.yAxis.axisLabel.overflow, 'truncate');
	assert.equal('formatter' in wide.tooltip, false);
	const notes = ['지난 학기 3위', '', '지난 학기 첫 선곡'];
	const noted = horizontalBarOption(bars, '많이 튼 곡', '2026-1학기 · 전체', notes, 220);
	assert.equal(noted.yAxis.axisLabel.width, 220);
	assert.equal(noted.yAxis.axisLabel.overflow, 'truncate');
	assert.deepEqual(tooltipLines(noted, 2), ['브람스 &#60;1&#62;', '1,234', '지난 학기 3위']);
	assert.deepEqual(tooltipLines(noted, 1), ['바흐', '5']);
});

test('markBar leaves the option as it is for no bar or a bar out of range', () => {
	const option = horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체');
	for (const index of [-1, 3, 99, 1.5, undefined, null])
		assert.equal(markBar(option, index), option);
});

test('markBar fills only the open name’s bar Micron, keeping its value and the series’ look', () => {
	const option = horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체');
	const before = structuredClone(option);
	// 막대는 뒤집혀 있다: dataIndex 2 가 맨 위의 1위(1234).
	const marked = markBar(option, 2);
	assert.notEqual(marked, option);
	assert.deepEqual(option, before, 'the input option is not changed');
	const [series] = marked.series;
	assert.deepEqual(series.data, [3, 5, { value: 1234, itemStyle: { color: '#656667' } }]);
	assert.deepEqual(series.itemStyle, before.series[0].itemStyle);
	assert.deepEqual(series.label, before.series[0].label);
	assert.equal(series.barMaxWidth, before.series[0].barMaxWidth);
	assert.deepEqual(series.emphasis, before.series[0].emphasis);
	assert.deepEqual(marked.yAxis, before.yAxis);
	assert.deepEqual(marked.title, before.title);
	assert.deepEqual(markBar(option, 0).series[0].data, [
		{ value: 3, itemStyle: { color: '#656667' } },
		5,
		1234
	]);
});

test('a marked bar’s tooltip still reads its name, count and note', () => {
	const notes = ['지난 학기 3위', '', '지난 학기 첫 선곡'];
	const marked = markBar(
		horizontalBarOption(bars, '많이 튼 작곡가', '2026-1학기 · 전체', notes),
		2
	);
	assert.deepEqual(tooltipLines(marked, 2), ['브람스 &#60;1&#62;', '1,234', '지난 학기 3위']);
	assert.deepEqual(tooltipLines(marked, 0), ['가상 작곡가', '3', '지난 학기 첫 선곡']);
});
