<script>
    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Checkbox, TableSearch, Badge } from 'flowbite-svelte';
    import { slide } from 'svelte/transition';
    import instalogo from '$lib/images/insta.svg';
    import Autocomplete from './Autocomplete.svelte';
    const items = [
        {
        composer: '요하네스 브람스',
        title: '피아노 협주곡 제1번 라단조, Op.15',
        semititle: '제 3악장',
        players: '피아노 : 아르투르 루빈슈타인',
        conductor: '프리츠 라이너',
        orchestra: '시카고 교향악단',
        source: 'ROON',
        is_requested: false,
        more_players: '바이올린 : 다비드 오이스트라흐, 첼로 : 므스티슬라프 로스트로포비치',
    },
    {
        composer: '루트비히 판 베토벤',
        title: '교향곡 제3번 내림마장조, Op.55',
        semititle: '',
        players: '',
        conductor: '헤르베르트 폰 카라얀',
        orchestra: '베를린 필하모니 관현악단',
        source: 'ROON',
        is_requested: true,
        more_players: '',
    }
    ];
    let data = [
        {text: '요하네스 브람스', value: '34'},
        {text: '루트비히 판 베토벤', value: '28'},
        {text: '볼프강 아마데우스 모차르트', value: '14'},
        {text: '프레데리크 쇼팽', value: '22'},
        {text: '모리스 라벨', value: '17'},
        {text: '구스타프 말러', value: '9'},
    ];
    let openRow;
    let openAdd = true;
    let addMusic = () => {
        openAdd = openAdd === true ? false : true
    }
    const toggleRow = (i) => {
        openRow = openRow === i ? null : i
    }
    

    import { Accordion, AccordionItem, Input, Button, Toggle, Heading, GradientButton, Helper, Dropdown, DropdownItem, FloatingLabelInput } from 'flowbite-svelte';
    import { PenOutline, CloseOutline, CheckOutline, PlayOutline } from 'flowbite-svelte-icons';

    let showDetail = false;
    
    let composer = '';
    let title = '';
    let semititle = '';
    let players = '';
    let conductor = '';
    let orchestra = '';
    let source = '';
    let is_requested = false;

    $: edit = Array.from(items, () => false);
    let editComposer = '';
    let editTitle = '';
    let editSemititle = '';
    let editPlayers = '';
    let editConductor = '';
    let editOrchestra = '';
    let editSource = '';
    let editIsRequested = false;
    
    function openEditForm(item, i) {
        edit[i] = true;
        editComposer = item.composer;
        editTitle = item.title;
        editSemititle = item.semititle;
        editPlayers = item.players;
        editConductor = item.conductor;
        editOrchestra = item.orchestra;
        editSource = item.source;
        editIsRequested = item.is_requested;
    }
</script>
<br><br>
<div class="flex justify-center gap-10 items-center">
    <div class="text-center w-fit px-6 py-2 shadow-lg bg-white rounded-md">
        <Heading tag="h4">12월 18일(월) 3타임</Heading>
        <Heading tag="h6">담당 지기 : 정용환</Heading>
    </div>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <div class="text-center w-fit flex-col">
        <GradientButton class="w-fit h-fit mb-2 shadow-lg" color="pinkToOrange"><img src={instalogo} alt="logo"/>&nbsp&nbsp업로드</GradientButton>
        <Helper>스토리를 자동으로<br> 올릴 수.. 있을까요?</Helper>
    </div>
    <div class="text-center w-fit flex-col">
        <GradientButton class="w-fit h-fit mb-2 shadow-lg" color="cyan">기기 휴식</GradientButton>
        <Helper>시간은 자동으로<br> 설정됩니다.</Helper>
    </div>
</div>
<br>

