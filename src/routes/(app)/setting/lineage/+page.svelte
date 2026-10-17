<script>
	import { onMount, tick } from 'svelte';
	import {
		buildLineage,
		layoutChart,
		lineageOf,
		descendantCount,
		semesterOf
	} from '$lib/lineage.js';

	const NODE = { nodeWidth: 120, nodeHeight: 64, gapX: 14, gapY: 32, padding: 16 };
	const ROW_HEIGHT = NODE.nodeHeight + NODE.gapY;
	const LABEL_WIDTH = 76;
	const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25];

	let status = 'loading'; // loading | ready | failed
	let lineage = { families: [], loners: [], byId: new Map(), cut: [] };
	let chart = { width: 0, height: 0, rows: [], boxes: [], links: [], detached: [] };
	let memberCount = 0;
	let order = new Map(); // id -> place on the page, for the search results
	let selected = null;
	let query = '';
	let matchIndex = 0;
	let zoom = 1;
	let panel;

	async function load() {
		status = 'loading';
		try {
			const response = await fetch('/api/user');
			if (!response.ok) {
				throw new Error(`Failed to fetch users: ${response.status}`);
			}
			const users = await response.json();
			lineage = buildLineage(users);
			chart = layoutChart(lineage, NODE);
			memberCount = users.length;
			order = new Map(chart.boxes.map((box, index) => [box.node.user.id, index]));
			selected = selected && lineage.byId.get(selected.user.id);
			status = 'ready';
		} catch (error) {
			console.error('Failed to fetch users', error);
			status = 'failed';
		}
	}

	onMount(load);

	$: highlighted = selected ? lineageOf(selected) : null;
	$: below = selected ? descendantCount(selected) : 0;
	$: longest = lineage.families.reduce((most, family) => Math.max(most, family.generations), 0);
	$: cutOf = new Map(lineage.cut.map((c) => [c.node, c]));
	$: detached = new Set(chart.detached);
	// 제자 drawn without the line to their 사부: their 입부 is not after the 사부's, or they have no
	// 입부 년도 (those are in the 입부 미상 row)
	$: early = chart.detached.filter((node) => semesterOf(node.user).year !== null);
	$: unknownRow = chart.rows.find((row) => row.year === null);
	$: needle = query.trim();
	$: matches = needle
		? [...lineage.byId.values()]
				.filter((node) => String(node.user.name ?? '').includes(needle))
				.sort((a, b) => order.get(a.user.id) - order.get(b.user.id))
		: [];

	function joinLabel(user, short = false) {
		if (!Number.isFinite(user.join_year)) return '';
		const semester = Number.isFinite(user.join_semester) ? user.join_semester : null;
		if (short) {
			return `${String(user.join_year).slice(-2)}${semester ? `-${semester}` : ''} 입부`;
		}
		return `${user.join_year}년${semester ? ` ${semester}학기` : ''} 입부`;
	}

	// 21-1; 21-? without a 학기; 미상 without a 년도
	function shortJoin(user) {
		if (!Number.isFinite(user.join_year)) return '미상';
		const semester = Number.isFinite(user.join_semester) ? user.join_semester : '?';
		return `${String(user.join_year).slice(-2)}-${semester}`;
	}

	function rowLabel(row) {
		if (row.year === null) return ['입부', '미상'];
		return [String(row.year), row.semester === null ? '학기 미상' : `${row.semester}학기`];
	}

	function describe(node) {
		const user = node.user;
		const parts = [
			user.name,
			user.is_ob ? 'OB' : '현역',
			[user.major, user.year_id ? `${user.year_id}학번` : ''].filter(Boolean).join(' '),
			joinLabel(user),
			node.parent ? `사부 ${node.parent.user.name}` : '',
			node.children.length ? `제자 ${node.children.length}명` : ''
		];
		return parts.filter(Boolean).join(', ');
	}

	async function select(node, { focus = false } = {}) {
		selected = node;
		await tick();
		const card = document.getElementById(`jigi-${node.user.id}`);
		if (!card) return;
		if (focus) card.focus({ preventScroll: true });
		card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
	}

	function toggle(node) {
		if (selected === node) {
			selected = null;
		} else {
			select(node);
		}
	}

	// On a card: ↓ 사부, ↑ first 제자 (사부 sit below their 제자), ← → the 사부's other 제자. An arrow
	// with Alt, ⌘ or Ctrl (Back, Forward) or one with no member that way keeps its browser action.
	function moveFrom(event, node) {
		if (event.altKey || event.metaKey || event.ctrlKey) return;
		let next = null;
		const siblings = node.parent ? node.parent.children : [];
		const at = siblings.indexOf(node);
		if (event.key === 'ArrowDown') next = node.parent;
		else if (event.key === 'ArrowUp') next = node.children[0];
		else if (event.key === 'ArrowLeft' && at > 0) next = siblings[at - 1];
		else if (event.key === 'ArrowRight' && at >= 0) next = siblings[at + 1];
		else return;
		if (!next) return;
		event.preventDefault();
		select(next, { focus: true });
	}

	async function search() {
		await tick(); // matches follows the new query only after the update
		matchIndex = 0;
		if (matches.length) select(matches[0]);
	}

	function searchKey(event) {
		// Hangul input: the Enter that ends the last syllable's composition is not a search step
		if (event.isComposing || event.keyCode === 229) return;
		if (event.key === 'Enter' && matches.length) {
			event.preventDefault();
			const step = event.shiftKey ? -1 : 1;
			matchIndex = (matchIndex + step + matches.length) % matches.length;
			select(matches[matchIndex]);
		} else if (event.key === 'Escape') {
			// The first Escape clears the box, the next one closes the panel (windowKey skips inputs)
			if (query) query = '';
			else if (selected) closeDetail();
		}
	}

	// Focus inside the panel goes back to the member's card, not to the top of the page
	function closeDetail() {
		if (panel?.contains(document.activeElement)) {
			document.getElementById(`jigi-${selected.user.id}`)?.focus({ preventScroll: true });
		}
		selected = null;
	}

	function windowKey(event) {
		if (event.key === 'Escape' && selected && event.target?.tagName !== 'INPUT') {
			closeDetail();
		}
	}

	function zoomBy(step) {
		const at = ZOOMS.indexOf(zoom);
		zoom = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, at + step))];
	}

	function cutReason(c) {
		if (c.reason === 'self') return '자기 자신이 사부';
		if (c.reason === 'missing') return '목록에 없는 지기가 사부';
		// From the member named, each followed by their 사부
		const at = c.loop.indexOf(c.node.user);
		const names = [...c.loop.slice(at), ...c.loop.slice(0, at)].map((user) => user.name);
		return `사부 관계가 순환: ${[...names, names[0]].join(' → ')}`;
	}
