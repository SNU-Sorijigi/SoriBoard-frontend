<script>
    import { onMount } from 'svelte';
    import { Input } from 'flowbite-svelte';

    export let data;
    export let inputValue;
    export let placeholder;
    export let isRequired;
    let isOpen = false;
    let filteredData = [];
    let focusedIndex = -1;

    const updateFilteredData = () => {
        filteredData = data
            .filter(item => item.text.toLowerCase().includes(inputValue.toLowerCase()))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };

    const selectItem = (item) => {
        inputValue = item.text;
        isOpen = false;
    };

    const handleInput = (event) => {
        inputValue = event.target.value;
        isOpen = true;
        updateFilteredData();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            focusedIndex = Math.min(filteredData.length - 1, focusedIndex + 1);
        } else if (event.key === 'ArrowUp') {
            focusedIndex = Math.max(0, focusedIndex - 1);
        } else if (event.key === 'Enter' && focusedIndex >= 0) {
            selectItem(filteredData[focusedIndex]);
        }
    };
    const handleBlur = () => {
        isOpen = false;
    };

    const handleFocus = () => {
        isOpen = true;
        updateFilteredData();
    };

    onMount(() => {
        document.addEventListener('click', (event) => {
            if (!inputEl.contains(event.target)) {
                isOpen = false;
            }
        });
    });
</script>

<div class="container px-2">
    <Input type="text" placeholder={placeholder} required={isRequired} bind:value={inputValue} on:input={handleInput} on:keydown={handleKeyDown} on:blur={handleBlur} on:focus={handleFocus} size="md" class="mb-1 py-1.5 w-64" />
    {#if isOpen}
        <ul class="dropdown">
            {#each filteredData as item, index}
            <li class:selected={index === focusedIndex} on:click={() => selectItem(item)} tabindex="-1">
                <div class="row">
                    <p>{item.text}</p>
                    <p>{item.value}회 선곡</p>
                </div>
            </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .container {
        position: relative;
        width: 100%;
    }

    .dropdown {
        position: absolute;
        top: 100%; /* Positioned right below the input */
        left: 0;
        width: 100%;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10;
        max-height: 200px;
        overflow-y: auto;
    }

    .dropdown li {
        padding: 8px;
        cursor: pointer;
    }

    .dropdown li:hover, .dropdown li.selected {
        background-color: #f7f7f7;
    }

    .row {
        display: flex;
        justify-content: space-between;
        width: 100%; /* Full width of the container */
    }

    .row p:first-child {
        flex: 1; /* Allocate remaining space to the first paragraph */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis; /* Add ellipsis for overflowed text */
    }

    .row p:last-child {
        width: 100px; /* Fixed width for the second paragraph */
        text-align: right;
    }
</style>