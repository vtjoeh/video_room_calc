/* Unit conversion helpers: convertToUnit, convertToMeters, convertMetersFeet.
 *
 * Extracted from roomCalc.js (Phase 2, notes/TECH_NOTES.md). Attached to
 * window.VRC.util.<name>; roomCalc.js aliases them back as top-level consts.
 * Loaded BEFORE roomCalc.js (see <script> order in RoomCalculator.html).
 * Cross-script refs (unit, activeRoom*, round, drawRoom, etc.) resolve lazily
 * at call time in the shared classic-script scope. IIFE scopes the local
 * `util` alias. See notes/COMMENT_NOTES.md "Unit conversion helpers".
 */

window.VRC = window.VRC || {};
window.VRC.util = window.VRC.util || {};

(function () {
    const util = window.VRC.util;

    /* On inputs.  Changes 5 ft 6 in to 5.5 ft.  Or 1 m to 3.28 ft. Or 10' 6" to 10.5. */
    util.convertToUnit = function convertToUnit(input) {

        input = input.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'); // replace fancy quotes for iPhone

        let measurement;

        let regex = /(?<negative>-)?\s*((?<meter>[0-9.]*)\s*m)?\s*((?<cm>[0-9.]*)\s*c)?\s*((?<feet>[0-9.]*)\s*(ft\.?|'|feet|foot))?\s*((?<inch>[0-9.]*)\s*(i|"))?\s*(?<value>[0-9.]*)?/gmi;
        let { negative, meter, cm, feet, inch, value } = regex.exec(input,).groups;

        meter = Number(meter);
        cm = Number(cm);
        feet = Number(feet);
        inch = Number(inch);
        value = Number(value);

        if (isNaN(meter)) {
            meter = 0;
        }

        if (isNaN(cm)) {
            cm = 0;
        }

        if (isNaN(feet)) {
            feet = 0;
        }

        if (isNaN(inch)) {
            inch = 0;
        }

        if (isNaN(value)) {
            value = 0;
        }

        if (unit == 'feet') {
            measurement = meter * 3.2808 + cm * 3.2808 / 100 + feet + inch / 12 + value;
        }
        else { // unit == meters
            measurement = meter + cm / 100 + feet / 3.2808 + inch / 12 / 3.2808 + value;
        }

        if (negative == '-') {
            measurement = measurement * -1;
        }

        return Math.round(measurement * 100) / 100;
    };


    /* Normalize a roomObj clone to meters for Workspace Designer export. */
    util.convertToMeters = function convertToMeters(roomObj2) {

        let roomObjTemp = {};
        roomObjTemp.room = {};
        roomObjTemp.items = [];

        let roomX;
        let roomY;

        let ratio = 1;

        if (roomObj2.unit === 'feet') {
            ratio = 1 / 3.28084;
        }
        roomObjTemp.name = roomObj2.name;




        roomX = ratio * (activeRoomX / 2 - (roomObj2.room.roomWidth - activeRoomWidth) / 2);
        roomY = ratio * (activeRoomY / 2 - (roomObj2.room.roomLength - activeRoomLength) / 2);

        roomX = ratio * (activeRoomX / 2 - (activeRoomWidth) / 2);
        roomY = ratio * (activeRoomY / 2 - (activeRoomLength) / 2);

        roomX = ratio * (activeRoomX - (roomObj2.room.roomWidth - activeRoomWidth) / 2);
        roomY = ratio * (activeRoomY - (roomObj2.room.roomLength - activeRoomLength) / 2);


        roomObjTemp.room.roomWidth = roomObj2.room.roomWidth * ratio;
        roomObjTemp.room.roomLength = roomObj2.room.roomLength * ratio;

        roomObjTemp.activeRoomLength = activeRoomLength * ratio;
        roomObjTemp.activeRoomWidth = activeRoomWidth * ratio;
        roomObjTemp.activeRoomX = roomX;
        roomObjTemp.activeRoomY = roomY;

        if (roomObj2.room.roomHeight) {
            roomObjTemp.room.roomHeight = roomObj2.room.roomHeight * ratio;
        } else {
            roomObjTemp.room.roomHeight = 2.5;
        }

        if ('backgroundImage' in roomObj2) {
            roomObjTemp.backgroundImage = {};
            roomObjTemp.backgroundImage.x = roomObj2.backgroundImage.x * ratio;
            roomObjTemp.backgroundImage.y = roomObj2.backgroundImage.y * ratio;
            roomObjTemp.backgroundImage.width = roomObj2.backgroundImage.width * ratio;
            roomObjTemp.backgroundImage.height = roomObj2.backgroundImage.height * ratio;
            roomObjTemp.backgroundImage.rotation = roomObj2.backgroundImage.rotation;
            roomObjTemp.backgroundImage.name = roomObj2.backgroundImage.name;
            roomObjTemp.backgroundImage.opacity = roomObj2.backgroundImage.opacity;
        }

        (roomObj2.items || []).forEach(item => {
            const isItemOnStage = !itemsOffStageId.includes(item.id);

            if (!(isItemOnStage || isActiveRoomPart)) return; /* only add the node if it is onstage */

            if ('x' in item) {
                item.x = (item.x * ratio) - roomX;
            }

            if ('y' in item) {
                item.y = (item.y * ratio) - roomY;
            }

            if ('width' in item) {
                item.width = item.width * ratio;
            }

            if ('height' in item) {
                item.height = item.height * ratio;
            }

            if ('radius' in item) {
                item.radius = item.radius * ratio;
            }

            if ('data_zPosition' in item) {
                item.data_zPosition = round(item.data_zPosition * ratio);
            }

            if ('data_vHeight' in item) {
                item.data_vHeight = round(item.data_vHeight * ratio);
            }

            if ('data_radius2' in item && !isNaN(item.data_radius2)) {
                item.data_radius2 = item.data_radius2 * ratio;
            }

            if ('data_gridWidth' in item && !isNaN(item.data_gridWidth)) {
                item.data_gridWidth = item.data_gridWidth * ratio;
            }

            if ('data_gridLength' in item && !isNaN(item.data_gridLength)) {
                item.data_gridLength = item.data_gridLength * ratio;
            }

            if ('tblRectRadius' in item) {
                item.tblRectRadius = round(item.tblRectRadius * ratio);
            }

            if ('data_trapNarrowWidth' in item) {
                item.data_trapNarrowWidth = round(item.data_trapNarrowWidth * ratio);
            }

            if ('data_chairSpacing' in item && !isNaN(item.data_chairSpacing)) {
                item.data_chairSpacing = round(item.data_chairSpacing * ratio);
            }

            if ('tblRectRadiusRight' in item) {
                item.tblRectRadiusRight = round(item.tblRectRadiusRight * ratio);
            }

            if (isItemOnStage) {
                item.data_isItemOnStage = true;
            } else {
                item.data_isItemOnStage = false;
            }

            roomObjTemp.items.push(item);
        });

        return roomObjTemp;

    };


    util.convertMetersFeet = function convertMetersFeet(isDrawRoom, newUnit = null) {

        wallBuilderOn(false);
        polyBuilderOn(false);

        if (newUnit === null) {
            roomObj.unit = document.getElementById('drpMetersFeet').value;
            zoomInOut('reset');
        } else {
            roomObj.unit = newUnit;
        }

        if (document.getElementById('snapIncrementCheckBox').checked = true) {  /* Snap center to increment feature messes with converting between meters, feet.  Turn it off. */
            document.getElementById('snapIncrementCheckBox').checked = false;
            document.getElementById('snapToIncrement').disabled = true;
            setItemForLocalStorage('snapIncrementCheckBox', 'false');
        }

        let defaultUnit = localStorage.getItem('defaultUnit');
        if (!(defaultUnit === 'none')) {
            setItemForLocalStorage('defaultUnit', roomObj.unit);
        }

        updateFeetMetersToggleBtn();


        let ratio = 3.28084 /* Feet / meter */
        if (roomObj.unit === 'feet') {
            /*  feet is default */
        } else {
            ratio = 1 / ratio;
        };

        function updateTextBox(id) {
            document.getElementById(id).value = (getNumberValue(id) * ratio).toFixed(2);

        }

        updateTextBox('tableWidth');
        updateTextBox('frntWallToTv');
        updateTextBox('tableLength');
        updateTextBox('distDisplayToTable');
        updateTextBox('onePersonCrop');
        updateTextBox('twoPersonCrop');

        roomObj.room.roomWidth = roomObj.room.roomWidth * ratio;
        roomObj.room.roomLength = roomObj.room.roomLength * ratio;
        if ('roomHeight' in roomObj.room) {
            roomObj.room.roomHeight = roomObj.room.roomHeight * ratio;
        }
        roomObj.room.tableWidth = roomObj.room.tableWidth * ratio;
        roomObj.room.frntWallToTv = roomObj.room.frntWallToTv * ratio;
        roomObj.room.tableLength = roomObj.room.tableLength * ratio;
        roomObj.room.distDisplayToTable = roomObj.room.distDisplayToTable * ratio;
        roomObj.room.onePersonCrop = roomObj.room.onePersonCrop * ratio;
        roomObj.room.twoPersonCrop = roomObj.room.twoPersonCrop * ratio;

        if ('backgroundImage' in roomObj) {

            roomObj.backgroundImage.x = roomObj.backgroundImage.x * ratio;
            roomObj.backgroundImage.y = roomObj.backgroundImage.y * ratio;
            roomObj.backgroundImage.width = roomObj.backgroundImage.width * ratio;
            roomObj.backgroundImage.height = roomObj.backgroundImage.height * ratio;
        }

        roomObj.items.forEach((item, i) => {
            roomObj.items[i] = convertItemUnitBasedOnRatio(item, ratio);
        });

        /* Groups store geometry in unit-space and must scale with items, else the rect drifts from members on redraw (see notes/COMMENT_NOTES.md). */
        if (Array.isArray(roomObj.groups) && roomObj.groups.length) {
            for (const i in roomObj.groups) {
                roomObj.groups[i] = convertItemUnitBasedOnRatio(roomObj.groups[i], ratio);
            }
        }

        /* Same unit-space scaling for CustomItems as Groups. */
        if (Array.isArray(roomObj.customItems) && roomObj.customItems.length) {
            for (const i in roomObj.customItems) {
                roomObj.customItems[i] = convertItemUnitBasedOnRatio(roomObj.customItems[i], ratio);
            }
        }

        if (isDrawRoom != 'noDraw') {
            drawRoom(true);
        }




    };
})();
