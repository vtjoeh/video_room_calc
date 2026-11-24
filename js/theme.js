const THEME_STORAGE_KEY = 'vrcTheme';

(() => {
    const themeIcons = {
        system: 'icon-brightness-auto-regular',
        light: 'icon-brightness-high-regular',
        dark: 'icon-quiet-hours-presence-regular'
    };
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    let preference = 'system';
    let select;
    let icon;

    function applyTheme(value = preference) {
        preference = value === 'light' || value === 'dark' ? value : 'system';
        const isDark = preference === 'dark' || (preference === 'system' && systemDark.matches);
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        themeColor.content = isDark ? '#000000' : '#ffffff';
        if (select) {
            select.value = preference;
            icon.className = `icon theme-picker-icon ${themeIcons[preference]}`;
        }
    }

    try {
        applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        applyTheme();
    }

    systemDark.addEventListener('change', () => {
        if (preference === 'system') applyTheme();
    });

    window.addEventListener('storage', (event) => {
        if ((event.key === THEME_STORAGE_KEY || event.key === null) && event.storageArea === localStorage) {
            applyTheme(event.newValue);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        select = document.getElementById('themeSelect');
        if (!select) return;

        icon = document.getElementById('themeSelectIcon');
        applyTheme();
        select.addEventListener('change', () => {
            applyTheme(select.value);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, preference);
            } catch {
                // Storage can be blocked while the selected theme still works in this page.
            }
        });
        select.addEventListener('keydown', (event) => event.stopPropagation());
    });
})();
