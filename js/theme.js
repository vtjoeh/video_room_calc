const THEME_STORAGE_KEY = 'vrcTheme';

(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    let preference = 'system';
    let updatePicker;

    function applyTheme(value = preference) {
        preference = value === 'light' || value === 'dark' ? value : 'system';
        const isDark = preference === 'dark' || (preference === 'system' && systemDark.matches);
        const theme = isDark ? 'dark' : 'light';
        const previousTheme = document.documentElement.dataset.theme;
        document.documentElement.dataset.theme = theme;
        themeColor.content = isDark ? '#000000' : '#ffffff';
        updatePicker?.();
        if (theme !== previousTheme) window.dispatchEvent(new Event('vrc:themechange'));
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
        const trigger = document.getElementById('themeSelect');
        if (!trigger) return;

        const listbox = document.getElementById('themeOptions');
        const options = Array.from(listbox.querySelectorAll('[role="option"]'));
        const value = document.getElementById('themeSelectValue');
        const icon = document.getElementById('themeSelectIcon');
        const picker = trigger.closest('.theme-picker');
        let activeIndex = 0;

        function setActiveOption(index) {
            options[activeIndex].classList.remove('is-active');
            activeIndex = Math.max(0, Math.min(index, options.length - 1));
            const option = options[activeIndex];
            option.classList.add('is-active');
            trigger.setAttribute('aria-activedescendant', option.id);
            option.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        const selectedIndex = () => options.findIndex(option => option.dataset.value === preference);

        function openMenu(index) {
            listbox.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            trigger.focus({ preventScroll: true });
            setActiveOption(index);
        }

        function closeMenu() {
            listbox.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            trigger.removeAttribute('aria-activedescendant');
            options[activeIndex].classList.remove('is-active');
        }

        function chooseOption(option) {
            closeMenu();
            applyTheme(option.dataset.value);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, preference);
            } catch {
                // Storage can be blocked while the selected theme still works in this page.
            }
        }

        updatePicker = () => {
            const selected = options[selectedIndex()];
            value.textContent = selected.querySelector('span').textContent;
            icon.className = selected.querySelector('.icon').className;
            options.forEach(option => option.setAttribute('aria-selected', String(option === selected)));
        };
        updatePicker();

        trigger.addEventListener('click', () => {
            if (listbox.hidden) openMenu(selectedIndex());
            else closeMenu();
        });
        trigger.addEventListener('keydown', (event) => {
            event.stopPropagation();
            if (event.ctrlKey || event.metaKey) return;

            const { key } = event;
            if (key === 'Escape' && !listbox.hidden) {
                event.preventDefault();
                closeMenu();
                return;
            }
            if (key === 'Enter' || key === ' ') {
                if (listbox.hidden) return;
                event.preventDefault();
                chooseOption(options[activeIndex]);
                return;
            }

            let index;
            switch (key) {
                case 'ArrowDown':
                case 'ArrowUp':
                    index = listbox.hidden ? selectedIndex() : activeIndex + (key === 'ArrowDown' ? 1 : -1);
                    break;
                case 'Home':
                    index = 0;
                    break;
                case 'End':
                    index = options.length - 1;
                    break;
                default:
                    if (key.length !== 1 || event.altKey) return;
                    index = options.findIndex(option => option.dataset.value.startsWith(key.toLowerCase()));
                    if (index < 0) return;
            }
            event.preventDefault();
            if (listbox.hidden) openMenu(index);
            else setActiveOption(index);
        });
        listbox.addEventListener('pointerdown', event => event.preventDefault());
        listbox.addEventListener('click', event => {
            const option = event.target.closest('[role="option"]');
            if (option) chooseOption(option);
        });
        trigger.addEventListener('blur', closeMenu);
        window.addEventListener('blur', closeMenu);
        document.addEventListener('pointerdown', event => {
            if (!listbox.hidden && !picker.contains(event.target)) closeMenu();
        });
    });
})();
