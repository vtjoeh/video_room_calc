const version = "v0.1.503";  // format example "v0.1" or "v0.2.3" - ver 0.1.1 and 0.1.2 should be compatible with a Shareable Link  ver 0.1 and ver 0.2 are not compabile.  
const isCacheImages = true; /* Images for Canvas are preloaded in case of network disruption while being mobile. Turn to false to save server downloads */
let perfectDrawEnabled = false;
let versionQueryString;
let qrCodeAlwaysOn = false; /* QrCode is only used on RoomOS devices.  Adding &qr to the query string turns on the qrCode options */
let timerQRcodeOn; 
const svgns = "http://www.w3.org/2000/svg";  // variable for the namespace 
const videoRoomCalcSVG = "videoRoomCalcSVG";
let roomCanvas = "roomCanvas"; // roomCanvas will replace videoRoomCalcSVG
let pxOffset = 40; // margin on the picture in pixels 
let pyOffset = pxOffset;
let scale = 50; /* Scale of image. initial value.  Will be recalculated before drawing image */
let roomWidth = 20;  /* initial values */
let roomLength = 20;  /* inital values */
let mobileDevice; /* Either 'true' / 'false' as a string */
let muserAgent;
let windowOuterWidth = window.outerWidth;  //  keep track of outer width/height for room zoom
let windowOuterHeight = window.outerHeight;
let pxLastGridLineY;
let roomName = '';

let qrCodeButtonsVisible = false; 

let onePersonCrop; // values will change when unit changes m * ft/m 
let twoPersonCrop; // values will change when unit changes m * ft/m
let onePersonZoom;
let twoPersonZoom;

let defaultOnePersonCrop = 2.1; // default in meters  
let defaultTwoPersonCrop = 3.2;  // default in meters

let drawScaledLineMode = false; /* False by default.  True when scaled line is being drawn */ 
let touchesLength = 0; /* hold the e.touches.length on start for a touch device */
let stage = new Konva.Stage({ container: 'canvasDiv', name: 'theCanvas', id: 'theId' });
let layerGrid = new Konva.Layer({
    name: 'layerGrid',
});
const sessionId = createUuid(); /* Each browser session has a unique sessionId to keep track of statistics. No cookies used for this. */ 
const startTime = new Date(Date.now()); /* startTime is for statistics */ 
const clientTimeStamp = startTime.toUTCString();
let videoDevice;
let videoDeviceKey;
let fullShareLink;
let lastAction = "load";
let quickSetupState = 'disabled'; /* QuickSetupState states are changed by program to 'update', 'disabled' or 'insert' to see if quick setup menu works */
let primaryDeviceIsAllInOne = false; /* keep track if the primary device is all in one */
let idKeyObj = {}; /* keep the vavlue pair { 'id' : 'key' } of the different categories in 1 object */
let keyIdObj = {}; /* keep the vavlue pair { 'key' : 'id' } of the different categories in 1 object */
let roomObj = {}; /* used to store the room data in JSON format.  redraw(true) rebuilds the entire room from the roomObj JSON */
roomObj.name = ''; /* Pre-creating objects now so the order shows up on top in JSON file. */
roomObj.version = version; /* version of Video Room Calculator */
roomObj.unit = 'feet'; /* meters or feet*/
roomObj.room = {};  /* Dimensions of the room and anything specific */
roomObj.room.roomWidth = 26; /* roomWidth default value in feet */
roomObj.room.roomLength = 20; /* roomLength default value in feet */
roomObj.items = {}; /* all devices in the room will be stored here.  Video devices, displays, tables, etc. */
roomObj.trNodes = []; /* These are the selected shape items used for undo / redo. Does not need to be saved in URL */
roomObj.layersVisible = {};
roomObj.layersVisible.grShadingCamera = true;  /* true or false */
roomObj.layersVisible.grDisplayDistance = true; /* true or false */
roomObj.layersVisible.grShadingMicrophone = true;  /* true or false */
roomObj.layersVisible.gridLines = true; /* true or false */
roomObj.layersVisible.grShadingSpeaker = true;  /* true or false */

roomObj.items.videoDevices = [];
roomObj.items.chairs = [];
roomObj.items.tables = [];
roomObj.items.shapes = [];
roomObj.items.displays = [];
roomObj.items.speakers = [];
roomObj.items.microphones = [];
roomObj.items.touchPanels = []; 

let unit = roomObj.unit;

let gridToggleState = 'room';
let toggleButtonOnColor = '#4169E1';

let toggleButtonOffColor = '#800000';

let undoArray = [];

let redoArray = [];

let maxUndoArrayLength = 100;

let undoArrayTimer; /* timer pepare for saving to the undoArray so that undoArray entries are limited */
let undoArrayTimeDelta = 500; /* ms between saves to undoArray after changes to roomObj */
let touchConsecutiveCount = 0; /* Holds consecutive tapping to zoom out on mobile devices when stuck on the canvas.  Needed if user zooms web page on canvas. Ignored on RoomOS and non-touch devices. */
let touchConsectiveCoutTimer; /* timer to hold consective taps */

let stageOriginalWidth;
let stageOriginalLength;
let stageOriginalset = false;

let zoomScaleX = 1;  /* zoomScaleX zoomScaleY used clicking the + or - button to zoom. */

let zoomScaleY = 1;

const PADDING = 100;

let kGroupLines = new Konva.Group();

let dx = 0; /* dx & dy change based on scrolling when zoomed */

let dy = 0;

let panScrollableOn = false; /* Keeps state if the canvas is scrollable */

let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

let scrollContainer = document.getElementById('scroll-container');

/* displayDepth, DisplayHeight, displayWidth, diagonalInches are used as a ratio to determine size of display based on diagonal inches */
let displayDepth = 90;
let displayHeight = 750;
let displayWidth = 1230;
let diagonalInches = 55;

/*************************************************/

let nodeNumber = 1;  /* used for testing */

let insertCountXOffset = 0;  /* Not used at the moment. Was used counters used when inserting a node for the first time */
let insertCountYOffset = 0;

let layerSelectionBox = new Konva.Layer({
    name: 'layerSelectionBox'
});


let clipShadingBorder = {  /* Outside of the border/wall guidance is feature are not used */
    x: pxOffset,
    y: pyOffset,
    width: roomWidth * scale,
    height: roomLength * scale,
}

let grShadingMicrophone = new Konva.Group({
    name: 'grShadingMicrophone',
    clip: clipShadingBorder,
});

let grDisplayDistance = new Konva.Group(
    {
        name: 'grDisplayDistance',
        clip: clipShadingBorder,
    }
)

let grShadingSpeaker = new Konva.Group(
    {
        name: 'grShadingSpeaker',
        clip: clipShadingBorder,
    }
)

let grShadingCamera = new Konva.Group({
    name: 'grShadingCamera',
    clip: clipShadingBorder,
});

let layerTransform = new Konva.Layer(
    { name: 'layerTransform' },
);

let groupVideoDevices = new Konva.Group({
    name: 'videoDevices',
});

let groupMicrophones = new Konva.Group({
    name: 'microphones',
});

let groupChairs = new Konva.Group({
    name: 'chairs',
})

let groupTables = new Konva.Group({
    name: 'tables',
})

let groupDisplays = new Konva.Group({
    name: 'displays',
})

let groupSpeakers = new Konva.Group({
    name: 'speakers',
})

let groupTouchPanel = new Konva.Group({
    name: 'touchPanels',
})

/* future use.  groupShapes could be used for ceiling shapes or custom images */
let groupShapes = new Konva.Group(
    {
        name: 'shapes',
    }
)

let titleGroup = new Konva.Group(
    {
        name: 'titleGroup',
    }
)

let txtAttribution = new Konva.Text(
    {
        name: 'txtAttribution',
    }
)

let tr = new Konva.Transformer({
    resizeEnabled: false,
    flipEnabled: false,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
    name: 'theTransformer',
    rotateAnchorOffset: 25,
});

let groupBackground = new Konva.Group(
    {
        name: 'backGround',
    }
)

/* panRectangle is the highest level shape used to make panning work. It is hidden until pan is enabled. Opacity always = 0 */
let panRectangle = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'red',
    preventDefault: false,
    opacity: 0,
});

let panX = 0;
let panY = 0;
let panMove = false;

panRectangle.on('click', (event) => {

})

panRectangle.on('mousedown', (mouse) => {
    panX = mouse.evt.clientX;
    panY = mouse.evt.clientY;
    panMove = true;
    document.getElementById("canvasDiv").style.cursor = "grabbing";
})

panRectangle.on('mousemove', (mouse) => {

    if (!panMove) return;

    let changeX = panX - mouse.evt.clientX;
    let changeY = panY - mouse.evt.clientY;

    scrollContainer.scrollLeft = scrollContainer.scrollLeft + changeX;
    scrollContainer.scrollTop = scrollContainer.scrollTop + changeY;

    panX = mouse.evt.clientX;
    panY = mouse.evt.clientY;

})

panRectangle.on('mouseup', (event) => {
    panMove = false;
    document.getElementById("canvasDiv").style.cursor = "grab";
})

panRectangle.hide(); /* use .hide() panRectangle to hide, but .show() to pan on the canvas.  */
layerSelectionBox.add(panRectangle);

/************************************************************************** */

document.getElementById('lblVersion').innerHTML = version;

/* videoDevices key starts with A or B */
let videoDevices = [
    { name: "Room Bar", id: 'roomBar', key: 'AB', wideHorizontalFOV: 120, teleHorizontalFOV: 120, onePersonZoom: 2.94, twoPersonZoom: 4.76, topImage: 'roomBar-top.png', frontImage: 'roomBar-front.png', width: 534, depth: 64.4, height: 82, micRadius: 3000, micDeg: 140, cameraShadeOffSet: 20 },
    { name: "Room Bar Pro", id: 'roomBarPro', key: 'AC', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 2.09, twoPersonZoom: 3.16, topImage: 'roomBarPro-top.png', frontImage: 'roomBarPro-front.png', width: 960, depth: 90, height: 120, micRadius: 4000, micDeg: 100 },
    { name: 'Room Kit EQX: 75"_displays', id: 'roomKitEqx', key: 'AD', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqx-top.png', frontImage: 'roomKitEqx-front.png', width: 3362, depth: 152, height: 1230, diagonalInches: 75 },
    { name: "Room Kit EQ: Quad Camera", key: 'AE', id: 'roomKitEqQuadCam', cameraParent: 'quadCam', topImage: 'quadCam-top.png', frontImage: 'quadCam-front.png' },
    { name: "Room Kit EQ: Quad Camera Extended (720p)", key: 'AF', id: 'roomKitEqQuadCamExt', cameraParent: 'quadCamExt' },
    { name: "Room Kit EQ: PTZ 4K Camera", key: 'AG', id: 'roomKitEqPtz4k', cameraParent: 'ptz4k' },
    { name: "Room Kit EQ: Quad Cam + PTZ 4K Extended", key: 'AH', id: 'roomKitEqQuadPtz4k', cameraParent: 'quadPtz4kExt', topImage: 'roomKitEqQuadPtz4k-top.png', frontImage: 'roomKitEqQuadPtz4k-front.png' },
    { name: "Room Kit Pro: Quad Camera", id: 'roomKitProQuadCam', key: 'AI', cameraParent: "quadCam" },
    { name: "Board Pro 55", id: 'boardPro55', key: 'AJ', codecParent: "boardPro75", topImage: 'boardPro55-top.png', frontImage: 'boardPro55-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55 },
    { name: "Board Pro 75", id: 'boardPro75', key: 'AK', wideHorizontalFOV: 120, teleHorizontalFOV: 85, onePersonZoom: 2.39, twoPersonZoom: 3.82, topImage: 'boardPro75-top.png', frontImage: 'boardPro75-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75 },
    { name: "Board Pro 55 G2", id: 'brdPro55G2', key: 'AL', codecParent: 'brdPro75G2', topImage: 'brdPro55G2-top.png', frontImage: 'brdPro55G2-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, micRadius: 4000, micDeg: 100 },
    { name: "Board Pro 75 G2", id: 'brdPro75G2', key: 'AM', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 2.09, twoPersonZoom: 3.16, topImage: 'brdPro75G2-top.png', frontImage: 'brdPro75G2-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, micRadius: 4000, micDeg: 100 },
    { name: "Desk", id: 'webexDesk', key: 'AN', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDesk-top.png', frontImage: 'webexDesk-front.png', width: 565, depth: 70, height: 474, diagonalInches: 24 },
    { name: "Desk Pro", id: 'webexDeskPro', key: 'AO', wideHorizontalFOV: 71, teleHorizontalFOV: 71, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDeskPro-top.png', frontImage: 'webexDeskPro-front.png', width: 627.7, depth: 169.9, height: 497.8, diagonalInches: 27, cameraShadeOffSet: 40 },
    { name: "Desk Mini", id: 'webexDeskMini', key: 'AP', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDeskMini-top.png', frontImage: 'webexDeskMini-front.png', width: 371, depth: 135, height: 162.5, diagonalInches: 15, cameraShadeOffSet: 30 },
    { name: "Room 55", id: 'room55', key: 'AQ', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'room55-top.png', frontImage: 'room55-front.png', width: 1245, depth: 775, height: 1593, diagonalInches: 55, displayOffSetY: 370 },
    { name: "Room Kit Mini", id: 'rmKitMini', key: 'AR', wideHorizontalFOV: 112, teleHorizontalFOV: 112, onePersonZoom: 2.04, twoPersonZoom: 3.41, topImage: 'rmKitMini-top.png', frontImage: 'rmKitMini-front.png', width: 500, depth: 77, height: 80 },
    { name: "Room Kit", id: 'roomKit', key: 'AS', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'roomKit-top.png', frontImage: 'roomKit-front.png', width: 700, depth: 88, height: 106 },
    { name: "Virtual Lens (Beta) Bar Pro/Brd Pro G2", id: 'rmBarProVirtualLens', key: 'AT', codecParent: 'roomBarPro', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 4.335, twoPersonZoom: 3.5 },
    { name: 'Room Kit EQX: 75"_displays Floor Stand', id: 'roomKitEqxFS', key: 'AU', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqxFS-top.png', frontImage: 'roomKitEqx-front.png', width: 3362, depth: 924, height: 1910, diagonalInches: 75, displayOffSetY: 450 },
]


/* camera key starts with C */
let cameras = [
    { name: "Precision 60 Camera", id: 'cameraP60', key: 'CA', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 20, twoPersonZoom: 20, topImage: 'cameraP60-top.png', frontImage: 'cameraP60-front.png', width: 268.1, depth: 162.5, height: 151.9, cameraShadeOffSet: 40, displayOffSetY: 35 },
    { name: "PTZ 4K Camera", id: 'ptz4k', key: 'CB', wideHorizontalFOV: 70, teleHorizontalFOV: 69, onePersonZoom: 24, twoPersonZoom: 36, topImage: 'ptz4k-top.png', frontImage: 'ptz4k-front.png', width: 158.4, depth: 200.2, height: 177.5, cameraShadeOffSet: 50, displayOffSetY: 60 },
    { name: "Quad Camera", id: 'quadCam', key: 'CC', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 2.64, twoPersonZoom: 2.64, teleFullWidth: true, topImage: 'quadCam-top.png', frontImage: 'quadCam-front.png', width: 950, depth: 102.5, height: 120 },
    { name: "Quad Camera Extended (720p)", id: 'quadCamExt', key: 'CD', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 4, twoPersonZoom: 4, teleFullWidth: true, topImage: 'quadCamExt-top.png', frontImage: 'quadCamExt-front.png', width: 950, depth: 102.5, height: 120 },
    { name: "Quad Cam + PTZ 4K Extended", id: 'quadPtz4kExt', key: 'CE', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 2.64, twoPersonZoom: 5, teleFullWidth: true, topImage: 'quadPtz4kExt-top.png', frontImage: 'quadPtz4kExt-front.png', width: 950, depth: 200.2, height: 177.5, displayOffSetY: 60 },
]

/* microphone key starts with M */
let microphones = [
    {
        name: "Cisco Table Microphone",
        id: "tableMic",
        key: "MB",
        micRadius: 1000,
        micDeg: 360,
        topImage: 'tableMic-top.png',
        frontImage: 'tableMic-front.png',
        width: 63.9,
        depth: 63.9,
        height: 10.9,

    },
    {
        name: "Cisco Table Microphone Pro",
        id: "tableMicPro",
        key: "MC",
        micRadius: 1500,
        micDeg: 360,
        topImage: 'tableMicPro-top.png',
        frontImage: 'tableMicPro-front.png',
        width: 98,
        depth: 98,
        height: 29,
    },
    {
        name: "Cisco Ceiling Microphone",
        id: "ceilingMic",
        key: "MD",
        micRadius: 4200,
        micDeg: 180,
        topImage: 'ceilingMic-top.png',
        frontImage: 'ceilingMic-front.png',
        width: 750,
        depth: 550,
        height: 270,
    },
    {
        name: "Cisco Ceiling Microphone Pro",
        id: "ceilingMicPro",
        key: "MA",
        micRadius: 3500,
        micDeg: 360,
        topImage: 'ceilingMicPro-top.png',
        frontImage: 'ceilingMicPro-front.png',
        width: 420,
        depth: 420,
        height: 48,
    },
]

/* tables key starts with T */
let tables = [{
    name: 'Table Rectangle',
    id: 'tblRect',
    key: 'TA',
    frontImage: 'tblRect-front.png',
},
{
    name: 'Table Ellipse',
    id: 'tblEllip',
    key: 'TB',
    frontImage: 'tblEllip-front.png',
},
{
    name: 'Table Trapezoid ',
    id: 'tblTrap',
    key: 'TC',
    frontImage: 'tblTrap-front.png',
}
]

/* chair key ID start with S */
let chairs = [
    {
        name: "Chair",
        id: "chair",
        key: "SA",
        topImage: 'chair-top.png',
        frontImage: 'chair-front.png',
        width: 640,
        depth: 640,
        opacity: 0.4,
    }
]

/* displays key starts with D */
let displays = [
    {
        name: 'Single Display',
        id: 'displaySngl',
        key: 'DA',
        frontImage: 'displaySngl-front.png',
        topImage: 'displaySngl-top.png',
        width: displayWidth * 1,
        depth: displayDepth,
        height: displayHeight,
        diagonalInches: diagonalInches,

    },
    {
        name: 'Dual Displays',
        id: 'displayDbl',
        key: 'DB',
        frontImage: 'displayDbl-front.png',
        topImage: 'displayDbl-top.png',
        width: displayWidth * 2,
        depth: displayDepth,
        height: displayHeight,
        diagonalInches: diagonalInches,
    },
    {
        name: 'Triple Displays',
        id: 'displayTrpl',
        key: 'DC',
        frontImage: 'displayTrpl-front.png',
        topImage: 'displayTrpl-top.png',
        width: displayWidth * 3,
        depth: displayDepth,
        height: displayHeight,
        diagonalInches: diagonalInches,

    }
]



expandVideoDeviceArray();

/* 
    Purpuse to merge videoDevice array and camera array.  
    Each videoDevice can have a codecParent and a cameraParent.
    If the parent device has an attribute missing on the child device, it is added to the child device.  
    cameraParent is applied before the codecParent. 
*/
function expandVideoDeviceArray() {
    videoDevices = videoDevices.concat(cameras);
    videoDevices.forEach((primaryDevice, index) => {
        if ("cameraParent" in primaryDevice) {
            videoDevices.forEach((parentDevice) => {
                if (primaryDevice.cameraParent == parentDevice.id) {

                    let updatedDevice = {
                        ...parentDevice,
                        ...primaryDevice
                    }

                    videoDevices[index] = updatedDevice;

                }
            });
        }
    })

    videoDevices.forEach((primaryDevice, index) => {
        if ("codecParent" in primaryDevice) {
            videoDevices.forEach((parentDevice) => {
                if (primaryDevice.codecParent == parentDevice.id) {
                    let updatedDevice = {
                        ...parentDevice,
                        ...primaryDevice
                    }

                    videoDevices[index] = updatedDevice;

                }
            });
        }
    })

}


creatArrayKeysTypes();
/* UUUID is used for unique IDs for each shape and session. */
function createUuid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/* determine if touchenabled */
function isTouchEnabled() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
}

/* On inputs.  Changes 5 ft 6 in to 5.5 ft.  Or 1 m to 3.28 ft. Or 10' 6" to 10.5. */
function convertToUnit(input) {

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
}

function addOnBlurUnitInputListener() {
    let inputs = document.querySelectorAll(".unitInput");

    for (var i = 0; i < inputs.length; i++) {

        inputs[i].addEventListener("input", (event) => {

            event.target.value = event.target.value.replace(/[^0-9.inmcft"'-\s\u2018\u2019\u201C\u201D]/i, '');  /* allow the characters in the Regex */

        })

        inputs[i].addEventListener("blur", (event) => {

            event.target.value = convertToUnit(event.target.value);
            if (event.target.classList.contains('updateDrawRoom')) {
                if (event.target.id === 'roomWidth') {
                    roomObj.room.roomWidth = event.target.value;
                }

                if (event.target.id === 'roomLength') {
                    roomObj.room.roomLength = event.target.value;
                }

                // drawRoom(true);
            }

        })
    }
}

addOnBlurUnitInputListener();

determineMobileDevice();

makeButtonsVisible();

function updateWidthOfDisplay(inches) {
    if (!isNaN(inches)) {
        let itemWidth = document.getElementById('itemWidth');
        // let itemHeight = document.getElementById('itemLength');
        let data_deviceid = document.getElementById('itemType').innerText;
        let displayNumber, width, height;
        let unitRatio = 1;

        if (data_deviceid === 'displayDbl') {
            displayNumber = 2;
        }
        else if (data_deviceid === 'displayTrpl') {
            displayNumber = 3;
        }
        else {
            /* includes data_deviceid type displaySngl */
            displayNumber = 1;
        }

        if (unit === 'feet') {
            unitRatio = 3.28084;
        }

        width = (displayWidth / diagonalInches) * inches / 1000 * displayNumber * unitRatio;


        itemWidth.value = width.toFixed(2);



    }
}

function addOnNumberInputListener() {
    let inputs = document.querySelectorAll(".numberInput");

    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9.]/i, '');
            if (event.target.classList.contains('updateWidthOfDisplay')) {
                updateWidthOfDisplay(Number(event.target.value));
            }
        })

        inputs[i].addEventListener("blur", () => {
            //   updateItem();
        })
    }

    let degreeInputs = document.querySelectorAll(".degreeInput");

    for (var i = 0; i < degreeInputs.length; i++) {
        degreeInputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9.-]/i, '');
        })

        degreeInputs[i].addEventListener("blur", () => {
            //   updateItem();
        })
    }

    let txtInputs = document.querySelectorAll(".textInput");

    for (var i = 0; i < txtInputs.length; i++) {
        txtInputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[<]/i, '\uFF1C');  // don't allow scripting tags be typed. 
            event.target.value = event.target.value.replace(/[>]/i, '\uFF1E');  // don't allow scripting tags be typed. 
            event.target.value = event.target.value.replace(/[~]/i, '\u301C');
            roomObj.name = event.target.value;
        })

        txtInputs[i].addEventListener("blur", (event) => {
            roomObj.name = event.target.value;
            // drawRoom(true, true);
        })
    }

}

addOnNumberInputListener();

function determineMobileDevice() {

    if (navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)) {
        mobileDevice = 'iOS';
        Konva.pixelRatio = 1; // improve performance with Konva on mobile devices
    }
    else if (navigator.userAgent.match(/Mac/i) && navigator.maxTouchPoints > 1) {
        mobileDevice = 'iOS';
    }
    else if (navigator.userAgent.match(/Android/i)) {
        mobileDevice = 'Android';
    }
    else if (navigator.userAgent.match(/RoomOS/i)) {
        mobileDevice = 'RoomOS';
    }
    else {
        mobileDevice = 'false';
    }
    userAgent = navigator.userAgent;

}
/* come back to this */

// function setMouseEventListeners() {
//     document.addEventListener('mousemove', (event) => {
//         logMouseMovements(event);
//     });

//     document.addEventListener('scroll', (event) => {
//         logMouseMovements(event);
//     });
// }

