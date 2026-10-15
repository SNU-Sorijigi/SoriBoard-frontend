<script>
	import { onMount, tick } from 'svelte';
	import { buildLineage, layoutFamily, lineageOf, descendantCount } from '$lib/lineage.js';

	const NODE = { nodeWidth: 120, nodeHeight: 68, gapX: 14, gapY: 40 };
	const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25];

	let status = 'loading'; // loading | ready | failed
	let lineage = { families: [], loners: [], byId: new Map(), cut: [] };
	let layouts = [];
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
			layouts = lineage.families.map((family) => ({
				family,
				...layoutFamily(family.root, NODE)
			}));
			memberCount = users.length;
			order = new Map();
			for (const layout of layouts) {
				for (const box of layout.boxes) order.set(box.node.user.id, order.size);
			}
			for (const node of lineage.loners) order.set(node.user.id, order.size);
			selected = selected && lineage.byId.get(selected.user.id);
			status = 'ready';
		} catch (error) {
			console.error('Failed to fetch users', error);
			status = 'failed';
		}
	}

	onMount(load);

	$: highlighted = selected ? lineageOf(selected) : null;
	$: longest = lineage.families.reduce((most, family) => Math.max(most, family.generations), 0);
	$: cutOf = new Map(lineage.cut.map((c) => [c.node, c]));
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

	function shortMeta(user) {
		return [user.year_id ? `${user.year_id}학번` : '', joinLabel(user, true)]
			.filter(Boolean)
			.join(' · ');
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

	// On a card: ↑ 사부, ↓ first 제자, ← → the 사부's other 제자. An arrow with Alt, ⌘ or Ctrl
	// (Back, Forward) or one with no member that way keeps its browser action (scrolling).
	function moveFrom(event, node) {
		if (event.altKey || event.metaKey || event.ctrlKey) return;
		let next = null;
		const siblings = node.parent ? node.parent.children : [];
		const at = siblings.indexOf(node);
		if (event.key === 'ArrowUp') next = node.parent;
		else if (event.key === 'ArrowDown') next = node.children[0];
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
			query = '';
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

	// Focus goes along to the 계보's heading: Tab then continues in that 계보, and a screen reader
	// says where it went. It used to stay on the chip.
	function goToFamily(family) {
		const section = document.getElementById(`family-${family.root.user.id}`);
		section?.querySelector('h2')?.focus({ preventScroll: true });
		section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
				지기 {memberCount}명 · 계보 {lineage.families.length}개{#if longest}
					· 가장 긴 계보 {longest}대{/if}
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
			</div>
			<a class="edit-link" href="/setting/jigi">사부 수정은 지기 관리에서</a>
		</div>

		{#if lineage.cut.length}
			<p class="notice">
				사부 기록이 잘못되어 사부 없이 표시한 지기:
				{lineage.cut.map((c) => `${c.node.user.name}(${cutReason(c)})`).join(', ')}
			</p>
		{/if}

		{#if lineage.families.length === 0}
			<p class="message">
				아직 사부가 설정된 지기가 없습니다. 지기 관리에서 사부를 설정하면 계보가 그려집니다.
			</p>
		{:else}
			{#if lineage.families.length > 1}
				<nav class="families-nav" aria-label="계보 바로가기">
					{#each lineage.families as family (family.root.user.id)}
						<button type="button" class="chip" on:click={() => goToFamily(family)}>
							{family.root.user.name} 계보 <span class="chip-count">{family.size}명</span>
						</button>
					{/each}
				</nav>
			{/if}

			<div class="forest">
				{#each layouts as layout (layout.family.root.user.id)}
					{@const family = layout.family}
					<section class="family" id="family-{family.root.user.id}">
						<div class="family-head">
							<h2 tabindex="-1">{family.root.user.name} 계보</h2>
							<p>
								{family.size}명 · {family.generations}대{#if family.firstYear}
									· {family.firstYear === family.lastYear
										? family.firstYear
										: `${family.firstYear}–${family.lastYear}`}{/if}
							</p>
						</div>
						<div class="scroll">
							<div
								class="canvas"
								style="width: {layout.width * zoom}px; height: {layout.height * zoom}px"
							>
								<div
									class="tree"
									style="width: {layout.width}px; height: {layout.height}px; transform: scale({zoom})"
								>
									<svg
										width={layout.width}
										height={layout.height}
										viewBox="0 0 {layout.width} {layout.height}"
										aria-hidden="true"
									>
										{#each layout.links as link}
											<path
												d={link.d}
												class:on={highlighted?.has(link.to.user.id) &&
													highlighted.has(link.from.user.id)}
												class:dim={highlighted &&
													selected.root === family.root &&
													!highlighted.has(link.to.user.id)}
											/>
										{/each}
									</svg>
									{#each layout.boxes as box (box.node.user.id)}
										{@const user = box.node.user}
										<button
											type="button"
											id="jigi-{user.id}"
											class="card"
											class:ob={user.is_ob}
											class:selected={selected === box.node}
											class:dim={highlighted &&
												selected.root === family.root &&
												!highlighted.has(user.id)}
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
											<span class="line">{shortMeta(user)}</span>
										</button>
									{/each}
								</div>
							</div>
						</div>
					</section>
				{/each}
			</div>
		{/if}

		{#if lineage.loners.length}
			<section class="loners">
				<h2>사부·제자 기록이 없는 지기 · {lineage.loners.length}명</h2>
				<p>지기 관리에서 사부를 설정하면 계보에 들어갑니다.</p>
				<div class="loner-list">
					{#each lineage.loners as node (node.user.id)}
						<button
							type="button"
							id="jigi-{node.user.id}"
							class="chip member"
							class:ob={node.user.is_ob}
							class:selected={selected === node}
							class:match={needle && matches.includes(node)}
							aria-pressed={selected === node}
							aria-label={describe(node)}
							on:click={() => toggle(node)}
						>
							{node.user.name}{#if node.user.is_ob}<span class="tag">OB</span>{/if}
							<span class="chip-count">{shortMeta(node.user)}</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}
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
					{selected.root.user.name} 계보 {selected.depth + 1}대째{#if descendantCount(selected)}
						· 아래로 {descendantCount(selected)}명{/if}
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
		padding-bottom: 240px; /* room above the fixed detail panel */
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
	.notice {
		width: calc(100% - 80px);
		margin: 8px 40px 0;
		padding: 10px 14px;
		border-radius: 6px;
		background-color: var(--danger-bg);
		color: var(--danger-fg);
		font-family: var(--medium-font-family);
		font-size: 13px;
	}
	.families-nav {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 8px 40px 0;
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
	.chip.member {
		background-color: var(--secondary-secondary-200);
	}
	.forest {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: center;
		gap: 24px;
		padding: 24px 40px;
	}
	.family {
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px 20px 20px;
		border-radius: 6px;
		background-color: var(--secondary-secondary-100);
		scroll-margin-top: 16px;
	}
	.family-head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		font-family: var(--medium-font-family);
		color: var(--gray-gray-950);
	}
	.family-head h2 {
		font-size: 16px;
		font-weight: 700;
	}
	.family-head p {
		font-size: 13px;
		color: var(--gray-gray-700);
	}
	.scroll {
		max-width: 100%;
		overflow-x: auto;
		padding: 4px;
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
		padding: 6px 10px;
		border: 1px solid var(--gray-gray-400);
		border-radius: 6px;
		background-color: var(--secondary-secondary-200);
		color: var(--gray-gray-950);
		font-family: var(--medium-font-family);
		text-align: left;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.card.ob,
	.chip.ob {
		background-color: var(--secondary-secondary-50);
	}
	.card:hover {
		border-color: var(--control-border);
	}
	.card.selected,
	.chip.selected {
		border-color: var(--gray-gray-950);
		box-shadow:
			0 0 0 1px var(--gray-gray-950),
			3px 3px 0 1px var(--button-shadow);
	}
	.card.match,
	.chip.match {
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
	.loners {
		width: calc(100% - 80px);
		margin: 0 40px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px 20px 20px;
		border-radius: 6px;
		border: 1px dashed var(--gray-gray-400);
		font-family: var(--medium-font-family);
		color: var(--gray-gray-950);
	}
	.loners h2 {
		font-size: 16px;
		font-weight: 700;
	}
	.loners p {
		font-size: 13px;
		color: var(--gray-gray-700);
	}
	.loner-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 4px;
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
