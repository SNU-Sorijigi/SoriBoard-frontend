import { test } from 'node:test';
import assert from 'node:assert/strict';
import { axisLabelTipAction } from '../../src/lib/axisLabelTip.js';

const label = (extra) => ({ componentType: 'yAxis', targetType: 'axisLabel', ...extra });

test('pointing at a name or date shows the tooltip of its category', () => {
	assert.deepEqual(axisLabelTipAction('mouseover', label({ dataIndex: 0, value: '가상 작곡가' })), {
		type: 'showTip',
		seriesIndex: 0,
		dataIndex: 0
	});
	assert.deepEqual(
		axisLabelTipAction('mouseover', {
			componentType: 'xAxis',
			targetType: 'axisLabel',
			dataIndex: 7
		}),
		{ type: 'showTip', seriesIndex: 0, dataIndex: 7 }
	);
});

test('leaving a name or date hides the tooltip', () => {
	assert.deepEqual(axisLabelTipAction('mouseout', label({ dataIndex: 3 })), { type: 'hideTip' });
	assert.deepEqual(axisLabelTipAction('mouseout', label({})), { type: 'hideTip' });
});

test('bars, points, slices and axis names are left to ECharts', () => {
	const bar = { componentType: 'series', seriesType: 'bar', seriesIndex: 0, dataIndex: 2 };
	assert.equal(axisLabelTipAction('mouseover', bar), null);
	assert.equal(axisLabelTipAction('mouseout', bar), null);
	const slice = { componentType: 'series', seriesType: 'pie', dataIndex: 1 };
	assert.equal(axisLabelTipAction('mouseover', slice), null);
	assert.equal(
		axisLabelTipAction('mouseover', { componentType: 'xAxis', targetType: 'axisName' }),
		null
	);
	assert.equal(
		axisLabelTipAction('mouseout', { componentType: 'xAxis', targetType: 'axisName' }),
		null
	);
});

test('a label without a whole, non-negative index shows nothing', () => {
	assert.equal(axisLabelTipAction('mouseover', label({})), null);
	assert.equal(axisLabelTipAction('mouseover', label({ dataIndex: 1.5 })), null);
	assert.equal(axisLabelTipAction('mouseover', label({ dataIndex: -1 })), null);
	assert.equal(axisLabelTipAction('mouseover', label({ dataIndex: '3' })), null);
	assert.equal(axisLabelTipAction('mouseover', undefined), null);
});

test('other events show nothing', () => {
	assert.equal(axisLabelTipAction('click', label({ dataIndex: 3 })), null);
	assert.equal(axisLabelTipAction('mousemove', label({ dataIndex: 3 })), null);
});