</script>

<svelte:window on:keydown={windowKey} />

<svelte:head>
	<title>지기 계보</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<div class="lineage-screen">
	<div class="header">
		<div class="settinginfo">지기 계보</div>
	</div>

	{#if status === 'loading'}
		<p class="message">불러오는 중…</p>
	{:else if status === 'failed'}
		<div class="message">
			<p>지기 목록을 불러오지 못했습니다.</p>
			<button type="button" class="action" on:click={load}>다시 시도</button>
		</div>
	{:else if memberCount === 0}
		<p class="message">등록된 지기가 없습니다.</p>
	{:else}
		<div class="toolbar">
			<p class="summary">
				지기 {memberCount}명 · 계보 {lineage.families.length}개{longest
					? ` · 가장 긴 계보 ${longest}대`
					: ''}
			</p>
			<div class="search">
				<input
					type="search"
					placeholder="이름으로 찾기"
					aria-label="이름으로 찾기"
					bind:value={query}
					on:input={search}
					on:keydown={searchKey}
				/>
				<span class="count" aria-live="polite">
					{#if needle}
						{matches.length ? `${matchIndex + 1}/${matches.length}` : '없음'}
					{/if}
				</span>
			</div>
			<div class="zoom" role="group" aria-label="확대/축소">
				<button
					type="button"
					class="action small"
					on:click={() => zoomBy(-1)}
					disabled={zoom === ZOOMS[0]}
					aria-label="축소">−</button
				>
				<span class="zoom-value">{Math.round(zoom * 100)}%</span>
				<button
					type="button"
					class="action small"
					on:click={() => zoomBy(1)}
					disabled={zoom === ZOOMS[ZOOMS.length - 1]}
					aria-label="확대">+</button
				>
			</div>
			<div class="legend" aria-hidden="true">
				<span class="swatch active"></span>현역
				<span class="swatch ob"></span>OB
				<span class="legend-note">한 줄이 한 입부 학기 · 위로 갈수록 최근, 사부 위에 제자</span>
			</div>
			<a class="edit-link" href="/setting/jigi">사부·입부 수정은 지기 관리에서</a>
		</div>

		{#if lineage.cut.length}
			<p class="notice">
				사부 기록이 잘못되어 사부 없이 표시한 지기:
				{lineage.cut.map((c) => `${c.node.user.name}(${cutReason(c)})`).join(', ')}
			</p>
		{/if}
		{#if early.length}
			<p class="notice">
				입부 학기가 사부와 같거나 더 일러 사부와 선으로 잇지 못한 지기:
				{early
					.map(
						(node) =>
							`${node.user.name}(${shortJoin(node.user)}, 사부 ${node.parent.user.name} ${shortJoin(node.parent.user)})`
					)
					.join(', ')}
			</p>
		{/if}
		{#if lineage.families.length === 0}
			<p class="note">
				아직 사부가 설정된 지기가 없습니다. 지기 관리에서 사부를 설정하면 사부와 제자가 선으로
				이어집니다.
			</p>
		{/if}
		{#if unknownRow}
			<p class="note">
				입부 년도가 없는 지기 {unknownRow.count}명은 맨 아래 ‘입부 미상’ 줄에 있습니다. 지기
				관리에서 입부 년도와 학기를 넣으면 제 학기 줄로 옮겨집니다.
			</p>
		{/if}

		<div class="chart">
			<div
				class="canvas"
				style="width: {LABEL_WIDTH + chart.width * zoom}px; height: {chart.height * zoom}px"
			>
				<div class="labels" style="width: {LABEL_WIDTH}px" aria-hidden="true">
					{#each chart.rows as row (row.key)}
						{@const [main, sub] = rowLabel(row)}
						<div
							class="label"
							class:alt={row.year !== null && row.year % 2 === 0}
							class:unknown={row.year === null}
							style="top: {row.top * zoom}px; height: {ROW_HEIGHT * zoom}px"
						>
							<span class="label-main">{main}</span>
							<span class="label-sub">{sub} · {row.count}명</span>
						</div>
					{/each}
				</div>
				<div class="plot" style="width: {chart.width * zoom}px; height: {chart.height * zoom}px">
					<div
						class="tree"
						style="width: {chart.width}px; height: {chart.height}px; transform: scale({zoom})"
					>
						{#each chart.rows as row (row.key)}
							<div
								class="band"
								class:alt={row.year !== null && row.year % 2 === 0}
								class:unknown={row.year === null}
								style="top: {row.top}px; height: {ROW_HEIGHT}px"
							></div>
						{/each}
						<svg
							width={chart.width}
							height={chart.height}
							viewBox="0 0 {chart.width} {chart.height}"
							aria-hidden="true"
						>
							{#each chart.links as link}
								<path
									d={link.d}
									class:on={highlighted?.has(link.to.user.id) && highlighted.has(link.from.user.id)}
									class:dim={highlighted && !highlighted.has(link.to.user.id)}
								/>
							{/each}
						</svg>
						{#each chart.boxes as box (box.node.user.id)}
							{@const user = box.node.user}
							<button
								type="button"
								id="jigi-{user.id}"
								class="card"
								class:ob={user.is_ob}
								class:selected={selected === box.node}
								class:dim={highlighted && !highlighted.has(user.id)}
								class:match={needle && matches.includes(box.node)}
								style="left: {box.x}px; top: {box.y}px; width: {NODE.nodeWidth}px; height: {NODE.nodeHeight}px"
								aria-pressed={selected === box.node}
								aria-label={describe(box.node)}
								title={describe(box.node)}
								on:click={() => toggle(box.node)}
								on:keydown={(event) => moveFrom(event, box.node)}
							>
								<span class="name"
									><span class="name-text">{user.name}</span>{#if user.is_ob}<span class="tag"
											>OB</span
										>{/if}</span
								>
								<span class="line">{user.major ?? ''}</span>
								{#if detached.has(box.node)}
									<span class="line detached">사부 {box.node.parent.user.name}</span>
								{:else}
									<span class="line">{user.year_id ? `${user.year_id}학번` : ''}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if selected}
	{@const user = selected.user}
	<aside class="detail" aria-label="{user.name} 정보" bind:this={panel}>
		<div class="detail-head">
			<div>
				<div class="detail-name">
					{user.name}{#if user.is_ob}<span class="tag">OB</span>{/if}
				</div>
				<div class="detail-meta">
					{[user.major, user.year_id ? `${user.year_id}학번` : '', joinLabel(user)]
						.filter(Boolean)
						.join(' · ')}
				</div>
			</div>
			<button type="button" class="close" on:click={closeDetail} aria-label="닫기">×</button>
		</div>
		<dl>
			<dt>사부</dt>
			<dd>
				{#if selected.parent}
					<button
						type="button"
						class="chip"
						on:click={() => select(selected.parent, { focus: true })}
						>{selected.parent.user.name}
						<span class="chip-count">{selected.parent.user.year_id ?? ''}</span></button
					>
				{:else if cutOf.has(selected)}
					<span class="none">기록 오류 ({cutReason(cutOf.get(selected))})</span>
				{:else}
					<span class="none">기록 없음</span>
				{/if}
			</dd>
			<dt>제자</dt>
			<dd>
				{#each selected.children as child (child.user.id)}
					<button type="button" class="chip" on:click={() => select(child, { focus: true })}
						>{child.user.name}
						<span class="chip-count">{child.user.year_id ?? ''}</span></button
					>
				{:else}
					<span class="none">없음</span>
				{/each}
			</dd>
			{#if selected.root !== selected || selected.children.length}
				<dt>계보</dt>
				<dd>
					{selected.root.user.name} 계보 {selected.depth + 1}대째{below
						? ` · 아래로 ${below}명`
						: ''}
				</dd>
			{/if}
		</dl>
	</aside>
{/if}

<style>
	.lineage-screen,
	.lineage-screen *,
	.detail,
	.detail * {
		box-sizing: border-box;
	}
	.lineage-screen {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding-bottom: 24px;
	}
	.header {
		padding: 16px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		flex-direction: row;
		background-color: var(--secondary-secondary-100);
		border-style: solid;
		border-color: var(--gray-gray-400, #bcbcbc);
		border-width: 1px;
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.25);
	}
	.settinginfo {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
	}
	.message {
		margin-top: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		color: var(--gray-gray-700);
		font-family: var(--medium-font-family);
		text-align: center;
	}
	.toolbar {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
		padding: 24px 40px 8px;
		font-family: var(--medium-font-family);
		color: var(--gray-gray-950);
	}
	.summary {
		font-size: 15px;
		font-weight: 700;
		margin-right: auto;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.search input {
		width: 200px;
		padding: 6px 10px;
		border: 1px solid var(--control-border);
		border-radius: 6px;
		background-color: var(--secondary-secondary-50);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family);
		font-size: 14px;
	}
	.count {
		min-width: 40px;
		font-size: 13px;
		color: var(--gray-gray-700);
	}
	.zoom {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.zoom-value {
		min-width: 44px;
		text-align: center;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.legend {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid var(--gray-gray-400);
		margin-left: 6px;
	}
	.swatch.active {
		background-color: var(--secondary-secondary-200);
	}
	.swatch.ob {
		background-color: var(--secondary-secondary-50);
	}
	.edit-link {
		font-size: 13px;
		color: var(--gray-gray-700);
	}
	.action {
		background-color: var(--action-bg);
		color: var(--action-fg);
		border: none;
		border-radius: 3px;
		padding: 6px 16px;
		font-family: var(--medium-font-family);
		font-size: 14px;
		cursor: pointer;
		filter: drop-shadow(2px 2px 0 var(--button-shadow));
	}
	.action:hover:not(:disabled) {
		background-color: var(--action-hover-bg);
		color: var(--action-hover-fg);
	}
	.action:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.action.small {
		width: 28px;
		height: 28px;
		padding: 0;
		font-size: 16px;
		line-height: 28px;
	}
	.notice,
	.note {
		width: calc(100% - 80px);
		margin: 8px 40px 0;
		padding: 10px 14px;
		border-radius: 6px;
		background-color: var(--danger-bg);
		color: var(--danger-fg);
		font-family: var(--medium-font-family);
		font-size: 13px;
	}
	.note {
		background-color: var(--secondary-secondary-100);
		color: var(--gray-gray-950);
	}
	.legend-note {
		margin-left: 10px;
		color: var(--gray-gray-700);
	}
	/* The chart scrolls both ways inside the window; the 학기 column stays at its left edge */
	.chart {
		width: calc(100% - 80px);
		max-height: calc(100vh - 150px);
		margin: 16px 40px 0;
		overflow: auto;
		border: 1px solid var(--gray-gray-400);
		border-radius: 6px;
		background-color: var(--secondary-secondary-50);
	}
	.canvas {
		position: relative;
		display: flex;
	}
	.labels {
		position: sticky;
		left: 0;
		z-index: 2;
		flex: none;
		height: 100%;
		border-right: 1px solid var(--gray-gray-400);
		background-color: var(--secondary-secondary-50);
	}
	.label {
		position: absolute;
		left: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-family: var(--medium-font-family);
		color: var(--gray-gray-950);
		line-height: 1.25;
	}
	.label-main {
		font-size: 14px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.label-sub {
		font-size: 11px;
		color: var(--gray-gray-700);
	}
	.plot {
		position: relative;
		flex: none;
	}
	.band {
		position: absolute;
		left: 0;
		width: 100%;
	}
	.label.alt,
	.band.alt {
		background-color: var(--secondary-secondary-100);
	}
	.label.unknown,
	.band.unknown {
		border-top: 1px dashed var(--gray-gray-500);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--gray-gray-400);
		border-radius: 999px;
		background-color: var(--secondary-secondary-50);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family);
		font-size: 13px;
		cursor: pointer;
	}
	.chip:hover {
		border-color: var(--control-border);
	}
	.chip-count {
		color: var(--gray-gray-700);
		font-size: 12px;
	}
	.canvas {
		position: relative;
	}
	.tree {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: 0 0;
	}
	svg {
		position: absolute;
		left: 0;
		top: 0;
		overflow: visible;
	}
	path {
		fill: none;
		stroke: var(--gray-gray-500);
		stroke-width: 1.5;
		transition: opacity 0.15s;
	}
	path.on {
		stroke: var(--gray-gray-950);
		stroke-width: 2.5;
	}
	path.dim {
		opacity: 0.25;
	}
	.card {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 2px;
		padding: 4px 10px;
		border: 1px solid var(--gray-gray-400);
		border-radius: 6px;
		background-color: var(--secondary-secondary-200);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family);
		text-align: left;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.card.ob {
		background-color: var(--secondary-secondary-50);
	}
	.card:hover {
		border-color: var(--control-border);
	}
	.card.selected {
		border-color: var(--gray-gray-950);
		box-shadow:
			0 0 0 1px var(--gray-gray-950),
			3px 3px 0 1px var(--button-shadow);
	}
	.card.match {
		outline: 2px solid var(--danger-fg);
		outline-offset: 2px;
	}
	.card:focus-visible,
	.chip:focus-visible {
		outline: 2px solid var(--gray-gray-950);
		outline-offset: 2px;
	}
	.card.dim {
		opacity: 0.3;
	}
	.name {
		max-width: 100%;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.2;
	}
	.name-text {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.line {
		max-width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 12px;
		line-height: 1.3;
		color: var(--gray-gray-700);
	}
	.line.detached {
		color: var(--gray-gray-950);
	}
	.tag {
		flex-shrink: 0;
		padding: 0 4px;
		border-radius: 3px;
		background-color: var(--neutral-bg);
		color: var(--neutral-fg);
		font-size: 10px;
		font-weight: 500;
		line-height: 1.5;
	}
	.detail {
		position: fixed;
		right: 24px;
		bottom: 24px;
		z-index: 10;
		width: 320px;
		max-height: calc(100vh - 48px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 18px;
		border: 1px solid var(--gray-gray-400);
		border-radius: 6px;
		background-color: var(--secondary-secondary-50);
		box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.25);
		font-family: var(--medium-font-family);
		color: var(--gray-gray-950);
	}
	.detail-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.detail-name {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 20px;
		font-weight: 700;
	}
	.detail-meta {
		margin-top: 2px;
		font-size: 13px;
		color: var(--gray-gray-700);
	}
	.close {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 3px;
		background-color: var(--neutral-bg);
		color: var(--neutral-fg);
		font-size: 18px;
		line-height: 28px;
		cursor: pointer;
	}
	dl {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 8px 10px;
		align-items: baseline;
		font-size: 14px;
	}
	dt {
		color: var(--gray-gray-700);
		font-size: 13px;
	}
	dd {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.none {
		color: var(--gray-gray-700);
	}
</style>
