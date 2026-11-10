// 축 이름(순위 카드의 이름, 시간 카드의 날짜)을 가리키면 그 막대·점을 가리킨 것과 같은 툴팁을 띄운다.
// 축의 triggerEvent 로 ECharts 가 이름에서 mouseover/mouseout 을 내고(targetType 'axisLabel',
// dataIndex = 카테고리 순서), 그 순서는 모든 축 차트에서 계열의 dataIndex 와 같다(chartOptions.js).
// trigger 'axis' 툴팁은 seriesIndex 0 으로도 그 칸의 모든 계열을 보인다. 그 밖의 이벤트는 null.
export function axisLabelTipAction(kind, params) {
	if (!params || params.targetType !== 'axisLabel') return null;
	if (kind === 'mouseout') return { type: 'hideTip' };
	if (kind !== 'mouseover') return null;
	const { dataIndex } = params;
	if (!Number.isInteger(dataIndex) || dataIndex < 0) return null;
	return { type: 'showTip', seriesIndex: 0, dataIndex };
}
