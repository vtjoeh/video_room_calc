/* VRC load migration for legacy Ceiling Mic Pro and Ceiling Speaker Pro mounts. */
window.VRC = window.VRC || {};
window.VRC.migrations = window.VRC.migrations || {};

(function () {
    function migrateLegacyCeilingKitMounts(obj) {
        if (!obj || !Array.isArray(obj.items)) return 0;

        const mountAliases = {
            ceilingMicPro: {
                suspended: 'ceilingMount',
                normal: 'ceilingBracket',
                recessed: 'dropCeilingGrid'
            },
            loudspeakerPro: {
                ceilingMount: 'suspended',
                ceilingBracket: 'normal',
                dropCeilingGrid: 'recessed'
            }
        };
        let migrated = 0;

        obj.items.forEach(item => {
            if (!item || !mountAliases[item.data_deviceid]) return;
            const mounts = allDeviceTypes[item.data_deviceid]?.mounts || [];
            if (!mounts.length) return;

            const oldMount = item.data_mount;
            let mountValue = typeof oldMount === 'string' ? oldMount : oldMount?.value;
            if (mountValue) mountValue = mountAliases[item.data_deviceid][mountValue] || mountValue;

            let mountIndex = mounts.findIndex(option =>
                (typeof option === 'string' ? option : Object.keys(option)[0]) === mountValue
            );
            if (mountIndex < 0 && Number.isInteger(oldMount?.index) && oldMount.index >= 0 && oldMount.index < mounts.length) {
                mountIndex = oldMount.index;
            }
            if (mountIndex < 0) mountIndex = 0;

            const option = mounts[mountIndex];
            const normalizedValue = typeof option === 'string' ? option : Object.keys(option)[0];
            if (typeof oldMount !== 'object' || !oldMount
                || oldMount.value !== normalizedValue || oldMount.index !== mountIndex) {
                item.data_mount = { value: normalizedValue, index: mountIndex };
                migrated++;
            }
        });

        return migrated;
    }

    window.VRC.migrations.migrateLegacyCeilingKitMounts = migrateLegacyCeilingKitMounts;
})();
