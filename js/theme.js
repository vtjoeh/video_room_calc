(() => {
    const storageKey = 'vrcTheme';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    let preference = 'system';
    let select;

    function applyTheme(value = preference) {
        preference = value === 'light' || value === 'dark' ? value : 'system';
        const isDark = preference === 'dark' || (preference === 'system' && systemDark.matches);
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        themeColor.content = isDark ? '#000000' : '#ffffff';
        if (select) select.value = preference;
    }

    try {
        applyTheme(localStorage.getItem(storageKey));
    } catch {
        applyTheme();
    }

    systemDark.addEventListener('change', () => {
        if (preference === 'system') applyTheme();
    });

    window.addEventListener('storage', (event) => {
        if ((event.key === storageKey || event.key === null) && event.storageArea === localStorage) {
            applyTheme(event.newValue);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        select = document.getElementById('themeSelect');
        if (!select) return;

        select.value = preference;
        select.addEventListener('change', () => {
            applyTheme(select.value);
            try {
                localStorage.setItem(storageKey, preference);
            } catch {
                // Storage can be blocked while the selected theme still works in this page.
            }
        });
        select.addEventListener('keydown', (event) => event.stopPropagation());
    });
})();
