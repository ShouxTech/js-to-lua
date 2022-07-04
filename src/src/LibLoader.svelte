<script>
    // Based on code from https://stackoverflow.com/questions/59629947/how-do-i-load-an-external-js-library-in-svelte-sapper
    import { onMount, createEventDispatcher } from 'svelte';

    export let src;
    export let libraryDetectionObject;

    const dispatch = createEventDispatcher();

    let script;

    onMount(() => {
        if (
            libraryDetectionObject &&
            window &&
            typeof window[libraryDetectionObject] !== 'undefined'
        ) {
            return dispatch('loaded');
        }
        script.addEventListener('load', () => {
            dispatch('loaded');
        });
        script.addEventListener('error', (event) => {
            dispatch('error');
        });
    });
</script>

<svelte:head>
    <script bind:this={script} {src}></script>
</svelte:head>