/*      Come back to later
function logMouseMovements(event) {


    
        let svg = document.getElementById('videoRoomCalcSVG');
        let svgBound = svg.getBoundingClientRect();
    
        let svgPixelX = event.clientX - svgBound.x;
        let svgPixelY = event.clientY - svgBound.y;
    
        let unitX = (svgPixelX - pxOffset) / scale;
        let unitY = (svgPixelY - pxOffset) / scale;
    
        if (event.clientX > svgBound.x && event.clientX < svgBound.right && event.clientY > svgBound.y && (event.clientY + 50) < svgBound.bottom) {
            let style = 'display: block; position: fixed; top: ' + (event.clientY + -15) + 'px; left: ' + (event.clientX + 15) + "px; ";
            let styleCursorPoint = 'display: block; position: fixed; top: ' + (event.clientY - 176) + 'px; left: ' + (event.clientX - 27) + "px; font-size: 100px; font-family: Arial, Helvetica, sans-serif; opacity: 0.5'";
    
            document.getElementById('divCoordXy').setAttribute('style', style);
            document.getElementById('lblCoordXy').innerHTML = "x:" + unitX.toFixed(1) + ", y:" + unitY.toFixed(1);
    
            document.getElementById('divCursorPoint').setAttribute('style', styleCursorPoint);
        }
        else {
            document.getElementById('divCursorPoint').setAttribute('style', 'display: none;');
            document.getElementById('divCoordXy').setAttribute('style', 'display: none;');
    
        }

};

            */

windowResizeEvent();

function windowResizeEvent() {
    window.addEventListener('resize', function windowResizeEventName() {
        /* need to check if scroll-container changes size, if not don't drawRoom */
        drawRoom();
    });
}


let lastSvgBoundWidth = 100
let lastSvgBoundHeight = 100;

/*
    resizePage moves ContainerFeedback from div Container1 <--> Contariner2.  Also determine if scrolling is enabled.
    
    The DIVs inside Container2 div: 
        ContainerRoomSvg
            controlButtons
            scroll-container (used to contain scrolling)		
                large-container
                    canvasDiv
                        konvajs-content (DIV created by Konva.js)
        
*/
function resizePage() {

    let canvasDiv = document.getElementById('canvasDiv');
    let canvasDivBound = canvasDiv.getBoundingClientRect();

    let scrollContainer = document.getElementById('scroll-container');

    let controlButtons = document.getElementById('controlButtons');
    let controlButtonsBound = controlButtons.getBoundingClientRect();

    let newCanvasDivHeight;
    let newHeightScrollContainer;

    /* determines if ContainerFeedback is moved */
    if (scrollContainer.getBoundingClientRect().x > 40) {

        let Container1 = document.getElementById('Container1');

        let ContainerFeedback = document.getElementById('ContainerFeedback');

        Container1.append(ContainerFeedback);

    } else {

        let Container2 = document.getElementById('Container2');
        let ContainerFeedback = document.getElementById('ContainerFeedback');
        Container2.append(ContainerFeedback);
    }

    newCanvasDivHeight = window.innerHeight - controlButtonsBound.height;

    newHeightScrollContainer = newCanvasDivHeight;

    if (newHeightScrollContainer > stage.height()) {
        newHeightScrollContainer = stage.height();
        newCanvasDivHeight = stage.height() + controlButtonsBound.height;
    }

    if (canvasDivBound.width === lastSvgBoundWidth && canvasDivBound.height === lastSvgBoundHeight) {

        return false;
    } else {

        lastSvgBoundWidth = canvasDivBound.width;
        lastSvgBoundHeight = canvasDivBound.height;

        return true;
    }

}

/*
 Copy a hyperlink to the clipboard. Uses the name of the room or Video Room Calculator
*/
function copyLinkToClipboard() {
    createShareableLink();

    let text = document.getElementById('shareLink').getAttribute('href');

    // navigator.clipboard.writeText(text).then(() => {
    //     alert('Copied link to clipboard');
    // });

    
    let hyperTextName;

    const textUrl = document.getElementById('shareLink').getAttribute('href');
    if (roomObj.name === '') {
        hyperTextName = 'Video Room Calculator';
        if (roomObj.items.videoDevices.length > 0) {
            hyperTextName = hyperTextName + ' - ' + roomObj.items.videoDevices[0].name;
        }
    } else {
        hyperTextName = roomObj.name;
    }

    const anchorUrl = '<a href="' + textUrl + '">' + hyperTextName + '</a>';
    const blobHtml = new Blob([anchorUrl], { type: "text/html" });
    const blobText = new Blob([textUrl], { type: "text/plain" });

    const data = [new ClipboardItem({
        ["text/plain"]: blobText,
        ["text/html"]: blobHtml,
    })];

    navigator.clipboard.write(data).then(
        () => { alert('Copied link to clipboard') },
        () =>{}
    );


    lastAction = 'clipboard link';
    postHeartbeat();
}

function updateLabelUnits() {
    let lblUnits = document.querySelectorAll('.unitFeetMeters');

    lblUnits.forEach((lblUnit) => {
        let abbUnit = unit;
        if (unit == 'feet') {
            abbUnit = 'ft'
        }
        else if (unit == 'meters') {
            abbUnit = 'm'
        }
        lblUnit.innerHTML = abbUnit;
    });
}

function convertMetersFeet() {
    let unitValue = document.getElementById('drpMetersFeet').value;
    unit = unitValue;
    roomObj.unit = unit;
    let ratio = 3.2808 /* Feet / meter */
    if (unit === 'feet') {
        // feet is default                
    } else {
        ratio = 1 / ratio;
    };

    function updateTextBox(id) {
        document.getElementById(id).value = (getNumberValue(id) * ratio).toFixed(2);

    }

    // updateTextBox('roomWidth');
    // updateTextBox('roomLength');
    updateTextBox('tableWidth');
    updateTextBox('frntWallToTv');
    updateTextBox('tableLength');
    updateTextBox('distDisplayToTable');
    updateTextBox('onePersonCrop');
    updateTextBox('twoPersonCrop');

    roomObj.room.roomWidth = roomObj.room.roomWidth * ratio;
    roomObj.room.roomLength = roomObj.room.roomLength * ratio;
    roomObj.room.tableWidth = roomObj.room.tableWidth * ratio;
    roomObj.room.frntWallToTv = roomObj.room.frntWallToTv * ratio;
    roomObj.room.tableLength = roomObj.room.tableLength * ratio;
    roomObj.room.distDisplayToTable = roomObj.room.distDisplayToTable * ratio;
    roomObj.room.onePersonCrop = roomObj.room.onePersonCrop * ratio;
    roomObj.room.twoPersonCrop = roomObj.room.twoPersonCrop * ratio;

    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let nodes = roomObj.items[category][i];

            if ('x' in nodes) {
                nodes.x = nodes.x * ratio;
            }

            if ('y' in nodes) {
                nodes.y = nodes.y * ratio;
            }

            if ('width' in nodes) {
                nodes.width = nodes.width * ratio;
            }

            if ('height' in nodes) {
                nodes.height = nodes.height * ratio;
            }

            if ('radius' in nodes) {
                nodes.radius = nodes.radius * ratio;
            }
        }

    }

    drawRoom(true);

}

function getQueryString() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    roomName = urlParams.get('roomName');
    roomName = DOMPurify.sanitize(roomName);
    roomObj.name = roomName;

    if (urlParams.has('x')) {
        let x = urlParams.get('x');
        document.getElementById('quickSetupItems').style.display = 'none';
        parseShortenedXYUrl(x);
        drawRoom(true, true);

    }

    if (urlParams.has('ver')) {
        if (urlParams.has('ver')) versionQueryString = DOMPurify.sanitize(urlParams.get('ver'));
        if (urlParams.has('ver')) versionQueryString = urlParams.get('ver');

        lastAction = 'load from querystring';

        /* possibley remove the below code */
        if (!(versionQueryString == version)) {
            versionQueryString = DOMPurify.sanitize(versionQueryString);
            lastAction = "redirect to " + versionQueryString;
            //  responseRedirect(versionQueryString);

        }
    }

    if ((urlParams.has('roomWidth') && !urlParams.has('ver'))) {
        responseRedirect('v0.0');
    }

    function responseRedirect(newPath) {
        let redirectLink = location.origin + '/' + newPath + '/?latestVer=' + version + '&' + queryString.replace(/^\?/, '');
        window.location.href = redirectLink;
    }

    if (urlParams.has('ver') || urlParams.has('x')) {
        if (urlParams.get('ver') !== version) {
            let message = "Your Shareable Link was created in version " + version + ".  There were changes made but it should be comptabile with the current version. ";

        }
    }

    if (urlParams.has('qr')) {
        qrCodeButtonsVisible = true; 

        makeButtonsVisible();
    }

    if(urlParams.has('test')){
        console.info('test in querystring. Test fields shown.  Test fields are highly experimental and unstable.'); 
        document.getElementById('test').setAttribute('style', 'visibility: visible;');
    }

    function updatePageValues(param) {

        if (urlParams.has(param)) {

            let paramValue = urlParams.get(param);
            paramValue = DOMPurify.sanitize(paramValue);
            document.getElementById(param).value = paramValue;
            if (param === 'drpVideoDevice') {
                if (paramValue === 'custom') {
                    /*  create redirect if older custom camera is being used */

                    let redirectChoice = confirm('The link provided was created in version v0.1 with custom camera angles which are no longer supported. \n\n' +
                        'OK: Redirect to older site and see custom camera.\n\n ' +
                        'Cancel: Continue to new site, but data is lost.');

                    if (redirectChoice) {
                        responseRedirect('v0.1');
                    } else {
                        let redirectLink = location.origin;
                        window.location.href = redirectLink;
                    }

                }

            }

            if (param === 'roomLength') {
                roomObj.room.roomLength = Number(paramValue);
            }
            if (param === 'drpMetersFeet') {
                if (paramValue === 'meters') {
                    roomObj.unit = 'meters';

                } else {
                    roomObj.unit = 'feet';
                }
            }

            if (param === 'roomWidth') {

                roomObj.room.roomWidth = Number(paramValue);

                setTimeout(() => {
                    quickSetupState = 'insert';
                    quickUpdateButton();
                }, 250);

            }


        }


    }

    updatePageValues('tableWidth');
    updatePageValues('tableLength');
    updatePageValues('distDisplayToTable');
    updatePageValues('frntWallToTv');
    updatePageValues('drpVideoDevice');
    updatePageValues('tvDiag');
    updatePageValues('drpTvNum');
    updatePageValues('wideFOV');
    updatePageValues('teleFOV');
    updatePageValues('onePersonZoom');
    updatePageValues('twoPersonZoom');
    updatePageValues('onePersonCrop');
    updatePageValues('twoPersonCrop');
    updatePageValues('roomName');
    updatePageValues('drpMetersFeet');
    updatePageValues('roomLength');
    updatePageValues('roomWidth');

    if (urlParams.has('tableWidth')) {
        drawRoom(true, true);
    }


}

function parseShortenedXYUrl(parameters) {
    let output = []; /* parameter object - an intermedidate step to create a param */

    function isUpperCaseLetter(character) {
        return /[A-Z_]/.test(character);
    }

    function isLowerCaseLetter(character) {
        return /[a-z]/.test(character);
    }

    function isNumberLike(character) {   /* includes numbers and version numbers.  For example: 2, 0.05, -2, 0.1.1.2 */
        return /[\-.0-9]/.test(character);
    }

    let i = 0;

    let objCount = 0;

    let charType = {
        Start: 0,
        CapLetter: "CapLetter",
        CapNum: "CapNum",
        LowLetter: "LowLetter",
        LowNum: "LowNum",
        OpenTilde: "OpenTilde",
        BetweenTilde: "BetweenTilde",
        EndTilde: "EndTilde",
        OpenLowLetterTilde: "OpenLowLetterTilde",
        BetweenLowLetterTilde: "BetweenLowLetterTilde",
        EndLowLetterTilde: "EndLowLetterTilde"
    }

    let lastCharType = charType.Start;

    let strBldrLowerCase = '';

    let lowerCaseLetters = '';

    while (i < parameters.length) {
        let char = parameters[i];

        if (char === '_' && lastCharType != charType.BetweenTilde) {  /* represents a repeat of the last Capital Letter used. */

            output.push(structuredClone(output[objCount]));
            objCount += 1;
            lastCharType = charType.CapLetter;
        }
        else if (char === ' ' && lastCharType != charType.BetweenTilde) {

            output.push(JSON.parse(JSON.stringify(output[objCount])));
            objCount += 1;
            lastCharType = charType.CapLetter;
        }
        else if (lastCharType === charType.Start) {
            if (isUpperCaseLetter(char)) {
                output.push({ "sid": char });
                lastCharType = charType.CapLetter;
            } else {
                console.error('Error parsing Short XY Parameter.  lastChar === chartType.Start but next character is not UpperCase.  Current character: ', char);
            }
        }
        else if (isUpperCaseLetter(char) && lastCharType === charType.CapLetter) {
            output[objCount].sid += char;
            lastCharType = charType.CapLetter;
        }
        else if (isNumberLike(char) && lastCharType === charType.CapLetter) {
            output[objCount].value = char;
            lastCharType = charType.CapNum;
        }
        else if (isNumberLike(char) && lastCharType === charType.CapNum) {
            output[objCount].value += char;
            lastCharType = charType.CapNum;
        }
        else if (isLowerCaseLetter(char) && lastCharType != charType.LowLetter && lastCharType != charType.BetweenTilde && lastCharType != charType.OpenTilde && lastCharType != charType.OpenLowLetterTilde && lastCharType != charType.BetweenLowLetterTilde) {

            strBldrLowerCase = char;
            lastCharType = charType.LowLetter;
        }
        else if (isLowerCaseLetter(char) && lastCharType === charType.LowLetter) {

            strBldrLowerCase += char;
            lastCharType = charType.LowLetter;
        }
        else if (isNumberLike(char) && lastCharType === charType.LowLetter) {
            lowerCaseLetters = strBldrLowerCase;
            strBldrLowerCase = '';
            output[objCount][lowerCaseLetters] = char;
            lastCharType = charType.LowNum;
        }
        else if (isNumberLike(char) && lastCharType === charType.LowNum) {
            output[objCount][lowerCaseLetters] += char;
            lastCharType = charType.LowNum;
        }
        // New below
        else if (char === '~' && lastCharType === charType.LowLetter) {
            lastCharType = charType.OpenLowLetterTilde;

        }
        else if (char === '~' && lastCharType != charType.BetweenTilde && lastCharType != charType.BetweenLowLetterTilde && lastCharType != charType.OpenTilde && lastCharType != charType.OpenLowLetterTilde) {
            lastCharType = charType.OpenTilde;

        }
        // new below 
        else if (lastCharType === charType.OpenLowLetterTilde && char != '~') {
            lowerCaseLetters = strBldrLowerCase;
            strBldrLowerCase = '';
            output[objCount][lowerCaseLetters] = char;
            lastCharType = charType.BetweenLowLetterTilde;

        }
        //
        else if (lastCharType === charType.OpenTilde && char != '~') {
            output[objCount].text = char;
            lastCharType = charType.BetweenTilde;

        }
        // new below 
        else if (lastCharType === charType.BetweenLowLetterTilde && char != '~') {
            output[objCount][lowerCaseLetters] += char;
            lastCharType = charType.BetweenLowLetterTilde;

        }
        //
        else if (lastCharType === charType.BetweenTilde && char != '~') {
            output[objCount].text += char;
            lastCharType = charType.BetweenTilde;

        }
        // new below *** 
        else if ((lastCharType === charType.OpenLowLetterTilde || lastCharType === charType.OpenTilde) && char === '~') {
            output[objCount].text = "";
            lastCharType = charType.EndTilde;

        }
        else if ((lastCharType === charType.BetweenTilde || lastCharType === charType.BetweenLowLetterTilde) && char === '~') {
            lastCharType = charType.EndTilde;

        }
        else if (isUpperCaseLetter(char) && lastCharType != charType.CapLetter && lastCharType != charType.BetweenTilde && lastCharType != charType.BetweenLowLetterTilde) {

            if (Object.keys(output[objCount]).length === 1) {
                output[objCount].value = strBldrLowerCase;
                strBldrLowerCase = '';
            }
            output.push({ "sid": char });
            objCount += 1;
            lastCharType = charType.CapLetter;
        }
        /* if the very last character is a letter set of characters are an Upper Case Letter and a Lower Case*/
        if ((parameters.length - 1) === i && Object.keys(output[objCount]).length === 1) {
            output[objCount].value = strBldrLowerCase;
        }

        i += 1;

    }


    /* create a new rmObj and then copy to the roomObj */
    output.forEach((item) => {

        if (item.sid === "A") {
            if ('text' in item) {
                roomObj.name = DOMPurify.sanitize(item.text);
            }

            if ('value' in item) {
                if ((item.value === '1')) {
                    roomObj.unit = 'feet';
                }
                else if (item.value === '0') {
                    roomObj.unit = 'meters'
                }
            }

            if ('v' in item) {
                roomObj.version = 'v' + item.v;
            }

            if ('b' in item) {
                roomObj.room.roomWidth = item.b / 100;
            }

            if ('c' in item) {
                roomObj.room.roomLength = item.c / 100;
            }
        }
        else if (item.sid === "B") {
            if ('value' in item) {
                let value = item.value;
                let shadeArray = value.split('');


                if (shadeArray[0] == '1') {
                    roomObj.layersVisible.grShadingCamera = true;
                } else {
                    roomObj.layersVisible.grShadingCamera = false;
                }

                if (shadeArray[1] == '1') {
                    roomObj.layersVisible.grDisplayDistance = true;
                } else {
                    roomObj.layersVisible.grDisplayDistance = false;
                }

                if (shadeArray[2] == '1') {
                    roomObj.layersVisible.grShadingMicrophone = true;
                } else {
                    roomObj.layersVisible.grShadingMicrophone = false;
                }

                if (shadeArray[3] == '1') {
                    roomObj.layersVisible.gridLines = true;
                } else {
                    roomObj.layersVisible.gridLines = false;
                }
            }

        }

        if (item.sid in keyIdObj) {

            let groupName = keyIdObj[item.sid].groupName;

            let groupLength = roomObj.items[groupName].length;

            let newItem = {};

            newItem.data_deviceid = keyIdObj[item.sid].data_deviceid;

            newItem.name = keyIdObj[item.sid].name;

            newItem.width = keyIdObj[item.sid].width / 1000;
            newItem.height = keyIdObj[item.sid].height / 1000;

            if (roomObj.unit === 'feet') {
                newItem.width = newItem.width * 3.28084;
                newItem.height = newItem.height * 3.28084;
            }

            if ('value' in item) {
                roomObj.items[groupName][groupLength] = newItem;
                newItem.x = item.value / 100;

            }

            if ('a' in item) {
                // newItem.y = item.a / 100;
                roomObj.items[groupName][groupLength].y = item.a / 100;
            }

            if ('b' in item) {
                newItem.z = item.b / 100;
            }

            if ('c' in item) {
                newItem.width = item.c / 100;
            }

            if ('d' in item) {
                newItem.length = item.d / 100;
            }

            if ('e' in item) {
                newItem.height = item.e / 100;
            }

            if ('f' in item) {
                newItem.rotation = item.f / 10;
            } else {
                newItem.rotation = 0;
            }

            if ('g' in item) {
                newItem.data_diagonalInches = item.g;
            }

            newItem.id = createUuid();


        }


    })

    return output;

}

function resetRoomObj() {
    roomObj.name = ''; /* Pre-creating objects now so the order shows up on top in JSON file. */
    // roomObj.unit = 'feet'; /* meters or feet*/
    // roomObj.room.roomWidth = 20; /* roomWidth default value in feet */
    // roomObj.room.roomLength = 26; /* roomLength default value in feet */
    roomObj.trNodes = []; /* These are the selected shape items used for undo / redo. Does not need to be saved in URL */
    roomObj.layersVisible.grShadingCamera = true;  /* true or false */
    roomObj.layersVisible.grDisplayDistance = true; /* true or false */
    roomObj.layersVisible.grShadingMicrophone = true;  /* true or false */
    roomObj.layersVisible.gridLines = true; /* true or false */
    roomObj.layersVisible.grShadingSpeaker = true;  /* true or false */

    roomObj.items.videoDevices = [];
    roomObj.items.chairs = [];
    roomObj.items.tables = [];
    roomObj.items.shapes = [];
    roomObj.items.displays = [];
    roomObj.items.speakers = [];
    roomObj.items.microphones = [];

}


/* converts lowerCase letters (base26) to discrete binary number */
function base26ToBinaryString(characters) {
    let letterArray = characters.split('');
    letterArray.reverse();
    let decimalNumber = 0;
    let base = 26;
    letterArray.forEach((char, index) => {
        decimalNumber = ((char.charCodeAt(0) - 97) * base ** index) + decimalNumber;
    })
    let binary = decimalNumber.toString(2);
    let binaryString = binary.toString();

    while (binaryString.length < 8) {
        binaryString = '0' + binaryString;
    }
    return binaryString;
}

/* 
    converts binaryToBase26().  00000
    Only goes up to 'zz' or 1010100011, which is 675 entries
*/
function binaryToBase26(binary) {
    let array = createTable();

    let letters;
    array.forEach(entry => {
        if (Number(entry[1]) == Number(binary)) {
            letters = entry[0];
        }
    });

    return letters;

    function createTable() {

        alphabet = 'abcdefghijklmnopqrstuvwxyz';
        let alphaArray = alphabet.split('');
        let array = [];
        let i = 0;

        alphaArray.forEach(outerLetter => {
            alphaArray.forEach((letter) => {
                let fullLetter = outerLetter + letter;
                let txtBinary = base26ToBinaryString(fullLetter);
                array[i] = [fullLetter, txtBinary];
                i++;
            })
        });
        return array;
    }
};



onLoad();

function onLoad() {
    updateSelectVideoDeviceOptions();
    getQueryString();
    postHeartbeat();
}

function updateSelectVideoDeviceOptions() {

    let drpVideoDevice = document.getElementById('drpVideoDevice');
    videoDevices.forEach((device) => {
        // let name = device.name + ' - Wide:' + device.wideHorizontalFOV + '\u00b0 Tele:' + device.teleHorizontalFOV + '\u00b0 ' + device.onePersonZoom + 'x ' + device.twoPersonZoom + 'x';

        let name = device.name;

        let drpOption = new Option(name, device.id);

        drpVideoDevice.add(drpOption, undefined);
    })

    drpVideoDevice.value = 'roomBarPro'; // Set the Room Bar Pro as the default device. 

    drpVideoDeviceChange(true);

}

function update() {
    roomObj.room.roomWidth = getNumberValue('roomWidth');
    roomObj.room.roomLength = getNumberValue('roomLength');
    drawRoom(true);
    makeButtonsVisible();

}

/*
if the canvas is updated too quickly with a draw(true) followed by canvasToJSON() a 
race condition occurs that deletes all nodes.  To keep this from happening, drawRoom() has a 
setTimeOut(canvasToJSON()) command for delay. Any button or input that causes  a 
drawRoom(true) will be disabled for the duration of that setTimeout in case the enduser clicks quickly. 
*/
function disableDrawUpdateButtons(isDisabled) {

    let unitInputs = document.querySelectorAll(".unitInput");
    let numberInputs = document.querySelectorAll(".numberInput");

    for (var i = 0; i < unitInputs.length; i++) {
        unitInputs[i].disabled = isDisabled;
    }

    for (var i = 0; i < numberInputs.length; i++) {
        numberInputs[i].disabled = isDisabled;
    }

}

/*
    Determine if Quick Setup menu should be displayed. 
    Primary videodevice, primary table & primary display should be centered on the X axis. 
    Primary videoDevice and primary display should be on the same Y axis. 
    Check to see if the videoDevice is an all in one device.  
    quickSetupState = 'insert', 'disabled' or 'update' 
*/

