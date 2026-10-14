<script>
	import timetableIcon from '$lib/images/timetable.svg';
	import statIcon from '$lib/images/stat.svg';
	import settingIcon from '$lib/images/setting.svg';
	import githubIcon from '$lib/images/github.svg';
	import lineageIcon from '$lib/images/lineage.svg';

	function navigate(url) {
		window.location.href = url;
	}
</script>

<div class="setting-home-screen">
	<div class="stack">
		<div class="div">설정 페이지</div>
		<div class="stack2">
			<div class="stack3">
				<button class="button" on:click={() => navigate('/setting/jigi')}>
					<img src={timetableIcon} alt="지기 관리" class="icon" />
				</button>
				<div class="text">지기 관리</div>
			</div>
			<div class="stack3">
				<button class="button" on:click={() => navigate('/setting/lineage')}>
					<img src={lineageIcon} alt="지기 계보" class="icon" />
				</button>
				<div class="text">지기 계보</div>
			</div>
			<div class="stack3">
				<button class="button" on:click={() => navigate('/setting/semester')}>
					<img src={statIcon} alt="학기 관리" class="icon" />
				</button>
				<div class="text">학기 관리</div>
			</div>
			<div class="stack3">
				<button class="button" on:click={() => navigate('/setting/timetable')}>
					<img src={settingIcon} alt="뉴스 관리" class="icon" />
				</button>
				<div class="text">뉴스 관리</div>
			</div>
		</div>
	</div>
	<footer>
		<div class="footer">
			<div class="stack5">
				<div class="stack6">
					<div class="sorijigi-snu-musikverein">SORIJIGI SNU MUSIKVEREIN</div>
				</div>
				<div class="stack6">
					<div class="soriboard-2-0">Soriboard 2.0.0</div>
					<a class="githubbutton" href="https://github.com/SNU-Sorijigi/SoriBoard-frontend">
						<img src={githubIcon} alt="github" class="githubicon" />
					</a>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	.setting-home-screen {
		background: var(--secondary-secondary-50);
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: flex-start;
		height: 100vh;
		position: relative;
		overflow: hidden;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 40px;
		align-items: center;
		justify-content: center;
		align-self: stretch;
		flex: 1;
		position: relative;
	}
	.div {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: left;
		font-family: var(--xlarge-font-family);
		font-size: var(--xlarge-font-size, 32px);
		font-weight: var(--xlarge-font-weight, 500);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.stack2 {
		display: flex;
		flex-direction: row;
		gap: 160px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.stack3 {
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.button {
		border-radius: 3px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		height: auto;
		position: relative;
		overflow: visible;
		filter: drop-shadow(4px 4px 0 var(--button-shadow));
		background: var(--action-bg);
		border-radius: 3px;
		cursor: pointer;
		border: none;
	}
	.text {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: left;
		font-family: var(--large-font-family);
		font-size: var(--large-font-size, 24px);
		font-weight: var(--large-font-weight, 500);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.footer {
		display: flex;
		flex-direction: row;
		gap: 10px;
		align-items: center;
		flex-shrink: 0;
		padding: 2vh;
	}
	.stack5 {
		display: flex;
		flex-direction: column;
		gap: 0px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.sorijigi-snu-musikverein {
		color: var(--gray-gray-950, #1a1a1a);
		text-align: left;
		font-family: 'Times New Roman', sans-serif;
		font-size: 30px;
		font-weight: 400;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.stack6 {
		display: flex;
		flex-direction: row;
		gap: 10px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}
	.soriboard-2-0 {
		color: var(--gray-gray-600, #7c7c7c);
		text-align: left;
		font-family: 'Times New Roman', sans-serif;
		font-size: 18px;
		font-weight: 400;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}
	.icon {
		flex-shrink: 0;
		width: 70px;
		height: 70px;
		position: relative;
		overflow: visible;
	}
	.githubicon {
		flex-shrink: 0;
		width: 35px;
		height: 35px;
		position: relative;
		overflow: visible;
	}
	.githubbutton {
		border-radius: 3px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		height: auto;
		position: relative;
		overflow: visible;
		filter: drop-shadow(4px 4px 0 var(--button-shadow));
		border-radius: 3px;
		cursor: pointer;
	}
</style>
