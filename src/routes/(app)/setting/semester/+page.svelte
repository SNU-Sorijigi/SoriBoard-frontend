<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	const semesters = writable([]);

	async function fetchSemesters() {
		try {
			const response = await fetch('/api/semester');
			const data = await response.json();
			semesters.set(data);
		} catch (error) {
			console.error('Failed to fetch semesters');
		}
	}

	onMount(() => {
			fetchSemesters();
	});
</script>

<main>
  <h1>Semesters List</h1>
  <ul class="semesters-list">
    {#each $semesters as semester}
      <li>{semester.year}-{semester.semester}</li>
    {/each}
  </ul>
</main>

<style>
	.text {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--xlarge-font-family);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
	}
</style>