function isQuickSetupEnabled() {
    let quickSetup = document.getElementById('quickSetup');
    let quickSetupItems = document.getElementById('quickSetupItems');
    let videoDevicesNum = roomObj.items.videoDevices.length;
    let displaysNum = roomObj.items.displays.length;
    let tablesNum = roomObj.items.tables.length;
    let chairsNum = roomObj.items.chairs.length; 
    let shapesNum = roomObj.items.shapes.length; 
    let touchPanlesNum = roomObj.items.touchPanels.length; 
    let microphones = roomObj.items.microphones.length; 
    let otherDevices = chairsNum + shapesNum + touchPanlesNum + microphones; 

    quickSetupState = 'disabled';

    if (videoDevicesNum === 0 && displaysNum === 0 && tablesNum === 0) {
        quickSetupState = 'insert';
    }
    else if (videoDevicesNum === 1 && displays != 1) {
        quickSetupState = 'disabled';
    }
    else if (videoDevicesNum > 1 || displaysNum > 1 || tablesNum > 1) {
        quickSetupState = 'disabled';
    }

    if ((videoDevicesNum === 1 && tablesNum === 1) && (primaryDeviceIsAllInOne || displaysNum === 1)) {
        if (isPrimaryXequal()) {
            quickSetupState = 'update';
        } else {
            quickSetupState = 'disabled';
        }
    }

    if(primaryDeviceIsAllInOne && touchPanlesNum > 0){
        quickSetupState = 'disabled'; 
    }

    if(otherDevices > 0){
        quickSetupState = 'disabled'; 
    }

    let quickSetupEnabledText = 'Quick Setup (optional)';
    if (quickSetupState === 'insert') {
        quickSetup.innerText = quickSetupEnabledText;
        quickSetupItems.style.display = 'initial';
    }
    else if (quickSetupState === 'update') {
        quickSetup.innerText = quickSetupEnabledText;
        quickSetupItems.style.display = 'initial';

    }
    else if (quickSetupState === 'disabled') {
        quickSetup.innerText = 'Quick Setup is disabled';
        quickSetupItems.style.display = 'none';
        /* disable buttons */
    }


    createShareableLink();

    /* internal functions 
    Determine if the primary devices have the same X value to the 100th place.  
    Determin if the primary display & primary video device have the same Y value to the hundreds place.
    If so return true.
    */
    function isPrimaryXequal() {
        if (roomObj.items.tables.length > 0) {

            let tableX = roomObj.items.tables[0].x;
            let videoDeviceX = Math.round(roomObj.items.videoDevices[0].x * 100); /* check to the hundredths place */
            let tableWidth = roomObj.items.tables[0].width;
            let tableCenterX = Math.round((tableX + (tableWidth / 2)) * 100);

            if (primaryDeviceIsAllInOne) {
                if (videoDeviceX === tableCenterX) {
                    return true;
                } else {
                    return false;
                }
            } else {
                if (roomObj.items.displays.length == 1) {

                    let displayX = Math.round(roomObj.items.displays[0].x * 100);
                    let displayY = Math.round(roomObj.items.displays[0].y * 100); 
                    let videoDeviceY = Math.round(roomObj.items.videoDevices[0].y * 100); 
                    if (videoDeviceX === tableCenterX && videoDeviceX == displayX && displayY == videoDeviceY) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }


        }
    }

}


function quickSetupUpdate() {
    roomObj.items.tables = [];
    roomObj.items.chairs = [];
    roomObj.items.displays = [];
    roomObj.items.videoDevices = [];

    drawRoom(true, true, true);
    setTimeout(() => { quickSetupInsert() }, 100);
}


function quickSetupInsert() {
    let tableWidth = getNumberValue('tableWidth');
    let tableLength = getNumberValue('tableLength');
    let videoDeviceId = document.getElementById('drpVideoDevice').value;
    let distDisplayToTable = getNumberValue('distDisplayToTable');
    let frntWallToTv = getNumberValue('frntWallToTv');
    let tvDiag = getNumberValue('tvDiag');
    let drpTvNum = document.getElementById('drpTvNum').value;
    let roomWidth = getNumberValue('roomWidth');


    /* insert Table */
    let tableUuid = createUuid();
    let tblAttrs = {};
    tblAttrs.x = roomWidth / 2 - tableWidth / 2;
    tblAttrs.y = frntWallToTv + distDisplayToTable;
    tblAttrs.width = tableWidth;
    tblAttrs.height = tableLength;

    insertShapeItem('tblRect', 'tables', tblAttrs, tableUuid, false);

    /* insert videoDevice */
    let videoDeviceUuid = createUuid();
    let videoAttr = {};
    videoAttr.x = roomWidth / 2;
    // videoAttr.y = frntWallToTv;
    videoAttr.rotation = 0;

    /* only insert a display if the video device does not have diagonalInches */
    videoDevices.forEach((item) => {
        if (videoDeviceId === item.id) {
            let displayId;

            let offset = (item.depth / 1000) / 2;

            if ('displayOffSetY' in item) {
                offset = offset - (item.displayOffSetY / 1000);
            }

            if (unit === 'feet') {
                offset = offset * 3.2808;
            }

            videoAttr.y = frntWallToTv - offset;

            if ('diagonalInches' in item) {
                primaryDeviceIsAllInOne = true;
            } else {
                primaryDeviceIsAllInOne = false;
                /* insert Display */
                let displayUuid = createUuid();
                let displayAttr = {};

                displayAttr.x = roomWidth / 2;

                displayAttr.y = videoAttr.y;
                displayAttr.data_diagonalInches = tvDiag;
                displayAttr.rotation = 0;

                if (drpTvNum == 1) {
                    displayId = 'displaySngl';
                } else if (drpTvNum == 2) {
                    displayId = 'displayDbl';
                }
                else if (drpTvNum == 3) {
                    /* triple */
                    displayId = 'displayTrpl';
                }

                updateTxtPrimaryDeviceNameLabel(item.name);

                insertShapeItem(displayId, 'displays', displayAttr, displayUuid, false);
            }
        }
    });

    insertShapeItem(videoDeviceId, 'videoDevices', videoAttr, videoDeviceUuid, false);


    setTimeout(() => {
        canvasToJson()
    }, 250);


};

function updateTxtPrimaryDeviceNameLabel(primaryDevieName) {

}


function quickUpdateButton() {
    /* enable and disable updateButton in case it is pushed too quicly and overwhelms the canvas */
    document.getElementById('quickUpdateButtonId').disabled = true;
    lastAction = 'update button';
    postHeartbeat();

    if (quickSetupState === 'insert') {
        quickSetupInsert();
    }
    else if (quickSetupState === 'update') {
        quickSetupUpdate();
    }
    else if (quickSetupState === 'disabled') {
        update();
    }

    setTimeout(() => {
        document.getElementById('quickUpdateButtonId').disabled = false;
    }, 2000)
}

function updateButtonRoomDimensions() {
    update();

    /* 
    clicking the Update Room Dimensions updateButtonId too quickly like a five year old can create a race condition.  
    Disable button for short period. Because of the current CSS, the button does not appear disabled to the end user
    */
    document.getElementById("updateButtonId").disabled = true;
    setTimeout(() => {
        document.getElementById("updateButtonId").disabled = false;
    }, 750)
}


function drpVideoDeviceChange(firstRun = false) {
    let drpVideoDevice = document.getElementById('drpVideoDevice');
    let drpVideoDeviceValue = drpVideoDevice.value;
    let divCustomSettings = document.getElementById('customSettings');

    // if (drpVideoDeviceValue === 'custom') {
    //     divCustomSettings.setAttribute('style', 'display: visibility;');
    // } else {
    //     divCustomSettings.setAttribute('style', 'display: none;');
    //     updateDefaultsPersonCropUnit();
    // }

    if (drpVideoDeviceValue === 'autoselect') {
        let roomLength = document.getElementById('roomLength').value;

        unit = document.getElementById('drpMetersFeet').value;

        // do all calculations
        if (unit === 'feet') {
            roomLength = roomLength / 3.35;
        }

        if (roomLength <= 3.05) {
            // select room bar 
            drpVideoDevice.value = 'roomBar';
        }
        else if (roomLength <= 6.05) {
            // select room par pro 

            drpVideoDevice.value = 'roomBarPro';
        } else if (roomLength <= 9.05) {
            // select room kit eq quad cam
            drpVideoDevice.value = 'roomKitEqQuadCam';
        } else {
            // select room kit eq quad cam + 4K PTZ 
            drpVideoDevice.value = 'roomKitEqQuadPtz4k';
        }
    }

    videoDevices.forEach((device) => {
        if (device.id === drpVideoDevice.value) {

            videoDeviceKey = device.key;

            document.getElementById('wideFOV').value = device.wideHorizontalFOV;
            document.getElementById('teleFOV').value = device.teleHorizontalFOV;
            document.getElementById('onePersonZoom').value = device.onePersonZoom;
            document.getElementById('twoPersonZoom').value = device.twoPersonZoom;
        }
    })

    if (firstRun) {
        drawRoom(true, true);
    }

}

function getNumberValue(id) {
    return parseFloat(document.getElementById(id).value);
}

function makeButtonsVisible() {
    if (mobileDevice === 'RoomOS') {
        document.getElementById('RoomOSmessage').setAttribute('style', 'visibility: visible;');
        document.getElementById('downloadButtons').style.display = 'none';
    }
    else if (qrCodeButtonsVisible == true) {
        document.getElementById('RoomOSmessage').setAttribute('style', 'visibility: visible;');
        document.getElementById('downloadButtons').setAttribute('style', 'visibility: visible;');
    }
    else {
        document.getElementById('downloadButtons').setAttribute('style', 'visibility: visible;');
        document.getElementById('RoomOSmessage').style.display = 'none';
    }
}

function addText(text, x, y, size, color = 'black') {
    // Create a <text> element for the text
    const textSVG = document.createElementNS(svgns, "text");

    // Set the position and size of the <text> element
    textSVG.setAttribute("x", x);
    textSVG.setAttribute("y", y);
    textSVG.textContent = text;

    svg = document.getElementById(videoRoomCalcSVG);
    svg.appendChild(textSVG);

}

function addCenteredText(text, x1, y1, x2, y2, groups = '', id = '') {

    let x = x1 + (x2 - x1) / 2
    let y = y1 + (y2 - y1) / 2

    // Create a <text> element for the text
    const centeredTextSVG = document.createElementNS(svgns, "text");

    // Set the position and size of the <text> element
    centeredTextSVG.setAttribute("x", x);
    centeredTextSVG.setAttribute("y", y);
    // centeredTextSVG.setAttribute('dominant-baseline', 'middle');
    centeredTextSVG.setAttribute('text-anchor', 'middle');
    centeredTextSVG.setAttribute('style', 'font-size: 14px; font-family: Arial, Helvetica, sans-serif; opacity: 0.5')
    centeredTextSVG.textContent = text;

    if (id !== '') {
        centeredTextSVG.setAttribute('id', id);
    }

    if (groups === '') {
        let svg = document.getElementById(videoRoomCalcSVG);
        svg.appendChild(centeredTextSVG);
    }
    else if (groups == 'none') {
    }
    else {
        groups.appendChild(centeredTextSVG);
    }
    return centeredTextSVG;

}

function kAddCenteredText(text, x1, y1, x2, y2, groups = '') {

    let x = (x1 + (x2 - x1) / 2) - 6;
    let y = (y1 + (y2 - y1) / 2) - 9.5;

    let centeredText = new Konva.Text({
        x: x,
        y: y,
        text: text,
        fontSize: 14,
        fontFamily: 'Arial, Helvetica, sans-serif',
        opacity: 0.5,
        align: 'center',
        verticalAlign: 'center',
        preventDefault: false,

    })

    groups.add(centeredText);

    return centeredText;

}

function createTextElement(settings) {

    // Create a <text> element for the text
    let textSVG = document.createElementNS(svgns, "text");

    // Set the position and size of the <text> element
    textSVG.setAttribute("x", settings.x);
    textSVG.setAttribute("y", settings.y);
    // centeredTextSVG.setAttribute('dominant-baseline', 'middle');
    // centeredTextSVG.setAttribute('text-anchor', 'middle');
    if (!('style' in settings)) {
        settings.style = 'font-size: 14px; font-family: Arial, Helvetica, sans-serif;';
    }
    textSVG.setAttribute('style', settings.style)
    textSVG.textContent = settings.text;

    if ('id' in settings) {
        textSVG.setAttribute('id', id);
    }

    if ('g' in settings) {
        text.setAttribute('g', g);
    }

    return textSVG;

}

/*  Geomerty reference: https://www2.clarku.edu/faculty/djoyce/trig/right.html
 formula distanceA = distanceB / (Tan degreeB) */

function getDistanceA(degreeB, distanceB) {

    return distanceB / (Math.tan((degreeB * Math.PI) / 180));
}

function getDistanceB(degreeB, distanceA) {
    return (Math.tan((degreeB * Math.PI) / 180)) * distanceA;
}

//svgStart
function drawGrid(startX, startY, endX, endY, scale, increment = 1, style = 'stroke:#808080;stroke-width:2;opacity:0.3;') {
    // scale 

    let solidStyle = style;

    let lightStyle = 'stroke:#808080;stroke-width:0.6;opacity:0.4;'

    // Create a <g> group element for the grid
    const groupLines = document.createElementNS(svgns, "g");

    groupLines.setAttribute('id', 'grid-increment-' + increment.toFixed(2));

    // draw horizontal lines

    let measurementY = 0;
    let pxMeasurementY = 0;

    let increments = 30;
    let toFixedValue = 0;

    if (unit === 'feet' && scale < 19) {
        increment = 2 * Math.round((increments / (increment * scale)) / 2);
    }

    if (unit === 'meters') {
        if (scale < 30) {
            increment = 2 * Math.round((increments / (increment * scale * 3.3) / 2));
        }
        else if (scale < 60) {
            increment = 1;
        }

        else if (scale < 134) {
            increment = 0.5
        }
    }

    if (increment < 1) {
        toFixedValue = 2;
    }

    if (increment === 0.5) {
        toFixedValue = 1;
    }

    addCenteredText(unit, startX, startY, (pxOffset / 2 - 10), pxOffset / 2 - 10, groupLines, 'grid-unit' + unit);

    do {
        measurementY += increment;
        if (measurementY % 1 != 0) {
            style = lightStyle;
        } else {
            style = solidStyle;
        }
        pxMeasurementY = (measurementY * scale) + startY;
        let lineHorizontal = document.createElementNS(svgns, 'line');
        lineHorizontal.setAttribute('x1', startX.toFixed(2));
        lineHorizontal.setAttribute('y1', pxMeasurementY.toFixed(2));
        lineHorizontal.setAttribute('x2', endX.toFixed(2));
        lineHorizontal.setAttribute('y2', pxMeasurementY.toFixed(2));
        lineHorizontal.setAttribute('id', 'horiz-incr-' + increment + '-measurement-' + measurementY.toFixed(2));
        lineHorizontal.setAttribute('style', style);
        groupLines.appendChild(lineHorizontal);
        addCenteredText(measurementY.toFixed(toFixedValue), 0, pxMeasurementY, startX, pxMeasurementY, groupLines);

    } while (pxMeasurementY <= (endY - increment * scale));

    // draw vertical lines

    let measurementX = 0;
    let pxMeasurementX = 0;

    do {

        measurementX += increment;
        if (measurementX % 1 != 0) {
            style = lightStyle;
        } else {
            style = solidStyle;
        }
        pxMeasurementX = (measurementX * scale) + startX;
        let lineVertical = document.createElementNS(svgns, 'line');
        lineVertical.setAttribute('y1', startY.toFixed(2));
        lineVertical.setAttribute('x1', pxMeasurementX.toFixed(2));
        lineVertical.setAttribute('y2', endY.toFixed(2));
        lineVertical.setAttribute('x2', pxMeasurementX.toFixed(2));
        lineVertical.setAttribute('id', 'vert-incr-' + increment + '-measurement-' + measurementX.toFixed(2));
        lineVertical.setAttribute('style', style);
        groupLines.appendChild(lineVertical);
        addCenteredText(measurementX.toFixed(toFixedValue), pxMeasurementX, 0, pxMeasurementX, startY + 20, groupLines);

    } while (pxMeasurementX <= (endX - increment * scale));

    // append to SVG 

    return groupLines;

}
//svgEnd

function kDrawGrid(startX, startY, endX, endY, scale, increment = 1) {

    kGroupLines = new Konva.Group();

    let smallIncrementTextOffset = 0; /* if there is small increment, change the offset of the x position */
    let lineStyle;
    let darkLine = {};
    darkLine.stroke = "#808080";
    darkLine.strokeWidth = 1.5;
    darkLine.opacity = 0.3;

    let lightLine = {};
    lightLine.stroke = '#808080';
    lightLine.strokeWidth = 0.3;
    lightLine.opacity = 0.4;

    /* draw horizontal lines */
    let measurementY = 0;
    let pxMeasurementY = 0;

    let increments = 30;
    let toFixedValue = 0;

    if (unit === 'feet' && scale < 19) {
        increment = 2 * Math.round((increments / (increment * scale)) / 2);
    }

    if (unit === 'meters') {
        if (scale < 30) {
            increment = 2 * Math.round((increments / (increment * scale * 3.3) / 2));

        }
        else if (scale < 60) {
            increment = 1;
        }

        else if (scale < 134) {
            increment = 0.5
        }

    }

    if (increment < 1) {
        toFixedValue = 2;
        smallIncrementTextOffset = 10;
    }

    if (increment === 0.5) {
        toFixedValue = 1;
        smallIncrementTextOffset = 0;
    }

    do {
        measurementY += increment;
        if (measurementY % 1 != 0) {
            lineStyle = lightLine;
        } else {
            lineStyle = darkLine;
        }
        pxMeasurementY = (measurementY * scale) + startY;

        let lineHorizontal = new Konva.Line({
            points: [startX, pxMeasurementY, endX, pxMeasurementY],
            stroke: lineStyle.stroke,
            strokeWidth: lineStyle.strokeWidth,
            opacity: lineStyle.opacity,
            preventDefault: false,
        });

        kGroupLines.add(lineHorizontal);

        kAddCenteredText(measurementY.toFixed(toFixedValue), 0 - smallIncrementTextOffset, pxMeasurementY, startX, pxMeasurementY, kGroupLines);

    } while (pxMeasurementY <= (endY - increment * scale));

    /* draw vertical lines; */

    let measurementX = 0;

    let pxMeasurementX = 0;

    do {
        measurementX += increment;
        if (measurementX % 1 != 0) {
            lineStyle = lightLine;
        } else {
            lineStyle = darkLine;
        }
        pxMeasurementX = (measurementX * scale) + startX;

        let lineVertical = new Konva.Line({
            points: [pxMeasurementX, startY, pxMeasurementX, endY],
            stroke: lineStyle.stroke,
            strokeWidth: lineStyle.strokeWidth,
            opacity: lineStyle.opacity,
            preventDefault: false,
        });

        kGroupLines.add(lineVertical);

        kAddCenteredText(measurementX.toFixed(toFixedValue), pxMeasurementX, 0, pxMeasurementX, startY + 20, kGroupLines);

    } while (pxMeasurementX <= (endX - increment * scale));

    return kGroupLines;

}

function updatePersonCropUnit() {

    if (isNaN(onePersonCrop)) {
        if (unit == 'feet') {
            // feet 
            onePersonCrop = Math.round(defaultOnePersonCrop * 3.2808 * 100) / 100;

        } else {
            // meters
            onePersonCrop = defaultOnePersonCrop;

        };
        // document.getElementById('onePersonCrop').setAttribute('value', onePersonCrop.toFixed(2));
        document.getElementById('onePersonCrop').value = onePersonCrop.toFixed(2);
    }

    if (isNaN(twoPersonCrop)) {
        if (unit == 'feet') {
            // feet 
            twoPersonCrop = Math.round(defaultTwoPersonCrop * 3.2808 * 100) / 100;

        } else {
            // meters
            twoPersonCrop = 3.2;
        };
        document.getElementById('twoPersonCrop').value = twoPersonCrop.toFixed(2);

    }

}

function updateDefaultsPersonCropUnit() {

    if (unit == 'feet') {
        onePersonCrop = Math.round(defaultOnePersonCrop * 3.2808 * 100) / 100;
        twoPersonCrop = Math.round(defaultTwoPersonCrop * 3.2808 * 100) / 100;

    } else {
        // meters
        onePersonCrop = defaultOnePersonCrop;
        twoPersonCrop = defaultTwoPersonCrop;

    };

    document.getElementById('onePersonCrop').value = onePersonCrop.toFixed(2);
    document.getElementById('twoPersonCrop').value = twoPersonCrop.toFixed(2);

}

/* remove individual nodes from the stage EXCEPT for the 'tr' transformer node and layerSelectionBox */
function clearShapeNodesFromStage(closeDetailsTab) {

    layerGrid.destroyChildren();

    let groupLayer = layerTransform.getChildren();
    let lengthGrouplayer = groupLayer.length;

    for (let i = lengthGrouplayer - 1; i >= 0; i--) {
        if (groupLayer[i].name() != 'theTransformer') {
            groupLayer[i].destroyChildren();
        }
    }

    tr.nodes([]);
    if (!closeDetailsTab) {
        enableCopyDelBtn();
    }
}

function updateTitleGroup() {
    let nodes = layerGrid.find('#txtPrimaryDevice');
    let text = 'Primary Device: ';
    if (roomObj.items.videoDevices.length > 0) {
        text = 'Primary Device: ' + roomObj.items.videoDevices[0].name;
    }

    if (nodes.length > 0) {
        nodes[0].text(text);
    }

}

/* Adds the title and unit measurement for the layer grid */
function drawTitleGroup() {

    let txtPrimaryDeviceLabel = 'Primary Device: ';
    let groupTitle = new Konva.Group({
        name: 'groupTitle',
    })

    let unitWidth = pxOffset * 2;

    let unitText = new Konva.Text({
        x: pxOffset / 3,
        y: (pyOffset / 3),
        text: unit,
        fontSize: 14,
        fontFamily: 'Arial, Helvetica, sans-serif',
        opacity: 0.5,
        width: unitWidth,
        padding: 1,

    })

    txtAttribution = new Konva.Text({
        x: 0,
        y: stage.height() - 15,

        text: 'Video Room Calculator at https://collabexperience.com',
        fontSize: 8,
        fontFamily: 'Arial, Helvetica, sans-serif',
        opacity: 0.4,
        padding: 1,
        align: 'right',
        width: stage.width() - 35,

    })

    txtAttribution.visible(false);

    if (roomObj.items.videoDevices.length > 0) {
        txtPrimaryDeviceLabel = 'Primary Device: ' + roomObj.items.videoDevices[0].name;
    }

    let txtPrimaryDevice = new Konva.Text({
        x: pxOffset,
        y: pyOffset + roomLength * scale + 5,
        text: txtPrimaryDeviceLabel,
        fontSize: 13,
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: 1,
        opacity: 0.8,
        id: 'txtPrimaryDevice',

    })


    var txtName = new Konva.Label({
        x: pxOffset,
        y: pyOffset + roomLength * scale + 22,
        opacity: 1,
    });

    txtName.add(
        new Konva.Tag({
            // fill: 'lightgrey',
        })
    );

    txtName.add(
        new Konva.Text({
            text: roomObj.name,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 18,
            padding: 1,
            fill: 'black',
        })
    );

    if (txtName.width() > roomObj.room.roomWidth * scale) {
        let newScale = (roomObj.room.roomWidth * scale) / txtName.width();
        txtName.scaleX(newScale);
        txtName.scaleY(newScale);
    } else {
        txtName.scaleX(1);
        txtName.scaleY(1);
    }

    if (txtPrimaryDevice.width() > roomObj.room.roomWidth * scale - 30) {
        let newScale = (roomObj.room.roomWidth * scale) / txtPrimaryDevice.width();
        txtPrimaryDevice.scaleX(newScale);
        txtPrimaryDevice.scaleY(newScale);
    } else {
        txtPrimaryDevice.scaleX(1);
        txtPrimaryDevice.scaleY(1);
    }

    groupTitle.add(txtAttribution);
    groupTitle.add(txtName);
    groupTitle.add(txtPrimaryDevice);
    groupTitle.add(unitText);

    return groupTitle;
}

/* redrawShapes "true" redraw all shapes, "false" resize shapes using updateShapesBasedOnNewScale() */
function drawRoom(redrawShapes = false, dontCloseDetailsTab = false, dontSaveUndo = false) {

    layerGrid.destroyChildren();

    unit = roomObj.unit;

    document.getElementById('drpMetersFeet').value = unit;

    /* Do if there is a Unit change or Room Width/Length Change */
    if (redrawShapes) {
        clearShapeNodesFromStage(dontCloseDetailsTab);
    }

    document.getElementById('roomWidth').value = round(roomObj.room.roomWidth);
    document.getElementById('roomLength').value = round(roomObj.room.roomLength);
    document.getElementById('roomName').value = roomObj.name;

    let windowWidth = window.innerWidth;

    let controlButtons = document.getElementById('controlButtons');
    let ctrlBttnsBnd = controlButtons.getBoundingClientRect();
    let canvasWindowHeight = window.innerHeight - ctrlBttnsBnd.height - 20;
    let minWindowWidth = 300;
    let minWindowHeight = 600;
    let rightBuffer = 82;
    let bottomBuffer = 120;
    if (windowWidth < minWindowWidth) {
        windowWidth = minWindowWidth;
    }

    if (canvasWindowHeight < minWindowHeight) {
        canvasWindowHeight = minWindowHeight;
    }

    scrollContainer.setAttribute('style', 'height:' + (canvasWindowHeight) + 'px');

    roomWidth = getNumberValue('roomWidth');
    roomObj.room.roomWidth = roomWidth;
    roomLength = getNumberValue('roomLength');
    roomObj.room.roomLength = roomLength;

    let divRmContainerDOMRect = document.getElementById('scroll-container').getBoundingClientRect();

    let xScale = (divRmContainerDOMRect.width - rightBuffer) / roomWidth;

    let yScale = (canvasWindowHeight - bottomBuffer) / roomLength;

    if (xScale < yScale) {
        scale = xScale;
    } else {
        scale = yScale;
    }

    clipShadingBorder.x = pxOffset;
    clipShadingBorder.y = pyOffset;
    clipShadingBorder.width = (roomWidth * scale);
    clipShadingBorder.height = (roomLength * scale);

    grShadingMicrophone.clip(clipShadingBorder);
    grShadingCamera.clip(clipShadingBorder);
    grDisplayDistance.clip(clipShadingBorder);
    grShadingSpeaker.clip(clipShadingBorder);

    let tableWidth = getNumberValue('tableWidth');
    roomObj.room.tableWidth = tableWidth;
    let tableLength = getNumberValue('tableLength');
    roomObj.room.tableLength = tableLength;
    let distDisplayToTable = getNumberValue('distDisplayToTable');
    roomObj.room.distDisplayToTable = distDisplayToTable;
    let frntWallToTv = getNumberValue('frntWallToTv');
    roomObj.room.frntWallToTv = frntWallToTv;
    let tvDiag = getNumberValue('tvDiag');
    roomObj.room.tvDiag = tvDiag;
    let wideFOV = getNumberValue('wideFOV');
    roomObj.room.wideFOV = wideFOV;   /* Wide FOV in degrees */
    let teleFOV = getNumberValue('teleFOV');  /*  Tele FOV in Degrees */
    roomObj.room.teleFOV = teleFOV;

    onePersonCrop = getNumberValue('onePersonCrop');

    twoPersonCrop = getNumberValue('twoPersonCrop');

    onePersonZoom = getNumberValue('onePersonZoom');
    roomObj.room.onePersonZoom = onePersonZoom;

    twoPersonZoom = getNumberValue('twoPersonZoom');
    roomObj.room.twoPersonZoom = twoPersonZoom;

    let roomName = roomObj.name;

    let drpTvNum = getNumberValue('drpTvNum');
    roomObj.room.drpTvNum = drpTvNum;

    document.getElementById('lblvDiag').innerHTML = tvDiag;

    updatePersonCropUnit();

    roomObj.room.onePersonCrop = onePersonCrop;
    roomObj.room.twoPersoncrop = twoPersonCrop;

    //svgStart
    let viewBoxWidth = roomWidth + (pxOffset * 2) / scale;
    let viewBoxLength = roomLength + (pxOffset * 2) / scale;
    //svgEnd 

    let canvasWidth = roomWidth + (pxOffset * 2) / scale;
    let canvasLength = roomLength + (pxOffset * 2) / scale;

    //svgStart
    // Create an SVG <svg> element
    const svg = document.createElementNS(svgns, "svg");

    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("xmlns", svgns);

    // Set the width and height of the <svg> element
    svg.setAttribute("width", (viewBoxWidth * scale).toFixed(2));
    svg.setAttribute("height", ((viewBoxLength * scale) + 30).toFixed(2));
    svg.setAttribute("id", videoRoomCalcSVG);
    //svgEnd

    stageOriginalWidth = canvasWidth * scale;
    stageOriginalLength = (canvasLength * scale) + 30; // 30 is for title at bottom
    // create Konva State
    stage = new Konva.Stage(
        {
            container: 'canvasDiv',
            width: canvasWidth * scale,
            height: (canvasLength * scale) + 30,
            id: roomCanvas,

        }
    )

    zoomInOut(0); // update Stage based on values 

    let backGroundImage = new Konva.Rect({
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
        fill: 'white',
        preventDefault: false,
    });

    panRectangle.setAttrs({
        width: stage.width(),
        height: stage.height(),
    }
    )

    groupBackground.add(backGroundImage);

    layerGrid.add(groupBackground);

    // layerTransform.add(tr);

    //svgStart
    // Create a <rect> element for the outerWall
    const outerWall = document.createElementNS(svgns, "rect");

    // Set the position and size of the <rect> element

    outerWall.setAttribute("x", (pxOffset).toFixed(2));
    outerWall.setAttribute("y", (pxOffset).toFixed(2));
    outerWall.setAttribute("width", (roomWidth * scale).toFixed(2));
    outerWall.setAttribute("height", (roomLength * scale).toFixed(2));
    outerWall.setAttribute("style", "fill:none;stroke:#74a6f7;stroke-width: 3")
    outerWall.setAttribute("id", "outerWall");

    pxLastGridLineY = pxOffset + roomLength * scale;
    //svgEnd 

    // create layer for Border

    //create the outerWall 
    let cOuterWall = new Konva.Rect({
        x: pxOffset,
        y: pxOffset,
        width: roomWidth * scale,
        height: roomLength * scale,
        stroke: '#74a6f7',
        strokeWidth: 3,
        id: 'kOuterWall',
        listening: false,
        preventDefault: false,
    });

    let grOuterWall = new Konva.Group();

    grOuterWall.add(cOuterWall);

    layerGrid.add(grOuterWall);

    // stage.add(layerGrid); 

    //
    // SVG Create a Clip Path for the room. 
    //

    // SVG Create <defs> for Clip Path

    const defsClipPath = document.createElementNS(svgns, "defs");
    defsClipPath.setAttribute('id', 'def-clip-path-border');

    // Create the <clipPath> border
    const clipPathBorder = document.createElementNS(svgns, "clipPath");
    clipPathBorder.setAttribute('id', 'clipPathBorder');

    //svgStart
    // create the <rect> for the clipPathBorder
    const clipPathRect = document.createElementNS(svgns, "rect");
    clipPathRect.setAttribute("x", (pxOffset));
    clipPathRect.setAttribute("y", (pxOffset));
    clipPathRect.setAttribute("width", (roomWidth * scale) - 1);
    clipPathRect.setAttribute("height", (roomLength * scale) - 1);

    clipPathBorder.appendChild(clipPathRect);

    defsClipPath.appendChild(clipPathBorder);

    svg.insertBefore(defsClipPath, svg.firstChild); // <defs> need to be at top of SVG 

    // Draw the grid

    let increment = 1.0;
    if (unit === 'meters') {
        increment = 0.25;

    }

    let grid = drawGrid(pxOffset, pxOffset, (roomWidth * scale) + pxOffset, (roomLength * scale) + pxOffset, scale, increment);

    let kGrid = kDrawGrid(pxOffset, pxOffset, (roomWidth * scale) + pxOffset, (roomLength * scale) + pxOffset, scale, increment);

    titleGroup = drawTitleGroup();

    layerGrid.add(titleGroup);

    layerGrid.add(kGrid);



    //svgStart
    // Create a <rect> element for the table
    const table = document.createElementNS(svgns, "rect");

    // Set the position and size of the <rect> element

    table.setAttribute("x", (((viewBoxWidth - tableWidth) / 2) * scale).toFixed(2));
    table.setAttribute("y", (pxOffset + ((distDisplayToTable + frntWallToTv) * scale)).toFixed(2));
    table.setAttribute("width", (tableWidth * scale).toFixed(2));
    table.setAttribute("height", (tableLength * scale).toFixed(2));
    table.setAttribute("style", "fill:brown;stroke:black;stroke-width: 3; opacity: 0.8");
    table.setAttribute("id", "table");
    table.setAttribute("clip-path", "url(#clipPathBorder)");
    //svgEnd

    // let kTable = new Konva.Rect({
    //     x: ((viewBoxWidth - tableWidth) / 2) * scale,
    //     y: (pxOffset + ((distDisplayToTable + frntWallToTv) * scale)), 
    //     width: tableWidth * scale, 
    //     height: tableLength * scale, 
    //     fill: 'brown',
    //     stroke: 'black', 
    //     strokeWidth: 3, 
    //     opacity: 0.8,
    //     id: 'mainTable'
    // })

    // let layerTable = new Konva.Layer(); 

    // layerTable.add(kTable); 

    document.getElementById('keyTable').setAttribute('style', 'background: brown; opacity: 0.7; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px; ');

    document.getElementById('keyWideZoom').setAttribute('style', 'background: yellow; opacity: 0.4; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px;');

    document.getElementById('keyOnePersonCrop').setAttribute('style', 'background: #8FBC8B; opacity: 1; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px; ');

    document.getElementById('keyTwoPersonCrop').setAttribute('style', 'background: #87aeed; opacity: 1; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px;');

    //svgStart
    const wideCameraViewSVG = document.createElementNS(svgns, "polygon");
    //svgEnd 

    // Yello Wide Angle view: Set the position and size of the <polygon> element

    let startX = Number((viewBoxWidth * scale / 2).toFixed(2));
    let startY = (pxOffset + frntWallToTv * scale).toFixed(2);

    // let triangleHeight = getDistanceA(wideFOV / 2, roomWidth / 2);
    let wFovTriangleHeight = roomLength - frntWallToTv;

    let triangleBase = getDistanceB(wideFOV / 2, wFovTriangleHeight); //  half the triangleBase; 

    let pxTriangleBase = triangleBase * scale;
    let secondX = (startX - pxTriangleBase).toFixed(2);

    let pxwFovTriangleHeight = wFovTriangleHeight * scale;

    let secondY = (Number(startY) + Number(pxwFovTriangleHeight));

    let thirdX = Number(Number(startX) + triangleBase * scale);
    let thirdY = secondY;
    let wideCameraViewPoints = startX + "," + startY + " " + Number(secondX).toFixed(2) + "," + Number(secondY).toFixed(2) + " " + Number(thirdX).toFixed(2) + "," + Number(thirdY).toFixed(2);

    //svgStart
    wideCameraViewSVG.setAttribute("points", wideCameraViewPoints);

    wideCameraViewSVG.setAttribute("style", "stroke:black;stroke-width: 1;fill:yellow;opacity:0.3 ")
    wideCameraViewSVG.setAttribute("id", "wide-hfov-polygon");
    wideCameraViewSVG.setAttribute('clip-path', 'url(#clipPathBorder)');
    //svgEnd 

    // let wideCameraViewLine = new Konva.Line({
    //     points: [startX, startY, Number(secondX), Number(secondY), Number(thirdX), Number(thirdY)],
    //     stroke: 'black',
    //     strokeWidth: '1', 
    //     fill: 'yellow',
    //     opacity: 0.3, 
    //     closed: true,
    // }); 

    // kClipGroup.add(wideCameraViewLine); 

    // let layerMain = new Konva.Layer(); 

    // layerMain.add(kClipGroup); 

    // stage.add(layerMain); 

    // stage.add(layerTable);




    layerGrid.draw();

    //
    // Two Person Crop -- Create a <polygon> element for the zoom horizontal FOV 
    //

    const twoPersonCameraViewTriangle = document.createElementNS(svgns, "polygon");

    // Set the position and size of the <polygon> element

    let teleStartX = (viewBoxWidth * scale / 2);
    let teleStartY = (pxOffset + frntWallToTv * scale);

    let teleTriangleHeight = getDistanceA(teleFOV / 2, twoPersonCrop / 2);

    let zoomedDistForTriangle = teleTriangleHeight * twoPersonZoom;
    let teleSecondX = (viewBoxWidth / 2 - twoPersonCrop / 2) * scale;
    let teleSecondY = (zoomedDistForTriangle * scale) + pxOffset + frntWallToTv * scale;
    let teleThirdX = (viewBoxWidth / 2 + twoPersonCrop / 2) * scale;
    let teleThirdY = teleSecondY;

    let zoomCameraViewPoints = teleStartX + "," + teleStartY + " " + teleSecondX + "," + teleSecondY + " " + teleThirdX + "," + teleThirdY;

    twoPersonCameraViewTriangle.setAttribute("points", zoomCameraViewPoints);
    twoPersonCameraViewTriangle.setAttribute("style", "fill:none;stroke:black;stroke-width: 1; opacity:1.0")
    twoPersonCameraViewTriangle.setAttribute("id", "zoom-hfov-triangle");
    twoPersonCameraViewTriangle.setAttribute("clip-path", "url(#clipPathBorder)");

    //
    // One Person Crop -- Create a <polygon> element for the zoom horizontal FOV 
    //

    const onePerCameraViewTriangle = document.createElementNS(svgns, "polygon");

    // Set the position and size of the <polygon> element

    let teleOnePersonStartX = (viewBoxWidth * scale / 2).toFixed(2);
    let teleOnePersonStartY = (pxOffset + frntWallToTv * scale).toFixed(2);

    let teleOnePersonTriangleHeight = getDistanceA(teleFOV / 2, onePersonCrop / 2);
    let zoomedOnePersonDistForTriangle = teleOnePersonTriangleHeight * onePersonZoom;
    let teleOnePersonSecondX = (viewBoxWidth / 2 - onePersonCrop / 2) * scale;
    let teleOnePersonSecondY = (zoomedOnePersonDistForTriangle * scale) + pxOffset + frntWallToTv * scale;
    let teleOnePersonThirdX = (viewBoxWidth / 2 + onePersonCrop / 2) * scale;
    let teleOnePersonThirdY = teleOnePersonSecondY;

    let zoomOnePersonCameraViewPoints = teleOnePersonStartX + "," + teleOnePersonStartY + " " + teleOnePersonSecondX + "," + teleOnePersonSecondY + " " + teleOnePersonThirdX + "," + teleOnePersonThirdY;

    onePerCameraViewTriangle.setAttribute("points", zoomOnePersonCameraViewPoints);
    onePerCameraViewTriangle.setAttribute("style", "fill:none;stroke:green;stroke-width: 1; opacity:0.8")
    onePerCameraViewTriangle.setAttribute("id", "zoom-oneperson-hfov-triangle");
    onePerCameraViewTriangle.setAttribute("stroke-dasharray", "4");
    onePerCameraViewTriangle.setAttribute("clip-path", "url(#clipPathBorder)");

    let onePersonCropPieSlice = drawPieSlice({ id: "zoom-hfov-one-person-pie-slice", strokeColor: "gray", strokeWidth: 0.5, fillColor: 'none', centerX: Number(teleOnePersonStartX), centerY: Number(teleOnePersonStartY), angleDegrees: teleFOV, radius: (zoomedOnePersonDistForTriangle * scale), opacity: 1.0, clipPath: 'clipPathBorder' });

    // let wideHFOVpoly = svg.getElementById('wide-hfov-polygon');

    // let twoPersonCropPieSlice = drawPieSlice({ id: "zoom-hfov-two-person-pie-slice", fillColor: '#87aeed', centerX: Number(teleStartX), centerY: Number(teleStartY), angleDegrees: teleFOV, radius: (zoomedDistForTriangle * scale), opacity: 1.0, clipPath: 'clipPathBorder' });

    let twoPersonCropPieSlice = drawPieSlice({ id: "zoom-hfov-two-person-pie-slice", strokeColor: "gray", strokeWidth: 0.5, fillColor: 'url(#defs-gradient-optimal)', centerX: Number(teleStartX), centerY: Number(teleStartY), angleDegrees: teleFOV, radius: (zoomedDistForTriangle * scale), opacity: 1.0, clipPath: 'clipPathBorder' });

    createGradient(svg, twoPersonCropPieSlice, Number(teleStartX), Number(teleStartY), zoomedDistForTriangle, zoomedOnePersonDistForTriangle);

    function createGradient(svg, shape, startX, startY, twoPersonCropDist, onePersonCropDist) {

        let onePersonCropColor = "#8FBC8B"
        let twoPersonCropColor = "#87aeed";
        let gradientBlurTransition = 5 // percent the gradient changes +/-   
        let endPointPercent = 90; // Percent
        let stopPoint1Opacity = 1.0;
        let stopPoint2Opacity = 1.0;
        let stopPoint3Opacity = 1.0;
        let stopPoint4Opacity = 0.2;
        let stopPoint1Percent = 0 + '%';
        let stopPoint2Percent = (((onePersonCropDist / twoPersonCropDist) * 100)).toFixed(1);
        let stopPoint3Percent = (((onePersonCropDist / twoPersonCropDist) * 100) + gradientBlurTransition).toFixed(1);
        stopPoint2Percent = stopPoint2Percent + '%';
        stopPoint3Percent = stopPoint3Percent + '%';
        let stopPoint4Percent = 100 + '%';

        // farthestParticipantBlurStart = (farthestParticipantPercent - gradientBlur);

        // farthestParticipantBlurEnd = (farthestParticipantPercent + gradientBlur);           

        let defsGradient = document.createElementNS(svgns, "defs");
        defsGradient.setAttribute('id', 'defs-gradient-optimal');

        let radialGradient = document.createElementNS(svgns, "radialGradient");
        radialGradient.setAttribute('id', 'radial-gradient-optimal');
        radialGradient.setAttribute('gradientUnits', 'userSpaceOnUse')
        radialGradient.setAttribute('cx', Number(startX));
        radialGradient.setAttribute('cy', Number(startY));
        radialGradient.setAttribute('r', Number(twoPersonCropDist * scale));
        defsGradient.append(radialGradient);

        let stop1 = document.createElementNS(svgns, "stop");
        stop1.setAttribute('offset', stopPoint1Percent);
        stop1.setAttribute('style', 'stop-color:' + onePersonCropColor + ';stop-opacity:' + stopPoint1Opacity);
        stop1.setAttribute('id', 'radial-gradient-optimal-stop1');
        radialGradient.append(stop1);

        let stop2 = document.createElementNS(svgns, "stop");
        //                stop2.setAttribute('offset', farthestParticipantBlurStart.toFixed(2) + '%');
        stop2.setAttribute('offset', stopPoint2Percent);
        stop2.setAttribute('style', 'stop-color:' + onePersonCropColor + ';stop-opacity:' + stopPoint2Opacity);
        stop2.setAttribute('id', 'radial-gradient-optimal-stop2');
        radialGradient.append(stop2);

        let stop3 = document.createElementNS(svgns, "stop");
        // stop3.setAttribute('offset', farthestParticipantBlurEnd.toFixed(2) + '%');
        stop3.setAttribute('offset', stopPoint3Percent);
        stop3.setAttribute('style', 'stop-color:' + twoPersonCropColor + ';stop-opacity:' + stopPoint3Opacity);
        stop3.setAttribute('id', 'radial-gradient-optimal-stop3');
        radialGradient.append(stop3);

        let stop4 = document.createElementNS(svgns, "stop");
        // stop4.setAttribute('offset', endPointPercent.toFixed(1) + '%');
        stop4.setAttribute('offset', stopPoint4Percent);
        stop4.setAttribute('style', 'stop-color:' + twoPersonCropColor + ';stop-opacity:' + stopPoint4Opacity);
        stop4.setAttribute('id', 'radial-gradient-optimal-stop4');
        radialGradient.append(stop4);

        svg.insertBefore(defsGradient, svg.firstChild);
        shape.setAttribute('fill', "url(#radial-gradient-optimal)");

    }

    function drawTv() {
        let displayWidthTv = ((0.88 * tvDiag * drpTvNum) / 12).toFixed(3);
        let displayDepthTv = 0.25;

        if (unit === 'meters') {
            displayWidthTv = (displayWidthTv / 3.281);
            displayDepthTv = (displayDepthTv / 3.281);
        }
        displayWidthTv = Number(displayWidthTv);

        // Create a <rect> element for the TV
        const rectTv = document.createElementNS(svgns, "rect");

        // Set the position and size of the <rect> element

        let xRectTv = (((roomWidth / 2 - displayWidthTv / 2) * scale) + pxOffset);

        let yRectTv = (((frntWallToTv - displayDepthTv) * scale) + pxOffset);
        rectTv.setAttribute("x", xRectTv);
        rectTv.setAttribute("y", yRectTv);
        rectTv.setAttribute("width", (displayWidthTv * scale).toFixed(3));
        rectTv.setAttribute("height", (displayDepthTv * scale).toFixed(3));
        rectTv.setAttribute("style", "fill:black;stroke:black;stroke-width: 1;")
        rectTv.setAttribute("id", "rectTv");

        svg.appendChild(rectTv);

        let displayClosestParticipant = tvDiag * 1;
        let displayFarthestParticipant;

        if (unit == 'meters') {
            displayClosestParticipant = (tvDiag / 12) / 3.28084;
        } else {
            displayClosestParticipant = tvDiag / 12 * 1;
        }

        displayFarthestParticipant = displayClosestParticipant * 4;

        let yOneTimesFromDisplay = yRectTv + (displayDepthTv * scale) + (displayClosestParticipant * scale);

        let yThreeTimesFromDisplay = yRectTv + (displayDepthTv * scale) + (displayClosestParticipant * 3 * scale)

        let yFourTimeFromDisplay = yRectTv + (displayDepthTv * scale) + (displayFarthestParticipant * scale)

        let lineOneTimesFromeDisplay = drawLine({ x1: pxOffset, y1: yOneTimesFromDisplay, x2: pxOffset + (roomWidth * scale), y2: yOneTimesFromDisplay, id: 'line-1X-from-display', stroke: 'orchid', clipPath: 'clipPathBorder', dashArray: "6 4", strokeWidth: "2" });
        svg.appendChild(lineOneTimesFromeDisplay);

        let txtOneTimeFromDisplay = addCenteredText("Closest Person to Display: " + displayClosestParticipant.toFixed(1) + ' ' + unit, xRectTv, yOneTimesFromDisplay - 3, (xRectTv + (displayWidthTv * scale)), yOneTimesFromDisplay - 3, 'none', 'lable-1x-from-display');
        txtOneTimeFromDisplay.setAttribute("clip-path", "url(#clipPathBorder)");

        svg.appendChild(txtOneTimeFromDisplay);

        let lineThreeTimesFromeDisplay = drawLine({ x1: pxOffset, y1: yThreeTimesFromDisplay, x2: pxOffset + (roomWidth * scale), y2: yThreeTimesFromDisplay, id: 'line-3X-from-display', stroke: 'green', clipPath: 'clipPathBorder', dashArray: "6", strokeWidth: "2" });
        svg.appendChild(lineThreeTimesFromeDisplay);

        let txtThreeTimesFromDisplay = addCenteredText("Optimal Farthest Person: " + (3 * displayClosestParticipant).toFixed(1) + ' ' + unit, xRectTv, yThreeTimesFromDisplay - 3, (xRectTv + (displayWidthTv * scale)), yThreeTimesFromDisplay - 3, 'none', 'lable-3x-from-display');
        txtThreeTimesFromDisplay.setAttribute("clip-path", "url(#clipPathBorder)");
        svg.appendChild(txtThreeTimesFromDisplay);

        let lineFourTimesFromeDisplay = drawLine({ x1: pxOffset, y1: yFourTimeFromDisplay, x2: pxOffset + (roomWidth * scale), y2: yFourTimeFromDisplay, id: 'line-4X-from-display', stroke: 'red', clipPath: 'clipPathBorder', dashArray: "6 4", strokeWidth: "2" });
        svg.appendChild(lineFourTimesFromeDisplay);

        let txtFourTimesFromDisplay = addCenteredText("Max Viewing Dist: " + displayFarthestParticipant.toFixed(1) + ' ' + unit, xRectTv, yFourTimeFromDisplay - 3, (xRectTv + (displayWidthTv * scale)), yFourTimeFromDisplay - 3, 'none', 'lable-4x-from-display');
        txtFourTimesFromDisplay.setAttribute("clip-path", "url(#clipPathBorder)");

        svg.appendChild(txtFourTimesFromDisplay);
        // update labels in they key 
        document.getElementById('displayClosestParticipant').innerHTML = round(displayClosestParticipant, -1);

        document.getElementById('displayOptimalFarthestParticipant').innerHTML = round(displayClosestParticipant * 3, -1);

        document.getElementById('displayFarthestParticipant').innerHTML = round(displayFarthestParticipant, -1);

    }

    // Add text
    let teleFarthestParticipant = ((teleSecondY - pxOffset - frntWallToTv * scale) / scale).toFixed(1);

    // Append the <svg> element to the document

    document.getElementById('svgDiv').append(svg);

    // Create a <circle> element for the cameraCircle
    const cameraCircle = document.createElementNS(svgns, "circle");

    // Set the position and size of the <rect> element

    cameraCircle.setAttribute("cx", (viewBoxWidth * scale / 2).toFixed(2));
    cameraCircle.setAttribute("cy", (pxOffset + frntWallToTv * scale).toFixed(2));
    cameraCircle.setAttribute("r", 10);
    cameraCircle.setAttribute("style", "fill:white;stroke:black;stroke-width: 5;");
    cameraCircle.setAttribute("id", "cameraCircle");

    let farthestParticipant = distDisplayToTable + tableLength + frntWallToTv;

    let closestParticipant = (farthestParticipant / 4);
    let screenSize = 55;
    if (unit === 'feet') {
        screenSize = (closestParticipant * 12);
    } else {
        screenSize = (closestParticipant * 3.2808 * 12);
    }

    document.getElementById('lblDisplayToFarthest').innerHTML = farthestParticipant.toFixed(1);

    document.getElementById("lblRecommendedDisplay").innerHTML = (screenSize * 4 / 3).toFixed(0);

    document.getElementById('lblFarthestTwoPersonCrop').innerHTML = teleFarthestParticipant;

    document.getElementById('lblFarthestOnePersonCrop').innerHTML = zoomedOnePersonDistForTriangle.toFixed(1);

    document.getElementById('lblOnePersonCrop').innerHTML = onePersonCrop.toFixed(1);

    document.getElementById('lblTwoPersonCrop').innerHTML = twoPersonCrop.toFixed(1);

    // let strUrlQuery = '?ver=' + version + '&drpMetersFeet=' + unit + '&roomWidth=' + roomWidth + '&roomLength=' + roomLength + '&tableWidth=' + tableWidth + '&tableLength=' + tableLength + '&distDisplayToTable=' + distDisplayToTable + '&frntWallToTv=' + frntWallToTv + '&tvDiag=' + tvDiag + '&drpTvNum=' + drpTvNum + '&drpVideoDevice=' + drpVideoDevice.value + '&wideFOV=' + wideFOV + '&teleFOV=' + teleFOV + '&onePersonZoom=' + onePersonZoom + '&twoPersonZoom=' + twoPersonZoom + '&onePersonCrop=' + onePersonCrop + '&twoPersonCrop=' + twoPersonCrop + '&roomName=' + encodeURIComponent(roomName);


    let txtRoomName = createTextElement({ text: roomName, style: 'font-size: 24px; font-family: Arial, Helvetica, sans-serif;', x: (pxOffset + 10), y: (pxLastGridLineY + 50) });
    let selectedDevice = document.getElementById('drpVideoDevice');
    let deviceName = selectedDevice.options[selectedDevice.selectedIndex].text;
    let txtDeviceType = createTextElement({ text: ("Device: " + deviceName), style: 'font-size: 16px; font-family: Arial, Helvetica, sans-serif;', x: (pxOffset + 10), y: (pxLastGridLineY + 20) });

    svg.appendChild(wideCameraViewSVG);

    svg.appendChild(twoPersonCropPieSlice);

    // svg.appendChild(twoPersonCameraViewTriangle);

    // svg.appendChild(onePerCameraViewTriangle);

    svg.appendChild(grid);

    svg.appendChild(table);

    svg.appendChild(outerWall);

    let txtOneCropFarthest = addCenteredText(zoomedOnePersonDistForTriangle.toFixed(1) + " " + unit + " from the camera.", teleOnePersonSecondX, teleOnePersonSecondY - 5, teleOnePersonThirdX, teleOnePersonThirdY - 5);
    txtOneCropFarthest.setAttribute("clip-path", "url(#clipPathBorder)");

    let txtTwoCropFarthest = addCenteredText(teleFarthestParticipant + " " + unit + " from the camera.", teleSecondX, teleSecondY - 5, teleThirdX, teleThirdY - 5);
    txtTwoCropFarthest.setAttribute("clip-path", "url(#clipPathBorder)");


    // drawTv();

    // svg.appendChild(cameraCircle);

    // svg.appendChild(txtRoomName);

    // svg.appendChild(txtDeviceType);

    updateLabelUnits();

    // svg.appendChild(onePersonCropPieSlice);

    // resizePage();



    stageAddLayers();

    gridLinesVisible(roomObj.layersVisible.gridLines);
    shadingMicrophoneVisible(roomObj.layersVisible.grShadingMicrophone);
    displayDistanceVisible(roomObj.layersVisible.grDisplayDistance);
    shadingCameraVisible(roomObj.layersVisible.grShadingCamera);

    if (redrawShapes) {

        roomObjToCanvas(roomObj.items);

        trNodesFromUuids(roomObj.trNodes, false);

        setTimeout(() => { deleteNegativeShapes() }, 250);

        if (!dontSaveUndo) {
            /* canvasToJSON() needs a little time before running or else it won't capture the recenlty drawn room */
            setTimeout(() => {

                canvasToJson();
            }, 100);
        }


    } else {
        updateShapesBasedOnNewScale();
    }

    tr.nodes(tr.nodes()); /* reset tr.nodes so the box is draw again or in correct place */
    addListeners(stage);

    /* the Canvas scroll visully gets reset to 0,0 on a redraw, but the scrollContainer.scrollLeft && scrollContainer.scrollTop keep the same value.  
        Setting the srollContainer.scrollLeft = dx does nothing since Javscript thinks it is the same value and keeps the incorrect 0,0 position.  
        Changing the value a little does the trick to reset scroll values. 
    */
    if (dx > 0) {
        scrollContainer.scrollLeft = dx - 0.01;

    }
    if (dy > 0) {
        scrollContainer.scrollTop = dy - 0.01;
    }

}

function drawLine(settings) {
    // {x1: x1, y1, y2, id: id, style: style, idSvg: idSvg,  clipPath: clipPath, opacity: opacity; stroke-dasharray; stroke: stroke }
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttributeNS(null, 'x1', settings.x1);
    line.setAttributeNS(null, 'x2', settings.x2);
    line.setAttributeNS(null, 'y1', settings.y1);
    line.setAttributeNS(null, 'y2', settings.y2);

    if ('strokeWidth' in settings) {
        line.setAttributeNS(null, 'stroke-width', settings.strokeWidth);
    }

    if ('id' in settings) {
        line.setAttributeNS(null, 'id', settings.id);
    }

    if ('stroke' in settings) {
        line.setAttributeNS(null, 'stroke', settings.stroke);
    }

    if ('dashArray' in settings) {
        line.setAttributeNS(null, 'stroke-dasharray', settings.dashArray);
    }

    if ("opacity" in settings) {
        line.setAttributeNS(null, 'opacity', settings.opacity);
    }

    if ('style' in settings) {
        line.setAttribute('style', settings.style);
    }

    if ('clipPath' in settings) {
        line.setAttribute('clip-path', settings.clipPath);
    }

    if ("idSvg" in settings) {

        document.getElementById(settings.idSvg).appendChild(line);
    }

    if ("clipPath" in settings) {
        line.setAttributeNS(null, "clip-path", "url(#" + settings.clipPath + ")");
    }

    return line;

}

function creatArrayKeysTypes() {
    eachCategory(videoDevices, 'videoDevices');
    eachCategory(microphones, 'microphones');
    eachCategory(chairs, 'chairs');
    eachCategory(tables, 'tables');
    eachCategory(displays, 'displays');

    function eachCategory(category, groupName) {
        category.forEach((item) => {

            idKeyObj[item.id] = item.key;

            keyIdObj[item.key] = { 'groupName': groupName, 'data_deviceid': item.id, name: item.name, 'width': item.width, 'height': item.depth, 'name': item.name };
        });
    }
}

function createShareableLink() {
    let strUrlQuery2;
    strUrlQuery2 = `A${roomObj.unit == 'feet' ? '1' : '0'}`;
    strUrlQuery2 += `${roomObj.version}`;
    strUrlQuery2 += `b${expand(roomObj.room.roomWidth)}c${expand(roomObj.room.roomLength)}`;
    strUrlQuery2 += `${roomObj.name == '' ? '' : '~' + encodeURIComponent(roomObj.name).replaceAll('%20', '+') + '~'}`;
    strUrlQuery2 += createShareableLinkItemShading();

    let items = roomObj.items;
    let i = 0;
    for (const category in items) {
        items[category].forEach((item) => {
            strUrlQuery2 += createShareableLinkItem(item);
            i += 1;
        })
    }

    fullShareLink = location.origin + location.pathname + '?x=' + strUrlQuery2;
    fullShareLink = DOMPurify.sanitize(fullShareLink);
    fullShareLink = fullShareLink.replaceAll(' ', '+');

    document.getElementById('shareLink').setAttribute('href', fullShareLink);

    document.getElementById('qrCodeLinkText').value = 'QR Code Character Length: ' + fullShareLink.length + ' / 2950 max';


    if (fullShareLink.length > 2500) {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#ffffc5';
    } else {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#ffffff';
    }

    if (fullShareLink.length > 2950) {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#f9bfbf';
    }
    
    let queryParams = new URLSearchParams(window.location.search);
    queryParams.set("x", strUrlQuery2);
    history.replaceState(null, null, fullShareLink); 
    
    /* only create QR Code if RoomOS only every 2 seconds for performance */ 
    if(qrCodeAlwaysOn){
        let qrImage = document.getElementById('qrCode').firstChild; 
        clearTimeout(timerQRcodeOn); 

        /* blur the QR code until it is recreated */ 
        if(qrImage){
            qrImage.style.filter = 'blur(5px)';
            console.log('qrImage blud'); 
        }

        timerQRcodeOn = setTimeout(()=>{
            createQrCode(); 
        }, 2000); 

    }
    
}

function expand(num) {
    return Math.round(num * 100);
}



function createShareableLinkItem(item) {
    let strItem = '';
    strItem += idKeyObj[item.data_deviceid];

    if ('x' in item) {
        strItem += Math.round(item.x * 100);
    }

    if ('y' in item) {
        strItem += 'a' + Math.round(round(item.y) * 100);
    }

    if ('z' in item) {
        strItem += 'b' + Math.round(round(item.z) * 100);
    }

    if ('width' in item) {
        strItem += 'c' + Math.round(round(item.width) * 100);
    }

    if ('length' in item) {
        strItem += 'd' + Math.round(round(item.length) * 100);
    }

    if ('height' in item) {
        strItem += 'e' + Math.round(round(item.height) * 100);
    }

    if ('rotation' in item) {
        let rotation = Math.round(item.rotation);
        if (rotation != 0) {
            strItem += 'f' + Math.round(round(item.rotation) * 10);
        }
    }

    if ('data_diagonalInches' in item) {
        strItem += 'g' + item.data_diagonalInches;
    }

    return strItem;
}

function createShareableLinkItemShading() {
    let shadeArray = [];
    if (roomObj.layersVisible.grShadingCamera) {
        shadeArray[0] = 1;
    } else {
        shadeArray[0] = 0;
    }

    if (roomObj.layersVisible.grDisplayDistance) {
        shadeArray[1] = 1;
    } else {
        shadeArray[1] = 0;
    }

    if (roomObj.layersVisible.grShadingMicrophone) {
        shadeArray[2] = 1;
    } else {
        shadeArray[2] = 0;
    }

    if (roomObj.layersVisible.gridLines) {
        shadeArray[3] = 1;
    } else {
        shadeArray[3] = 0;
    }

    return 'B' + shadeArray.join('');

}



function drawPieSlice(settings) {

    if (!("rotateAngleDegrees" in settings)) {
        settings.rotateAngleDegrees = 0;
    }

    if (!("angleDegrees" in settings)) {
        settings.angleDegrees = 90;
    }

    if (!("opacity" in settings)) {
        settings.opacity = 1.0;
    }

    if (!("fillColor" in settings)) {
        settings.fillColor = 'none'; // light blue
    }

    if (!("strokeColor" in settings)) {
        settings.strokeColor = 'none'
    }

    let d = "";

    let flags = "0,1";
    if (360 > settings.angleDegrees && settings.angleDegrees > 180) {
        flags = "1,1";
    }
    else if (settings.angleDegrees == 360) {
        settings.angleDegrees = 359.99;
        flags = "1,1";
    }
    else if (settings.angleDegrees > 360) {
        flags = "1,0";
    }

    let startAngleRadians = (((180 - settings.angleDegrees) / 2 + settings.rotateAngleDegrees) / 180) * Math.PI;

    let sweepAngleRadians = (Math.PI * (settings.angleDegrees / 180));

    const firstCircumferenceX = settings.centerX + settings.radius * Math.cos(startAngleRadians);
    const firstCircumferenceY = settings.centerY + settings.radius * Math.sin(startAngleRadians);
    const secondCircumferenceX = settings.centerX + settings.radius * Math.cos(startAngleRadians + sweepAngleRadians);
    const secondCircumferenceY = settings.centerY + settings.radius * Math.sin(startAngleRadians + sweepAngleRadians);

    // move to center
    d += "M" + settings.centerX + "," + settings.centerY + " ";
    // line to first edge
    d += "L" + firstCircumferenceX + "," + firstCircumferenceY + " ";
    // arc
    // Radius X, Radius Y, X Axis Rotation, Large Arc Flag, Sweep Flag, End X, End Y
    d += "A" + settings.radius + "," + settings.radius + " 0 " + flags + " " + secondCircumferenceX + "," + secondCircumferenceY + " ";
    // close path
    d += "Z";

    const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arc.setAttributeNS(null, "d", d);
    arc.setAttributeNS(null, "fill", settings.fillColor);
    arc.setAttribute('opacity', settings.opacity);
    arc.setAttributeNS(null, "style", "stroke:" + settings.strokeColor);

    if ("id" in settings) {
        arc.setAttributeNS(null, "id", settings.id);
    }

    if ("clipPath" in settings) {
        arc.setAttributeNS(null, "clip-path", "url(#" + settings.clipPath + ")");
    }

    if ("strokeWidth" in settings) {
        arc.setAttributeNS(null, "stroke-width", settings.strokeWidth);
    }

    arc.setAttribute("rotateAngleDegrees", settings.rotateAngleDegrees);
    arc.setAttribute("angleDegrees", settings.angleDegrees);
    arc.setAttribute("centerX", settings.centerX);
    arc.setAttribute("centerY", settings.centerY);
    arc.setAttribute("radius", settings.radius);

    if ("idSvg" in settings) {

        document.getElementById(settings.idSvg).appendChild(arc);
    }

    return arc;
}

/* download a transparent image */
function downloadCanvasTransPNG() {
    zoomInOut('reset');
    /* allow time to reset */

    setTimeout(() => { downloadCanvasPNG2(false); }, 100);
}

function downloadCanvasPNG() {
    zoomInOut('reset');
    /* allow time to reset */
    setTimeout(() => { downloadCanvasPNG2(true); }, 100);
}

function downloadCanvasPNG2(isSolidBackground = true) {

    txtAttribution.visible(true);

    if (!isSolidBackground) groupBackground.visible(false);
    tr.nodes([]);
    enableCopyDelBtn(false);
    try {

        let roomName = document.getElementById('roomName').value;

        let downloadRoomName;

        if (roomName == null || roomName == '') {
            downloadRoomName = 'VideoRoomCalc.png';
        } else {
            downloadRoomName = roomName.replace(/[/\\?%*:|"<>]/g, '-');
            downloadRoomName = downloadRoomName.trim() + '.png'
        }

        function downloadURI(uri, name) {
            var link = document.createElement('a');
            link.download = name;
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            delete link;
        }

        let stageDataUrl = stage.toDataURL({ pixelRatio: 5 });
        downloadURI(stageDataUrl, downloadRoomName);

        lastAction = 'download png';
        postHeartbeat();

    } catch (err) {
        console.error(`Error: ${err}`);
    }
    if (!isSolidBackground) groupBackground.visible(true)

    txtAttribution.visible(false);
}

const downloadPNG = document.querySelector('#downloadPNG');
downloadPNG.addEventListener('click', downloadCanvasPNG);

const downloadTransPNG = document.querySelector('#downloadTransPNG');

downloadTransPNG.addEventListener('click', downloadCanvasTransPNG);

function shareableLinkClicked() {
    lastAction = "shareable link";
    postHeartbeat();
}

async function postHeartbeat() {

    setTimeout(() => {

        let path = location.origin + "/heartbeat";
        let primaryDevice = 'none';
        if (roomObj.items.videoDevices.length > 0) {
            primaryDevice = roomObj.items.videoDevices[0].data_deviceid;
        }
        let data = {
            sessionId: roomObj.version + '_' + sessionId,
            clientTimeStamp: clientTimeStamp,
            videoDevice: primaryDevice,
            lastAction: lastAction,
            mobileDevice: mobileDevice,
            unit: unit
        }

        fetch(path, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())

    }, 1000);
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    /* Get all elements with class="tabcontent" and hide them */
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    /* Get all elements with class="tablinks" and remove the class "active" */
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    /* Show the current tab, and add an "active" class to the button that opened the tab */
    document.getElementById(tabName).style.display = "block";

    evt.currentTarget.className += " active";
}

function openSubTab(evt, tabName) {
    /* Declare all variables */
    let i, tabcontent, tablinks;

    /* Get all elements with class="tabcontent" and hide them */
    tabcontent = document.getElementsByClassName("subtabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    /* Get all elements with class="tablinks" and remove the class "active" */
    tablinks = document.getElementsByClassName("subtablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    /* Show the current tab, and add an "active" class to the button that opened the tab */
    document.getElementById(tabName).style.display = "block";

    evt.currentTarget.className += " active";

}

// Get the element with id="defaultOpen" and click on it

function toggleButton(button) {
    if (button.style['color'] === 'black') {
        button.style["color"] = 'grey'
    } else {
        button.style["color"] = 'black'
    };
}


function btnUndoClicked() {
    clearTimeout(undoArrayTimer);
    if (undoArray.length > 0) {
        redoArray.push(undoArray.pop());
        roomObj = structuredClone(undoArray[undoArray.length - 1]);
        unit = roomObj.unit;
        drawRoom(true, true, true);
        enableBtnUndoRedo();
        setTimeout(() => {
            isQuickSetupEnabled(); 
            updateQuickSetupItems(); 
        }, 500);

    }
}

function btnRedoClicked() {
    if (redoArray.length > 0) {
        undoArray.push(redoArray.pop())
        roomObj = structuredClone(undoArray[undoArray.length - 1]);
        drawRoom(true, true, true);
        setTimeout(() => { 
            isQuickSetupEnabled(); 
            updateQuickSetupItems(); 
        }, 500);
    }
    enableBtnUndoRedo();
}

function enableBtnUndoRedo() {
    if (undoArray.length > 1) {
        document.getElementById('btnUndo').disabled = false;
    } else {
        document.getElementById('btnUndo').disabled = true;
    }
    if (redoArray.length > 0) {
        document.getElementById('btnRedo').disabled = false;
    } else {
        document.getElementById('btnRedo').disabled = true;
    }
}

function copyItems() {
    let items = tr.nodes();
    let uuids = [];

    items.forEach(node => {

        let attrs = node.attrs;

        let uuid = createUuid();

        uuids.push(uuid);

        if (!('rotation' in attrs)) {
            node.rotation(0);
        }

        let rotation = attrs.rotation;
        let center = {};

        if (node.getParent().name() === 'tables') {
            center.x = node.x();
            center.y = node.y();
        } else {
            center = getCenter(node);
        }

        let x2 = ((center.x - pxOffset) / scale) + (stage.width() * 0.04) / scale;
        let y2 = ((center.y - pyOffset) / scale) + (stage.height() * 0.04) / scale;

        let width = attrs.width / scale;
        let height = attrs.height / scale;
        let deviceId = node.data_deviceid;
        let newAttr = { x: x2, y: y2, width: width, height: height, rotation: rotation };

        if ('data_diagonalInches' in node) {
            newAttr.data_diagonalInches = node.data_diagonalInches;
        }

        insertShapeItem(deviceId, node.getParent().name(), newAttr, uuid);



    });

    trNodesFromUuids(uuids, true);

}

/* enter an array of UUIDs and select as part of trnodes */
function trNodesFromUuids(uuids, save = true) {
    let trNodes = [];
    setTimeout(() => {
        /* select newly copy items for tr nodes. Timeout is so call back has time. */
        uuids.forEach((uuid) => {
            trNodes.push(stage.find('#' + uuid)[0]);
        });
        tr.nodes(trNodes);
        enableCopyDelBtn();
        if (save) {
            canvasToJson();
        }

        if (uuids.length === 1) {
            updateFormatDetails(uuids[0]);
        }
    }, 100);
}

function stageAddLayers() {
    stage.add(layerGrid);

    layerTransform.add(grShadingCamera);
    layerTransform.add(groupChairs);
    layerTransform.add(groupTables);

    layerTransform.add(groupShapes);


    layerTransform.add(grShadingMicrophone);
    layerTransform.add(grDisplayDistance);
    layerTransform.add(grShadingSpeaker);

    layerTransform.add(groupDisplays);
    layerTransform.add(groupSpeakers);
    layerTransform.add(groupTouchPanel);

    layerTransform.add(groupVideoDevices);
    layerTransform.add(groupMicrophones);

    stage.add(layerTransform);

    stage.add(layerSelectionBox);

    tr.zIndex(layerTransform.getChildren().length - 1);   // make the TR node the highest node in layerTransform

}


/* update once labels are created */
document.getElementById('btnLabelToggle').disabled = true;


function displayDistanceVisible(state = 'buttonPress') {

    let button = document.getElementById('btnDisplayDistance');
    let saveToUndo = false;

    if (state === 'buttonPress') {
        saveToUndo = true;
        if (grDisplayDistance.visible() === true) {
            state = false;
        }
        else {
            state = true;
        }
    }

    if (state === true) {
        button.style["color"] = toggleButtonOnColor;
        grDisplayDistance.visible(true);
        button.children[0].textContent = 'tv';
        roomObj.layersVisible.grDisplayDistance = true;

    } else {
        button.style["color"] = toggleButtonOffColor;
        grDisplayDistance.visible(false);
        button.children[0].textContent = 'tv_off';
        roomObj.layersVisible.grDisplayDistance = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function gridLinesVisible(state = 'buttonPress') {
    let saveToUndo = false;
    let button = document.getElementById('btnGridToggle');

    if (state === 'buttonPress') {
        saveToUndo = true;
        if (kGroupLines.visible() === true) {
            state = false;
        } else {
            state = true;
        }
    }

    if (state === true) {
        layerGrid.visible(true);

        titleGroup.visible(true);

        grShadingCamera.clip(clipShadingBorder);
        grShadingMicrophone.clip(clipShadingBorder);
        kGroupLines.visible(true);
        button.style["color"] = toggleButtonOnColor;
        document.getElementById("spanGridOn").textContent = 'grid_on';
        roomObj.layersVisible.gridLines = true;
    }
    else {
        button.style["color"] = toggleButtonOnColor;
        layerGrid.visible(true);
        kGroupLines.visible(false);
        titleGroup.visible(false);
        grShadingCamera.clip(clipShadingBorder);
        grShadingMicrophone.clip(clipShadingBorder);
        document.getElementById("spanGridOn").textContent = 'check_box_outline_blank';
        gridToggleState = 'off';
        roomObj.layersVisible.gridLines = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function shadingCameraVisible(state = 'buttonPress') {
    let button = document.getElementById('btnCamShadeToggle');
    let saveToUndo = false;

    if (state === 'buttonPress') {
        saveToUndo = true;
        if (grShadingCamera.visible() === true) {

            state = false;
        } else {
            state = true;
        }
    }

    if (state) {
        button.style["color"] = toggleButtonOnColor;
        button.children[0].textContent = 'videocam';
        grShadingCamera.visible(true);
        roomObj.layersVisible.grShadingCamera = true;
    } else {
        button.style["color"] = toggleButtonOffColor;
        button.children[0].textContent = 'videocam_off';
        grShadingCamera.visible(false);
        roomObj.layersVisible.grShadingCamera = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function shadingMicrophoneVisible(state = 'buttonPress') {
    let button = document.getElementById('btnMicShadeToggle');
    let saveToUndo = false;
    if (state === 'buttonPress') {
        saveToUndo = true;
        if (grShadingMicrophone.visible() === true) {
            state = false;
        } else {
            state = true;
        }
    }

    if (state === true) {
        grShadingMicrophone.visible(true);
        button.children[0].textContent = 'mic';
        button.style["color"] = toggleButtonOnColor;
        roomObj.layersVisible.grShadingMicrophone = true;
    } else {
        button.style["color"] = toggleButtonOffColor;
        button.children[0].textContent = 'mic_off';
        grShadingMicrophone.visible(false);
        roomObj.layersVisible.grShadingMicrophone = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function toggleSelectPan() {
    let button = document.getElementById('btnSelectPan');
    if (button.children[0].textContent === 'select') {
        button.children[0].textContent = 'pan_tool';
        button.children[0].style.color = '';
        document.getElementById("canvasDiv").style.cursor = "auto";

        panScrollableOn = false;
        panRectangle.hide();

    } else {

        button.children[0].textContent = 'select';

        document.getElementById("canvasDiv").style.cursor = "grab";

        panScrollableOn = true;

        panRectangle.show();
    }
}

/* this needs to be updated */
function toggleLabels(button) {
    if (button.children[0].textContent === 'label') {
        button.children[0].textContent = 'label_off';
        button.style["color"] = toggleButtonOffColor;
        roomObj.layersVisible.labels = false;
    } else {
        button.children[0].textContent = 'label'
        button.style["color"] = toggleButtonOnColor;
        roomObj.layersVisible.labels = true;
    }


}

let selectionRectangle = new Konva.Rect({
    fill: 'rgba(0,0,255,0.5)',
    visible: false,
    /*  disable listening to not interrupt other events */
    listening: false,
});

layerSelectionBox.add(selectionRectangle);

layerTransform.add(tr);

layerTransform.draw();

function deleteTrNodes(save = true) {

    tr.nodes().forEach(node => {

        let audioShading = stage.find('#audio~' + node.id())[0];
        let videoShading = stage.find('#fov~' + node.id())[0];
        let displayShading = stage.find('#dispDist~' + node.id())[0];

        node.destroy();
        if (audioShading) {
            audioShading.destroy();
        }

        if (videoShading) {
            videoShading.destroy();
        }

        if (displayShading) {
            displayShading.destroy();
        }

    });
    tr.nodes([]);
    enableCopyDelBtn();
    if (save) {
        canvasToJson();
    }

}

let microphone = new Konva.Shape({
    x: 0,
    y: 0,
    fill: 'grey',
    width: 40,
    height: 40,
    name: 'microphone',
    draggable: true,
    strokeWidth: 4,
    stroke: 'black',
    sceneFunc: function (ctx, shape) {
        ctx.beginPath();
        ctx.arc(shape.width() / 2, shape.height() / 2, shape.width() / 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStrokeShape(shape);
    }

});

microphone.data_type = 'microphone';

function updateInsertVideoDeviceOptions() {

    let drpInsertVideoDevice = document.getElementById('drpInsertVideoDevice');
    videoDevices.forEach((device) => {
        // let name = device.name + ' - Wide:' + device.wideHorizontalFOV + '\u00b0 Tele:' + device.teleHorizontalFOV + '\u00b0 ' + device.onePersonZoom + 'x ' + device.twoPersonZoom + 'x';

        let name = device.name;

        let drpOption = new Option(name, device.id);

        drpInsertVideoDevice.add(drpOption, undefined);
    })

    // drpInsertVideoDevice.value = 'ptz4k'; // Set the Room Bar Pro as the default device. 

}

// updateInsertVideoDeviceOptions();

// var camera = new Konva.Shape({
//     x: 80,
//     y: 120,
//     fill: '#00D2FF',
//     width: 100,
//     height: 50,
//     draggable: true,
//     name: 'camera',
//     id: 'camera-' + cameraNumber,
//     sceneFunc: function (ctx, shape) {
//         ctx.beginPath();
//         // don't need to set position of rect, Konva will handle it
//         ctx.rect(0, 0, shape.getAttr('width'), shape.getAttr('height'));
//         // (!) Konva specific method, it is very important
//         // it will apply are required styles
//         ctx.fillStrokeShape(shape);
//     }
// });

function sceneFuncPtz4k(ctx, shape) {
    ctx.beginPath();
    let width = shape.getAttr('width');
    let height = shape.getAttr('height');
    // don't need to set position of rect, Konva will handle it
    ctx.rect(0, 0, width, height * 0.65);
    // (!) Konva specific method, it is very important
    // it will apply are required styles

    ctx.fillStrokeShape(shape);
    ctx.moveTo(width * 0.3, height * 0.65);
    ctx.lineTo(width * 0.7, height * 0.65);
    ctx.lineTo(width, height * 0.95);
    ctx.lineTo(0, height * 0.95);
    ctx.closePath();
    ctx.fillStrokeShape(shape);
    ctx.stroke();

}

function sceneFuncQuadCam(ctx, shape) {
    ctx.beginPath();
    let width = shape.getAttr('width');
    let height = shape.getAttr('height');
    // don't need to set position of rect, Konva will handle it
    ctx.rect(0, 0, width, height * 0.65);
    // (!) Konva specific method, it is very important
    // it will apply are required styles

    ctx.fillStrokeShape(shape);
    ctx.moveTo(width * 0.4, height * 0.65);
    ctx.lineTo(width * 0.6, height * 0.65);
    ctx.lineTo(width, height * 0.8);
    ctx.lineTo(0, height * 0.8);
    ctx.closePath();
    ctx.fillStrokeShape(shape);
    ctx.stroke();
}

let camera = new Konva.Shape({
    x: stage.width() / 2,
    y: stage.height() / 2,
    fill: 'grey',
    width: 35,
    height: 30,
    draggable: true,
    name: 'cameraName',
    id: nodeNumber,
    sceneFunc: sceneFuncPtz4k,
});

camera.data_type = 'videoDevice';

function roomObjToCanvas(roomObjItems) {

    layerTransform.data_scale = scale;
    layerTransform.data_pxOffset = pxOffset;
    layerTransform.data_pyOffset = pyOffset;

    if ('videoDevices' in roomObjItems) {
        for (const device of roomObjItems.videoDevices) {

            insertShapeItem(device.data_deviceid, 'videoDevices', { x: device.x, y: device.y, rotation: device.rotation }, device.id);

        }
    }

    if ('microphones' in roomObjItems) {
        for (const device of roomObjItems.microphones) {

            insertShapeItem(device.data_deviceid, 'microphones', { x: device.x, y: device.y, rotation: device.rotation }, device.id);

        }
    }

    if ('speakers' in roomObjItems) {
        for (const device of roomObjItems.speakers) {

            insertShapeItem(device.data_deviceid, 'microphones', { x: device.x, y: device.y, rotation: device.rotation }, device.id);

        }
    }

    if ('displays' in roomObjItems) {
        for (const device of roomObjItems.displays) {

            insertShapeItem(device.data_deviceid, 'displays', { x: device.x, y: device.y, rotation: device.rotation, data_diagonalInches: device.data_diagonalInches }, device.id);

        }
    }

    if ('chairs' in roomObjItems) {
        for (const device of roomObjItems.chairs) {

            insertShapeItem(device.data_deviceid, 'chairs', { x: device.x, y: device.y, rotation: device.rotation }, device.id);

        }
    }

    if ('tables' in roomObjItems) {
        for (const device of roomObjItems.tables) {

            let attrObj = { x: device.x, y: device.y, rotation: device.rotation }

            if ('height' in device) {
                attrObj.height = device.height;
            }

            if ('width' in device) {
                attrObj.width = device.width;
            }

            insertShapeItem(device.data_deviceid, 'tables', attrObj, device.id);

        }
    }

}

function canvasToJson() {
    let scaleRoomObj = {};
    let transformGroups = layerTransform.getChildren();

    transformGroups.forEach((group) => {
        let groupName = group.name();
        /* ignore the shading and the temporary groups */
        if (!(groupName === 'theTransformer' || groupName === 'grShadingMicrophone' || groupName === 'grShadingCamera' || groupName === 'grDisplayDistance' || groupName === 'grShadingSpeaker')) {
            getNodesJson(group);
        }

    })
    trNodesUuidToRoomObj();


    setTimeout(() => {
        isQuickSetupEnabled();
        updateQuickSetupItems(); 
        updateTitleGroup();

    }, 500);

    function getNodesJson(parentGroup) {
        let theObjects = parentGroup.getChildren();
        let groupName = parentGroup.name();
        scaleRoomObj[groupName] = [];
        roomObj.items[groupName] = [];
        let itemAttr = {};

        theObjects.forEach(element => {
            let x, y;
            let attrs = element.attrs;

            if (!('rotation' in attrs)) {
                element.rotation(0);
            }

            /* scaleRoomObj is used for troubleshooting */
            scaleRoomObj[groupName].push({ x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height, rotation: attrs.rotation, scaleX: attrs.scaleX, scaleY: attrs.scaleY, type: element.data_type, id: element.attrs.id, name: element.attrs.name, test: attrs.test })

            let scaleX = Math.round(attrs.scaleX * 1000) / 1000;
            let scaleY = Math.round(attrs.scaleY * 1000) / 1000;

            let rotation = attrs.rotation;

            if (groupName === 'tables') {
                x = attrs.x;
                y = attrs.y;
            } else {
                let center = getCenter(element);
                x = center.x;
                y = center.y;
            }


            itemAttr = {
                x: ((x - pxOffset) / scale),
                y: ((y - pyOffset) / scale),
                rotation: rotation,
                type: element.data_type,
                data_deviceid: element.data_deviceid,
                id: element.attrs.id,
                name: element.attrs.name,
            }


            if ('data_diagonalInches' in element) {
                itemAttr.data_diagonalInches = element.data_diagonalInches;
            }

            if (groupName === 'tables') {
                itemAttr.width = (attrs.width / scale);
                itemAttr.height = (attrs.height / scale);
            }
            roomObj.items[groupName].push(itemAttr);

        });

    }

    console.log(JSON.stringify(roomObj, null, 5)); 

    clearTimeout(undoArrayTimer);
    undoArrayTimer = setTimeout(() => {
        saveToUndoArray();
        createShareableLink();
    }, undoArrayTimeDelta)


}

/*
    Save the tr.nodes() UUIDs to roomObj.trNodes[] array for the purpose of undo/redo shape items being shown selected. 
*/
function trNodesUuidToRoomObj() {
    let trNodes = tr.nodes();
    let trNodesIdArray = [];

    if (trNodes.length > 0) {
        trNodes.forEach((node) => {
            trNodesIdArray.push(node.id());
        })
    }

    roomObj.trNodes = trNodesIdArray;
}

function saveToUndoArray() {
    let strUndoArrayLastItem;

    let strRoomObj = JSON.stringify(roomObj);

    if (undoArray.length === 0) {
        strUndoArrayLastItem = '';
    } else {
        strUndoArrayLastItem = JSON.stringify(undoArray[undoArray.length - 1]);
    }

    strRoomObj = strRoomObj.trim();
    strUndoArrayLastItem = strUndoArrayLastItem.trim();

    if ((strRoomObj === strUndoArrayLastItem)) {

    } else {
        undoArray.push(structuredClone(roomObj));
        createShareableLink();
    }

    redoArray = [];

    enableBtnUndoRedo();

    if (undoArray.length > maxUndoArrayLength) {
        undoArray.shift();
    }

}

function insertTable(insertDevice, groupName, attrs, uuid, selectTrNode) {

    let table;
    let width = 1220 / 1000 * scale; /* default width is about 4 feet */
    let height = 2440 / 1000 * scale; /* default table height is about 8 feet */
    let pixelX = scale * attrs.x + pxOffset;
    let pixelY = scale * attrs.y + pyOffset;
    let opacity = 0.8;

    let fillColor = 'brown';
    let strokeColor = 'black';

    if (unit === 'feet') {
        width = width * 3.28084;
        height = height * 3.28084;
    }

    if ('width' in attrs) {
        width = attrs.width * scale;
    }

    if ('height' in attrs) {
        height = attrs.height * scale;
    }

    if ('rotation' in attrs) {
        rotation = attrs.rotation;
    } else {
        rotation = 0;
    }

    if (insertDevice.id === 'tblRect') {
        table = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: opacity,
        });
    }

    if (insertDevice.id === 'tblEllip') {
        table = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: opacity,
            sceneFunc: (context, shape) => {
                context.beginPath();
                /* don't need to set position of ellipse, Konva will handle it */
                context.ellipse(shape.getAttr('width') / 2, shape.getAttr('height') / 2, shape.getAttr('width') / 2, shape.getAttr('height') / 2, 0, 0, 2 * Math.PI);
                /* (!) Konva specific method, it is very important - it will apply are required styles */
                context.fillStrokeShape(shape);
            }
        });
    }

    let width2 = 0.8; /* in meters */
    if (unit === 'feet') {
        width2 = 3.28 * width2;
    }
    width2 = width2 * scale;

    if (insertDevice.id === 'tblTrap') {
        table = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: opacity,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                let width = shape.width();
                let height = shape.height();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(width, 0);
                // ctx.lineTo(width * 0.7, height);
                // ctx.lineTo(width * 0.3, height);

                ctx.lineTo((width / 2) + (width2 / 2), height);
                ctx.lineTo((width / 2) - (width2 / 2), height);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });
    }

    table.data_deviceid = insertDevice.id;

    table.perfectDrawEnabled(perfectDrawEnabled);

    if ('scaleX' in attrs) {
        table.scaleX = attrs.scaleX;
    };

    if ('scaleY' in attrs) {
        table.scaleX = attrs.scaleX;
    };

    if ('name' in attrs) {
        table.name(attrs.name);
    } else {
        table.name(insertDevice.name);
    }

    /* if statement to add incase in future */
    if (groupName === 'tables') {
        groupTables.add(table);
    }

    if (selectTrNode) {
        tr.resizeEnabled(true);
        tr.nodes([table]);
        enableCopyDelBtn();
        /* add delay before updateFormatDetails to give time for object to be inserted and roomObj JSON to be updated */
        setTimeout(() => {
            updateFormatDetails(uuid)
        }, 500);
    }

    table.on('dragmove', function (e) {

        if (!tr.nodes().includes(e.target)) {
            tr.nodes([e.target]);
            enableCopyDelBtn();
            /* tables and other objects maybe resizable. */
            if (e.target.getParent() === groupTables) {
                tr.resizeEnabled(true);
            } else {
                tr.resizeEnabled(false);
            }
        }

        if (e.target.attrs.id) {
            if (tr.nodes().length === 1) {

                updateFormatDetails(e);
            }
        }
    });

}

/*
    insertOffsetCount() not used at the moment due to drag and drop.  Might use the code gain.  
*/
function insertOffsetCount() {
    insertCountXOffset += 1;

    insertCountYOffset += 1;

    if (insertCountYOffset > 7) {
        insertCountXOffset = insertCountXOffset - 0.1;
        insertCountYOffset = 0;

    }

    if (stage.width() / 2.5 < stage.width() * 0.03 * insertCountXOffset) {
        insertCountXOffset = 0;
    }
}

function findUpperLeftXY(shape) {

    // return {

    //     x:
    //         shape.x()
    //         + (shape.width() / 2) * Math.cos(Math.PI / 180 * shape.rotation())
    //         + (shape.height() / 2) * Math.sin(Math.PI / 180 * (-shape.rotation())),
    //     y:
    //         shape.y() +
    //         (shape.height() / 2) * Math.cos(Math.PI / 180 * shape.rotation()) +
    //         (shape.width() / 2) * Math.sin(Math.PI / 180 * shape.rotation())
    // };

    return {
        x:
            shape.x
            - (shape.width / 2) * Math.cos(Math.PI / 180 * shape.rotation)
            - (shape.height / 2) * Math.sin(Math.PI / 180 * (-shape.rotation)),
        y:
            shape.y -
            (shape.height / 2) * Math.cos(Math.PI / 180 * shape.rotation) -
            (shape.width / 2) * Math.sin(Math.PI / 180 * shape.rotation)
    };
}

/* 
    Take an item and insert into proper layerTransform group. 
    deviceId e.g. roomBar found in devices.  
  attrs { x: x, y: y, rotation: rotation }
  Insert based on un-scaled values. 
  if UUID does not exist, create one for the object

*/
function updateShapesBasedOnNewScale() {
    nodeNumber += 1;
    let oldScale, oldPxOffset, oldPyOffset;
    /* data_scale keeps track of the scale of the stage related to units of metric/feet */
    if (!('data_scale' in stage)) {
        oldScale = layerTransform.data_scale;
        oldPxOffset = layerTransform.data_pxOffset;
        oldPyOffset = layerTransform.data_pyOffset;

        updateNodeScale(layerTransform);
        // updateNodeScale(grShadingMicrophone); 
        // updateNodeScale(grShadingCamera); 
        // updateNodeScale(grShadingSpeaker);
        // updateNodeScale(grDisplayDistance);  

        function updateNodeScale(layer) {

            layer.getChildren().forEach((parentGroup) => {

                let theObjects = parentGroup.getChildren();

                theObjects.forEach(node => {
                    let attrs = node.attrs;

                    if ('x' in attrs) {

                        let newX = pxOffset + ((scale / oldScale) * (node.x() - oldPxOffset));
                        node.x(newX);
                    }

                    /* for the shading_group, scaling works. */
                    if ('name' in attrs) {
                        if (attrs.name === 'shading_group') {
                            let newScaleX = scale / oldScale * node.scaleX();
                            let newScaleY = scale / oldScale * node.scaleY();
                            node.scaleX(newScaleX);
                            node.scaleY(newScaleY);
                        }
                    }

                    if ('y' in attrs) {
                        let newY = pyOffset + ((scale / oldScale) * (node.y() - oldPyOffset));
                        node.y(newY);
                    }

                    if ('height' in attrs) {
                        let newHeight = scale / oldScale * node.height();
                        node.height(newHeight);
                    }

                    if ('width' in attrs) {
                        let newWidth = scale / oldScale * node.width();
                        node.width(newWidth);
                    }

                    if ('radius' in attrs) {
                        let newRadius = scale / oldScale * node.radius();
                        node.radius(newRadius);
                    }

                    if ('fillRadialGradientEndRadius' in attrs) {
                        let newFillRadialGradientEndRadius = scale / oldScale * node.fillRadialGradientEndRadius();
                        node.fillRadialGradientEndRadius(newFillRadialGradientEndRadius);
                    }

                });

            })
        }
    }

    layerTransform.data_scale = scale;
    layerTransform.data_pxOffset = pxOffset;
    layerTransform.data_pyOffset = pyOffset;


}

/* Item is updated after clicking Update item on web page from Details tab */
function updateItem() {
    let width = document.getElementById('itemWidth').value;
    let heigth = document.getElementById('itemLength').value;
    let data_diagonalInches = document.getElementById('itemDiagnoalTv').value;
    let x = document.getElementById('itemX').value;
    let y = document.getElementById('itemY').value;
    let name = document.getElementById('itemName').value;

    let rotation = document.getElementById('itemRotation').value;

    let data_deviceid = document.getElementById('itemType').innerText;
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;


    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            if ('x' in item) {
                item.x = x;
            }

            if ('y' in item) {
                item.y = y;
            }

            if ('width' in item) {
                item.width = width;
            }

            if ('height' in item) {
                item.height = heigth;
            }

            if (parentGroup === 'displays') {
                item.data_diagonalInches = data_diagonalInches;
            };

            if ('data_diagonalInches' in item) {
                item.data_diagonalInches = data_diagonalInches;
            }

            item.rotation = rotation;

            /* come back to updating name later as it will take more coding to transfer to copy link URL */
            /*  item.name or item.data_name 
            
            if ('name' in item){
                item.name = name; 
            }
            
            */

            if (document.getElementById('isPrimaryCheckBox').disabled === false && document.getElementById('isPrimaryCheckBox').checked === true) {
                arrayMove(roomObj.items[parentGroup], index, 0);

            }




            drawRoom(true, true);

            setTimeout(() => {
                updateFormatDetails(id);
                tr.nodes([stage.find('#' + id)[0]]);
                enableCopyDelBtn();
            }, 100);

            return;


        }
    });

}

/*
   Moves an object from one part of the array to another.  
   Code from https://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
*/
function arrayMove(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
};



/* shapes that have x: or y: less than 0 for all four corners will be deleted */
function deleteNegativeShapes() {

    let transformGroups = layerTransform.getChildren();

    transformGroups.forEach((group) => {
        let groupName = group.name();
        if (!(groupName === 'theTransformer' || groupName === 'grShadingMicrophone' || groupName === 'grShadingCamera' || groupName === 'grDisplayDistance' || groupName === 'grShadingSpeaker')) {

            deleteNegShapeGroups(group);
        }
    })


    function deleteNegShapeGroups(parentGroup) {
        let theObjects = parentGroup.getChildren();

        theObjects.forEach(node => {

            let attrs = node.attrs;
            let height = 0;
            let width = 0;

            if ('height' in attrs) {
                height = attrs.height;
            }

            if ('width' in attrs) {
                width = attrs.width;
            }

            let corners = [];

            // Now get the 4 corner points
            corners[0] = { x: 0, y: 0 }; // top left
            corners[1] = { x: width, y: 0 }; // top right
            corners[2] = { x: width, y: height }; // bottom right
            corners[3] = { x: 0, y: height }; // bottom left

            // And rotate the corners using the same transform as the rect.
            for (let i = 0; i < 4; i++) {
                // Here be the magic
                corners[i] = node.getAbsoluteTransform().point(corners[i]); // top left

            }

            if ((corners[0].x < 1 && corners[1].x < 1 && corners[2].x < 1 && corners[3].x < 1)
                || (corners[0].y < 1 && corners[1].y < 1 && corners[2].y < 1 && corners[3].y < 1)) {

                let audioShading = stage.find('#audio~' + node.id())[0];
                let videoShading = stage.find('#fov~' + node.id())[0];

                node.destroy();
                if (audioShading) {
                    audioShading.destroy();
                }

                if (videoShading) {
                    videoShading.destroy();
                }

                /* destroying nodes takes time */

                // setTimeout(()=>{
                //     canvasToJson();    
                // }, 10); 

            }

        });
    }
}

function insertShapeItem(deviceId, groupName, attrs, uuid = '', selectTrNode = false) {

    let hitStrokeWidth = 15; /* px:  always the user to be close within X pixels to click on shape */

    /* each shape gets a unique uuid for tracking.  This UUID is also in the roomObj JSON and not recreated if it exists */
    if (uuid === '') {
        uuid = createUuid();
    }

    /* scale the attrs to fit grid */
    let pixelX = scale * attrs.x + pxOffset;
    let pixelY = scale * attrs.y + pyOffset;

    let insertDevice = {};
    let group;
    let width, height, rotation;
    let abbrUnit = 'm';  /* abbreviated unit - will be m for meters, f for feet. Inserted in the shape rendering. */

    if (unit === 'feet') {
        abbrUnit = 'ft'
    }

    /* 
        Check if deviceId is in group tables 
        if a table, break out of this and go to insertTable 
    */
    if (groupName === 'tables') {
        for (const device of tables) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupTables;
                break;
            }
        }
        insertTable(insertDevice, groupName, attrs, uuid, selectTrNode)
        return;
    }

    /* check dragId in microphones */
    if (groupName === 'microphones') {
        for (const device of microphones) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupMicrophones;
                break;
            }
        }
    }

    /* check dragId in videoDevices */
    if (groupName === 'videoDevices') {
        for (const device of videoDevices) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupVideoDevices;
                break;
            }
        }
    }

    if (groupName === 'displays') {
        for (const device of displays) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupDisplays;
                break;
            }
        }
    }

    if (groupName === 'chairs') {
        for (const device of chairs) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupChairs;
                break;
            }
        }
    }

    if (groupName === 'shapes') {
        /*
        for (const device of shapes) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupShapes;
                break;
            }
        }
        */
    }

    if (groupName === 'speakers') {
        /*
        for (const device of speakers) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupSpeakers;
                break;
            }
        }
        */
    }


    if (groupName === 'touchPanels') {
        /*
         for (const device of touchPan) {
             if (device.id === deviceId) {
                 insertDevice = device;
                 group = groupTouchPanel;
                 break;
             }
         }
         */
    }


    tr.resizeEnabled(false);
    // convert mm to meters * sclae
    width = insertDevice.width / 1000 * scale;

    height = insertDevice.depth / 1000 * scale;

    if (unit === 'feet') {
        width = width * 3.28084;
        height = height * 3.28084;
    }

    if ('rotation' in attrs) {
        rotation = attrs.rotation;
    } else {
        rotation = 0;
    }

    // need to move Display calculations here: 
    let data_diagonalInches = 0;


    if ('data_diagonalInches' in attrs) {
        data_diagonalInches = attrs.data_diagonalInches;
    }
    else if ('diagonalInches' in insertDevice) {
        data_diagonalInches = insertDevice.diagonalInches;
        attrs.data_diagonalInches = data_diagonalInches;
    }

    /*
        Calculate width of displays based on Diagonal inches.  
    */
    let displayNumber = 1;
    if (groupName === 'displays') {

        if (deviceId === 'displaySngl') {
            displayNumber = 1;
        }
        else if (deviceId === 'displayDbl') {
            displayNumber = 2;
        }
        else if (deviceId === 'displayTrpl') {
            displayNumber = 3;
        }

        width = (displayWidth / diagonalInches) * data_diagonalInches / 1000 * scale * displayNumber; /* height is displayDepth, which is constant regardless of diagnol inches */

        height = displayDepth / 1000 * scale;  /* height is displayDepth, which is constant regardless of diagnol inches */

        if (unit === 'feet') {
            width = width * 3.28084;
            height = height * 3.28084;
        }

    }


    /* 
        Testing scaling up the microphones and videodevices so they can be found 
        Items that are displays and table items should not be scaled. 
    */

    /*
    let scaleMin = 20;
    let scaleMinFactor = 1; 
    if (unit === 'meters'){
        scaleMin = scaleMin * 3.28084; 
    }
    if (scale < scaleMin) {
    if (!('data_diagonalInches' in attrs)){
            scaleMinFactor = scaleMin / scale;
            width = width * scaleMinFactor; 
            height = height * scaleMinFactor;
        }
    }
    */


    //convert to upper left pixel position before conversion 
    let cornerXY = findUpperLeftXY({ x: pixelX, y: pixelY, rotation: rotation, width: width, height: height });


    let imageObj = new Image();
    imageObj.onload = function () {
        let imageItem = new Konva.Image({
            x: cornerXY.x,
            y: cornerXY.y,
            image: imageObj,
            width: width,
            height: height,
            id: uuid,
            draggable: true,
            rotation: rotation,
        });

        imageItem.hitStrokeWidth(hitStrokeWidth); // don't need to be close to the image to be selected

        imageItem.data_deviceid = deviceId;

        if ('scaleX' in attrs) {
            imageItem.scaleX = attrs.scaleX;
        };

        if ('scaleY' in attrs) {
            imageItem.scaleX = attrs.scaleX;
        };

        if ('data_diagonalInches' in attrs) {
            imageItem.data_diagonalInches = data_diagonalInches;
        }

        if ('name' in insertDevice) {
            imageItem.name(insertDevice.name);
        }

        if ('opacity' in insertDevice) {
            imageItem.opacity(insertDevice.opacity);
        }

        imageItem.on('dragend', function () {
            canvasToJson();
        });

        imageItem.on('transformstart', function () {

        });

        imageItem.on('dragmove', function (e) {
            updateShading(imageItem);

            /* in case the dragged item is not the tr.node, make it the tr.node */

            if (!tr.nodes().includes(e.target)) {
                tr.nodes([e.target]);
                enableCopyDelBtn();
                /* tables and other objects maybe resizable. */
                if (e.target.getParent() === groupTables) {
                    tr.resizeEnabled(true);
                } else {
                    tr.resizeEnabled(false);
                }
            }

            if (e.target.attrs.id) {
                if (tr.nodes().length === 1) {
                    updateFormatDetails(e);
                }
            }

        });

        imageItem.on('mousedown touchstart', function (e) {

            if (panScrollableOn) {
                e.evt.preventDefault();
                return;
            }

            updateShading(imageItem);

        });

        imageItem.on('transform', function () {
            updateShading(imageItem);
        });

        imageItem.on('transformend', function () {

        });

        imageItem.on('mousemove touchmove', (e) => {

        });

        // add the shape to the layer
        group.add(imageItem);
        updateShading(imageItem);

        if (selectTrNode) {

            tr.nodes([imageItem]);
            enableCopyDelBtn();
            /* add delay before updateFormatDetails to give time for object to be inserted and roomObj JSON to be updated */
            setTimeout(() => {
                updateFormatDetails(uuid)
            }, 500);
        }

    };
    imageObj.src = './assets/' + insertDevice.topImage;

    /* add shading for cameras */
    if ('wideHorizontalFOV' in insertDevice) {

        let groupFov = new Konva.Group({
            id: 'fov~' + uuid,
            x: pixelX,
            y: pixelY,
            listening: false,
            rotation: 0,
            name: 'shading_group',
        })


        let teleAngle;
        /* teleFullWidth is for multi-lense devices like the Quad Camera were the combined teleAngle equals the wide FOV. */
        if (insertDevice.teleFullWidth) {
            teleAngle = insertDevice.wideHorizontalFOV;
        } else {
            teleAngle = insertDevice.teleHorizontalFOV;
        }

        let onePersonCrop = defaultOnePersonCrop;
        let twoPersonCrop = defaultTwoPersonCrop;

        if (unit == 'feet') {
            /* feet  */
            twoPersonCrop = twoPersonCrop * 3.28084;
            onePersonCrop = onePersonCrop * 3.28084;

        }


        let onePersonDistance = getDistanceA(insertDevice.teleHorizontalFOV / 2, onePersonCrop / 2) * insertDevice.onePersonZoom;

        let twoPersonDistance = getDistanceA(insertDevice.teleHorizontalFOV / 2, twoPersonCrop / 2) * insertDevice.twoPersonZoom;

        let gradientRatio = onePersonDistance / twoPersonDistance;

        let gradientStop1 = gradientRatio * 0.9;

        let gradientStop2 = gradientRatio * 1.1;

        let onePersonCropColor = "#8FBC8B"
        let twoPersonCropColor = "#87aeed";

        let wideFOV = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: twoPersonDistance * scale * 1.3,
            angle: insertDevice.wideHorizontalFOV,
            fill: 'yellow',
            stroke: 'black',
            strokeWidth: 1,
            name: 'wFOV-' + deviceId + '-' + groupName,
            rotation: -insertDevice.wideHorizontalFOV / 2 + 90,
            opacity: 0.1,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
        });

        let teleTwoPersonFOV = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            opacity: 0.55,
            radius: twoPersonDistance * scale,
            angle: teleAngle,
            stroke: '#0000004D',
            strokeWidth: 1,
            name: 'singleTeleFOV' + deviceId + '-' + groupName,
            rotation: 0 - teleAngle / 2 + 90,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,

            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint: { x: 0, y: 0 },
            fillRadialGradientEndRadius: twoPersonDistance * scale,
            fillRadialGradientColorStops: [0, onePersonCropColor, gradientStop1, onePersonCropColor, gradientStop2, twoPersonCropColor, 1, twoPersonCropColor + '64'],

        });

        let txtTwoPersonFov = new Konva.Text({
            x: -1000,
            y: twoPersonDistance * scale - 15,
            width: 2000,
            text: '2 person zoom: ' + twoPersonDistance.toFixed(1) + ' ' + abbrUnit + ' to camera',
            fontSize: 12,
            fill: '#6495ED',
            padding: 3,
            align: 'center',
        });

        let teleOnePersonFOV = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            opacity: 0.3,
            radius: onePersonDistance * scale,
            angle: teleAngle,
            stroke: '#0000004D',
            strokeWidth: 1,
            name: 'singleTeleFOV' + deviceId + '-' + groupName,
            rotation: -teleAngle / 2 + 90,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
        });

        let txtOnePersonFov = new Konva.Text({
            x: -1000,
            y: onePersonDistance * scale - 15,
            width: 2000,
            text: '1 person zoom: ' + onePersonDistance.toFixed(1) + ' ' + abbrUnit + ' to camera',
            fontSize: 12,
            fill: '#023020',
            padding: 3,
            align: 'center',
        });


        groupFov.add(wideFOV);


        groupFov.add(teleTwoPersonFOV);

        groupFov.add(teleOnePersonFOV);

        groupFov.add(txtOnePersonFov);

        groupFov.add(txtTwoPersonFov);

        grShadingCamera.add(groupFov);

    }


    if ('micRadius' in insertDevice) {

        let groupAudioShading = new Konva.Group({
            id: 'audio~' + uuid,
            x: pixelX,
            y: pixelY,
            listening: false,
            rotation: 0,
            name: 'shading_group',
        })

        let micRadius = insertDevice.micRadius / 1000 * scale;

        let lblMicRadius = insertDevice.micRadius / 1000;

        if (unit === 'feet') {
            micRadius = micRadius * 3.28084;
            lblMicRadius = lblMicRadius * 3.28084;
        }

        let audioShading = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: micRadius,
            angle: insertDevice.micDeg,
            stroke: 'black',
            strokeWidth: 1,
            name: 'audio-' + deviceId + '-' + groupName,
            rotation: 90 - insertDevice.micDeg / 2,
            opacity: 0.3,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
            opacity: 0.3,
            stroke: '#00000080',
            strokeWidth: 1,
            radius: micRadius,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint: { x: 0, y: 0 },
            fillRadialGradientEndRadius: micRadius,
            fillRadialGradientColorStops: [0, 'purple', 0.8, '#800080', 1, '#80008000'],
        });




        let txtAudio = new Konva.Text({
            x: -1000,
            y: micRadius - 10,
            width: 2000,
            text: lblMicRadius.toFixed(1) + ' ' + abbrUnit + ' from mic',
            fontSize: 12,
            fill: 'purple',
            padding: 3,
            align: 'center',
        });

        groupAudioShading.add(audioShading);
        groupAudioShading.add(txtAudio);
        grShadingMicrophone.add(groupAudioShading);
    }

    /* Add shading lines for a display */
    if (data_diagonalInches > 0) {

        let groupItemDisplayDistance = new Konva.Group({
            id: 'dispDist~' + uuid,
            x: pixelX,
            y: pixelY,
            listening: false,
            rotation: 0,
            name: 'shading_group',
        })



        /* closest distance line */
        let widthRatio = 1 * displayNumber;
        let diagonalUnit = data_diagonalInches / 12;
        if (unit === 'meters') {
            diagonalUnit = diagonalUnit / 3.28084;
        }

        let xc1 = -diagonalUnit * scale * widthRatio;
        let distance1 = diagonalUnit * scale;
        let xc2 = diagonalUnit * scale * widthRatio;

        let purpleLine = new Konva.Line({
            points: [xc1, distance1, xc2, distance1],
            stroke: 'purple',
            strokeWidth: 2,
            lineJoin: 'round',
            dash: [5, 5],
        });

        let txt1xFromDisplay = new Konva.Text({
            x: -1000,
            y: distance1,
            text: 'Ideal closest participant to display: ' + diagonalUnit.toFixed(1) + ' ' + abbrUnit,
            fontSize: 12,
            fill: 'purple',
            align: 'center',
            width: 2000,
            padding: 3,
            align: 'center',
        });

        let greenLine = new Konva.Line({

            points: [xc1 * 3, distance1 * 3, xc2 * 3, distance1 * 3],
            stroke: 'green',
            strokeWidth: 2,
            lineJoin: 'round',
            dash: [5, 5],
        });

        let txt3xFromDisplay = new Konva.Text({
            x: -1000,
            y: distance1 * 3,
            text: 'Ideal farthest participant from display: ' + (diagonalUnit * 3).toFixed(1) + ' ' + abbrUnit,
            fontSize: 12,
            fill: 'green',
            align: 'center',
            width: 2000,
            padding: 3,
            align: 'center',
        });

        let redLine = new Konva.Line({
            points: [xc1 * 4, distance1 * 4, xc2 * 4, distance1 * 4],
            stroke: 'red',
            strokeWidth: 2,
            lineJoin: 'round',
            dash: [5, 5],
        });

        let txt4xFromDisplay = new Konva.Text({
            x: -1000,
            y: distance1 * 4,
            text: 'Max farthest participant from display: ' + (diagonalUnit * 4).toFixed(1) + ' ' + abbrUnit,
            fontSize: 12,
            fill: '#C41E3A',
            align: 'center',
            width: 2000,
            padding: 3,
            align: 'center',
        });

        groupItemDisplayDistance.add(redLine);
        groupItemDisplayDistance.add(greenLine);
        groupItemDisplayDistance.add(purpleLine);
        groupItemDisplayDistance.add(txt1xFromDisplay);
        groupItemDisplayDistance.add(txt3xFromDisplay);
        groupItemDisplayDistance.add(txt4xFromDisplay);
        imageDataUrl = groupItemDisplayDistance.toDataURL();
        grDisplayDistance.add(groupItemDisplayDistance);
    }

    function updateShading(imageItem) {

        let fovShading = stage.find(`#fov~${uuid}`);
        let audioShading = stage.find(`#audio~${uuid}`);
        let dispDistShading = stage.find(`#dispDist~${uuid}`)

        if (fovShading.length === 1) {
            moveShading(imageItem, fovShading[0]);
        }

        if (audioShading.length === 1) {
            moveShading(imageItem, audioShading[0]);
        }

        if (dispDistShading.length === 1) {
            moveShading(imageItem, dispDistShading[0]);
        }


        function moveShading(imageItem, shadingItem) {

            let center = getCenter(imageItem);
            let centerY = center.y;
            let centerX = center.x;

            if (insertDevice.id === 'ceilingMic') {
                centerX = (imageItem.height() / 2) * (Math.sin(imageItem.rotation() * Math.PI / 180)) + center.x;
                centerY = (imageItem.height() / 2) * -(Math.cos(imageItem.rotation() * Math.PI / 180)) + center.y;
            }

            if ('cameraShadeOffSet' in insertDevice) {

                let cameraShadeOffset = insertDevice.cameraShadeOffSet / 1000 * scale;

                if (unit === 'feet') {
                    cameraShadeOffset = cameraShadeOffset * 3.28084;
                }


                centerX = ((imageItem.height() / 2) - cameraShadeOffset) * -(Math.sin(imageItem.rotation() * Math.PI / 180)) + center.x;
                centerY = ((imageItem.height() / 2) - cameraShadeOffset) * (Math.cos(imageItem.rotation() * Math.PI / 180)) + center.y;
            }

            shadingItem.rotation(imageItem.rotation());

            shadingItem.x(centerX);
            shadingItem.y(centerY);

        }

    }

}

