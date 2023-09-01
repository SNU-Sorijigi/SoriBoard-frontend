<div class="music-card">
    <div class="number">
        <span>
            <slot name="id"></slot>
        </span>
    </div>
    <div class="delete">
        <span role="button" tabindex="0" class="xbutton" title="close">&times;</span>
    </div>
	<div class="music-info">
		<h2>
			<slot name="composer"></slot>
			-
			<slot name="name"></slot>
		</h2>
		<div class="info">
            {#if $$slots.requested}
			<slot name="requested"></slot>
			/
            {/if}
			<slot name="source"></slot>
		</div>
	</div>

	<div class="performers">
		{#if $$slots.conductor}
		<slot name="conductor"></slot>
		/
		<slot name="orchestra"></slot>
		<br>
		{/if}
		<slot name="performer"></slot>
	</div>
</div>

<style>
	.music-card {
        display: block;
        position:sticky;
		width: 45vw;
		border: 1px solid #aaa;
		border-radius: 2px;
		box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
		padding: 1em;
        margin-bottom: 0.5em;
        background-color: white;
	}

	.music-info {
		text-align: center
	}

    .xbutton {
        position: absolute;
        right: 0;
        top: 0;
        display: inline-block;
        text-decoration: none;
        text-align: center;
        cursor: pointer;
        padding: 8px 16px;
        font-weight: bold;
        font-size: 1em;
    }
    .number {
        position: absolute;
        left: 0;
        top: 0;
        display: inline-block;
        text-decoration: none;
        text-align: center;
        padding: 8px 16px;
        font-weight: bold;
        font-size: 1em;
    }

    .xbutton:hover {
        color: #fff!important;
        background-color: #f44336!important
    }

	h2 {
        font-size: 22px;
		padding: 0 0 0.2em 0;
		margin: 0 0 0.2em 0;
		border-bottom: 1px solid #79a59a;
	}

    .info {
        font-size: 14px;
    }

	.performers {
		text-align: center;
		padding: 0.8em 0 0 0;
		margin: 0;
		line-height: 1.5;
        font-size: 15px;
	}
</style>
