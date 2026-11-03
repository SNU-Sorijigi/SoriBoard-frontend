// ECharts option 빌더 모음. 각 함수는 백엔드 봉투({labels, values, items, ...})와
// 제목/부제를 받아 option 객체를 돌려준다. PNG 내보내기가 독립적으로 보이도록
// 제목/부제를 option.title 에 그대로 박아 넣는다.
//
// 캔버스는 CSS 변수를 못 읽으므로 색상은 app.css 토큰값과 동일한 hex 로 둔다.
// 모든 색은 Pantone 2026 공식 스와치 값 그대로다(혼합·투명도·파생 색 없음).
// ECharts 가 기본값으로 칠하는 색(축, 격자, 툴팁, 호버 강조)도 모두 스와치로 지정한다.

import { SHARE_PRECISION, formatEvenness, formatShare } from './statTable.js';

const ACCENT = '#DBD2DB'; // Orchid Tint 13-3802 TCX (= --action-bg / --primary-primary-600)
const TEXT = '#2B2C30'; // Stretch Limo 19-4005 TCX (= --gray-gray-950)
const SUBTEXT = '#656667'; // Micron 20-0007 TPM (= --gray-gray-600)
const GRID = '#D5D5D8'; // Nimbus Cloud 13-4108 TCX (= --gray-gray-300)
const PANEL = '#F0EEE9'; // Cloud Dancer 11-4201 TCX (= --secondary-secondary-100)
const OUTLINE = TEXT; // 옅은 파스텔 막대·조각이 흰 배경에서 보이도록 1px 윤곽선
const FONT = "'Noto Sans KR', sans-serif";

// 시대/다계열 차트용 카테고리 팔레트: Powdered Pastels 8색.
// 서로 가장 잘 구분되는 5색을 앞에 둔다(5계열 이하 도넛에서 비슷한 색이 이웃하지 않도록).
const CATEGORICAL = [
	'#DBD2DB', // Orchid Tint 13-3802 TCX
	'#D3E4F1', // Ice Melt 13-4306 TCX
	'#F0D8CC', // Peach Dust 12-1107 TCX
	'#CAD3C1', // Almost Aqua 13-6006 TCX
	'#F6EBC8', // Lemon Icing 11-0515 TCX
	'#ECD8DC', // Raindrops on Roses 11-1400 TCX
	'#D5D5D8', // Nimbus Cloud 13-4108 TCX
	'#F0EEE9' // Cloud Dancer 11-4201 TCX
];

// 공통: 툴팁, 축, 격자를 스와치 색으로 고정한다.
// 툴팁 기본 그림자(rgba)는 끄고 Micron 테두리로 구분한다.
const TOOLTIP_BOX = {
	backgroundColor: PANEL,
	borderColor: SUBTEXT,
	shadowBlur: 0,
	shadowOffsetX: 0,
	shadowOffsetY: 0,
	shadowColor: 'transparent',
	textStyle: { fontFamily: FONT, color: TEXT }
};
const BAND_POINTER = { type: 'shadow', z: 1, shadowStyle: { color: PANEL, opacity: 1 } };
const LINE_POINTER = { type: 'line', lineStyle: { color: SUBTEXT } };
const AXIS_LINE = { lineStyle: { color: SUBTEXT } };
const SPLIT_LINE = { lineStyle: { color: GRID } };
// 다계열 선 그래프의 선 모양: 진한 스와치 + 선 종류로 계열을 구분한다.
const LINE_STYLES = [
	{ color: TEXT, width: 2, type: 'solid' },
	{ color: SUBTEXT, width: 2, type: 'dashed' },
	{ color: TEXT, width: 2, type: 'dotted' },
	{ color: SUBTEXT, width: 2, type: 'solid' }
];
// 호버 시 ECharts 가 색을 10% 어둡게 바꾸는 강조 효과를 끈다(파생 색 방지).
const NO_EMPHASIS = { disabled: true };

function titleBlock(title, subtitle) {
	return {
		text: title || '',
		subtext: subtitle || '',
		left: 'center',
		textStyle: { fontFamily: FONT, color: TEXT, fontSize: 18, fontWeight: 700 },
		subtextStyle: { fontFamily: FONT, color: SUBTEXT, fontSize: 12 }
	};
}