function getCenter(shape) {

    return {

        x:
            shape.x()
            + (shape.width() / 2) * Math.cos(Math.PI / 180 * shape.rotation())
            + (shape.height() / 2) * Math.sin(Math.PI / 180 * (-shape.rotation())),
        y:
            shape.y() +
            (shape.height() / 2) * Math.cos(Math.PI / 180 * shape.rotation()) +
            (shape.width() / 2) * Math.sin(Math.PI / 180 * shape.rotation())
    };
}



/* enableCopyButton is enacted anywhere tr.nodes([]) is used and changes from length=0 to lenth >0 */
function enableCopyDelBtn(e) {

    let divItemDetailsVisible = document.getElementById('itemDetailsVisible');
    let txtItemsDetailNote = document.getElementById('txtItemsDetailNote');

    if (tr.nodes().length > 0) {
        document.getElementById('btnCopy').disabled = false;
        document.getElementById('btnDelete').disabled = false;

    }
    else {
        document.getElementById('btnCopy').disabled = true;
        document.getElementById('btnDelete').disabled = true;

    }

    if (tr.nodes().length === 1) {
        divItemDetailsVisible.style.display = 'initial';
        txtItemsDetailNote.style.display = 'none';

    } else {
        divItemDetailsVisible.style.display = 'none';
        txtItemsDetailNote.style.display = 'initial';
    }

};

