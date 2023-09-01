<script>
	import Header from './Header.svelte';
    import './styles.css';
    import logo from '$lib/images/logo.svg';
	import { page } from '$app/stores';
</script>

{#if $page.url.pathname != '/display'}
	<div class="app">
		<Header />

		<main>
			<slot />
		</main>

		<footer>
			<p><img src={logo} alt="logo"> SORIJIGI SNU MUSIKVEREIN</p>
        	<p class="version">Soriboard 2.0</p>
		</footer>
	</div>
{:else}
	<div class="app">
		<slot />
	</div>
{/if}

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 95vw;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
        flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 10px;
        font-size: 1.6em;
        font-family: "Times New Roman";
	}

    footer img {
        width: 2.5em;
        height: 2.5em;
        transform: translatey(50%);
    }

    .version {
        font-size: 0.8em;
    }

    p {
        margin: 0;
    }
</style>