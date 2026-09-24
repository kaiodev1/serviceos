export const THEME_KEY = 'serviceos-theme';
export const THEME_EVENT = 'serviceos-theme-change';

// Runs before the body is painted so a saved dark preference never flashes light.
// The script contains no user input and also works when localStorage is unavailable.
export const themeBootstrap = `(()=>{let theme;try{theme=localStorage.getItem('${THEME_KEY}')}catch{}document.documentElement.dataset.theme=theme==='dark'||theme==='light'?theme:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;
