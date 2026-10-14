// 사부-제자 계보: builds the family trees from /api/user and lays each one out top-down.

// 학번 "19" → 2019, "98" → 1998 (a 학번 past this year's is from the 1900s)
function admissionYear(user) {
	const digits = String(user.year_id ?? '').trim();
	if (!/^\d{1,2}$/.test(digits)) return null;
	const yy = Number(digits);
	return yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy;
}

function joinKey(user) {
	// Earlier 입부 first. Without a 입부 년도 the 학번 stands in for it; without both, last.
	const admitted = admissionYear(user) ?? Infinity;
	const year = Number.isFinite(user.join_year) ? user.join_year : admitted;
	const semester = Number.isFinite(user.join_semester) ? user.join_semester : Infinity;
	return [year, semester, admitted];
}

export function compareMembers(a, b) {
	const ka = joinKey(a);
	const kb = joinKey(b);
	for (let i = 0; i < ka.length; i++) {
		if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
	}
	return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ko') || a.id - b.id;
}

// users: the /api/user list ({id, name, sabu_id, ...}).
// Returns
//   families: trees with at least one 사부-제자 link, oldest root first,
//   loners: members with neither 사부 nor 제자,
//   byId: Map id -> node ({user, parent, children, root, depth}),
//   cut: members whose 사부 link was ignored (it pointed to themselves, to a member
//        missing from the list, or closed a loop), so that every member is drawn once.
export function buildLineage(users) {
	const byId = new Map();
	for (const user of users) {
		byId.set(user.id, { user, parent: null, children: [], root: null, depth: 0 });
	}
	const cut = [];
	for (const node of byId.values()) {
		const sabuId = node.user.sabu_id;
		if (sabuId === null || sabuId === undefined || sabuId === '') continue;
		const sabu = byId.get(Number(sabuId));
		if (!sabu || sabu === node) {
			cut.push({ node, reason: sabu ? 'self' : 'missing' });
			continue;
		}
		node.parent = sabu;
	}
	// A loop (A's 사부 is B, B's 사부 is A) has no top: cut it at its earliest member
	const state = new Map(); // node -> 1 visiting, 2 done
	for (const start of byId.values()) {
		const path = [];
		let node = start;
		while (node && !state.has(node)) {
			state.set(node, 1);
			path.push(node);
			node = node.parent;
		}
		if (node && state.get(node) === 1) {
			const loop = path.slice(path.indexOf(node));
			const top = loop.slice().sort((a, b) => compareMembers(a.user, b.user))[0];
			top.parent = null;
			cut.push({ node: top, reason: 'loop', loop: loop.map((n) => n.user) });
		}
		for (const visited of path) state.set(visited, 2);
	}
	for (const node of byId.values()) {
		if (node.parent) node.parent.children.push(node);
	}
	const byMember = (a, b) => compareMembers(a.user, b.user);
	const roots = [];
	for (const node of byId.values()) {
		node.children.sort(byMember);
		if (!node.parent) roots.push(node);
	}
	roots.sort(byMember);

	const families = [];
	const loners = [];
	for (const root of roots) {
		if (root.children.length === 0) {
			root.root = root;
			loners.push(root);
			continue;
		}
		let size = 0;
		let generations = 0;
		let firstYear = Infinity;
		let lastYear = -Infinity;
		const stack = [root];
		root.depth = 0;
		while (stack.length) {
			const node = stack.pop();
			node.root = root;
			size += 1;
			generations = Math.max(generations, node.depth + 1);
			if (Number.isFinite(node.user.join_year)) {
				firstYear = Math.min(firstYear, node.user.join_year);
				lastYear = Math.max(lastYear, node.user.join_year);
			}
			for (const child of node.children) {
				child.depth = node.depth + 1;
				stack.push(child);
			}
		}
		families.push({
			root,
			size,
			generations,
			firstYear: Number.isFinite(firstYear) ? firstYear : null,
			lastYear: Number.isFinite(lastYear) ? lastYear : null
		});
	}
	return { families, loners, byId, cut };
}

