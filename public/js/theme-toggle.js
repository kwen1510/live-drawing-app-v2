const THEME_STORAGE_KEY = 'preferred-theme';
const root = document.documentElement;
const toggleButton = document.getElementById('themeToggle');
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isValidTheme = (value) => value === 'light' || value === 'dark';

const readStoredTheme = () => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isValidTheme(stored) ? stored : null;
    } catch (error) {
        console.warn('Unable to access localStorage for theme preference.', error);
        return null;
    }
};

const writeStoredTheme = (value) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch (error) {
        console.warn('Unable to persist theme preference.', error);
    }
};

const applyTheme = (theme) => {
    const nextTheme = isValidTheme(theme) ? theme : 'light';
    root.setAttribute('data-theme', nextTheme);

    if (toggleButton) {
        toggleButton.dataset.theme = nextTheme;
        toggleButton.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
        toggleButton.setAttribute(
            'aria-label',
            nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
};

const initialiseTheme = () => {
    const stored = readStoredTheme();
    const initialTheme = stored ?? (mediaQuery.matches ? 'dark' : 'light');
    applyTheme(initialTheme);
};

initialiseTheme();

if (toggleButton) {
    toggleButton.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        writeStoredTheme(nextTheme);
    });
}

if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', (event) => {
        const stored = readStoredTheme();
        if (stored) {
            return;
        }
        applyTheme(event.matches ? 'dark' : 'light');
    });
} else if (mediaQuery.addListener) {
    mediaQuery.addListener((event) => {
        const stored = readStoredTheme();
        if (stored) {
            return;
        }
        applyTheme(event.matches ? 'dark' : 'light');
    });
}
