import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clubShareText, previousShareText } from '../../src/lib/statShare.js';

test('the share has the club count, the unit and one decimal', () => {
	assert.equal(clubShareText(42, 342, '곡'), '클럽 342곡 중 12.3%');
	assert.equal(clubShareText(12, 64, '타임'), '클럽 64타임 중 18.8%');
	assert.equal(clubShareText(342, 342, '곡'), '클럽 342곡 중 100.0%');
});

test('none of the club is still a share worth saying', () => {
	assert.equal(clubShareText(0, 31, '곡'), '클럽 31곡 중 0.0%');
});

test('no line when the club has nothing or a number is missing', () => {
	assert.equal(clubShareText(0, 0, '곡'), '');
	assert.equal(clubShareText(3, null, '곡'), '');
	assert.equal(clubShareText(3, undefined, '타임'), '');
	assert.equal(clubShareText(null, 31, '곡'), '');
	assert.equal(clubShareText(undefined, 31, '곡'), '');
});

test('the club count has thousands separators', () => {
	assert.equal(clubShareText(123, 1234, '곡'), '클럽 1,234곡 중 10.0%');
});

test("last 학기's share has one decimal", () => {
	assert.equal(previousShareText(9, 92), '지난 학기 9.8%');
	assert.equal(previousShareText(1, 3), '지난 학기 33.3%');
	assert.equal(previousShareText(92, 92), '지난 학기 100.0%');
});

test('playing nothing last 학기 is still a share worth saying', () => {
	assert.equal(previousShareText(0, 31), '지난 학기 0.0%');
});

test('no part when the club played nothing last 학기 or a number is missing', () => {
	assert.equal(previousShareText(0, 0), '');
	assert.equal(previousShareText(3, null), '');
	assert.equal(previousShareText(3, undefined), '');
	assert.equal(previousShareText(null, 31), '');
	assert.equal(previousShareText(undefined, 31), '');
});