const BASE_TEXT_STYLE = { fontFamily: FONT, color: TEXT };

// 라인 차트(boundaryGap: false)의 첫·마지막 x 이름표는 양 끝 점 가운데에 놓여 절반이 캔버스 밖으로
// 잘린다('2026-2학기', '2026-10-19'). 끝 이름표만 안쪽으로 붙여 정렬한다.
const EDGE_LABELS_INSIDE = { alignMinLabel: 'left', alignMaxLabel: 'right' };

// 시간 축은 마지막(가장 최근) 버킷 이름을 늘 그린다. ECharts 는 첫 이름부터 n 개마다 그려서 간격이 맞을
// 때만 마지막 이름이 보이고, 진행 중인 버킷의 '(진행 중)' 이 숨는다. 겹치면 그 앞 이름이 빠진다.
const LAST_NAME_SHOWN = { showMaxLabel: true };

// 아직 진행 중인 버킷의 x 이름표('2026-10-26 (진행 중)')는 날짜 밑 둘째 줄에 '(진행 중)' 을 둔다.
// 한 줄로 길어지면 ECharts 가 축 이름을 솎아 내 표시하려던 바로 그 이름이 숨는다. 그리는 이름만 바뀌고
// 카테고리 값(툴팁, 표로 보기, CSV)은 그대로다.
/** @param {string | number} value */
const twoLineName = (value) => String(value).replace(/ \(진행 중\)$/, '\n(진행 중)');

// 툴팁은 HTML 로 그려지므로 이름을 이스케이프한다(ECharts 의 문자열 템플릿이 하던 일).
/** @param {string} s */
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 막대 툴팁: ECharts 기본 축 툴팁(이름, 표식과 굵은 값)과 같은 모양에, 그 막대의 note 가 있으면
// 한 줄 더(Micron). notes 는 막대 순서(뒤집힌 순서)이고, 축 툴팁은 params 를 배열로 준다.
function barTooltip(notes) {
	const row = (html) =>
		`<div style="margin:10px 0 0;line-height:1">${html}<div style="clear:both"></div></div>`;
	return (params) => {
		const p = Array.isArray(params) ? params[0] : params;
		const note = notes[p.dataIndex];
		const value = escapeHtml(Number(p.value).toLocaleString('en-US'));
		return (
			`<div style="line-height:1">${escapeHtml(p.name)}</div>` +
			row(`${p.marker}<span style="float:right;margin-left:10px;font-weight:900">${value}</span>`) +
			(note ? row(`<span style="font-size:12px;color:${SUBTEXT}">${escapeHtml(note)}</span>`) : '')
		);
	};
}

// 가로 막대 (top-N): composers / works / conductors / orchestras 공용.
// notes(1위부터, 막대마다 한 줄 또는 '')를 주면 툴팁에 덧붙인다(지난 학기 순위). 없으면 기본 툴팁.
// 이름은 nameWidth px(기본 160)에서 잘린다. 곡 이름(`작곡가 - 곡`)은 더 넓어야 한다.
export function horizontalBarOption(
	{ labels, values },
	title,
	subtitle,
	notes = null,
	nameWidth = 160
) {
	// ECharts category 축은 아래에서 위로 그려지므로 역순으로 넣어 1위가 맨 위로.
	const cats = [...labels].reverse();
	const vals = [...values].reverse();
	const formatter = notes ? { formatter: barTooltip([...notes].reverse()) } : {};
	return {
		title: titleBlock(title, subtitle),
		textStyle: BASE_TEXT_STYLE,
		grid: { left: 8, right: 48, top: subtitle ? 70 : 56, bottom: 16, containLabel: true },
		tooltip: { trigger: 'axis', axisPointer: BAND_POINTER, ...TOOLTIP_BOX, ...formatter },
		xAxis: {
			type: 'value',
			axisLabel: { fontFamily: FONT, color: SUBTEXT },
			splitLine: SPLIT_LINE
		},
		yAxis: {
			type: 'category',
			data: cats,
			triggerEvent: true, // 이름을 눌러도 그 막대를 누른 것으로(drill-down)
			axisLine: AXIS_LINE,
			axisLabel: {
				fontFamily: FONT,
				color: TEXT,
				fontSize: 12,
				width: nameWidth,
				overflow: 'truncate'
			}
		},
		series: [
			{
				type: 'bar',
				data: vals,
				itemStyle: {
					color: ACCENT,
					borderColor: OUTLINE,
					borderWidth: 1,
					borderRadius: [0, 4, 4, 0]
				},
				emphasis: NO_EMPHASIS,
				label: { show: true, position: 'right', fontFamily: FONT, color: SUBTEXT }
			}
		]
	};
}