/*
    Rounds the number.  Default is to one-hundredth place, -2.  It drops trailing zeros if needed, unlike .toFixed() 
*/
function round(inNumber, place = -2) {
    let factor = 10 ** (-1 * place);
    return Math.round(inNumber * factor) / factor;
}

function updateQuickSetupItems(){
    let primaryVideoDevice = roomObj.items.videoDevices[0]; 
    let primaryTable = roomObj.items.tables[0]; 
    let primaryDisplay = roomObj.items.displays[0]; 

    if(primaryTable){
        document.getElementById('tableWidth').value = round(primaryTable.width); 
        document.getElementById('tableLength').value = round(primaryTable.height); 
    }

    if(primaryVideoDevice){

        document.getElementById('drpVideoDevice').value = primaryVideoDevice.data_deviceid; 
        videoDevices.forEach((item) => {
            if (primaryVideoDevice.data_deviceid == item.id) {
                let displayId;
                let frntWallToTv = document.getElementById('frntWallToTv'); 
                let distDisplayToTable = document.getElementById('distDisplayToTable'); 
                let offset = (item.depth / 1000) / 2;
                
                if ('displayOffSetY' in item) {
                    offset = offset - (item.displayOffSetY / 1000);
                }
    
                if (unit === 'feet') {
                    offset = offset * 3.2808;
                }

                frntWallToTv.value = round(primaryVideoDevice.y + offset);

                distDisplayToTable.value = round(primaryTable.y - (primaryVideoDevice.y + offset)); 
    
                if ('diagonalInches' in item) {
                    primaryDeviceIsAllInOne = true;
                    document.getElementById('tvDiag').value = item.diagonalInches; 
                    document.getElementById('drpTvNum').value = '1'; 
                    /* Room Kit EQX always has 2 displays */ 
                    if(primaryVideoDevice.data_deviceid.startsWith('roomKitEqx')){
                        document.getElementById('drpTvNum').value = '2'; 
                    }
                } else {
                    primaryDeviceIsAllInOne = false;

                    document.getElementById('tvDiag').value = primaryDisplay.data_diagonalInches; 

                    if(primaryDisplay.data_deviceid === 'displaySngl'){
                        document.getElementById('drpTvNum').value = '1'; 
                    } 
                    else if (primaryDisplay.data_deviceid === 'displayDbl'){
                        document.getElementById('drpTvNum').value = '2'; 

                    }
                    else if (primaryDisplay.data_deviceid === 'displayDbl'){
                        document.getElementById('drpTvNum').value = '3'; 
                    }

                }
            }
        });

    }
}

