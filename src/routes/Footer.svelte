<script>
    import { FooterIcon, FooterLink, FooterLinkGroup } from 'flowbite-svelte';
	import { GithubSolid } from 'flowbite-svelte-icons';
    import logo from '$lib/images/logo.svg';
</script>

<footer>
    <div class="logo-text">
        <img src="{logo}" alt="logo">
        <p>SORIJIGI SNU MUSIKVEREIN</p>
    </div>
    <div class ="version">
        <p>Soriboard 2.0 &nbsp;&nbsp;&nbsp;&nbsp;</p>
        <FooterIcon href="https://github.com/SNU-Sorijigi">
            <GithubSolid class="w-6 h-6 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white" />
        </FooterIcon>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;</p>
        <FooterLinkGroup ulClass="flex flex-wrap items-center mb-6 text-sm text-gray-500 sm:mb-0 dark:text-gray-400">
            <FooterLink href="/">문의</FooterLink>
        </FooterLinkGroup>
    </div>
</footer>

<style>
    footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1em;
		text-align: center;
		font-size: 1.6em;
        font-family: "Times New Roman";
	}

	footer img {
        width: 1.5em;
        height: 1.5em;
    }

	.logo-text {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.version {
		color: #888;
		font-size: 0.8em;
		margin-top: 0.5em;
		display: flex;
		flex-direction: row;
	}
</style>