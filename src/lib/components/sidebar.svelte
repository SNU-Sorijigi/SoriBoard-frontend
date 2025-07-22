<script>
	import homeIcon from '$lib/images/home.svg';
	import timetableIcon from '$lib/images/timetable.svg';
	import playlistIcon from '$lib/images/playlist.svg';
	import displayIcon from '$lib/images/display.svg';
	import statIcon from '$lib/images/stat.svg';
	import settingIcon from '$lib/images/setting.svg';

	function navigate(url) {
		window.location.href = url;
	}
</script>

<div class="side-bar">
	<div class="spacer-top"></div>
	<div class="main-buttons">
		<button class="button" on:click={() => navigate('/')}>
			<img src={homeIcon} alt="home" class="icon" />
		</button>
		<button class="button" on:click={() => navigate('/time_manage')}>
			<img src={timetableIcon} alt="timetable" class="icon" />
		</button>
		<!--
        <button class="button" on:click={() => navigate('/time_manage/1')}>
            <img src={playlistIcon} alt="playlist" class="icon">
        </button>
    -->
		<button class="button" on:click={() => navigate('/stat')}>
			<img src={statIcon} alt="stats" class="icon" />
		</button>
	</div>
	<div class="spacer-bottom"></div>
	<div class="divider"></div>
	<button class="button" on:click={() => navigate('/setting')}>
		<img src={settingIcon} alt="settings" class="icon" />
	</button>
</div>

<style>
	.side-bar {
		display: flex;
		align-items: flex-start;
		background: var(--secondary-secondary-100, #fef9f3);
		border-style: solid;
		border-color: var(--gray-gray-400, #bcbcbc);
		border-width: 1px;
		flex-direction: column;
		gap: 4px;
		align-items: stretch;
		justify-content: flex-start;
		height: 100vh; /* Full viewport height */
		min-height: 100vh; /* Ensure minimum full height */
		width: 58px; /* Fixed width for sidebar */
		position: relative;
		box-shadow: 0px 4px 5px 0px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		padding: 4px;
		flex-shrink: 0;
	}
	.spacer-top {
		flex: 1; /* Take up half the available space */
		min-height: 50px; /* Minimum spacing */
	}
	.main-buttons {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
	}
	.spacer-bottom {
		flex: 1; /* Take up half the available space */
		min-height: 50px; /* Minimum spacing */
	}
	.button {
		border-radius: 3px;
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		height: 45px;
		position: relative;
		overflow: visible;
		background: var(--primary-primary-700);
		filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
		border-radius: 3px;
		cursor: pointer;
		border: none;
	}
	.icon {
		width: 34px;
		height: 34px;
		background-size: cover;
	}
	.divider {
		background: var(--gray-gray-300, #d4d4d4);
		align-self: stretch;
		flex-shrink: 0;
		height: 2px;
		position: relative;
		overflow: hidden;
		margin: 4px 0;
	}
</style>