<div class="flex justify-center">
    <div class="p-2 overflow-auto table-height hide-scrollbar">
        <Table shadow hoverable={true} class="flex-col m-auto w-fit">
        <TableHead>
            <TableHeadCell class="text-center">판서</TableHeadCell>
            <TableHeadCell class="text-center">#</TableHeadCell>
            <TableHeadCell class="w-52 text-center">작곡가</TableHeadCell>
            <TableHeadCell class="w-52 text-center">제목</TableHeadCell>
            <TableHeadCell class="w-52 text-center">연주</TableHeadCell>
            <TableHeadCell class="w-min text-center"></TableHeadCell>
        </TableHead>
        <TableBody>
            {#each items as item, i}
            <TableBodyRow>
                <TableBodyCell><Button outline color="dark" size="xs"><PlayOutline color="teal" size="sm"/></Button></TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)}>{i+1}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)} class="text-center">{item.composer}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)} class="text-center">{item.title}<br>{item.semititle}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)} class="text-center">
                    {#if item.players}{item.players}{#if item.conductor || item.orchestra}<br>{/if}{/if}
                    {#if item.conductor}지휘 : {item.conductor}{#if item.orchestra}<br>{/if}{/if}
                    {item.orchestra}
                </TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)} class="text-center flex flex-col items-center justify-center gap-1">
                    {#if item.is_requested}
                    <Badge color="dark">신청곡</Badge>
                    {/if}
                    <Badge>{item.source}</Badge>
                </TableBodyCell>
            </TableBodyRow>
            {#if openRow === i || edit[i] || showDetail}
            <TableBodyRow>
                <TableBodyCell colspan="6" class="p-0">
                    <div class="px-2 py-3 flex text-gray-500 justify-center gap-10" transition:slide={{ duration: 300, axis: 'y' }}>
                        <div>
                            {#each item.more_players.split(',') as line}<p>{line}</p>{/each}
                        </div>
                        <div>
                            {#if !edit[i]}
                            <Button class="!p-2" size="lg" outline={true} color="dark" on:click={() => openEditForm(item, i)} ><PenOutline class="m-auto"/></Button>
                            {/if}
                            {#if edit[i]}
                            <Button class="!p-2" size="lg" outline={true} color="dark" on:click={() => edit[i] = false}><CheckOutline class="m-auto"/></Button>
                            {/if}
                            <Button class="!p-2" size="lg" outline={true} color="dark"><CloseOutline class="m-auto" /></Button> 
                        </div>
                    </div>
                </TableBodyCell>
            </TableBodyRow>
            {/if}
            {/each}
            <TableBodyRow>
                <TableBodyCell on:click={() => addMusic()} colspan="6" class="text-center cursor-pointer">{#if !openAdd}+ 곡 추가하기{/if}{#if openAdd}취소{/if}</TableBodyCell>
            </TableBodyRow>
            {#if openAdd}
            <TableBodyRow>
                <TableBodyCell colspan="6">
                    <div class="flex-col flex items-center" transition:slide={{ duration: 140, axis: 'y' }}>
                        <Heading tag="h5" class="text-center">곡 추가</Heading>
                        <Helper>&nbsp&nbsp&nbsp선곡 횟수는 학기 기준입니다.</Helper>
                        <form autocomplete="off" class="flex flex-col py-3">
                            <div class="flex gap-4">
                                <div class="grid grid-cols-[auto,1fr] gap-3">
                                    <div><p class="whitespace-nowrap">작곡가</p></div>
                                    <div><Autocomplete data={data} inputValue={composer} isRequired={true}/></div>
                                    <div><p class="whitespace-nowrap">제목</p></div>
                                    <div><Autocomplete data={data} inputValue={title} isRequired={true}/></div>
                                    <div><p class="whitespace-nowrap">세부</p></div>
                                    <div><Autocomplete data={data} inputValue={semititle}/></div>
                                </div>
                                <div class="grid grid-cols-[auto,1fr] gap-3">
                                    <div><p class="whitespace-nowrap">지휘자</p></div>
                                    <div><Autocomplete data={data} inputValue={conductor}/></div>
                                    <div><p class="whitespace-nowrap">오케스트라</p></div>
                                    <div><Autocomplete data={data} inputValue={orchestra}/></div>
                                    <div><p class="whitespace-nowrap">연주자</p></div>
                                    <div><Autocomplete data={data} inputValue={players}/></div>
                                </div>
                            </div>
                            <div class="flex flex-col items-center pt-4 gap-2">
                                <label class="flex items-center">재생
                                    <Badge class="ml-2">ROON</Badge>
                                    <Dropdown class="ml-2" label="ROON" size="md" color="dark">
                                        <DropdownItem><Badge>ROON</Badge></DropdownItem>
                                        <DropdownItem><Badge color="dark">CD</Badge></DropdownItem>
                                        <DropdownItem><Badge color="indigo">OPPO</Badge></DropdownItem>
                                        <DropdownItem><Badge color="red">Youtube</Badge></DropdownItem>
                                        <DropdownItem><Badge color="yellow">개인 소장</Badge></DropdownItem>
                                    </Dropdown>
                                </label>
                                <Checkbox bind:checked={is_requested} color="teal">신청곡</Checkbox>
                                <Button type="submit" class="w-auto" color="green">추가</Button>
                            </div>
                        </form>
                    </div>
                </TableBodyCell>
            </TableBodyRow>
            {/if}
        </TableBody>
        </Table>
    </div>
</div>

<style>
    .hide-scrollbar {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
    }

    .hide-scrollbar::-webkit-scrollbar { 
        display: none;  /* Safari and Chrome */
    }

    .table-height {
        max-height: 70vh;
    }
</style>