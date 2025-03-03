<script>
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import NewsInfo from '$lib/components/newsinfo.svelte';

	const news = writable([]);

	async function fetchNews() {
		try {
			const response = await fetch('/api/information');
			const data = await response.json();
			news.set(data);
		} catch (error) {
			console.error('Failed to fetch news');
		}
	}

	onMount(() => {
			fetchNews();
	});

	/*let new_content = '';
	async function createNewNews(event) {
		event.preventDefault();
		const newNews = {
			content: new_content,
		};
		const response = await fetch('/api/information', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(newNews),
		});
		new_content = '';
		location.reload();
	}*/

</script>

<svelte:head>
	<title>뉴스 관리</title>
	<meta name="description" content="SoriBoard" />
</svelte:head>

<div class="setting-news-screen">
	<div class="header">
		<div class="settinginfo">뉴스 설정</div>
	</div>
	<div class="content">
		<div class="newslist hide-scrollbar">
			{#each $news as n}
				<NewsInfo
					id={n.id}
					content={n.content}
				></NewsInfo>
			{/each}
		</div>
	</div>
</div>


<style>
	.text {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--xlarge-font-family);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
	}
	.setting-news-screen {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		position: relative;
		overflow: hidden;
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
		box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.25);
	}
	.newsinfo {
		margin-left: 120px;
		color: var(--gray-gray-950, #1a1a1a);
		text-align: center;
		font-family: var(--medium-font-family, 'NotoSansKr-Medium', sans-serif);
		font-size: var(--medium-font-size, 16px);
		font-weight: var(--medium-font-weight, 500);
		position: relative;
	}
	.newslist {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
	}

</style>
