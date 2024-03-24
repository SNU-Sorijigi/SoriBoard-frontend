import { writable } from 'svelte/store';

export const displayComposer = writable('');
export const displayTitle = writable('');
export const displaySemiTitle = writable('');
export const displayOrchestra = writable('');
export const displayConductor = writable('');
export const displayPlayers = writable([]);
export const composerFontSize = writable(3);
export const titleFontSize = writable(2);
export const orchestraFontSize = writable(1.25);
export const playerFontSize = writable(1.25);
export const spacerSize1 = writable(2.25);
export const spacerSize2 = writable(1.6875);
export const spacerSize3 = writable(0.28125);
export const spacerSize4 = writable(0.28125);
