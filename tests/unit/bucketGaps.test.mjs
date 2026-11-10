import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingBuckets, gapNote } from '../../src/lib/bucketGaps.js';

test('weeks: counts the Mondays missing between the first and the last', () => {
	assert.equal(missingBuckets('week', ['2026-03-02', '2026-03-09', '2026-03-30']), 2);
	assert.equal(missingBuckets('week', ['2026-03-02', '2026-03-09', '2026-03-16']), 0);
});

test('weeks: across a year end and across a DST date', () => {
	assert.equal(missingBuckets('week', ['2025-12-29', '2026-01-05']), 0);
	assert.equal(missingBuckets('week', ['2026-03-02', '2026-04-06']), 4);
});

test('weeks: unsorted labels give the same count', () => {
	assert.equal(missingBuckets('week', ['2026-03-30', '2026-03-02', '2026-03-09']), 2);
});

test('weeks: labels not a whole number of weeks apart are not counted', () => {
	assert.equal(missingBuckets('week', ['2026-03-02', '2026-03-12']), 0);
	assert.equal(missingBuckets('week', ['2026-02-23', '2026-02-30']), 0);
});

test('months: within a year and across a year end', () => {
	assert.equal(missingBuckets('month', ['2026-03', '2026-05']), 1);
	assert.equal(missingBuckets('month', ['2025-11', '2026-02']), 2);
	assert.equal(missingBuckets('month', ['2026-05', '2026-03', '2026-04']), 0);
});

test('학기: two per year', () => {
	assert.equal(missingBuckets('semester', ['2025-1', '2025-2', '2026-1']), 0);
	assert.equal(missingBuckets('semester', ['2024-2', '2026-1']), 2);
});

test('0 for too few labels, duplicates, an unknown bucket or a malformed label', () => {
	assert.equal(missingBuckets('week', []), 0);
	assert.equal(missingBuckets('month', ['2026-03']), 0);
	assert.equal(missingBuckets('month', ['2026-03', '2026-03']), 0);
	assert.equal(missingBuckets('month', ['2026-03', '2026-03', '2026-05']), 1);
	assert.equal(missingBuckets('year', ['2024', '2026']), 0);
	assert.equal(missingBuckets('month', ['2026-3', '2026-05']), 0);
	assert.equal(missingBuckets('month', ['2026-03', '2026-13']), 0);
	assert.equal(missingBuckets('semester', ['2025-1', '2026-3']), 0);
	assert.equal(missingBuckets('week', ['2026-03', '2026-05']), 0);
});

test('gapNote: the wording for each unit, and nothing without a gap', () => {
	assert.equal(
		gapNote('week', ['2026-03-02', '2026-03-09', '2026-03-30']),
		'선곡이 없는 2주는 빠져 있습니다'
	);
	assert.equal(gapNote('month', ['2026-03', '2026-05']), '선곡이 없는 1개월은 빠져 있습니다');
	assert.equal(gapNote('semester', ['2024-2', '2026-1']), '선곡이 없는 2개 학기는 빠져 있습니다');
	assert.equal(gapNote('month', ['2026-03', '2026-04']), '');
	assert.equal(gapNote('week', []), '');
});
