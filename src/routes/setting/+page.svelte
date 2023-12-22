<script>
    import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import { AccordionItem, Accordion, Input, Checkbox, Search, Button } from 'flowbite-svelte';
    import { Dropdown, DropdownItem, Modal, GradientButton } from 'flowbite-svelte';
    import { PenOutline } from 'flowbite-svelte-icons';
    import { writable } from 'svelte/store';
    import { onMount } from 'svelte';

    export let data;
    let users = data.users;
    let searchTerm = '';
    $: filteredUser = users.filter((user) => user.name.indexOf(searchTerm) !== -1);

    const sortKey = writable('name');
    const sortDirection = writable(1);

    $: sortUsers = [...filteredUser].sort((a, b) => {
        const aVal = a[$sortKey];
        const bVal = b[$sortKey];

        if (aVal < bVal) return -1 * $sortDirection;
        if (aVal > bVal) return 1 * $sortDirection;
        return 0;
    });

    const sortTable = (key) => {
        if ($sortKey === key) {
            sortDirection.update((n) => -n);
        } else {
            sortKey.set(key);
            sortDirection.set(1);
        }
    };

    let name = '';
    let major = '';
    let yearId = '';
    let isOb = false;
    async function addNewUser(event) {
        event.preventDefault();
        const newUser = {
            name,
            major,
            year_id: yearId,
            is_ob: isOb
        };
        const response = await fetch(`/api/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newUser)
        });
        name = '';
        major = '';
        yearId = '';
        isOb = false;
        location.reload();
    }
    let edit = false;
    let editId = '';
    let editName = '';
    let editMajor = '';
    let editYearId = '';
    let editIsOb = false;
    async function editUser(event) {
        event.preventDefault();
        const newUser = {
            name: editName,
            major: editMajor,
            year_id: editYearId,
            is_ob: editIsOb
        };
        const response = await fetch(`/api/user/${editId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newUser)
        });
        if (response.ok) {
        } else {
            console.error("Failed to update user");
        }
        edit = false;
        editName = '';
        editMajor = '';
        editYearId = '';
        editIsOb = false;
        location.reload();
    }
    function openEditForm(user) {
        edit = false;
        edit = true;
        editId = user.id;
        editName = user.name;
        editMajor = user.major;
        editYearId = user.year_id;
        editIsOb = user.is_ob;
    }

    import { ButtonGroup } from 'flowbite-svelte';

    let year;
    let semester;
    let time_num = 4;
    let semesterId;
    let startTime;
    let endTime;
    let restTime;
    $: timetable = Array.from({ length: time_num }, () => 
        Array.from({ length: 5 }, () => 
            Array.from({ length: 2 }, () => 
                new Array(6).fill("")
            )
        )
    );
    function updateDate() {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        semester = (month >= 2 && month <= 7) ? 1 : 2;
    }

    async function fetchData(year, semester) {
        const response = await fetch(`/api/semester/${year}/${semester}`);
        if (!response.ok) {
            console.log("Error");
        }
        return await response.json();
    }

    async function fetchSemester(year, semester) {
        const response = await fetch(`/api/semesterinfo/${year}/${semester}`);
        if (!response.ok) {
            console.log("Error");
        }
        return await response.json();
    }

    onMount(() => {
        updateDate();
    });

    $: if (year && semester && time_num) {
        fetchSemester(year, semester).then(data => {
            if(data.total_time != null){
                time_num = data.total_time;
                semesterId = data.id;
                startTime = data.start_time;
                endTime = data.end_time;
                restTime = data.rest_time;
            }else{
                time_num = 4;
                semesterId = null;
            }
        });
        timetable = Array.from({ length: time_num }, () => 
            Array.from({ length: 5 }, () => 
                Array.from({ length: 2 }, () => 
                    new Array(6).fill("")
                )
            )
        );
        fetchData(year, semester).then(data => {
            data.forEach(element => {
                timetable[element.time-1][element.day-1][0][0] = element.user.name;
                timetable[element.time-1][element.day-1][0][1] = element.user.major;
                timetable[element.time-1][element.day-1][0][2] = element.user.year_id;
                timetable[element.time-1][element.day-1][0][3] = element.user.is_ob;
                timetable[element.time-1][element.day-1][0][4] = element.user.id;
                timetable[element.time-1][element.day-1][0][5] = element.id;
                if (element.mentee != null){
                    timetable[element.time-1][element.day-1][1][0] = element.mentee.name;
                    timetable[element.time-1][element.day-1][1][1] = element.mentee.major;
                    timetable[element.time-1][element.day-1][1][2] = element.mentee.year_id;
                    timetable[element.time-1][element.day-1][1][3] = element.mentee.is_ob;
                    timetable[element.time-1][element.day-1][1][4] = element.mentee.id;
                }
            });
        });
    }
        

    function goToNextSemester() {
        if (semester == 1) {
            semester = 2;
        } else {
            year += 1;
            semester = 1;
        }
    }
    function goToPreviousSemester() {
        if (semester == 2) {
            semester = 1;
        } else {
            year -= 1;
            semester = 2;
        }
    }

    let timeEdit = false;
    function startTimeEdit() {
        timeEdit = true;
    }

    function endEdit() {
        timeEdit = false;
        year = year+1;
        year = year-1;
    }

    async function saveTimeEdit() {
        timeEdit = false;
        event.preventDefault();
        const newSemester = {
            year,
            semester,
            total_time: time_num,
            start_time: startTime,
            end_time: endTime,
            rest_time: restTime
        };
        if(semesterId == null){
            const response = await fetch(`/api/semester/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSemester)
            });
            if (response.ok) {
                const data = await response.json();
                semesterId = data.id;
            } else {
                console.error("Failed to create semester");
            }
        }else{
            const response = await fetch(`/api/semester/${semesterId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSemester)
            });
            if (response.ok) {
            } else {
                console.error("Failed to update timetable");
            }
        }
        for(let i=0; i<time_num; i++){
            for(let j=0; j<5; j++){
                if(timetable[i][j][0][4] != ""){
                    if(timetable[i][j][0][5] != ""){
                        const newTimetable = {
                            user: timetable[i][j][0][4],
                            semester_info: semesterId,
                            day: j+1,
                            time: i+1,
                            mentee: timetable[i][j][1][4]
                        };
                        const response = await fetch(`/api/semesterinfo/${timetable[i][j][0][5]}/`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(newTimetable)
                        });
                        if (response.ok) {
                        } else {
                            console.error("Failed to update timetable");
                        }
                    }else{
                        const newTimetable = {
                            user: timetable[i][j][0][4],
                            semester_info: semesterId,
                            day: j+1,
                            time: i+1,
                            mentee: timetable[i][j][1][4]
                        };
                        const response = await fetch(`/api/semesterinfo/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(newTimetable)
                        });
                        if (response.ok) {
                        } else {
                            console.error("Failed to create timetable");
                        }
                    }
                }
            }
        }
        //location.reload();
    }

    function changeUser(newUser, i, j, k) {
        timetable[i][j][k][0] = newUser.name;
        timetable[i][j][k][1] = newUser.major;
        timetable[i][j][k][2] = newUser.year_id;
        timetable[i][j][k][3] = newUser.is_ob;
        timetable[i][j][k][4] = newUser.id;
    }
</script>
<br>
<div class="flex justify-center">
    <ButtonGroup class="space-x-px">
        <GradientButton pill shadow="teal" color="teal" on:click={goToPreviousSemester}>← 지난 학기</GradientButton>
        <GradientButton pill shadow="teal" color="teal" on:click={goToNextSemester}>다음 학기 →</GradientButton>
    </ButtonGroup>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
    <GradientButton shadow="teal" color="teal" on:click={updateDate}>이번 학기</GradientButton>
</div>
<br>
<div class="space-x-4 flex items-center m-auto w-fit h-10">
    <p class="font-bold whitespace-nowrap">{year}년 {semester}학기</p>
    {#if timeEdit}
    <p class="font-bold whitespace-nowrap">시작 시간</p>
    <Input type="time" bind:value={startTime} size="sm" class="mb-1 h-fit" required/>
    <p class="font-bold whitespace-nowrap">종료 시간</p>
    <Input type="time" bind:value={endTime} size="sm" class="mb-1 h-fit" required/>
    <p class="font-bold whitespace-nowrap">휴식 시간</p>
    <Input type="number" bind:value={restTime} size="sm" class="mb-1 h-fit"/>
    <p class="font-bold whitespace-nowrap">타임 수</p>
    <Input type="number" bind:value={time_num} size="sm" class="mb-1 h-fit" required/>
    {/if}
</div>
<br>
<div class="container mx-auto p-2">
    <div class="grid grid-cols-5 gap-4">
        <div class="text-center font-bold">월</div>
        <div class="text-center font-bold">화</div>
        <div class="text-center font-bold">수</div>
        <div class="text-center font-bold">목</div>
        <div class="text-center font-bold">금</div>
        {#each Array(time_num) as _, i}
            {#each Array(5) as _, j}
                <div class="border py-4 text-center">
                    {#if timetable[i][j][0][0] != "" && !timeEdit}
                        <div class="font-bold">{timetable[i][j][0][0]}</div>
                        <div>{timetable[i][j][0][1]}&nbsp;{timetable[i][j][0][2]}</div>
                    {/if}
                    {#if timeEdit}
                    <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1 mb-1">{timetable[i][j][0][0]}<br>{timetable[i][j][0][1]}&nbsp;{timetable[i][j][0][2]}</Button>
                    <Dropdown class="overflow-y-auto px-3 pb-3 text-sm h-96" style="width: 36rem;">
                        <div slot="header" class="p-3">
                            <Search type="text" bind:value={searchTerm} placeholder="지기 검색" size="md"/>
                        </div>
                        <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1" on:click={changeUser({name:'', major:'', year_id:'', is_ob: false, id:null}, i, j, 0)}>자리<br>비우기</Button>
                        {#each sortUsers as user}
                        <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1" on:click={changeUser(user, i, j, 0)}>{user.name}<br>{user.major}&nbsp{user.year_id}</Button>
                        {/each}
                    </Dropdown>
                    {/if}
                    <br>
                    {#if timetable[i][j][1][0] != "" && !timeEdit}
                        <div class="font-bold">{timetable[i][j][1][0]}</div>
                        <div>{timetable[i][j][1][1]}&nbsp;{timetable[i][j][1][2]}</div>
                    {/if}
                    {#if timeEdit}
                    <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1">{timetable[i][j][1][0]}<br>{timetable[i][j][1][1]}&nbsp;{timetable[i][j][1][2]}</Button>
                    <Dropdown class="overflow-y-auto px-3 pb-3 text-sm h-96" style="width: 36rem;">
                        <div slot="header" class="p-3">
                            <Search type="text" bind:value={searchTerm} placeholder="지기 검색" size="md"/>
                        </div>
                        <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1" on:click={changeUser({name:'', major:'', year_id:'', is_ob: false, id:null}, i, j, 1)}>자리<br>비우기</Button>
                        {#each sortUsers as user}
                        <Button outline color="dark" class="w-44 h-16 text-sm rounded p-1" on:click={changeUser(user, i, j, 1)}>{user.name}<br>{user.major}&nbsp{user.year_id}</Button>
                        {/each}
                    </Dropdown>
                    {/if}
                </div>
            {/each}
        {/each}
    </div>
</div>
<br>
<div class="flex justify-center">
    {#if !timeEdit}
    <GradientButton shadow="teal" color="teal" on:click={startTimeEdit}>편집</GradientButton>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
    {/if}
    {#if timeEdit}
    <GradientButton shadow="teal" color="teal" on:click={saveTimeEdit}>저장</GradientButton>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
    <GradientButton shadow="teal" color="teal" on:click={endEdit}>취소</GradientButton>
    {/if}
</div>


<br><br>
<div class="flex justify-center">
    <div class="p-2 overflow-auto table-height hide-scrollbar">
        <Table hoverable={true} class="border border-grey-500">
            <caption class="p-5 text-lg font-semibold text-center text-gray-900 bg-white dark:text-white dark:bg-gray-800 border border-black">
                지기 관리
            </caption>
            <TableHead>
                <TableHeadCell on:click={() => sortTable('name')}>이름</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('major')}>학과</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('year_id')}>학번</TableHeadCell>
                <TableHeadCell on:click={() => sortTable('is_ob')}>특징</TableHeadCell>
                <TableHeadCell></TableHeadCell>
            </TableHead>
            <TableBody>
                {#each sortUsers as user}
                <TableBodyRow>
                    <TableBodyCell>{user.name}</TableBodyCell>
                    <TableBodyCell>{user.major}</TableBodyCell>
                    <TableBodyCell>{user.year_id}</TableBodyCell>
                    <TableBodyCell>
                        {#if user.is_ob}
                        <Badge color="green">OB</Badge>
                        {/if}
                    </TableBodyCell>
                    <TableBodyCell>
                        <PenOutline on:click={() => openEditForm(user)} />
                    </TableBodyCell>
                </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    </div>
    <div>
        <br>
        <Search type="text" bind:value={searchTerm} placeholder="지기 검색" size="md"/>
        <br>
        <Accordion>
            <AccordionItem class="h-2">
                <span slot="header">지기 추가</span>
                <form on:submit={addNewUser} class="flex flex-col items-center">
                    <Input type="text" bind:value={name} placeholder="이름" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={major} placeholder="전공" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={yearId} placeholder="학번" size="sm" class="mb-1" pattern="\d{2}\" title="학번은 두 자리 숫자여야 합니다." required/>
                    <Checkbox bind:checked={isOb} color="teal" class="mb-1">OB</Checkbox>
                    <Button type="submit" class="w-auto" color="green">추가</Button>
                </form>
            </AccordionItem>
        </Accordion>
        <br>
        {#if edit}
        <Accordion>
            <AccordionItem open={edit} class="h-2">
                <span slot="header">정보 수정</span>
                <form on:submit={editUser} class="flex flex-col items-center">
                    <Input type="text" bind:value={editName} placeholder="이름" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={editMajor} placeholder="전공" size="sm" class="mb-1" required/>
                    <Input type="text" bind:value={editYearId} placeholder="학번" size="sm" class="mb-1" pattern="\d{2}\" title="학번은 두 자리 숫자여야 합니다." required/>
                    <Checkbox bind:checked={editIsOb} color="teal" class="mb-1">OB</Checkbox>
                    <div>
                        <Button type="submit" class="w-auto" color="green">수정</Button>
                        <Button on:click={()=>edit=false} class="w-auto" color="dark">취소</Button>
                    </div>
                </form>
            </AccordionItem>
        </Accordion>
        {/if}
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
        height: 60vh;
    }
</style>