// 추이 라인 (timeline)
export function timelineOption({ labels, values }, title, subtitle) {
	return {
		title: titleBlock(title, subtitle),
		textStyle: BASE_TEXT_STYLE,
		grid: { left: 8, right: 24, top: subtitle ? 70 : 56, bottom: 24, containLabel: true },
		tooltip: { trigger: 'axis', axisPointer: LINE_POINTER, ...TOOLTIP_BOX },
		xAxis: {
			type: 'category',
			data: labels,
			boundaryGap: false,
			axisLine: AXIS_LINE,
			axisLabel: {
				fontFamily: FONT,
				color: TEXT,
				...EDGE_LABELS_INSIDE,
				...LAST_NAME_SHOWN,
				formatter: twoLineName
			}
		},
		yAxis: {
			type: 'value',
			axisLabel: { fontFamily: FONT, color: SUBTEXT },
			splitLine: SPLIT_LINE
		},
		series: [
			{
				type: 'line',
				data: values,
				smooth: true,
				symbol: 'circle',
				symbolSize: 6,
				// 선은 Stretch Limo, 점은 Orchid Tint + 윤곽선, 면은 불투명 Orchid Tint(그라데이션·투명도 없음)
				lineStyle: { color: TEXT, width: 2 },
				itemStyle: { color: ACCENT, borderColor: OUTLINE, borderWidth: 1 },
				areaStyle: { color: ACCENT, opacity: 1 },
				emphasis: NO_EMPHASIS
			}
		]
	};
}

// 세로 막대 (주/월별 선곡 수 등 시계열 카운트)
export function countBarOption({ labels, values }, title, subtitle) {
	return {
		title: titleBlock(title, subtitle),
		textStyle: BASE_TEXT_STYLE,
		// 축 이름은 막대 밑 가운데에 놓인다. containLabel 은 견본 이름으로 크기를 어림해, 막대가 가는 긴 주별
		// 차트에서 첫 이름('2024-03-04')과 늘 그리는 마지막 이름이 캔버스 밖으로 잘렸다. outerBounds 는 그려진
		// 이름을 모두 재서 그만큼만 그리드를 줄인다.
		grid: {
			left: 8,
			right: 16,
			top: subtitle ? 70 : 56,
			bottom: 24,
			outerBoundsMode: 'same',
			outerBoundsContain: 'axisLabel'
		},
		tooltip: { trigger: 'axis', axisPointer: BAND_POINTER, ...TOOLTIP_BOX },
		xAxis: {
			type: 'category',
			data: labels,
			axisLine: AXIS_LINE,
			axisLabel: {
				fontFamily: FONT,
				color: TEXT,
				hideOverlap: true,
				...LAST_NAME_SHOWN,
				formatter: twoLineName
			}
		},
		yAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { fontFamily: FONT, color: SUBTEXT },
			splitLine: SPLIT_LINE
		},
		series: [
			{
				type: 'bar',
				data: values,
				itemStyle: {
					color: ACCENT,
					borderColor: OUTLINE,
					borderWidth: 1,
					borderRadius: [4, 4, 0, 0]
				},
				emphasis: NO_EMPHASIS
			}
		]
	};
}

