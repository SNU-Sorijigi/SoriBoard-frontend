<script>
    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Checkbox, TableSearch, Badge } from 'flowbite-svelte';
    import { slide } from 'svelte/transition';
    const items = [
    {
        composer: '요하네스 브람스',
        title: '피아노 협주곡 제1번 라단조, Op.15',
        semititle: '제 3악장',
        players: '피아노 : 아르투르 루빈슈타인',
        conductor: '지휘 : 프리츠 라이너',
        orchestra: '시카고 교향악단',
        source: 'ROON',
        is_requested: false,
    },
    {
        composer: '루트비히 판 베토벤',
        title: '교향곡 제3번 내림마장조, Op.55',
        semititle: '',
        players: '',
        conductor: '지휘 : 헤르베르트 폰 카라얀',
        orchestra: '베를린 필하모닉 관현악단',
        source: 'ROON',
        is_requested: true,
    }
    ];
    let openRow
    const toggleRow = (i) => {
        openRow = openRow === i ? null : i
    }

    import { Accordion, AccordionItem, Input, Button, Toggle } from 'flowbite-svelte';
    import { PenOutline, CloseOutline, CheckOutline } from 'flowbite-svelte-icons';

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
<h2>12월 19일 3타임</h2>
<Toggle bind:checked={showDetail} color="teal" class="w-fit m-auto">자세히 보기</Toggle>

<div class="flex justify-center">
    <div class="p-2 overflow-auto table-height hide-scrollbar">
        <Table shadow hoverable={true} class="w-auto flex-col m-auto">
        <TableHead>
            <TableHeadCell>#</TableHeadCell>
            <TableHeadCell>신청곡</TableHeadCell>
            <TableHeadCell>작곡가</TableHeadCell>
            <TableHeadCell>제목</TableHeadCell>
            <TableHeadCell></TableHeadCell>
            <TableHeadCell>수정</TableHeadCell>
            <TableHeadCell>삭제</TableHeadCell>
        </TableHead>
        <TableBody class="divide-y">
            {#each items as item, i}
            <TableBodyRow>
                {#if !edit[i]}
                <TableBodyCell on:click={() => toggleRow(i)}>{i+1}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)}>
                    <Checkbox class="m-auto" disabled checked={item.is_requested}/>
                </TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)}>{item.composer}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)}>{item.title}</TableBodyCell>
                <TableBodyCell on:click={() => toggleRow(i)}>{item.semititle}</TableBodyCell>
                <TableBodyCell>
                    <Button class="!p-2" size="lg" outline={true} color="dark" on:click={() => openEditForm(item, i)} ><PenOutline class="m-auto"/></Button>
                </TableBodyCell>
                {/if}
                {#if edit[i]}
                <TableBodyCell>{i+1}</TableBodyCell>
                <TableBodyCell>
                    <Checkbox class="m-auto" checked={editIsRequested}/>
                </TableBodyCell>
                <TableBodyCell><Input type="text" bind:value={editComposer} size="sm"/></TableBodyCell>
                <TableBodyCell><Input type="text" bind:value={editTitle} size="sm"/></TableBodyCell>
                <TableBodyCell><Input type="text" bind:value={editSemititle} size="sm"/></TableBodyCell>
                <TableBodyCell>
                    <Button class="!p-2" size="lg" outline={true} color="dark" on:click={() => edit[i] = false}><CheckOutline class="m-auto"/></Button>
                </TableBodyCell>
                {/if}
                <TableBodyCell>
                    <Button class="!p-2" size="lg" outline={true} color="dark"><CloseOutline class="m-auto" /></Button>
                </TableBodyCell>
            </TableBodyRow>
            {#if openRow === i || edit[i] || showDetail}
            <TableBodyRow>
                <TableBodyCell colspan="7" class="p-0">
                    <div class="px-2 py-3" transition:slide={{ duration: 300, axis: 'y' }}>
                        <p class="text-gray-500 text-sm">{item.players}</p>
                        <p class="text-gray-500 text-sm">{item.conductor}</p>
                        <p class="text-gray-500 text-sm">{item.orchestra}</p>
                        <Badge style="background-color: #477; color: #aaa;">{item.source}</Badge>
                    </div>
                </TableBodyCell>
            </TableBodyRow>
            {/if}
            {/each}
        </TableBody>
        </Table>
    </div>
    <div>
        <br>
        <Accordion class="w-80">
            <AccordionItem open class="h-2">
                <span slot="header">곡 추가</span>
                <form class="flex flex-col items-center">
                    <Input type="text" bind:value={composer} placeholder="작곡가" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={title} placeholder="제목" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={semititle} placeholder="세부 제목" size="sm" class="mb-1"/>
                    <Input type="text" bind:value={conductor} placeholder="지휘자" size="sm" class="mb-1"/>
                    <Input type="text" bind:value={orchestra} placeholder="오케스트라" size="sm" class="mb-1"/>
                    <Input type="text" bind:value={players} placeholder="연주자" size="sm" class="mb-1"/>
                    <Input type="text" bind:value={source} placeholder="소스 기기" size="sm" class="mb-1"/>
                    <Checkbox bind:checked={is_requested} color="teal" class="mb-1">신청곡</Checkbox>
                    <Button type="submit" class="w-auto" color="green">추가</Button>
                </form>
            </AccordionItem>
        </Accordion>
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
        height: 70vh;
    }
</style>