function updateFormatDetails(eventOrShapeId) {

    let shape;

    if (typeof eventOrShapeId === 'string') {
        shape = stage.find('#' + eventOrShapeId)[0];
    } else {
        shape = eventOrShapeId.target;
    }

    let id = shape.attrs.id;
    let parentGroup = shape.getParent().name();

    if (parentGroup === 'tables') {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = false;
    } else {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = true;
    }

    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            let x, y;

            let isPrimaryDiv = document.getElementById('isPrimaryDiv');
            let isPrimaryLabel = document.getElementById('isPrimaryLabel');
            let isPrimaryCheckBox = document.getElementById('isPrimaryCheckBox');

            isPrimaryCheckBox.disabled = true;
            isPrimaryCheckBox.checked = false;
            isPrimaryDiv.style.display = 'none';

            if (parentGroup === 'tables') {
                x = shape.x();
                y = shape.y();

            } else {
                let xy = getCenter(shape);
                x = xy.x;
                y = xy.y;
            }

            if (parentGroup === 'displays') {
                document.getElementById('itemDiagnoalTvDiv').style.display = 'initial';
                document.getElementById('itemDiagnoalTv').value = shape.data_diagonalInches;
            } else {
                document.getElementById('itemDiagnoalTvDiv').style.display = 'none';
            }

            if (parentGroup === 'videoDevices' || parentGroup === 'displays' || parentGroup === 'tables') {
                isPrimaryDiv.style.display = 'initial';
                if (index === 0) {
                    isPrimaryCheckBox.checked = true;
                } else {
                    isPrimaryCheckBox.disabled = false;
                }

                if (parentGroup === 'videoDevices') {
                    isPrimaryLabel.innerText = 'Is primary video device?';
                }
                else if (parentGroup === 'displays') {
                    isPrimaryLabel.innerText = 'Is primary display?';
                }
                else if (parentGroup === 'tables') {
                    isPrimaryLabel.innerText = 'Is primary table?';
                }
            }

            document.getElementById('itemX').value = round((x - pxOffset) / scale);

            document.getElementById('itemY').value = round((y - pyOffset) / scale);

            document.getElementById('itemId').innerText = item.id;

            document.getElementById('itemType').innerText = item.data_deviceid;

            document.getElementById('itemGroup').innerText = parentGroup;

            if ('name' in item) {
                document.getElementById('itemName').value = shape.attrs.name;
            } else {
                document.getElementById('itemName').value = '';
            }

            if ('width' in item) {
                document.getElementById('itemWidth').value = round(shape.width() / scale);
            } else {
                document.getElementById('itemWidth').value = 0;
            }

            if ('height' in item) {
                document.getElementById('itemLength').value = round(shape.height() / scale);
            } else {
                document.getElementById('itemLength').value = 0;
            }

            if ('rotation' in shape.attrs) {

                document.getElementById('itemRotation').value = round(shape.rotation(), -1);
            }

            return;
        }
    })

}


