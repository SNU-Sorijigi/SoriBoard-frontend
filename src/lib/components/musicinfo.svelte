<script>
    import showIcon from '$lib/images/show.svg';
    import editIcon from '$lib/images/edit.svg';
    import xIcon from '$lib/images/x.svg';
    export let composer="요하네스 브람스";
    export let title="바이올린과 첼로를 위한 이중협주곡 가단조, Op.102";
    export let semiTitle="3악장";
    export let orchestra="클리블랜드 관현악단";
    export let conductor="조지 셀";
    export let players=[
        {instrument: "바이올린", name: "다비드 오이스트라흐"},
        {instrument: "첼로", name: "므스티슬라브 로스트로포비치"}
    ];
</script>
  
<div class="music">
    <div class="stack">
      <div class="div">{composer}</div>
      <div class="stack2">
        <div class="stack3">
          <div class="op-102">
            {title}
          </div>
          <div class="_3">{semiTitle}</div>
        </div>
        <div class="stack4">
          <div class="stack5">
            <div class="div2">{orchestra}</div>
            <div class="divider"></div>
            <div class="div2">{conductor}</div>
          </div>
          <div class="stack6">
            {#each players as player}
            <div class="div2">{player.instrument + ": " + player.name}</div> 
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="button">
        <div class="button" on:click={() => navigate('/time_manage')}>
            <img src={showIcon} alt="show" class="icon">
        </div>  
    <div class="div3">판서</div>
    </div>
    <div class="button">
        <div class="button" on:click={() => navigate('/time_manage')}>
            <img src={editIcon} alt="edit" class="icon">
        </div>
      <div class="div3">수정</div>
    </div>
    <div class="button">
        <div class="button" on:click={() => navigate('/time_manage')}>
            <img src={xIcon} alt="x" class="icon">
        </div>
      <div class="div3">삭제</div>
    </div>
  </div>
  
  <style>
    .music {
      width: 100%;
      border-style: solid;
      border-color: var(--primary-primary-800, #6a5134);
      border-width: 1px;
      padding: 0px 6px 0px 6px;
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      box-shadow: 2px 2px 4px 0px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      background-color: var(--primary-primary-300)
    }
    .stack {
      padding: 4px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      align-items: flex-start;
      justify-content: flex-start;
      flex-shrink: 0;
      position: relative;
    }
    .div {
      color: var(--gray-gray-950, #1a1a1a);
      text-align: left;
      font-family: var(--medium-font-family, "NotoSansKr-Medium", sans-serif);
      font-size: var(--medium-font-size, 16px);
      font-weight: var(--medium-font-weight, 500);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .stack2 {
      display: flex;
      flex-direction: column;
      gap: 5px;
      align-items: flex-start;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .stack3 {
      padding: 0px 4px 0px 4px;
      display: flex;
      flex-direction: row;
      gap: 16px;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .op-102 {
      color: var(--gray-gray-950, #1a1a1a);
      text-align: left;
      font-family: var(
        --small-medium-font-family,
        "NotoSansKr-Medium",
        sans-serif
      );
      font-size: var(--small-medium-font-size, 13px);
      font-weight: var(--small-medium-font-weight, 500);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    ._3 {
      color: var(--gray-gray-950, #1a1a1a);
      text-align: left;
      font-family: var(
        --small-medium-font-family,
        "NotoSansKr-Medium",
        sans-serif
      );
      font-size: var(--small-medium-font-size, 13px);
      font-weight: var(--small-medium-font-weight, 500);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .stack4 {
      display: flex;
      flex-direction: row;
      gap: 14px;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .stack5 {
      padding: 4px;
      display: flex;
      flex-direction: row;
      gap: 5px;
      align-items: flex-start;
      justify-content: flex-start;
      flex-shrink: 0;
      position: relative;
    }
    .div2 {
      color: var(--gray-gray-800, #343434);
      text-align: left;
      font-family: var(--small-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--small-font-size, 10px);
      font-weight: var(--small-font-weight, 400);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .divider {
      background: var(--primary-primary-800, #6a5134);
      align-self: stretch;
      flex-shrink: 0;
      width: 1px;
      position: relative;
      overflow: hidden;
    }
    .stack6 {
      padding: 4px;
      display: flex;
      flex-direction: row;
      gap: 8px;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .button {
      display: flex;
      flex-direction: column;
      gap: 1px;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      position: relative;
    }
    .icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      position: relative;
      overflow: visible;
    }
    .div3 {
      color: var(--gray-gray-950, #1a1a1a);
      text-align: left;
      font-family: var(--xsmall-font-family, "NotoSansKr-Regular", sans-serif);
      font-size: var(--xsmall-font-size, 8px);
      font-weight: var(--xsmall-font-weight, 400);
      position: relative;
    }
    .icon2 {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      position: relative;
      overflow: visible;
    }
    .icon3 {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      position: relative;
      overflow: visible;
    }
  </style>
  