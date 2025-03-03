import { writable } from 'svelte/store';

export const displayComposer = writable('');
export const displayTitle = writable('');
export const displaySemiTitle = writable('');
export const displayOrchestra = writable('');
export const displayConductor = writable('');
export const displayPlayers = writable([]);
export const displayInfoNews = writable('News');
export const displayInstagram = writable('@snu_sorijigi');
export const composerFontSize = writable(3);
export const titleFontSize = writable(2);
export const orchestraFontSize = writable(1.25);
export const playerFontSize = writable(1.25);
export const spacerSize1 = writable(2.25);
export const spacerSize2 = writable(1.6875);
export const spacerSize3 = writable(0.28125);
export const spacerSize4 = writable(0.28125);
export const spacerSize5 = writable(2.25);
export const infoNewsFontSize = writable(1.25);
export const instagramFontSize = writable(1);
export function fontSizeInit() {
    composerFontSize.set(3)
    titleFontSize.set(2);
    orchestraFontSize.set(1.25);
    playerFontSize.set(1.25);
    spacerSize1.set(2.25);
    spacerSize2.set(1.6875);
    spacerSize3.set(0.28125);
    spacerSize4.set(0.28125);
    spacerSize5.set(2.25);
    infoNewsFontSize.set(1.25);
    instagramFontSize.set(1);
}