// 다양성 추이 라인 (0~1 고른정도 여러 계열, 축과 툴팁은 칸처럼 % 로)
export function diversityLineOption(labels, series, title, subtitle) {
	return {
		title: titleBlock(title, subtitle),
		textStyle: BASE_TEXT_STYLE,
		color: CATEGORICAL,
		// 범례는 부제(위에서 약 45~62px) 밑에 둔다. 48 이면 부제 위에 겹친다.
		grid: { left: 8, right: 16, top: subtitle ? 104 : 72, bottom: 24, containLabel: true },
		tooltip: {
			trigger: 'axis',
			axisPointer: LINE_POINTER,
			...TOOLTIP_BOX,
			valueFormatter: (v) => formatEvenness(Number.isFinite(v) ? v : null)
		},
		legend: {
			top: subtitle ? 66 : 34,
			inactiveColor: GRID,
			inactiveBorderColor: GRID,
			itemStyle: { borderColor: OUTLINE, borderWidth: 1 },
			textStyle: { fontFamily: FONT, color: TEXT }
		},
		xAxis: {
			type: 'category',
			data: labels,
			boundaryGap: false,
			axisLine: AXIS_LINE,
			axisLabel: {
				fontFamily: FONT,
				color: TEXT,
				hideOverlap: true,
				...EDGE_LABELS_INSIDE,
				...LAST_NAME_SHOWN,
				formatter: twoLineName
			}
		},
		yAxis: {
			type: 'value',
			min: 0,
			max: 1,
			axisLabel: { fontFamily: FONT, color: SUBTEXT, formatter: formatEvenness },
			splitLine: SPLIT_LINE
		},
		// 파스텔 선은 흰 배경에서 1.3~1.5:1 로 보이지 않으므로, 선은 진한 스와치(실선·점선)로 긋고
		// 파스텔은 점과 범례에 둔다(점마다 Stretch Limo 윤곽선).
		series: series.map((s, i) => ({
			name: s.name,
			type: 'line',
			data: s.values,
			smooth: true,
			symbol: 'circle',
			symbolSize: 9,
			connectNulls: true,
			lineStyle: LINE_STYLES[i % LINE_STYLES.length],
			itemStyle: {
				color: CATEGORICAL[i % CATEGORICAL.length],
				borderColor: OUTLINE,
				borderWidth: 1
			},
			emphasis: NO_EMPHASIS
		}))
	};
}

// 시대 분포 도넛 (eras) — 장르 분포도 같은 형태라 공용으로 쓴다.
export function eraPieOption({ labels, values }, title, subtitle) {
	const data = labels.map((name, i) => ({ name, value: values[i] }));
	return {
		title: titleBlock(title, subtitle),
		textStyle: BASE_TEXT_STYLE,
		color: CATEGORICAL,
		tooltip: {
			trigger: 'item',
			formatter: (p) => `${escapeHtml(p.name)}: ${p.value}곡 (${formatShare(p.percent)})`,
			...TOOLTIP_BOX
		},
		legend: {
			bottom: 0,
			inactiveColor: GRID,
			inactiveBorderColor: GRID,
			itemStyle: { borderColor: OUTLINE, borderWidth: 1 },
			textStyle: { fontFamily: FONT, color: TEXT }
		},
		series: [
			{
				type: 'pie',
				// 340px 카드에서 부제(~60px)와 범례(~320px) 사이에 조각 이름표(인출선 15px + 두 줄
				// 글자)까지 들어가는 크기. 68% 일 때 아래쪽 조각의 이름표가 범례에 겹쳤다.
				radius: ['36%', '58%'],
				center: ['50%', '56%'],
				avoidLabelOverlap: true,
				// 비율은 '표로 보기'·학기 결산과 같이 소수 한 자리(statTable.js).
				percentPrecision: SHARE_PRECISION,
				itemStyle: { borderColor: OUTLINE, borderWidth: 1 },
				emphasis: NO_EMPHASIS,
				// 조각을 눌러도 열리는 것이 없어 손가락 커서를 쓰지 않는다(조각·이름표).
				// 조각이 무언가를 열게 되면(예: 백엔드 ?era=) 그 차트에서는 둘 다 뺀다.
				cursor: 'default',
				label: {
					silent: true,
					fontFamily: FONT,
					color: TEXT,
					formatter: (p) => `${p.name}\n${formatShare(p.percent)}`
				},
				labelLine: { lineStyle: { color: SUBTEXT } },
				data
			}
		]
	};
}
