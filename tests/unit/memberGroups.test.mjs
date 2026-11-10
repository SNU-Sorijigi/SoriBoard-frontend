import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberGroups } from '../../src/lib/memberGroups.js';

const user = (id, isOb) => ({ id, name: `가상${id}`, major: '가상학', year_id: '25', is_ob: isOb });
const ids = (groups) => groups.map((group) => [group.label, group.users.map((u) => u.id)]);

test('memberGroups splits a mixed list into 현역 then OB, each in the given order', () => {
	const users = [
		user(5, false),
		user(6, true),
		user(1, false),
		user(7, true),
		user(3, true),
		user(2, false)
	];
	assert.deepEqual(ids(memberGroups(users)), [
		['현역', [5, 1, 2]],
		['OB', [6, 7, 3]]
	]);
});

test('memberGroups keeps 현역 first even when the list starts with OB', () => {
	assert.deepEqual(ids(memberGroups([user(1, true), user(2, false)])), [
		['현역', [2]],
		['OB', [1]]
	]);
});

test('memberGroups gives one group when every 지기 is 현역, or every 지기 is OB', () => {
	assert.deepEqual(ids(memberGroups([user(1, false), user(2, false)])), [['현역', [1, 2]]]);
	assert.deepEqual(ids(memberGroups([user(3, true), user(4, true)])), [['OB', [3, 4]]]);
});

test('memberGroups counts a 지기 without is_ob as 현역', () => {
	const users = [{ id: 1, name: '가상1' }, user(2, null), user(3, true)];
	assert.deepEqual(ids(memberGroups(users)), [
		['현역', [1, 2]],
		['OB', [3]]
	]);
});

test('memberGroups gives [] for an empty list or a non-array', () => {
	assert.deepEqual(memberGroups([]), []);
	assert.deepEqual(memberGroups(null), []);
	assert.deepEqual(memberGroups(undefined), []);
	assert.deepEqual(memberGroups({ message: 'Error' }), []);
});

test('memberGroups returns the same user objects and leaves the list unchanged', () => {
	const users = [user(1, true), user(2, false)];
	const copy = structuredClone(users);
	const groups = memberGroups(users);
	assert.equal(groups[0].users[0], users[1]);
	assert.deepEqual(users, copy);
});
