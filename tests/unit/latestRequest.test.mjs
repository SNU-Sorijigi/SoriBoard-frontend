import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequests } from '../../src/lib/latestRequest.js';

const CARDS = ['summary', 'composers', 'diversity'];

test('a request is the latest for every key it covers', () => {
	const requests = createLatestRequests();
	const id = requests.begin(CARDS);
	for (const key of CARDS) assert.equal(requests.isLatest(key, id), true);
});

test('a key no request covered has no latest request', () => {
	const requests = createLatestRequests();
	const id = requests.begin(['summary']);
	assert.equal(requests.isLatest('diversity', id), false);
});

test('a newer full load replaces an older one on every key', () => {
	const requests = createLatestRequests();
	const first = requests.begin(CARDS);
	const second = requests.begin(CARDS);
	for (const key of CARDS) {
		assert.equal(requests.isLatest(key, first), false);
		assert.equal(requests.isLatest(key, second), true);
	}
});

test('a diversity-only reload keeps the full load current for the other cards', () => {
	const requests = createLatestRequests();
	const full = requests.begin(CARDS);
	const reload = requests.begin(['diversity']);
	assert.equal(requests.isLatest('summary', full), true);
	assert.equal(requests.isLatest('composers', full), true);
	// The full load's older diversity answer must not overwrite the reload.
	assert.equal(requests.isLatest('diversity', full), false);
	assert.equal(requests.isLatest('diversity', reload), true);
});

test('a full load after a diversity-only reload makes the reload stale', () => {
	const requests = createLatestRequests();
	requests.begin(CARDS);
	const reload = requests.begin(['diversity']);
	const full = requests.begin(CARDS);
	assert.equal(requests.isLatest('diversity', reload), false);
	assert.equal(requests.isLatest('diversity', full), true);
});

test('ids grow across calls and separate guards do not share state', () => {
	const a = createLatestRequests();
	const b = createLatestRequests();
	const a1 = a.begin(['x']);
	const a2 = a.begin(['y']);
	assert.ok(a2 > a1);
	assert.equal(a.isLatest('x', a1), true);
	const b1 = b.begin(['x']);
	assert.equal(b.isLatest('x', b1), true);
	assert.equal(a.isLatest('x', a1), true);
});

test('a signal aborts only once none of its keys belongs to its request', () => {
	const requests = createLatestRequests();
	const id = requests.begin(['a', 'b']);
	const signal = requests.signal(id, ['a', 'b']);
	assert.equal(signal.aborted, false);
	requests.begin(['a']);
	// b is still served by id.
	assert.equal(signal.aborted, false);
	requests.begin(['b']);
	assert.equal(signal.aborted, true);
});

test('a signal asked for a stale request comes back aborted', () => {
	const requests = createLatestRequests();
	const old = requests.begin(['a']);
	requests.begin(['a']);
	assert.equal(requests.signal(old, ['a']).aborted, true);
});

test('two signals of one request abort separately by their own keys', () => {
	const requests = createLatestRequests();
	const id = requests.begin(CARDS);
	const summary = requests.signal(id, ['summary']);
	const diversity = requests.signal(id, ['diversity']);
	requests.begin(['diversity']);
	assert.equal(summary.aborted, false);
	assert.equal(diversity.aborted, true);
});

test('a diversity-only reload keeps the full load diversity request that still draws other cards', () => {
	const requests = createLatestRequests();
	const full = requests.begin(['summary', 'diversity', 'eras', 'genres']);
	const shared = requests.signal(full, ['diversity', 'eras', 'genres']);
	const reload = requests.begin(['diversity']);
	const reloadSignal = requests.signal(reload, ['diversity']);
	assert.equal(shared.aborted, false);
	// Switching back again makes only the first reload stale.
	requests.begin(['diversity']);
	assert.equal(reloadSignal.aborted, true);
	assert.equal(shared.aborted, false);
	// A new full load ends both.
	requests.begin(['summary', 'diversity', 'eras', 'genres']);
	assert.equal(shared.aborted, true);
});

test('a signal of a key nobody else begins is never aborted', () => {
	const requests = createLatestRequests();
	const id = requests.begin(['clubSummary']);
	const signal = requests.signal(id, ['clubSummary']);
	requests.begin(['summary']);
	requests.begin(['previousSummary']);
	assert.equal(signal.aborted, false);
});

test('abortAll aborts every signal handed out and not yet aborted', () => {
	const requests = createLatestRequests();
	const full = requests.begin(CARDS);
	const summary = requests.signal(full, ['summary']);
	const diversity = requests.signal(full, ['diversity']);
	const club = requests.begin(['clubSummary']);
	const clubSignal = requests.signal(club, ['clubSummary']);
	requests.abortAll();
	assert.equal(summary.aborted, true);
	assert.equal(diversity.aborted, true);
	assert.equal(clubSignal.aborted, true);
});

test('after abortAll no earlier request is the latest for any key', () => {
	const requests = createLatestRequests();
	const full = requests.begin(CARDS);
	const reload = requests.begin(['diversity']);
	const club = requests.begin(['clubSummary']);
	requests.abortAll();
	for (const id of [full, reload, club]) {
		for (const key of [...CARDS, 'clubSummary']) assert.equal(requests.isLatest(key, id), false);
	}
});

test('a begin after abortAll returns a fresh latest id with a live signal', () => {
	const requests = createLatestRequests();
	const old = requests.begin(CARDS);
	requests.abortAll();
	const id = requests.begin(CARDS);
	assert.notEqual(id, old);
	for (const key of CARDS) assert.equal(requests.isLatest(key, id), true);
	const signal = requests.signal(id, CARDS);
	assert.equal(signal.aborted, false);
	// A later view change still cancels it as before.
	requests.begin(CARDS);
	assert.equal(signal.aborted, true);
});

test('a signal asked for an old id after abortAll comes back aborted', () => {
	const requests = createLatestRequests();
	const id = requests.begin(['previousSummary']);
	requests.abortAll();
	assert.equal(requests.signal(id, ['previousSummary']).aborted, true);
});