// Top-down tidy layout: each subtree is packed against the ones to its left as
// closely as their outlines allow, and every 사부 is centred over their 제자.
// Returns { width, height, boxes: [{node, x, y}], links: [{from, to, d}] } in px;
// the boxes come in pre-order, so Tab walks each lineage from the 사부 down.
export function layoutFamily(root, { nodeWidth, nodeHeight, gapX, gapY }) {
	const unit = nodeWidth + gapX; // horizontal distance between neighbours
	const rowHeight = nodeHeight + gapY;

	const order = []; // pre-order: every node before its 제자, 제자 left to right
	const depth = new Map([[root, 0]]);
	const stack = [root];
	while (stack.length) {
		const node = stack.pop();
		order.push(node);
		for (let k = node.children.length - 1; k >= 0; k--) {
			depth.set(node.children[k], depth.get(node) + 1);
			stack.push(node.children[k]);
		}
	}

	// Pass 1 (children first): each node's offset from its 사부, in units, and its
	// subtree's outline: [leftmost, rightmost] per level, relative to the subtree's top.
	const offset = new Map();
	const outline = new Map();
	for (let i = order.length - 1; i >= 0; i--) {
		const node = order[i];
		if (node.children.length === 0) {
			outline.set(node, [[0, 0]]);
			continue;
		}
		const merged = [];
		const at = [];
		node.children.forEach((child, k) => {
			const shape = outline.get(child);
			let x = 0;
			if (k > 0) {
				x = at[k - 1] + 1;
				for (let level = 0; level < Math.min(shape.length, merged.length); level++) {
					x = Math.max(x, merged[level][1] - shape[level][0] + 1);
				}
			}
			at.push(x);
			shape.forEach(([left, right], level) => {
				if (level < merged.length) {
					merged[level] = [
						Math.min(merged[level][0], left + x),
						Math.max(merged[level][1], right + x)
					];
				} else {
					merged.push([left + x, right + x]);
				}
			});
			outline.delete(child);
		});
		const centre = (at[0] + at[at.length - 1]) / 2;
		node.children.forEach((child, k) => offset.set(child, at[k] - centre));
		outline.set(node, [[0, 0], ...merged.map(([left, right]) => [left - centre, right - centre])]);
	}

	// Pass 2 (top down): absolute positions
	const slot = new Map([[root, 0]]);
	let min = 0;
	let max = 0;
	let deepest = 0;
	for (const node of order) {
		for (const child of node.children) slot.set(child, slot.get(node) + offset.get(child));
		min = Math.min(min, slot.get(node));
		max = Math.max(max, slot.get(node));
		deepest = Math.max(deepest, depth.get(node));
	}
	const position = new Map();
	const boxes = order.map((node) => {
		const box = {
			node,
			x: Math.round((slot.get(node) - min) * unit),
			y: depth.get(node) * rowHeight
		};
		position.set(node, box);
		return box;
	});
	const links = [];
	for (const box of boxes) {
		const fromX = box.x + nodeWidth / 2;
		const fromY = box.y + nodeHeight;
		const middleY = fromY + gapY / 2;
		for (const child of box.node.children) {
			const to = position.get(child);
			links.push({
				from: box.node,
				to: child,
				d: `M${fromX},${fromY}V${middleY}H${to.x + nodeWidth / 2}V${to.y}`
			});
		}
	}
	return {
		width: Math.round((max - min) * unit) + nodeWidth,
		height: deepest * rowHeight + nodeHeight,
		boxes,
		links
	};
}

// The selected member, their 사부 line up to the root, and everyone below them
export function lineageOf(node) {
	const ids = new Set();
	for (let n = node; n; n = n.parent) ids.add(n.user.id);
	const stack = [...node.children];
	while (stack.length) {
		const n = stack.pop();
		ids.add(n.user.id);
		stack.push(...n.children);
	}
	return ids;
}

export function descendantCount(node) {
	let count = 0;
	const stack = [...node.children];
	while (stack.length) {
		const n = stack.pop();
		count += 1;
		stack.push(...n.children);
	}
	return count;
}