/*
    On touch devices if the browser is zoomed and the user is inselect mode on the canvas, it is possible 
    to get stuck on the canvas and now way to scroll, touchmove or zoom out.  Clicking 4-6 times quickly on an iOS device
    will allow it set the proper web zoom.  No idea how this works on an android device.

    Only registers if:  !(mobileDevice === 'false' || mobileDevice === 'RoomOS')
*/
function countConsectiveTouches() {
    let timeBetweenTouches = 1000; /* in ms */
    let totalTouches = 2;

    touchConsecutiveCount = touchConsecutiveCount + 1;

    if (totalTouches < touchConsecutiveCount) {
        document.body.style.zoom = "100%";
        toggleSelectPan();
        touchConsecutiveCount = 0;
        alert('Toggle between Pan & Select activated after 4-6 quick clicks.');
    }
    clearTimeout(touchConsectiveCoutTimer);
    touchConsectiveCoutTimer = setTimeout(() => {
        touchConsecutiveCount = 0;
    }, timeBetweenTouches);
}

function addListeners(stage) {

    let x1, y1, x2, y2;
    let selecting = false;

    stage.on('dblclick dbltap', (e) => {

        if (!(mobileDevice === 'false' || mobileDevice === 'RoomOS')) {
            countConsectiveTouches();
        }
        document.getElementById("tabItem").click();

    });

    stage.on('mousedown touchstart', (e) => {

        if (e.target.findAncestor('.layerTransform')) {
            return;
        }

        // tr.resizeEnabled(false);

        if (panScrollableOn) {
            return;
        }

        e.evt.preventDefault();

        x1 = stage.getPointerPosition().x / zoomScaleX;
        y1 = stage.getPointerPosition().y / zoomScaleY;
        x2 = stage.getPointerPosition().x / zoomScaleX;
        y2 = stage.getPointerPosition().y / zoomScaleY;

        selectionRectangle.width(0);
        selectionRectangle.height(0);
        selecting = true;

    });

    stage.on('mousemove touchmove', (e) => {

        if (!selecting) {
            return;
        }

        if (panScrollableOn) {
            return;
        }

        e.evt.preventDefault();
        tr.resizeEnabled(false);
        x2 = stage.getPointerPosition().x / zoomScaleX;
        y2 = stage.getPointerPosition().y / zoomScaleY;

        selectionRectangle.setAttrs({
            visible: true,
            x: Math.min(x1, x2) + dx / zoomScaleX,
            y: Math.min(y1, y2) + dy / zoomScaleY,
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
        });
    });

    stage.on('mouseup touchend', (e) => {

        canvasToJson();

        selecting = false;

        if (!selectionRectangle.visible()) {
            return;
        }
        e.evt.preventDefault();
        /* update selectionRectangle visibility in setTimeout, so we can check it is in the click event */
        setTimeout(() => {
            selectionRectangle.visible(false);
        }, 1);

        let shapes = groupVideoDevices.getChildren();

        shapes = shapes.concat(groupDisplays.getChildren());

        shapes = shapes.concat(groupMicrophones.getChildren());

        shapes = shapes.concat(groupShapes.getChildren());

        shapes = shapes.concat(groupSpeakers.getChildren());

        shapes = shapes.concat(groupTables.getChildren());

        shapes = shapes.concat(groupTouchPanel.getChildren());

        shapes = shapes.concat(groupChairs.getChildren());

        var box = selectionRectangle.getClientRect();

        var selected = shapes.filter((shape) => Konva.Util.haveIntersection(box, shape.getClientRect()));

        tr.nodes(selected);

        if (selected.length === 1 && selected[0].getParent().name() === 'tables') {
            /* if there is a single table, make it resizable */
            tr.resizeEnabled(true);
        }
        enableCopyDelBtn();
    });

    // clicks should select/deselect shapes
    stage.on('click tap', function (e) {

        if (e.target.attrs.id) {
            if (tr.nodes().length === 1) {
                updateFormatDetails(e);
                
            }
        }

        if (selecting) {
            return;
        }

        if (selectionRectangle.visible()) {

            return;
        }

        if (!e.target.draggable()) {

            tr.resizeEnabled(false);
            tr.nodes([]);
            enableCopyDelBtn();
            return;
        }

        // do we pressed shift or ctrl?
        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = tr.nodes().indexOf(e.target) >= 0;

        if (!metaPressed && !isSelected) {
            /* if no key pressed and the node is not selected */
            tr.nodes([e.target]);

            /* tables and other objects maybe resizable. */
            if (e.target.getParent() === groupTables) {
                tr.resizeEnabled(true);
            } else {
                tr.resizeEnabled(false);
            }

        } else if (metaPressed && isSelected) {
            /* if we pressed keys and node was selected
             we need to remove it from selection: */

            const nodes = tr.nodes().slice(); /* use slice to have new copy of array */
            /* remove node from array */
            nodes.splice(nodes.indexOf(e.target), 1);
            tr.nodes(nodes);
            enableCopyDelBtn();

        } else if (metaPressed && !isSelected) {
            /* add the node into selection */

            const nodes = tr.nodes().concat([e.target]);
            tr.nodes(nodes);
            enableCopyDelBtn();
        }

        enableCopyDelBtn();
    });

    tr.on('transform', (e) => {

        let scaleX = e.target.scaleX();
        let scaleY = e.target.scaleY();

        if (tr.nodes().length === 1 && !(scaleX === 1 || scaleY === 1)) {

            let width = e.target.width();
            let height = e.target.height();
            width = width * scaleX;
            height = height * scaleY;

            e.target.scaleX(1);
            e.target.scaleY(1);
            e.target.width(width);
            e.target.height(height);
            e.target.draw();

        }

        updateFormatDetails(e);

    });

}

