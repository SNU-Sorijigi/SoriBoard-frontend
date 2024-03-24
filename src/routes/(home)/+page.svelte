<script>
    import { onMount } from 'svelte';
    import timetableIcon from '$lib/images/timetable.svg';
    import displayIcon from '$lib/images/display.svg';
    import statIcon from '$lib/images/stat.svg';
    import settingIcon from '$lib/images/setting.svg';
    import logoIcon from '$lib/images/logo.svg';
    import githubIcon from '$lib/images/github.svg';

    function navigate(url) {
        window.location.href = url;
    }

    let selectedString = "";

    const strings = [
    { text: "오늘도 풍성한 선곡 부탁합니다.", probability: 0.3 },
    { text: "오늘의 날씨와 어울리는 선곡 부탁해요~", probability: 0.02 },
    { text: "오늘은 이안니스 크세나키스 어때요?", probability: 0.01 },
    { text: "오늘은  21세기 음악 트는거 어때요?", probability: 0.03 },
    { text: "오늘은 20세기 후반 음악 트는거 어때요?", probability: 0.03 },
    { text: "오늘은 바로크 음악 트는거 어때요?", probability: 0.03 },
    { text: "오늘은 후기낭만 음악 트는거 어때요?", probability: 0.03 },
    { text: "오늘은 20세기 초반 음악 트는거 어때요?", probability: 0.03 },
    { text: "＼＼\٩(๑`^´๑)۶//／／오늘 하루도 파이팅!＼＼\٩(๑`^´๑)۶//／／", probability: 0.05 },
    { text: "다음주 쯤엔 특집 한 번 해보시죠!", probability: 0.02 },
    { text: "왜 지금 학교에 계시죠..?ㅎ", probability: 0.03 },
    { text: "이 글을 보셨다면 오늘 아주 좋은 일이 가득하겠군요:)", probability: 0.02 },
    { text: "소리지기에 오신것을 환영합니다!!", probability: 0.4 }
    ];

    function selectStringWithProbability(strings) {
        const rand = Math.random();
        let sum = 0;

        for (const item of strings) {
            sum += item.probability;
            if (rand <= sum) {
                return item.text;
            }
        }
        return strings[strings.length - 1].text;
    }
    onMount(() => {
        selectedString = selectStringWithProbability(strings);
    });
</script>
  
<div class="home-screen">
    <div class="stack">
      <div class="div">{selectedString}&nbsp</div>
      <div class="stack2">
        <div class="stack3">
            <button class="button" on:click={() => navigate('/time_manage')}>
                <img src={timetableIcon} alt="timetable" class="icon">
            </button>
            <div class="text">타임 관리</div>
        </div>
        <div class="stack3">
            <button class="button" on:click={() => navigate('/stat')}>
                <img src={statIcon} alt="stat" class="icon">
            </button>
            <div class="text">통계</div>
        </div>
        <div class="stack3">
            <button class="button" on:click={() => navigate('/setting')}>
                <img src={settingIcon} alt="setting" class="icon">
            </button>
            <div class="text">설정</div>
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
                    <div class="githubbutton" on:click={() => navigate('https://github.com/SNU-Sorijigi/SoriBoard-frontend')}>
                        <img src={githubIcon} alt="github" class="githubicon">
                    </div>
                </div>
            </div>
        </div>
    </footer>
</div>
  
  <style>
    .home-screen {
      background: var(--secondary-secondary-100, #fdf1e4);
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
      background: var(--primary-primary-700);
      filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
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
      font-family: "Times New Roman", sans-serif;
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
      font-family: "Times New Roman", sans-serif;
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
        filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
        border-radius: 3px;
        cursor: pointer;
    }
  </style>
  