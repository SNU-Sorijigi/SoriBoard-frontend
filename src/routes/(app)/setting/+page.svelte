<script>
    import { writable } from 'svelte/store';
    import { onMount } from 'svelte';
/*
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
    */
</script>
<div class="text">공사 중..</div>

<style>
    .text {
        color: var(--gray-gray-950, #1a1a1a);
        text-align: center;
        font-family: var(--xlarge-font-family);
        font-size: var(--xlarge-font-size, 32px);
        font-weight: var(--xlarge-font-weight, 500);
    }
</style>