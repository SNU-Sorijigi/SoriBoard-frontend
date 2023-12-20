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
        is_requested: false,
    }
    ];
    let openRow
    const toggleRow = (i) => {
        openRow = openRow === i ? null : i
    }
</script>

<Table class="w-fit m-auto">
    <caption>12월 19일 3타임</caption>
    <TableHead>
        <TableHeadCell class="!p-4">
            <Checkbox />
        </TableHeadCell>
        <TableHeadCell>작곡가</TableHeadCell>
        <TableHeadCell>제목</TableHeadCell>
    </TableHead>
        <TableBody class="divide-y">
            {#each items as item, i}
            <TableBodyRow on:click={() => toggleRow(i)}>
                <TableBodyCell class="!p-4">
                    <Checkbox />
                </TableBodyCell>
                <TableBodyCell>{item.composer}</TableBodyCell>
                <TableBodyCell>{item.title}</TableBodyCell>
            </TableBodyRow>
            {#if openRow === i}
            <TableBodyRow>
                <TableBodyCell colspan="4" class="p-0">
                    <div class="px-2 py-3" transition:slide={{ duration: 300, axis: 'y' }}>
                        <p class="text-gray-500 text-sm">{item.semititle}</p>
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