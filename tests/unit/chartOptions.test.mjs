import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	timelineOption,
	countBarOption,
	diversityLineOption,
	eraPieOption,
	horizontalBarOption
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

test('the still-running bucket is drawn on two lines, (진행 중) under its date', () => {
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

test('diversity legend sits below the subtitle, and the plot below the legend', () => {
	const option = diversityLineOption(labels, series, '월별 다양성 추이', '0=편중 · 1=고름');
	// 부제는 위에서 약 45~62px 를 차지한다(범례가 48 이면 그 위에 겹쳤다).
	assert.ok(option.legend.top >= 64, `legend.top ${option.legend.top}`);
	assert.ok(option.grid.top - option.legend.top >= 38, `grid.top ${option.grid.top}`);
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

// 막대 툴팁의 글자들(태그를 떼고 줄마다). ECharts 축 툴팁은 params 를 배열로 준다.
const tooltipLines = (option, dataIndex) => {
	const { data } = option.yAxis;
	const html = option.tooltip.formatter([
		{ name: data[dataIndex], value: option.series[0].data[dataIndex], dataIndex, marker: '<i></i>' }
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