let draggedElementId;
let draggedElement;
let tempClass; /* used for Safari.  When dragStart, remove the class on the target item, then add back in on drop. */

function dragStart(event) {
    /** Firefox on Windows requires the event.originalEvent.dataTransfer.setData be used. The following command really doesn't do anything except allow for drag to work. */
    event.dataTransfer.setData("text/plain", event.target.id)
    event.dataTransfer.effectAllowed = "copy";
    draggedElementId = event.target.id;

    /* Safari drags the whole DIV by default and doesn't like event.dataTransfer.setDragImage, therefore temporarily removing the CSS class and then adding back in ondrag. */

    /*  come back to this later; 
    if (isSafari) {

        draggedElement = event.target;
        tempClass = draggedElement.className;
        draggedElement.className = 'flexItemsTemp'; 
        draggedElement.width = width;
    }
    */

    /* Using css element :hover when user hovers over choice, but on drag the hover background is carried with Chrome. Therefore, reset the hover image so background is transparent. */
    if (navigator.userAgent.match(/Chrome/i) || navigator.userAgent.match(/Firefox/i)) {
        const img = new Image();
        img.id = 'dragging-image';
        img.src = event.target.children[0].src;
        img.draggable = true;
        event.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
    }
}

/* Safari does not report the correct X, Y coord at the end of an HTML ondragend event, but does giver correct X, Y for dragevent
 therefore use last known dragevent X,Y */
let dragClientX;
let dragClientY;

function drag(event) {

    event.preventDefault();
    dragClientX = event.clientX;
    dragClientY = event.clientY;

    /* come back to later
    if (isSafari && draggedElement.className === 'flexItemsTemp') {
        draggedElement.className = tempClass;
    }
    */

    let canvasDiv = document.getElementById('canvasDiv');

    /* scroll down if Canvas is below the dragged element */
    let rect = canvasDiv.getBoundingClientRect();
    if (((rect.top) * 0.8) > dragClientY) {

        window.scroll({
            top: rect.top,
            behavior: "smooth",
        }
        );
    }
}

function dragEnd(event) {
    if (event.target.id === '') {
        /*  event.target.id is just an empty string.  Abort! */
        return;
    }
    let canvas = document.getElementById('canvasDiv');
    let canvasBound = canvas.getBoundingClientRect();

    dx = scrollContainer.scrollLeft;
    dy = scrollContainer.scrollTop;

    if ('clientX' in event && !isSafari) {
        dragClientX = event.clientX;
        dragClientY = event.clientY;
    }

    let canvasPixelX = (dragClientX - canvasBound.x + dx) / zoomScaleX;
    let canvasPixelY = (dragClientY - canvasBound.y + dy) / zoomScaleY;

    let unitX = (canvasPixelX - pxOffset) / scale;
    let unitY = (canvasPixelY - pxOffset) / scale;

    let deviceIdGroupName = event.target.id.split('-');

    if (canvasPixelX < 10 || canvasPixelY < 10) return; // break out funciton and do not insert image if the X or Y coordinate is negative

    let attrs = { x: unitX, y: unitY };

    insertShapeItem(deviceIdGroupName[1], deviceIdGroupName[0], attrs, uuid = '', true);

    dragClientX = 0;
    dragClientY = 0;
    setTimeout(() => { canvasToJson() }, 100);
}

/* Prevent default value on canvas */
function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    if (navigator.userAgent.match(/Firefox/i)) {
        dragEnd(event, true);
    }

}

function createItemsOnMenu(divMenuContainerId, menuItems, groupName, jsonGroup) {
    let divMenuContainer = document.getElementById(divMenuContainerId);
    let frontImage = 'frontImage.png';
    let name = 'No Name';

    menuItems.forEach((menuItem) => {

        jsonGroup.forEach((item) => {
            if (menuItem === item.id) {
                if ('frontImage' in item) {
                    frontImage = item.frontImage;

                }

                if ('name' in item) {
                    name = item.name;
                }
            }
        });

        let flexItemDiv = document.createElement("div");
        flexItemDiv.classList.add('flexItems');
        flexItemDiv.id = `${groupName}-${menuItem}-div`;
        flexItemDiv.draggable = 'true';
        divMenuContainer.appendChild(flexItemDiv);

        let flexItemImage = document.createElement("img");
        flexItemImage.classList.add('flexSubItemImage');
        flexItemImage.id = `${groupName}-${menuItem}-img`;
        flexItemImage.draggable = 'true';
        flexItemImage.src = `./assets/${frontImage}`;
        flexItemDiv.appendChild(flexItemImage);

        let labelDiv = document.createElement("div");
        labelDiv.classList.add('flexSubItemLabel');
        labelDiv.innerText = name;
        flexItemDiv.appendChild(labelDiv);

        flexItemDiv.addEventListener('dragstart', dragStart);
        flexItemDiv.addEventListener('drag', drag);
        flexItemDiv.addEventListener('dragend', dragEnd);

        flexItemDiv.addEventListener('touchstart', touchStart);
        flexItemDiv.addEventListener('touchmove', touchMove);
        flexItemDiv.addEventListener('touchend', touchEnd);

    });

}


let videoDevicesMenu = ['roomBar', 'roomBarPro', 'roomKitEqQuadCam', 'roomKitEqPtz4k', 'roomKitEqQuadPtz4k', 'roomKitProQuadCam'];

let videoDevicesAllin1Menu = ['roomKitEqx', 'roomKitEqxFS', 'brdPro55G2', 'brdPro75G2'];

let personalVideoDevicesMenu = ['webexDeskPro', 'webexDesk', 'webexDeskMini'];

let cameraDevicesMenu = ['ptz4k', 'quadCam', 'quadCamExt', 'quadPtz4kExt', 'roomKitEqQuadCamExt', 'rmBarProVirtualLens'];

let legacyVideoDevicesMenu = ['room55', 'rmKitMini', 'roomKit', 'cameraP60', 'boardPro55', 'boardPro75'];

let microphonesMenu = ['ceilingMicPro','tableMicPro', 'tableMic','ceilingMic'];

let displaysMenu = ['displaySngl', 'displayDbl', 'displayTrpl'];

let tablesMenu = ['tblRect', 'tblEllip', 'tblTrap'];

let chairsMenu = ['chair'];

createItemsOnMenu('cameraMenuContainer', videoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraMenuAllin1Container', videoDevicesAllin1Menu, 'videoDevices', videoDevices);

createItemsOnMenu('personalDevicesMenuContainer', personalVideoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraDevicesMenuContainer', cameraDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraLegacyMenuContainer', legacyVideoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('microphoneMenuContainer', microphonesMenu, 'microphones', microphones);

createItemsOnMenu('displaysMenuContainer', displaysMenu, 'displays', displays);

createItemsOnMenu('tablesMenuContainer', tablesMenu, 'tables', tables);

createItemsOnMenu('chairsMenuContainer', chairsMenu, 'chairs', chairs);

function touchStart(e) {

    touchesLength = e.touches.length;

    /* only allow 1 touch to start event */

    if (touchesLength != 1) {
        return;
    }
    e.preventDefault();
    /* create a new node to drag, then delete it on touchend */
    newInsertItem = e.target.children[0].cloneNode(true);
    newInsertItem.style.zIndex = 100;
    document.body.appendChild(newInsertItem);
    newInsertItem.style.position = 'absolute';
}

function touchMove(e) {
    if (touchesLength != 1) {
        return;
    }
    e.preventDefault();
    /* grab the location of touch */
    let touchLocation = e.targetTouches[0];

    newInsertItem.style.left = (touchLocation.pageX - newInsertItem.width / 2) + 'px';
    newInsertItem.style.top = (touchLocation.pageY - newInsertItem.height / 2) + 'px';

    dragClientX = touchLocation.clientX;
    dragClientY = touchLocation.clientY;
    newInsertItem.style.position = 'absolute';

    let canvasDiv = document.getElementById('canvasDiv');

    let rect = canvasDiv.getBoundingClientRect();

    /* scroll down automatically if selected device is being dragged down towards canvas.  Good for mobile devices. */
    if (((rect.top) * 0.8) > touchLocation.clientY) {
        window.scroll({
            top: rect.top,
            behavior: "smooth",
        }
        );
    }
}

function touchEnd(e) {

    dragEnd(e)
    document.body.removeChild(newInsertItem);
}

function addItemListeners(itemArray) {

    itemArray.forEach((item) => {
        let box = document.getElementById(item + '-div');
        let newInsertItem; // will be the item inserted on touchstart, touchmove and touchinsert

        box.addEventListener('dragstart', dragStart);
        box.addEventListener('drag', drag);
        box.addEventListener('dragend', dragEnd);

        box.addEventListener('touchstart', function (e) {

            e.preventDefault();
            // create a new node to drag, then delete it on touchend 
            newInsertItem = e.target.children[0].cloneNode(true);
            newInsertItem.style.zIndex = 1;
            document.body.appendChild(newInsertItem);
            newInsertItem.zIndex = 100;
            newInsertItem.style.position = 'absolute';
        })

        box.addEventListener('touchmove', function (e) {
            e.preventDefault();
            /* grab the location of touch */
            let touchLocation = e.targetTouches[0];

            newInsertItem.style.left = (touchLocation.pageX - newInsertItem.width / 2) + 'px';
            newInsertItem.style.top = (touchLocation.pageY - newInsertItem.height / 2) + 'px';

            dragClientX = touchLocation.clientX;
            dragClientY = touchLocation.clientY;
            newInsertItem.style.position = 'absolute';

            let canvasDiv = document.getElementById('canvasDiv');

            let rect = canvasDiv.getBoundingClientRect();

            /* scroll down automatically if device is being dragged down */
            if (((rect.top) * 0.8) > touchLocation.clientY) {
                window.scroll({
                    top: rect.top,
                    behavior: "smooth",
                }
                );
            }

        })

        /* record the position of the touch when released using touchend event. This will be the drop position. */
        box.addEventListener('touchend', function (event) {
            dragEnd(event)
            document.body.removeChild(newInsertItem);  /* Remove the temporary node  */

        })
    });
}


/* 
    Change stage.Width, stage.Height, stage.ScaleX and stage.ScaleY at the same time. 
    Performance hits are taken with a larger canvas, so decide Zoom level allowed based on device.
    Safari supports limited canvas sizes, so limit zoom size. 
    RoomOS can run into memory issues, so keep the canvas smaller.
    zoomChange is: + or - number, or 'in' or 'out' or 'reset' 
 */
function zoomInOut(zoomChange) {
    let scrollContainer = document.getElementById('scroll-container');
    let zoomValue = document.getElementById('zoomValue').textContent;
    zoomValue = zoomValue.replace(/%/, '');
    zoomValue = Number(zoomValue);

    if (zoomChange === 'in') {
        if (zoomValue >= 150) {
            zoomChange = -25;
        }
        else {
            zoomChange = -10;
        }
    }

    if (zoomChange === 'out') {
        if (zoomValue > 150) {
            zoomChange = 25;
        }
        else {
            zoomChange = 10;
        }
    }

    if (zoomChange === 'reset') {
        zoomChange = 0;
        zoomValue = 100;

    }
    else {
        zoomValue = zoomValue - zoomChange;
    }

    if (zoomValue < 50) {
        zoomValue = 50;
    }

    if (zoomValue > 400) {
        zoomValue = 400;
    }

    if (zoomValue > 250 && mobileDevice != 'false') {
        zoomValue = 250;
    }

    if (zoomValue > 150 && mobileDevice === 'RoomOS') {
        zoomValue = 150;
    }

    if (zoomValue > 100) {
        document.getElementById('btnSelectPan').disabled = false;
    } else {
        document.getElementById('btnSelectPan').disabled = true;
        document.getElementById('btnSelectPan').children[0].textContent = 'pan_tool';
        document.getElementById('btnSelectPan').children[0].style.color = '';
        document.getElementById("canvasDiv").style.cursor = "auto";

        panScrollableOn = false;
        panRectangle.hide();

    }

    zoomScaleX = zoomValue / 100;
    zoomScaleY = zoomValue / 100;

    stage.scaleX(zoomScaleX);
    stage.scaleY(zoomScaleY);
    stage.width(stageOriginalWidth * zoomScaleX);
    stage.height(stageOriginalLength * zoomScaleY);

    stage.draw();

    document.getElementById('zoomValue').textContent = String(zoomValue) + '%';
    layerGrid.draw();

    document.getElementById("large-container").style.width = stage.width() + 'px';
    document.getElementById("large-container").style.height = stage.height() + 'px';

    if (zoomValue <= 100) {
        scrollContainer.style.borderColor = 'white';
    } else {
        scrollContainer.style.borderColor = 'black';
    }

    if (zoomValue === 100) {
        scrollContainer.scrollLeft = 0;
        scrollContainer.scrollTop = 0;

    }

    resizePage();
}

function onScrollContainerScroll() {
    dx = scrollContainer.scrollLeft;
    dy = scrollContainer.scrollTop;
}

/* Set 'large-container' to stage width/height.  It will get larger when there is a scrollbar. */
document.getElementById("large-container").style.width = stage.width() + 'px';
document.getElementById("large-container").style.height = stage.height() + 'px';

function repositionStage() {
    dx = scrollContainer.scrollLeft;
    dy = scrollContainer.scrollTop;
    stage.container().style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    stage.x(-dx);
    stage.y(-dy);
}
scrollContainer.addEventListener('scroll', repositionStage);
repositionStage();

/* returns the type of object. Similar to typeof but more specific on objects */
function type(value) {
    if (value === null) {
        return "null";
    }
    const baseType = typeof value;
    // Primitive types
    if (!["object", "function"].includes(baseType)) {
        return baseType;
    }

    // Symbol.toStringTag often specifies the "display name" of the
    // object's class. It's used in Object.prototype.toString().
    const tag = value[Symbol.toStringTag];
    if (typeof tag === "string") {
        return tag;
    }

    // If it's a function whose source code starts with the "class" keyword
    if (
        baseType === "function" &&
        Function.prototype.toString.call(value).startsWith("class")
    ) {
        return "class";
    }

    // The name of the constructor; for example `Array`, `GeneratorFunction`,
    // `Number`, `String`, `Boolean` or `MyCustomClass`
    const className = value.constructor.name;
    if (typeof className === "string" && className !== "") {
        return className;
    }

    // At this point there's no robust way to get the type of value,
    // so we use the base implementation.
    return baseType;
}


/* 
    Cache Images so if internet is lost, insert images to canvas still works.
    May try to determine a way so images don't need to be cached to reduce file downloads. 
*/

function preLoadTopImages(list) {
    list.forEach((item) => {
        if ('topImage' in item) {
            let imageLocation = './assets/' + item.topImage;

            groupBackground.add();

            let imageObj = new Image();
            imageObj.onload = function () {
                var img = new Konva.Image({
                    x: 1,
                    y: 1,
                    image: imageObj,
                    width: 1,
                    height: 1,
                    visible: false,
                });

            };

            imageObj.src = imageLocation;

        }
    })
}

if (isCacheImages) {
    preLoadTopImages(videoDevices);
    preLoadTopImages(microphones);
    preLoadTopImages(displays);
    preLoadTopImages(chairs);
}

/* 
    Load QR code javascript.  QR code is only needed for RoomOS devices, therefore is only downloaded on request
*/



function setExternalScripts(src) {
    return new Promise((resolve, reject) => {
        const scriptTag = document.createElement('script');
        scriptTag.type = 'text/javascript';
        scriptTag.src = src;
        scriptTag.id = 'qrcodejs';
        scriptTag.onload = () => resolve();
        document.body.appendChild(scriptTag);
    });
}

async function loadQRCodeScript() {

    /* attribution: kazuhikoarase QR Code Generator: https://github.com/kazuhikoarase/qrcode-generator */
    
    const script = './js/qrcode.js';
    qrCodeAlwaysOn = true; 

    document.getElementById('btnQRcodeLoad').disabled = true;
    const scripts = [script];
    for (let i = 0; i < scripts.length; i++) {
        canvasToJson();
        document.getElementById('btnQRcodeLoad').disabled = true;

        await setExternalScripts(scripts[i]);

        createQrCode(); 

        

        createShareableLink(); 
    }
}

function createQrCode() {

 
 
        // let link = document.getElementById('shareLink').getAttribute('href');

        let typeNumber = 0;
        let errorCorrectionLevel = 'L';
        let qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(fullShareLink);
        qr.make();

        document.getElementById('qrCode').innerHTML = qr.createImgTag();

        /* 
            QR code library creates an img tag with width & height that changes with QR code. 
            Remove that height and width and have it fit in its parent div. 
        */ 

        let qrImage = document.getElementById('qrCode').firstChild; 
        qrImage.removeAttribute("width");
        qrImage.removeAttribute("height");
        qrImage.style.width = '50%'; 

        qrImage.style.filter = ''; 

        // let containerInputs = document.getElementById('ContainerInputs').; 

}


// clearUrlQueryString();

/* shorten the visible url */

function clearUrlQueryString() {
    const baseUrl = location.origin + location.pathname
    history.replaceState(null, null, baseUrl);
}


function loadTemplate(x) {
    resetRoomObj(); 
    parseShortenedXYUrl(x);
    drawRoom(true, true);
    const baseUrl = location.origin + location.pathname; 
    document.getElementById("defaultOpenTab").click();
    setTimeout(()=>{
        // history.replaceState(null, null, baseUrl);
        drawRoom();
        canvasToJson(); 
        let simpleTimeoput = setTimeOut(()=>{
            createShareableLink(); 
        }, 500); 
        

    }, 500);    
    
}

const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {

        
      const image = new Image();
      image.onload = function() {
        const konvaImage = new Konva.Image({
          image: image,
          x: pxOffset,
          y: pyOffset,
          height: stage.height(),
          opacity: 0.5,
          draggable: true,
        });
        groupTables.add(konvaImage); 

        console.log('image.width', image.width); 
        console.log('image.height', image.height); 

        let roomScaleWidth = (scale * roomObj.room.roomWidth); 
        let roomScaleLength = (scale * roomObj.room.roomLength); 

        let ratioRoomToImageWidth = image.width / roomScaleWidth; 
        let ratioRoomToImageLength = image.height / roomScaleLength; 
        
        console.log('ratioRoomToImageWidth', ratioRoomToImageWidth); 
        console.log('ratioRoomToImageWidth', ratioRoomToImageLength); 


        let scaleImage = 1; 

        if (ratioRoomToImageWidth  > ratioRoomToImageLength){
            console.log('roomScale width is larger, use roomScaleLength'); 
            scaleImage = ratioRoomToImageLength;   
        } else {
            console.log('roomScaleLength is larger, use roomScaleWidth')

             
            scaleImage = ratioRoomToImageWidth; 

        }

        console.log('scaleImage', scaleImage); 
        
        konvaImage.width(image.width * scaleImage); 

        konvaImage.height(image.height * scaleImage ); 

        document.getElementById('scaleImageId').value = scaleImage; 
      };
      image.src = e.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
    // document.getElementById("canvasDiv").style.cursor = "crosshair";
    drawScaledLineMode = true; 
  }
});

const fileConfig = document.getElementById('fileConfig'); 

fileConfig.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        console.log('reader.onload')
        // console.log('e.target.result', e.target.result)
        let jsonFile = reader.readAsText(e.target.result, "UTF-8"); 
        console.log('jsonFile', jsonFile); 
     };
      // reader.readAsDataURL(e.target.files[0]);
      let jsonFile = reader.readAsText(e.target.files[0], "UTF-8"); 
      console.log('jsonFile', jsonFile); 
    }
  });
  


/*
    Attribution: 
    
    Konva.js: https://konvajs.org/ - MIT license can be found at https://github.com/konvajs/konva/blob/master/LICENSE

    DOMPurify: https://github.com/cure53/DOMPurify license can be found at https://github.com/cure53/DOMPurify/blob/main/LICENSE

*/