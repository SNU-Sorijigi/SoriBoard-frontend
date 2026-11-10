<script>
	import { looseMatchParts, matchParts } from '$lib/textMatch.js';

	// text 를 그대로 보이되, q(검색어)가 든 곳마다 <mark> 로 표시한다(대소문자 무시). q 가 비었으면 글만 보인다.
	// 링크 안에도 쓰므로 앞뒤에 공백을 더하지 않는다.
	export let text = '';
	export let q = '';
	// loose: 띄어쓰기·점·줄표를 가리지 않고 든 곳도 칠한다(표기 정리의 검색처럼, looseMatchParts).
	export let loose = false;
</script>

{#each loose ? looseMatchParts(text, q) : matchParts(text, q) as part}{#if part.hit}<mark
			>{part.text}</mark
		>{:else}{part.text}{/if}{/each}

<style>
	/* 옅은 강조색, 글자색은 그대로 */
	mark {
		background: var(--primary-primary-200, #f6ebc8);
		color: inherit;
		padding: 0;
	}
</style>
