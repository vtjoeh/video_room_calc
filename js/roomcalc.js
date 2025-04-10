const version = "v0.1.516";  /* format example "v0.1" or "v0.2.3" - ver 0.1.1 and 0.1.2 should be compatible with a Shareable Link because ver 0.1 and ver 0.2 are not compatible. */

const isCacheImages = true; /* Images for Canvas are preloaded in case of network disruption while being mobile. Turn to false to save server downloads */
let perfectDrawEnabled = false; /* Konva setting. Turning off helps with performance but reduces image quality of canvas.  */
let versionQueryString;
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
let defaultWallHeight = 2.5; /* meters. Overwirtten by Wall Height field */
let workspaceWindow; /* window representing the workspace designer window being open */
let firstLoad = true; /* set to false after onLoad is run the first time */

let isLoadingTemplate = false;  /* used to keep track if a template is loading */
let loadTemplateTime = 500; /* in milliseconds, the time to wait before attempting to load another template. This number is increased for RoomOS */

const GUIDELINE_OFFSET = 5;

let pageLoadTimeBeforeAddresBarUpdate = 3000; /* ms: time to allow the page to fully update before writing to the address bar.  If too early, Konva/canvas is not fully loaded and provides incorrect information */
let addressBarUpdate = false;  /* keep track if the address bar querystring has been updated. Used for onload. */

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

let layerBackgroundImageFloor = new Konva.Layer({
    name: 'layerBackgroundImageFloor'
})
const sessionId = createUuid(); /* Each browser session has a unique sessionId to keep track of statistics. No cookies used for this. */
const startTime = new Date(Date.now()); /* startTime is for statistics */
const clientTimeStamp = startTime.toUTCString();
let fullShareLink;
let fullShareLinkCollabExpBase; /* fullSharelink used the full domain and path.  shareLinkCollabExpBase only uses https://collabexperience.com/?x= */
let lastAction = "load";
let quickSetupState = 'disabled'; /* QuickSetupState states are changed by program to 'update', 'disabled' or 'insert' to see if quick setup menu works */
let primaryDeviceIsAllInOne = false; /* keep track if the primary device is all in one */
let idKeyObj = {}; /* keep the vavlue pair { 'id' : 'key' } of the different categories in 1 object */
let keyIdObj = {}; /* keep the vavlue pair { 'key' : 'id' } of the different categories in 1 object */
let allDeviceTypes = {}; /* a list of all device types merged using the id/data_deviceType as the key */
let roomObj = {}; /* used to store the room data in JSON format.  redraw(true) rebuilds the entire room from the roomObj JSON */
roomObj.name = ''; /* Pre-creating objects now so the order shows up on top in JSON file. */
roomObj.version = version; /* version of Video Room Calculator */
roomObj.unit = 'feet'; /* meters or feet*/
roomObj.room = {};  /* Dimensions of the room and anything specific */
roomObj.room.roomWidth = 26; /* roomWidth default value in feet */
roomObj.room.roomLength = 20; /* roomLength default value in feet */
roomObj.room.roomHeight = ''; /* default value of room is blank*/
roomObj.software = ''; /* mtr or webex. RoomOS = webex */
roomObj.authorVersion = ''; /* field for the author to change version numbers */
roomObj.items = {}; /* all devices in the room will be stored here.  Video devices, displays, tables, etc. */
roomObj.trNodes = []; /* These are the selected shape items used for undo / redo. Does not need to be saved in URL */
roomObj.workspace = {}; /* settings used for exporting to the Workspace Designer */
roomObj.layersVisible = {};
roomObj.layersVisible.grShadingCamera = true;  /* true or false */
roomObj.layersVisible.grDisplayDistance = true; /* true or false */
roomObj.layersVisible.grShadingMicrophone = true;  /* true or false */
roomObj.layersVisible.gridLines = true; /* true or false */
roomObj.layersVisible.grShadingSpeaker = true;  /* true or false */

roomObj.items.videoDevices = [];
roomObj.items.chairs = [];
roomObj.items.tables = [];
roomObj.items.stageFloors = [];
roomObj.items.shapes = [];
roomObj.items.displays = [];
roomObj.items.speakers = [];
roomObj.items.microphones = [];
roomObj.items.touchPanels = [];

roomObj.workspace.removeDefaultWalls = false; /* Workspace Designer setting to remove the default wall on export */
roomObj.workspace.addCeiling = false; /* Add a semi-transparent ceiling on export to the Workspace Designer */

let unit = roomObj.unit;

let gridToggleState = 'room';
let toggleButtonOnColor = '#4169E1';

let toggleButtonOffColor = '#800000';

let undoArray = [];

let redoArray = [];

let itemsOffStageId; /* represents the ID of devices that are not on the stage and not visible to the user. They will not show up in the URL and will be hidden:true in the Workspace Designer.  They are kept during a session in case a room is being resized */

let maxUndoArrayLength = 100; /* Undo amount in active memory.  Local storage will be less. */

let undoArrayTimer; /* timer pepare for saving to the undoArray so that undoArray entries are limited */
let undoArrayTimeDelta = 500; /* ms between saves to undoArray after changes to roomObj */
let touchConsecutiveCount = 0; /* Holds consecutive tapping to zoom out on mobile devices when stuck on the canvas.  Needed if user zooms web page on canvas. Ignored on RoomOS and non-touch devices. */
let touchConsectiveCoutTimer; /* timer to hold consective taps */

let vpnTestTimer; /* time to see if the VPN is working */

let stageOriginalWidth;
let stageOriginalLength;
let stageOriginalset = false;

let qrCodeAlwaysOn = false; /* QrCode is only used on RoomOS devices.  Adding &qr to the query string turns on the qrCode options */
let testProduction = false; /* For forcing to test production crosslaunch */

let zoomScaleX = 1;  /* zoomScaleX zoomScaleY used clicking the + or - button to zoom. */

let zoomScaleY = 1;

const PADDING = 100;

let kGroupLines = new Konva.Group();

let dx = 0; /* dx & dy change based on scrolling when zoomed */

let dy = 0;

let panScrollableOn = false; /* Keeps state if the canvas is scrollable */

let selectingTwoPoints = false; /* Keeps state if selecting 2 points to scale background image */

let movingBackgroundImage = false; /* Keeps state if moving background image */

let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

let scrollContainer = document.getElementById('scroll-container');

/* mm - displayDepth, DisplayHeight, displayWidth, diagonalInches are used as a ratio to determine size of display based on diagonal inches */
let displayDepth = 90;
let displayHeight = 695;
let displayWidth = 1223;
let diagonalInches = 55; /* inches */

/*************************************************/

let nodeNumber = 1;  /* used for testing */

let insertCountXOffset = 0;  /* Not used at the moment. Was used counters used when inserting a node for the first time */
let insertCountYOffset = 0;

let canvasPixel = {};
canvasPixel.x = 0;
canvasPixel.y = 0;


/** Workspace Designer keys: workspaceKeys
 *
 *  The Workspace Desinger and Video Room Calc have different coordinate systems
 *  VRC x = Designer x
 *  VRC y = Designer z
 *  VRC data_zPosition = Designer y
 *  Rotation: VRC degrees = Designer -1*(radians)
 *
 *  In the below workspaceKeys
 *  vertOffset: In meters, VRC data_zPosition value added when exporting to the Workspace Designer
 *  yOffset: In meters, refers to the VRC y difference between the VRC & Desinger per an object before
 *
 *  role: below is the default role, but can be overridden.
 *  **/

workspaceKey = {};
workspaceKey.roomBar = { objectType: 'videoDevice', model: 'Room Bar', color: 'light', yOffset: 0.032 };
workspaceKey.roomBarPro = { objectType: 'videoDevice', model: 'Room Bar Pro', color: 'light', yOffset: 0.045 };
workspaceKey.roomKitEqx = { objectType: 'videoDevice', model: 'EQX', mount: 'wall', color: 'dark', yOffset: 0.076 };

workspaceKey.roomKitEqQuadCam = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', yOffset: 0.051 };
workspaceKey.roomKitEqQuadCamExt = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', yOffset: 0.051 };
workspaceKey.roomKitEqPtz4k = { objectType: 'ptzcam', role: 'crossview', yOffset: 0.205 };
workspaceKey.roomKitEqQuadPtz4k = { objectType: 'videoDevice', model: 'Room Kit EQ' };
workspaceKey.roomKitProQuadCam = { objectType: 'videoDevice', model: 'Room Kit Pro', color: 'light' };

workspaceKey.boardPro55 = { objectType: 'VRC Custom', model: 'Board Pro 55 G1', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.boardPro75 = { objectType: 'VRC Custom', model: 'Board Pro 75 G2', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475 };
workspaceKey.brdPro55G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro55G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 55, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475 };
workspaceKey.brdPro75G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 75, role: 'firstScreen', yOffset: 0.475 };

workspaceKey.webexDesk = { objectType: 'videoDevice', model: 'Desk Pro', scale: [0.88, 0.88, 0.88] };
workspaceKey.webexDeskPro = { objectType: 'videoDevice', model: 'Desk Pro' };
workspaceKey.webexDeskMini = { objectType: 'videoDevice', model: 'Desk Pro', scale: [0.55, 0.6, 0.55], vertOffset: 0.12 };
workspaceKey.room55 = { objectType: 'VRC Custom', model: 'room55' };
workspaceKey.rmKitMini = { objectType: 'VRC Custom', model: 'rmKitMini' };
workspaceKey.roomKit = { objectType: 'VRC Custom', model: 'roomKit' };
workspaceKey.rmBarProVirtualLens = { objectType: 'videoDevice', model: 'Room Bar Pro', yOffset: 0.045 };
workspaceKey.roomKitEqxFS = { objectType: 'videoDevice', model: 'EQX', mount: 'floor', yOffset: 0.44 };

workspaceKey.cameraP60 = { objectType: 'VRC Custom', model: 'cameraP60' };
workspaceKey.ptz4k = { objectType: 'ptzcam', role: 'extended_reach', yOffset: 0.205 };
workspaceKey.quadCam = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadCamExt = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadPtz4kExt = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };

workspaceKey.chair = { objectType: 'chair' };
workspaceKey.plant = { objectType: 'plant' };

workspaceKey.tblRect = { objectType: 'table', model: 'regular' };
workspaceKey.tblShapeU = { objectType: 'table', model: 'ushape' };
workspaceKey.tblTrap = { objectType: 'table', model: 'tapered' };
workspaceKey.tblEllip = { objectType: 'table', model: 'round' };
workspaceKey.tblSchoolDesk = { objectType: 'table', model: 'schooldesk' };
workspaceKey.tblPodium = { objectType: 'table', model: 'podium' };

workspaceKey.ceilingMicPro = { objectType: 'microphone', model: 'Ceiling Mic Pro' };
workspaceKey.tableMicPro = { objectType: 'microphone', model: 'Table Mic Pro' };
workspaceKey.tableMic = { objectType: 'microphone', model: 'Table Mic' };
workspaceKey.ceilingMic = { objectType: 'microphone', model: 'Ceiling Mic', yOffset: 0.275 };

workspaceKey.displaySngl = { objectType: 'screen', role: 'firstScreen', yOffset: 0.045 };


workspaceKey.wallStd = { objectType: 'wall' };
workspaceKey.wallGlass = { objectType: 'wall', model: 'glass', width: 0.03, opacity: '0.3' };
workspaceKey.wallWindow = { objectType: 'wall', model: 'window' };
workspaceKey.ceiling = { objectType: 'ceiling' };
workspaceKey.columnRect = { objectType: 'wall', color: '#808080' };


workspaceKey.box = { objectType: 'box' }

workspaceKey.doorRight = { objectType: 'door', yOffset: -0.4 }
workspaceKey.doorLeft = { objectType: 'door', yOffset: -0.4, scale: [-1, 1, 1] }
workspaceKey.doorDouble = { objectType: 'door', yOffset: -0.4, scale: [1.9, 1, 1] }

workspaceKey.floor = { objectType: 'floor' };

workspaceKey.stageFloor = { objectType: 'box' };

workspaceKey.personStanding = { objectType: 'person', model: 'woman-standing' };

workspaceKey.wheelchair = { objectType: 'person', model: 'woman-sitting-wheelchair' };

workspaceKey.wheelchairTurnCycle = { objectType: 'person', model: 'woman-sitting-wheelchair' };

workspaceKey.circulationSpace = { objectType: 'box', opacity: '0.5', color: '#8FDBCE', height: 0.02, length: 1.2, width: 1.2 };

workspaceKey.navigatorTable = { objectType: 'navigator', role: 'navigator', yOffset: 0.0400 };

workspaceKey.navigatorWall = { objectType: 'scheduler', role: 'scheduler', yOffset: 0.0575 };

workspaceKey.laptop = { objectType: 'laptop', role: 'laptop', yOffset: 0.12 };

workspaceKey.customVRC = { objectType: 'Customer Video Room Calc', kind: '' };

/* end of defining workSpaceKey */

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

let groupStageFloors = new Konva.Group({
    name: 'stageFloors',
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

/* create a background image floorplan  to load */
let backgroundImageFloor = new Image();



function createKonvaBackgroundImageFloor(x = pxOffset - 5, y = pyOffset - 5, height = stage.height() * 1.05, opacity = 0.5) {

    /* remove previous instances of the background image */
    let tempKonvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (tempKonvaBackgroundImageFloor) {
        tempKonvaBackgroundImageFloor.destroy();
    }

    let konvaBackgroundImageFloor = new Konva.Image({
        image: backgroundImageFloor,
        x: x,
        y: y,
        height: height,
        opacity: opacity,
        id: 'konvaBackgroundImageFloor',
        listening: false
    });

    konvaBackgroundImageFloor.data_deviceid = 'backgroundImageFloor';

    konvaBackgroundImageFloor.on('dragend', function konvaBackgroundImageFloorOnDragend() {
        canvasToJson();
    });

    return konvaBackgroundImageFloor;
}


/* tr is the Transformer that does the selection and rotation magic for Konva.  It is exists in its own group. */
let tr = new Konva.Transformer({
    resizeEnabled: false,
    flipEnabled: false,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
    name: 'theTransformer',
    rotateAnchorOffset: 25
});


/* Customize the rotation / rotator anchor */
const rotateImageObj = new Image();

rotateImageObj.onload = function rotateImageObjOnload() {

    tr.anchorStyleFunc((anchor) => {
        if (anchor.attrs.name.startsWith('rotater')) {

            anchor.height(20);
            anchor.offsetY(10);
            anchor.width(20);
            anchor.offsetX(10);
            anchor.cornerRadius(anchor.width() / 2);
            anchor.stroke('lightblue');
            anchor.fill('');
            anchor.fillPatternImage(rotateImageObj);
            anchor.fillPatternOffset({ x: 0, y: 0 });

        }

    })
};

rotateImageObj.src = './assets/images/rotateRight.png';


let groupBackground = new Konva.Group(
    {
        name: 'backGround',
    }
)

let select2PointsRect = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'purple',
    opacity: 0.1,
})

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

/* circleStart is used when drawing the line to scale the background floor image */
let circleStart = new Konva.Circle({
    radius: 3,
    fill: 'green',
    stroke: 'black',
    strokeWidth: 1,
});

layerSelectionBox.add(circleStart);

circleStart.hide();

/* circleEnd is used when drawing the line to scale the background floor image */
let circleEnd = new Konva.Circle({
    x: 20,
    y: 29,
    radius: 3,
    fill: 'red',
    stroke: 'black',
    strokeWidth: 1,
});

layerSelectionBox.add(circleEnd);

circleEnd.hide();

/* distanceLine is used when drawing the line to scale the background floor image */
var distanceLine = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: 'red',
    strokeWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
});

layerSelectionBox.add(distanceLine);

distanceLine.hide();

select2PointsRect.on('click', function select2PointsRectOnClick(event) {

});

panRectangle.on('click', function panRectangleOnClick(event) {

});

select2PointsRect.on('mousedown', function select2PointsRectOnMousedown(mouse) {
    distanceLine.hide();
    circleStart.show();
    circleEnd.hide();
    circleStart.x(canvasPixel.x);
    circleStart.y(canvasPixel.y);
});

select2PointsRect.on('mousemove', function select2PointsRectOnMousemove(mouse) {
    if (circleStart.isVisible() && !(circleEnd.isVisible())) {
        distanceLine.show();
        distanceLine.points([circleStart.x(), circleStart.y(), canvasPixel.x, canvasPixel.y]);
    }
});

select2PointsRect.on('mouseup', function select2PointsRectOnMouseup(mouse) {
    circleEnd.show();
    circleEnd.x(canvasPixel.x);
    circleEnd.y(canvasPixel.y);
    document.getElementById('btnUpdateImageScale').disabled = false;
});

panRectangle.on('mousedown', function panRectangleOnMousedown(mouse) {
    panX = mouse.evt.clientX;
    panY = mouse.evt.clientY;
    panMove = true;
    document.getElementById("canvasDiv").style.cursor = "grabbing";
});

panRectangle.on('mousemove', function panRectangleOnMousemove(mouse) {

    if (!panMove) return;

    let changeX = panX - mouse.evt.clientX;
    let changeY = panY - mouse.evt.clientY;

    scrollContainer.scrollLeft = scrollContainer.scrollLeft + changeX;
    scrollContainer.scrollTop = scrollContainer.scrollTop + changeY;

    panX = mouse.evt.clientX;
    panY = mouse.evt.clientY;

})


panRectangle.on('mouseup', function panRectangleOnMouseup(event) {
    panMove = false;
    document.getElementById("canvasDiv").style.cursor = "grab";
})

select2PointsRect.hide();

panRectangle.hide(); /* use .hide() for panRectangle to hide, but .show() to pan on the canvas.  */

layerSelectionBox.add(panRectangle);
layerSelectionBox.add(select2PointsRect);


/************************************************************************** */

document.getElementById('lblVersion').innerText = version;






/* videoDevices key starts with A or B */
let videoDevices = [
    { name: "Room Bar", id: 'roomBar', key: 'AB', wideHorizontalFOV: 120, teleHorizontalFOV: 120, onePersonZoom: 2.94, twoPersonZoom: 4.76, topImage: 'roomBar-top.png', frontImage: 'roomBar-front.png', width: 534, depth: 64.4, height: 82, micRadius: 3000, micDeg: 140, cameraShadeOffSet: 20, defaultVert: 1230, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },
    { name: "Room Bar Pro", id: 'roomBarPro', key: 'AC', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 2.09, twoPersonZoom: 3.16, topImage: 'roomBarPro-top.png', frontImage: 'roomBarPro-front.png', width: 960, depth: 90, height: 120, micRadius: 4000, micDeg: 100, defaultVert: 1200, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },
    { name: 'Room Kit EQX', id: 'roomKitEqx', key: 'AD', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqx-top.png', frontImage: 'roomKitEqx-front.png', width: 3362, depth: 152, height: 1230, diagonalInches: 75, defaultVert: 0, defaultVert: 681, colors: null },
    { name: "Room Kit EQ: Quad Camera", key: 'AE', id: 'roomKitEqQuadCam', cameraParent: 'quadCam', topImage: 'quadCam-top.png', frontImage: 'quadCam-front.png' },
    { name: "Room Kit EQ: Quad Camera Extended (720p)", key: 'AF', id: 'roomKitEqQuadCamExt', cameraParent: 'quadCamExt' },
    { name: "Room Kit EQ: PTZ 4K Camera", key: 'AG', id: 'roomKitEqPtz4k', cameraParent: 'ptz4k' },
    { name: "Room Kit EQ: Quad Cam + PTZ 4K Extended", key: 'AH', id: 'roomKitEqQuadPtz4k', cameraParent: 'quadPtz4kExt', topImage: 'roomKitEqQuadPtz4k-top.png', frontImage: 'roomKitEqQuadPtz4k-front.png', defaultVert: 1900 },
    { name: "Room Kit Pro: Quad Camera", id: 'roomKitProQuadCam', key: 'AI', cameraParent: "quadCam" },
    { name: "Board Pro 55", id: 'boardPro55', key: 'AJ', codecParent: "boardPro75", topImage: 'boardPro55-top.png', frontImage: 'boardPro55-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, defaultVert: 923 },
    { name: "Board Pro 75", id: 'boardPro75', key: 'AK', wideHorizontalFOV: 120, teleHorizontalFOV: 85, onePersonZoom: 2.39, twoPersonZoom: 3.82, topImage: 'boardPro75-top.png', frontImage: 'boardPro75-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, defaultVert: 763 },
    { name: "Board Pro 55 G2", id: 'brdPro55G2', key: 'AL', codecParent: 'brdPro75G2', topImage: 'brdPro55G2-top.png', frontImage: 'brdPro55G2-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, micRadius: 4000, micDeg: 100, defaultVert: 974 },
    { name: "Board Pro 75 G2", id: 'brdPro75G2', key: 'AM', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 2.09, twoPersonZoom: 3.16, topImage: 'brdPro75G2-top.png', frontImage: 'brdPro75G2-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, micRadius: 4000, micDeg: 100, defaultVert: 763 },
    { name: "Desk", id: 'webexDesk', key: 'AN', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDesk-top.png', frontImage: 'webexDesk-front.png', width: 565, depth: 70, height: 474, diagonalInches: 24, defaultVert: 710 },
    { name: "Desk Pro", id: 'webexDeskPro', key: 'AO', wideHorizontalFOV: 71, teleHorizontalFOV: 71, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDeskPro-top.png', frontImage: 'webexDeskPro-front.png', width: 627.7, depth: 169.9, height: 497.8, diagonalInches: 27, cameraShadeOffSet: 40, defaultVert: 710 },
    { name: "Desk Mini", id: 'webexDeskMini', key: 'AP', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDeskMini-top.png', frontImage: 'webexDeskMini-front.png', width: 371, depth: 135, height: 162.5, diagonalInches: 15, cameraShadeOffSet: 30, defaultVert: 710 },
    { name: "Room 55", id: 'room55', key: 'AQ', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'room55-top.png', frontImage: 'room55-front.png', width: 1245, depth: 775, height: 1593, diagonalInches: 55, displayOffSetY: 370 },
    { name: "Room Kit Mini", id: 'rmKitMini', key: 'AR', wideHorizontalFOV: 112, teleHorizontalFOV: 112, onePersonZoom: 2.04, twoPersonZoom: 3.41, topImage: 'rmKitMini-top.png', frontImage: 'rmKitMini-front.png', width: 500, depth: 77, height: 80, defaultVert: 710 },
    { name: "Room Kit", id: 'roomKit', key: 'AS', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'roomKit-top.png', frontImage: 'roomKit-front.png', width: 700, depth: 88, height: 106, defaultVert: 1200 },
    { name: "Virtual Lens (Beta) Bar Pro/Brd Pro G2", id: 'rmBarProVirtualLens', key: 'AT', codecParent: 'roomBarPro', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 4.335, twoPersonZoom: 3.5, defaultVert: 1200 },
    { name: 'Room Kit EQX: Floor Stand', id: 'roomKitEqxFS', key: 'AU', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqxFS-top.png', frontImage: 'roomKitEqxFS-front.png', width: 3362, depth: 924, height: 1910, diagonalInches: 75, displayOffSetY: 450, defaultVert: 0, colors: null },
    { name: "Board Pro 55 G2: Floor Stand", id: 'brdPro55G2FS', key: 'AV', codecParent: 'brdPro75G2', topImage: 'brdPro55G2FS-top.png', frontImage: 'brdPro55G2FS-front.png', width: 1278, depth: 944, height: 1778, diagonalInches: 55, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },
    { name: "Board Pro 75 G2: Floor Stand", id: 'brdPro75G2FS', key: 'AW', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 2.09, twoPersonZoom: 3.16, topImage: 'brdPro75G2FS-top.png', frontImage: 'brdPro75G2FS-front.png', width: 1719, depth: 926, height: 1866, diagonalInches: 75, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },
]


let videoDevicesNoCameras = structuredClone(videoDevices);

/* camera key starts with C */
let cameras = [
    { name: "Precision 60 Camera", id: 'cameraP60', key: 'CA', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 20, twoPersonZoom: 20, topImage: 'cameraP60-top.png', frontImage: 'cameraP60-front.png', width: 268.1, depth: 162.5, height: 151.9, cameraShadeOffSet: 40, displayOffSetY: 35, defaultVert: 1900 },
    { name: "PTZ 4K Camera", id: 'ptz4k', key: 'CB', wideHorizontalFOV: 70, teleHorizontalFOV: 70, onePersonZoom: 24, twoPersonZoom: 36, topImage: 'ptz4k-top.png', frontImage: 'ptz4k-front.png', width: 158.4, depth: 200.2, height: 177.5, cameraShadeOffSet: 50, displayOffSetY: 60, defaultVert: 1900, roles: [{ crossview: 'Wide Angle - Cross-view' }, { extended_reach: 'Narrow -Extended Reach' }, { presentertrack: 'Narrow - PresenterTrack' }] },
    { name: "Quad Camera", id: 'quadCam', key: 'CC', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 2.64, twoPersonZoom: 2.64, teleFullWidth: true, topImage: 'quadCam-top.png', frontImage: 'quadCam-front.png', width: 950, depth: 102.5, height: 120, defaultVert: 1190, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },
    { name: "Quad Camera Extended (720p)", id: 'quadCamExt', key: 'CD', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 4, twoPersonZoom: 4, teleFullWidth: true, topImage: 'quadCamExt-top.png', frontImage: 'quadCamExt-front.png', width: 950, depth: 102.5, height: 120, defaultVert: 1190, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },
    { name: "Quad Cam + PTZ 4K Extended", id: 'quadPtz4kExt', key: 'CE', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 2.64, twoPersonZoom: 5, teleFullWidth: true, topImage: 'quadPtz4kExt-top.png', frontImage: 'quadPtz4kExt-front.png', width: 950, depth: 200.2, height: 177.5, displayOffSetY: 60, defaultVert: 1900 },
]

/* used for ptz4kNarrowFov crossview and extended_reach */
let ptz4kNarrowFov = { wideHorizontalFOV: 33, teleHorizontalFOV: 33, onePersonZoom: 4.4, twoPersonZoom: 3.2 };

/* Microphone & Navigators - key starts with M */
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
        defaultVert: 710,

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
        defaultVert: 710,
        colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }],
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
        defaultVert: 2500,
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
        defaultVert: 2500,
        colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }],
    },
    {
        name: "Table Navigator",
        id: "navigatorTable",
        key: "ME",
        topImage: 'navigatorTable-top.png',
        frontImage: 'navigatorTable-menu.png',
        width: 242,
        depth: 163,
        height: 96,
        defaultVert: 710,
        roles: [{ navigator: 'Navigator' }, { scheduler: 'Scheduler' }],
        colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }],

    },
    {
        name: "Wall Navigator",
        id: "navigatorWall",
        key: "MF",
        topImage: 'navigatorWall-top.png',
        frontImage: 'navigatorWall-menu.png',
        width: 242,
        depth: 115,
        height: 164,
        defaultVert: 710,
        roles: [{ scheduler: 'Scheduler' }, { navigator: 'Navigator' }],
        colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }],

    },
    {
        name: "Laptop",
        id: "laptop",
        key: "MG",
        topImage: 'laptop-top.png',
        frontImage: 'laptop-menu.png',
        width: 340,
        depth: 260,
        height: 164,
        defaultVert: 710,

    },
]

/* Tables & Walls. Table keys starts with T, Wall keys start with W */
let tables = [{
    name: 'Table Rectangle (round corners)',
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
    name: 'Table Tapered (trapezoid)',
    id: 'tblTrap',
    key: 'TC',
    frontImage: 'tblTrap-front.png',
},
{
    name: 'Table U-Shaped',
    id: 'tblShapeU',
    key: 'TD',
    frontImage: 'tblShapeU-menu.png',
},
{
    name: 'Desk',
    id: 'tblSchoolDesk',
    key: 'TE',
    depth: 590,
    frontImage: 'tblSchoolDesk-menu.png',
},
{
    name: 'Podium, round',
    id: 'tblPodium',
    key: 'TF',
    frontImage: 'tblPodium-menu.png',
},
{
    name: 'Wall Standard (10 cm / 3.9")',
    id: 'wallStd',
    key: 'WA',
    frontImage: 'wallStd-front.png',
},
{
    name: 'Glass Wall (10 cm / 3.9")',
    id: 'wallGlass',
    key: 'WB',
    frontImage: 'wallGlass-front.png',
},

{
    name: 'Column',
    id: 'columnRect',
    key: 'WC',
    frontImage: 'columnRect-front.png',
},

{
    name: 'Box',
    id: 'box',
    key: 'WD',
    frontImage: 'box-front.png',
},
{
    name: 'Wall with Windows',
    id: 'wallWindow',
    key: 'WE',
    frontImage: 'wallWindow-front.png',
    topImage: 'wallWindow-top.png'
}


]

/* Chair, doors and people. Key ID start with S */
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
    },
    {
        name: "Person Standing",
        id: "personStanding",
        key: "SC",
        topImage: 'person-top.png',
        frontImage: 'person-front.png',
        width: 640,
        depth: 640,
        opacity: 1,
        models: ['woman-standing', 'man-standing-pen', 'woman-sitting-wheelchair'],
    },
    {
        name: "Door (right)",
        id: "doorRight",
        key: "SB",
        topImage: 'doorRight-top.png',
        frontImage: 'doorRight-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Door (left)",
        id: "doorLeft",
        key: "SD",
        topImage: 'doorLeft-top.png',
        frontImage: 'doorLeft-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Double Door",
        id: "doorDouble",
        key: "SE",
        topImage: 'doorDouble-top.png',
        frontImage: 'doorDouble-menu.png',
        width: 2009,
        depth: 1004,
        opacity: 1,
    },
    {
        name: "Plant",
        id: "plant",
        key: "SF",
        topImage: 'plant.png',
        frontImage: 'plant.png',
        width: 640,
        depth: 640,
        opacity: 1,
    },
    {
        name: "Wheelchair",
        id: "wheelchair",
        key: "SG",
        topImage: 'wheelchair-top.png',
        frontImage: 'wheelchair-menu.png',
        width: 665,
        depth: 1050,
        opacity: 0.6,
    },
    {
        name: 'Wheelchair turn cycle (150cm/60")',
        id: 'wheelchairTurnCycle',
        key: "SH",
        topImage: 'wheelchairTurnCycle-top.png',
        frontImage: 'wheelchairTurnCycle-menu.png',
        width: 1500,
        depth: 1500,
        opacity: 0.65,
    },
    {
        name: "Ciruculation space (120cm/4')",
        id: 'circulationSpace',
        key: "SI",
        topImage: 'circulationSpace-top.png',
        frontImage: 'circulationSpace-menu.png',
        width: 1200,
        depth: 1200,
        opacity: 0.8,
    },



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
        defaultVert: 1320,
        roles: [{ 'singleScreen': 'Single Screen' }, { 'firstScreen': 'First Screen' }, { 'secondScreen': 'Second Screen' }, { 'thirdScreen': 'PresenterTrack Display' }]
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
        defaultVert: 1320,
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
        defaultVert: 1320,

    }
]

/* Floor keys start with */
let stageFloors = [
    {
        name: 'Stage Floor',
        id: 'stageFloor',
        key: 'FA',
        frontImage: 'box-front.png',
    },
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

    /* Add camera only devices with camerOnly = true; */
    videoDevices.forEach((primaryDevice, index) => {
        cameras.forEach((camera) => {
            if (camera.id === primaryDevice.id) {
                videoDevices[index].cameraOnly = true;
            }
        })
    });

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

            /* allow for blank inputs for class allowBlank by not applying convertToUnit */
            if (!(event.target.classList.contains('allowBlank') && event.target.value === '')) {
                event.target.value = convertToUnit(event.target.value);
            }

            if (event.target.classList.contains('updateDrawRoom')) {
                if (event.target.id === 'roomWidth') {
                    roomObj.room.roomWidth = event.target.value;
                }

                if (event.target.id === 'roomLength') {
                    roomObj.room.roomLength = event.target.value;
                }

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
        })
    }

    let degreeInputs = document.querySelectorAll(".degreeInput");

    for (var i = 0; i < degreeInputs.length; i++) {
        degreeInputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9.-]/i, '');
        })

        degreeInputs[i].addEventListener("blur", () => {

        })
    }

    let txtInputs = document.querySelectorAll(".textInput");

    for (var i = 0; i < txtInputs.length; i++) {
        txtInputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[<]/i, '\uFF1C');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[>]/i, '\uFF1E');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[~]/i, '\u301C'); /* tilde ~ is a control character in the URL and is replaced with a similar unicode character */
            if (event.target.id === 'roomName') {
                roomObj.name = event.target.value.replace(/^[\s_]+|[\s_]+$/g, ''); /* trim spaces or _ before sending adding to the roomObj */
            }
        })

        txtInputs[i].addEventListener("blur", (event) => {
            event.target.value = event.target.value.replace(/^[\s_]+|[\s_]+$/g, '');  /* trim spaces or _ */

            event.target.value = event.target.value.replace(/[<]/gi, '\uFF1C');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[>]/gi, '\uFF1E');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[~]/gi, '\u301C'); /* tilde ~ is a control character in the URL and is replaced with a similar unicode character */

            if (event.target.id === 'roomName') {
                roomObj.name = event.target.value.replace(/^[\s_]+|[\s_]+$/g, ''); /* trim spaces or _ before sending adding to the roomObj */
            }

        })
    }

}

addOnNumberInputListener();

function determineMobileDevice() {

    if (navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)) {
        mobileDevice = 'iOS';
        Konva.pixelRatio = 1; /* improve performance with Konva on mobile devices */
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

setMouseEventListeners();

function setMouseEventListeners() {
    document.addEventListener('mousemove', (event) => {
        logMouseMovements(event);
    });

    document.addEventListener('click', (event) => {
        logMouseMovements(event);
    })
}

let mouse = {}; /* mouse.x .y position pixels */
mouse.x = 0;
mouse.y = 0;

let mouseUnit = {}; /* mouseUnit.x .y are the position on the canvas in feet or meters, properly updated for scale and zoom */
mouseUnit.x = 0;
mouseUnit.y = 0;

/* log last mouse movement for Copy / Cut / Paste */


function logMouseMovements(event) {

    let canvas = document.getElementById('canvasDiv');
    let canvasDivBound = canvas.getBoundingClientRect();

    dx = scrollContainer.scrollLeft;
    dy = scrollContainer.scrollTop;

    if (event.clientX) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    }


    canvasPixel.x = (mouse.x - canvasDivBound.x + dx) / zoomScaleX;
    canvasPixel.y = (mouse.y - canvasDivBound.y + dy) / zoomScaleY;

    let unitX = (canvasPixel.x - pxOffset) / scale;
    let unitY = (canvasPixel.y - pxOffset) / scale;

    mouseUnit.x = round(unitX);

    mouseUnit.y = round(unitY);
};



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

        let Container1 = document.getElementById('sidebar');

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
        () => { }
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
        lblUnit.innerText = abbUnit;
    });
}

/* converts the roomObj2, used for exporting to meters for 3d Workspace file.  If the
roomObj is already in meters, it  */
function convertToMeters(roomObj2) {

    let roomObjTemp = {};
    roomObjTemp.room = {};
    roomObjTemp.items = {};

    Object.keys(roomObj2.items).forEach(key => {
        roomObjTemp.items[key] = [];
    });

    let ratio = 1;

    if (roomObj2.unit === 'feet') {
        ratio = 1 / 3.28084;
    }

    roomObjTemp.room.roomWidth = roomObj2.room.roomWidth * ratio;
    roomObjTemp.room.roomLength = roomObj2.room.roomLength * ratio;

    if (roomObj2.room.roomHeight) {
        roomObjTemp.room.roomHeight = roomObj2.room.roomHeight * ratio;
    } else {
        roomObjTemp.room.roomHeight = 2.5;
    }

    for (const category in roomObj2.items) {
        roomObjTemp.items[category] = [];
        for (const i in roomObj2.items[category]) {



            if (!itemsOffStageId.includes(roomObj2.items[category][i].id)) {    /* only add the node if it is onstage */

                let node = roomObj2.items[category][i];

                if ('x' in node) {
                    node.x = node.x * ratio;
                }

                if ('y' in node) {
                    node.y = node.y * ratio;
                }

                if ('width' in node) {
                    node.width = node.width * ratio;
                }

                if ('height' in node) {
                    node.height = node.height * ratio;
                }

                if ('radius' in node) {
                    node.radius = node.radius * ratio;
                }

                if ('data_zPosition' in node) {
                    node.data_zPosition = round(node.data_zPosition * ratio);
                }

                if ('data_vHeight' in node) {
                    node.data_vHeight = round(node.data_vHeight * ratio);
                }

                if ('tblRectRadius' in node) {
                    node.tblRectRadius = round(node.tblRectRadius * ratio);
                }

                if ('data_trapNarrowWidth' in node) {
                    node.data_trapNarrowWidth = round(node.data_trapNarrowWidth * ratio);
                }

                if ('tblRectRadiusRight' in node) {
                    node.tblRectRadiusRight = round(node.tblRectRadiusRight * ratio);
                }

                roomObjTemp.items[category].push(node);
            }
        }

    }

    return roomObjTemp;

}

function convertMetersFeet(isDrawRoom) {
    roomObj.unit = document.getElementById('drpMetersFeet').value;

    let defaultUnit = localStorage.getItem('defaultUnit');
    if (!(defaultUnit === 'none')) {
        setItemForLocalStorage('defaultUnit', roomObj.unit);
    }

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

            if ('data_zPosition' in nodes) {
                nodes.data_zPosition = round(nodes.data_zPosition * ratio);
            }

            if ('data_vHeight' in nodes) {
                nodes.data_vHeight = round(nodes.data_vHeight * ratio);
            }

            if ('data_trapNarrowWidth' in nodes) {
                nodes.data_trapNarrowWidth = round(nodes.data_trapNarrowWidth * ratio);
            }

            if ('tblRectRadiusRight' in nodes) {
                nodes.tblRectRadiusRight = round(nodes.tblRectRadiusRight * ratio);
            }

            if ('tblRectRadius' in nodes) {
                nodes.tblRectRadius = round(nodes.tblRectRadius * ratio);
            }



        }

    }

    if (isDrawRoom != 'noDraw') {
        drawRoom(true);
    }




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

        keepDefaultUnit();

        drawRoom(true, true, true);

    }

    if (urlParams.has('ver')) {
        if (urlParams.has('ver')) versionQueryString = DOMPurify.sanitize(urlParams.get('ver'));
        //  if (urlParams.has('ver')) versionQueryString = urlParams.get('ver');

        lastAction = 'load from querystring';

        /* possibley remove the below code */
        if (!(versionQueryString == version)) {
            versionQueryString = DOMPurify.sanitize(versionQueryString);
            lastAction = "redirect to " + versionQueryString;
        }
    }

    if ((urlParams.has('roomWidth') && !urlParams.has('ver'))) {
        responseRedirect('v0.0');
    }

    function responseRedirect(newPath) {
        let redirectLink = location.origin + '/' + newPath + '/?latestVer=' + version + '&' + queryString.replace(/^\?/, '');
        window.location.href = redirectLink;
    }

    if (urlParams.has('qr')) {
        qrCodeButtonsVisible = true;
        makeButtonsVisible();
    }

    // if (urlParams.has('test')) {
    //     let testValue = urlParams.get('test');
    //     if (testValue === '' || testValue == 1 || testValue == 'on') {
    //         console.info('test in querystring. Test fields shown.  Test fields are highly experimental and unstable.');
    //         document.getElementById('test').setAttribute('style', 'visibility: visible;');
    //         document.getElementById('testA').setAttribute('style', 'visibility: visible;');
    //         document.getElementById('testB').style.display = '';
    //         setItemForLocalStorage('test', 'true');
    //     }
    //     else if (testValue == '0' || testValue === 'off') {
    //         console.info('"test" fields are turned off and the setting is removed from local storage');
    //         document.getElementById('testB').style.display = 'none';
    //         localStorage.removeItem('test');
    //     }

    // } else if (localStorage.getItem('test') === 'true') {

    document.getElementById('test').setAttribute('style', 'visibility: visible;');

    /* RoomOS does not support the Workspace Designer cross-launch */
    if (mobileDevice != 'RoomOS') {
        document.getElementById('testA').setAttribute('style', 'visibility: visible;');
        document.getElementById('testB').style.display = '';
    }

    //   }


    if (urlParams.has('testProduction')) {
        testProduction = true;
    }

    if (urlParams.has('test2')) {
        console.info('test2 in querystring. Test & test2 fields shown.  Try fields are works in progress, highly experimental and unstable.');
        document.getElementById('test').setAttribute('style', 'visibility: visible;');
        document.getElementById('test2').setAttribute('style', 'visibility: visible;');
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

    setTimeout(() => {
        canvasToJson();
    }, 1000)


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
        if (char === '_' && (lastCharType != charType.BetweenTilde)) {  /* represents a repeat of the last Capital Letter used. */
            deleteBlankDotKeys(output[objCount]);
            repeateStringItem = true;
            output.push(structuredClone(output[objCount]));
            objCount += 1;
            lastCharType = charType.CapLetter;
        }
        /* a space or + could be used as another control character, need to work out decode */
        /*
        else if (char === ' ' && lastCharType != charType.BetweenTilde) {
            output.push(structuredClone(output[objCount]));
            objCount += 1;
            lastCharType = charType.CapLetter;
        }
        */
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
        /*  New below */
        else if (char === '~' && lastCharType === charType.LowLetter) {
            lastCharType = charType.OpenLowLetterTilde;

        }
        else if (char === '~' && lastCharType != charType.BetweenTilde && lastCharType != charType.BetweenLowLetterTilde && lastCharType != charType.OpenTilde && lastCharType != charType.OpenLowLetterTilde) {
            lastCharType = charType.OpenTilde;

        }
        /*  new below */
        else if (lastCharType === charType.OpenLowLetterTilde && char != '~') {
            lowerCaseLetters = strBldrLowerCase;
            strBldrLowerCase = '';
            output[objCount][lowerCaseLetters] = char;
            lastCharType = charType.BetweenLowLetterTilde;

        }
        else if (lastCharType === charType.OpenTilde && char != '~') {
            output[objCount].text = char;
            lastCharType = charType.BetweenTilde;

        }
        /* new below */
        else if (lastCharType === charType.BetweenLowLetterTilde && char != '~') {
            output[objCount][lowerCaseLetters] += char;
            lastCharType = charType.BetweenLowLetterTilde;

        }
        else if (lastCharType === charType.BetweenTilde && char != '~') {
            output[objCount].text += char;
            lastCharType = charType.BetweenTilde;

        }
        /* new below */
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

    /* delete the last object that has values '.' */
    deleteBlankDotKeys(output[objCount]);

    /* if the valuve is a '.'  (as in a dot) then delete the key.  If it is 't.', then delete the text key too. */
    function deleteBlankDotKeys(outputObj) {

        /* t. represents not repeating the previous object */
        if (outputObj.t) {
            if (outputObj.t = '.') {
                delete outputObj.t;
                delete outputObj.text;
            }
        }

        for (const [key, value] of Object.entries(outputObj)) {
            if (value === '.') {
                delete outputObj[key];

            }
        }
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

            if ('b' in item) {
                roomObj.room.roomWidth = item.b / 100;
            }

            if ('c' in item) {
                roomObj.room.roomLength = item.c / 100;
            }

            if ('f' in item) {
                roomObj.room.roomHeight = round(item.f / 100);
            }

            if ('e' in item) {
                if (item.e == "0") {
                    roomObj.software = 'webex';
                } else if (item.e == '1') {
                    roomObj.software = 'mtr'
                }
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

                if (shadeArray[4] == '1') {
                    roomObj.workspace.addCeiling = true;
                } else {
                    roomObj.workspace.addCeiling = false;
                }

                if (shadeArray[5] == '1') {
                    roomObj.workspace.removeDefaultWalls = true;
                    updateRemoveDefaultWallsCheckBox();
                } else {
                    roomObj.workspace.removeDefaultWalls = false;
                    updateRemoveDefaultWallsCheckBox();
                }
            }

        } else if (item.sid === "C") { /* authorVersion */
            if ('text' in item) {
                roomObj.authorVersion = DOMPurify.sanitize(item.text);
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


            roomObj.items[groupName][groupLength] = newItem;

            if (roomObj.unit === 'feet') {
                newItem.width = newItem.width * 3.28084;
                newItem.height = newItem.height * 3.28084;
            }

            if ('value' in item) {
                newItem.x = item.value / 100;

            }

            if ('a' in item) {
                roomObj.items[groupName][groupLength].y = item.a / 100;
            }

            if ('b' in item) {
                newItem.data_zPosition = item.b / 100;
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

            if ('h' in item) {
                newItem.tblRectRadius = item.h / 100;
            }

            if ('i' in item) {
                newItem.tblRectRadiusRight = item.i / 100;
            }

            if ('j' in item) {
                newItem.data_vHeight = item.j / 100;
            } else {
                newItem.data_vHeight = "";
            }

            if ('k' in item) {
                newItem.data_trapNarrowWidth = item.k / 100;
            }

            if ('l' in item) {
                populateRoleFromUrl(newItem, item.l);
            } else {
                populateRoleFromUrl(newItem);
            }

            if ('m' in item) {
                populateColorFromUrl(newItem, item.m);
            } else {
                populateColorFromUrl(newItem);
            }

            if ('n' in item) {
                parseShadingDecimalToBinary(newItem, item.n);
            }

            if ('text' in item) {
                newItem.data_labelField = DOMPurify.sanitize(item.text);
            }

            newItem.id = createUuid();


        }


    })

    return output;

}

function resetRoomObj() {
    roomObj.name = ''; /* Pre-creating objects now so the order shows up on top in JSON file. */
    roomObj.trNodes = []; /* These are the selected shape items used for undo / redo. Does not need to be saved in URL */
    roomObj.layersVisible.grShadingCamera = true;  /* true or false */
    roomObj.layersVisible.grDisplayDistance = true; /* true or false */
    roomObj.layersVisible.grShadingMicrophone = true;  /* true or false */
    roomObj.layersVisible.gridLines = true; /* true or false */
    roomObj.layersVisible.grShadingSpeaker = true;  /* true or false */

    roomObj.items.videoDevices = [];
    roomObj.items.chairs = [];
    roomObj.items.tables = [];
    roomObj.items.stageFloors = [];
    roomObj.items.shapes = [];
    roomObj.items.displays = [];
    roomObj.items.speakers = [];
    roomObj.items.microphones = [];

    roomObj.software = '';
    roomObj.authorVersion = '';
    roomObj.room = {
        "roomWidth": 26,
        "roomLength": 20,
        "roomHeight": "",
        "tableWidth": 4,
        "tableLength": 10,
        "distDisplayToTable": 5,
        "frntWallToTv": 0.5,
        "tvDiag": 65,
        "drpTvNum": 1,
    };

    /* reset fields */

    document.getElementById("tvDiag").value = "65";

    document.getElementById('tableWidth').value = 4;

    document.getElementById('tableLength').value = 10;

    document.getElementById('frntWallToTv').value = 0.5;

    document.getElementById('distDisplayToTable').value = 5;

    document.getElementById('drpTvNum').value = '1';

    document.getElementById('drpVideoDevice').value = 'roomBarPro';

    document.getElementById('roomHeight').value = '';

    document.getElementById('drpSoftware').value = 'select';

    document.getElementById('authorVersion').value = '';
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
    undoArray = JSON.parse(localStorage.getItem('undoArray'));
    if (!Array.isArray(undoArray)) undoArray = [];  /* for first run, if local storage not set */
    updateSelectVideoDeviceOptions();
    getQueryString();
    saveToUndoArray();
    postHeartbeat();
    setTimeout(() => {
        addressBarUpdate = true;
        canvasToJson();
    }, pageLoadTimeBeforeAddresBarUpdate);

    if (localStorage.getItem('snapGuidelinesCheckBox') === 'true') {
        document.getElementById('snapGuidelinesCheckBox').checked = true;
    } else {
        document.getElementById('snapGuidelinesCheckBox').checked = false;
    }

    if (localStorage.getItem('useDefaultUnitCheckBox') === 'true') {
        document.getElementById('useDefaultUnitCheckBox').checked = true;
    } else {
        document.getElementById('useDefaultUnitCheckBox').checked = false;
    }

    if (localStorage.getItem('snapIncrementCheckBox') === 'true') {
        document.getElementById('snapIncrementCheckBox').checked = true;
    } else {
        document.getElementById('snapIncrementCheckBox').checked = false;
    }

    if (localStorage.getItem('snapToIncrement')) {
        document.getElementById('snapToIncrement').value = localStorage.getItem('snapToIncrement');
    }

    firstLoad = false;
}


function updateSelectVideoDeviceOptions() {

    let drpVideoDevice = document.getElementById('drpVideoDevice');
    videoDevices.forEach((device) => {

        let name = device.name;

        if (device.id.match(/^(roomBar|roomBarPro|roomKitEqx(FS)?|roomKitEqQuadCam|brdPro\d\dG2(FS)?)$/)) {
            let drpOption = new Option(name, device.id);
            drpVideoDevice.add(drpOption, undefined);
        }
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
setTimeout(canvasToJSON()) command for delay. Any button or input that causes  a
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

    if (primaryDeviceIsAllInOne && touchPanlesNum > 0) {
        quickSetupState = 'disabled';
    }

    if (otherDevices > 0) {
        quickSetupState = 'disabled';
    }

    let quickSetupIconTooltip = `<span class="tooltipIcon"><span class="material-symbols-outlined" style="font-size: medium">info</span><span
                                class="tooltiptextIcon">Quick Setup will add displays, a video device, and a table centered in the room, along with updating the length and width of the room. The Quick Setup menu will disappear if there are additional items or if an item is moved. To reset the Quick Setup menu when disabled, try resetting the room under Save -> Reset Room.</span>
                             </span>`

    let quickSetupEnabledText = 'Quick Setup (optional) ' + quickSetupIconTooltip;
    if (quickSetupState === 'insert') {
        quickSetup.innerHTML = quickSetupEnabledText;  /* This should be innerHTML, no data is passed from QR String */
        quickSetupItems.style.display = 'initial';
    }
    else if (quickSetupState === 'update') {
        quickSetup.innerHTML = quickSetupEnabledText; /* This should be innerHTML, no data is passed from QR String */
        quickSetupItems.style.display = 'initial';

    }
    else if (quickSetupState === 'disabled') {
        quickSetup.innerHTML = `Quick Setup is disabled ` + quickSetupIconTooltip; /* This should be innerHTML, no data is passed from QR String */
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
    roomObj.items.microphones = [];
    roomObj.items.stageFloors = [];

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
    videoAttr.rotation = 0;

    /* determine if defaultVert is available for device and use if available */
    if ('defaultVert' in allDeviceTypes[videoDeviceId]) {
        let defaultVert = allDeviceTypes[videoDeviceId].defaultVert / 1000;
        if (roomObj.unit === 'feet') {
            defaultVert = round(defaultVert * 3.28084)
        }
        videoAttr.data_zPosition = defaultVert;
    }

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

                /* get defaultVert if available */
                if ('defaultVert' in allDeviceTypes[displayId]) {
                    let defaultVert = allDeviceTypes[displayId].defaultVert / 1000;
                    if (roomObj.unit === 'feet') {
                        defaultVert = round(defaultVert * 3.28084)
                    }
                    displayAttr.data_zPosition = defaultVert;
                }

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
    zoomInOut('reset');
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
    zoomInOut('reset');
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

    if (drpVideoDeviceValue === 'autoselect') {
        let roomLength = Number(document.getElementById('roomLength').value);

        unit = document.getElementById('drpMetersFeet').value;

        if (unit === 'feet') {
            roomLength = roomLength / 3.35;
        }

        if (roomLength <= 3.05) {
            drpVideoDevice.value = 'roomBar';
        }
        else if (roomLength <= 6.05) {
            drpVideoDevice.value = 'roomBarPro';
        } else if (roomLength <= 9.05) {
            drpVideoDevice.value = 'roomKitEqQuadCam';
        } else {
            drpVideoDevice.value = 'roomKitEqQuadPtz4k';
        }
    }

    videoDevices.forEach((device) => {
        if (device.id === drpVideoDevice.value) {

            // videoDeviceKey = device.key;

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
    /* Create a <text> element for the text */
    const textSVG = document.createElementNS(svgns, "text");

    /* Set the position and size of the <text> element */
    textSVG.setAttribute("x", x);
    textSVG.setAttribute("y", y);
    textSVG.textContent = text;

    svg = document.getElementById(videoRoomCalcSVG);
    svg.appendChild(textSVG);

}

function addCenteredText(text, x1, y1, x2, y2, groups = '', id = '') {

    let x = x1 + (x2 - x1) / 2
    let y = y1 + (y2 - y1) / 2

    /* Create a <text> element for the text */
    const centeredTextSVG = document.createElementNS(svgns, "text");

    /* Set the position and size of the <text> element */
    centeredTextSVG.setAttribute("x", x);
    centeredTextSVG.setAttribute("y", y);
    /* centeredTextSVG.setAttribute('dominant-baseline', 'middle'); */
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

    /* Create a <text> element for the text */
    let textSVG = document.createElementNS(svgns, "text");

    /* Set the position and size of the <text> element */
    textSVG.setAttribute("x", settings.x);
    textSVG.setAttribute("y", settings.y);
    /* centeredTextSVG.setAttribute('dominant-baseline', 'middle'); */
    /* centeredTextSVG.setAttribute('text-anchor', 'middle'); */
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

/* svgStart */
function drawGrid(startX, startY, endX, endY, scale, increment = 1, style = 'stroke:#808080;stroke-width:2;opacity:0.3;') {
    /* scale */

    let solidStyle = style;

    let lightStyle = 'stroke:#808080;stroke-width:0.6;opacity:0.4;'

    /* Create a <g> group element for the grid */
    const groupLines = document.createElementNS(svgns, "g");

    groupLines.setAttribute('id', 'grid-increment-' + increment.toFixed(2));

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

    /* draw vertical lines */

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

    /* append to SVG */

    return groupLines;

}
/* svgEnd */

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
            onePersonCrop = Math.round(defaultOnePersonCrop * 3.2808 * 100) / 100;

        } else {
            /* meters */
            onePersonCrop = defaultOnePersonCrop;

        };
        document.getElementById('onePersonCrop').value = onePersonCrop.toFixed(2);
    }

    if (isNaN(twoPersonCrop)) {
        if (unit == 'feet') {
            /* feet */
            twoPersonCrop = Math.round(defaultTwoPersonCrop * 3.2808 * 100) / 100;

        } else {
            /* meters */
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
        /* meters */
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

function getKonvaBackgroundImageFloor() {
    let konvaBackgroundImageFloor = stage.find('#konvaBackgroundImageFloor')[0];
    return konvaBackgroundImageFloor;
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
    if (roomObj.room.roomHeight) {
        document.getElementById('roomHeight').value = round(roomObj.room.roomHeight);
    }

    document.getElementById('authorVersion').value = roomObj.authorVersion;

    if ('software' in roomObj) {
        if (roomObj.software == 'webex') {
            document.getElementById('drpSoftware').value = 'webex';
        }
        else if (roomObj.software == 'mtr') {
            document.getElementById('drpSoftware').value = 'mtr';
        }
        else {
            document.getElementById('drpSoftware').value = 'select';
        }
    }



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

    let drpTvNum = getNumberValue('drpTvNum');
    roomObj.room.drpTvNum = drpTvNum;

    document.getElementById('lblvDiag').innerText = tvDiag;

    updatePersonCropUnit();

    roomObj.room.onePersonCrop = onePersonCrop;
    roomObj.room.twoPersoncrop = twoPersonCrop;

    let canvasWidth = roomWidth + (pxOffset * 2) / scale;
    let canvasLength = roomLength + (pxOffset * 2) / scale;

    stageOriginalWidth = canvasWidth * scale;
    stageOriginalLength = (canvasLength * scale) + 30; // 30 is for title at bottom

    /* create Konva stage.  All things get written on the stage.  It requires at least 1 layer */
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
    });

    select2PointsRect.setAttrs({
        width: stage.width(),
        height: stage.height(),
    })

    groupBackground.add(backGroundImage);

    layerGrid.add(groupBackground);

    /* create the outerWall (border) */
    let cOuterWall = new Konva.Rect({
        x: pxOffset,
        y: pxOffset,
        width: roomWidth * scale,
        height: roomLength * scale,
        stroke: '#74a6f7',
        strokeWidth: 3,
        id: 'cOuterWall',
        listening: false,
        preventDefault: false,
    });

    let grOuterWall = new Konva.Group();

    grOuterWall.add(cOuterWall);

    layerGrid.add(grOuterWall);

    let increment = 1.0;

    if (unit === 'meters') {
        increment = 0.25;
    }

    let kGrid = kDrawGrid(pxOffset, pxOffset, (roomWidth * scale) + pxOffset, (roomLength * scale) + pxOffset, scale, increment);

    titleGroup = drawTitleGroup();

    layerGrid.add(titleGroup);

    layerGrid.add(kGrid);

    document.getElementById('keyTable').setAttribute('style', 'background: brown; opacity: 0.7; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px; ');

    document.getElementById('keyWideZoom').setAttribute('style', 'background: yellow; opacity: 0.4; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px;');

    document.getElementById('keyOnePersonCrop').setAttribute('style', 'background: #8FBC8B; opacity: 1; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px; ');

    document.getElementById('keyTwoPersonCrop').setAttribute('style', 'background: #87aeed; opacity: 1; font-size: small; border-style: solid; border-color: lightgray; border-width: 1px;');

    layerGrid.draw();

    updateLabelUnits();

    stageAddLayers();

    gridLinesVisible(roomObj.layersVisible.gridLines);
    shadingMicrophoneVisible(roomObj.layersVisible.grShadingMicrophone);
    displayDistanceVisible(roomObj.layersVisible.grDisplayDistance);
    shadingCameraVisible(roomObj.layersVisible.grShadingCamera);

    if (redrawShapes) {

        roomObjToCanvas(roomObj.items);

        trNodesFromUuids(roomObj.trNodes, false);

        insertKonvaBackgroundImageFloor();

        setTimeout(() => {
            deleteNegativeShapes();

        }, 250);

        if (!dontSaveUndo) {
            /* canvasToJSON() needs a little time before running or else it won't capture the recenlty drawn room */
            setTimeout(() => {

                canvasToJson();
            }, 100);
        }

    } else {

        updateShapesBasedOnNewScale();
    }

    tr.nodes(tr.nodes()); /* reset tr.nodes so the box is drawn again or in correct place */
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

    if (workspaceWindow) {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }

}

function changeTransparency(value) {
    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();
    if (!konvaBackgroundImageFloor) return;

    document.getElementById('transparencyOutput').innerText = value;
    konvaBackgroundImageFloor.opacity(value / 100);
}

function select2Points() {
    resetBackgroundImageFloorSettings();
    document.getElementById("canvasDiv").style.cursor = "crosshair";
    tr.nodes([]);
    selectingTwoPoints = true;
    select2PointsRect.show();
}

function insertKonvaBackgroundImageFloor() {

    let tempKonvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (tempKonvaBackgroundImageFloor) {
        tempKonvaBackgroundImageFloor.destroy();
    }

    if ('backgroundImage' in roomObj) {

        let pixelX = scale * roomObj.backgroundImage.x + pxOffset;
        let pixelY = scale * roomObj.backgroundImage.y + pyOffset;
        let heightPixel = scale * roomObj.backgroundImage.height;
        let widthPixel = scale * roomObj.backgroundImage.width;

        let konvaBackgroundImageFloor = new Konva.Image({
            image: backgroundImageFloor,
            x: pixelX,
            y: pixelY,
            height: heightPixel,
            width: widthPixel,
            rotation: roomObj.backgroundImage.rotation,
            opacity: Number(roomObj.backgroundImage.opacity / 100),
            id: 'konvaBackgroundImageFloor',
            listening: false,
            name: roomObj.backgroundImage.name,
        });

        konvaBackgroundImageFloor.data_deviceid = 'backgroundImageFloor';

        layerBackgroundImageFloor.add(konvaBackgroundImageFloor);

        konvaBackgroundImageFloor.on('dragend', function konvaBackgroundImageFloorOnDragEnd() {
            canvasToJson();
        });


    }

}

function changeLayerBackgroundImageFl() {
    let checkBox = document.getElementById('resizeBackgroundImageCheckBox');

    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (!konvaBackgroundImageFloor) return;

    if (checkBox.checked) {
        document.getElementById("canvasDiv").style.cursor = "auto";
        konvaBackgroundImageFloor.listening(true);
        konvaBackgroundImageFloor.moveTo(layerSelectionBox);
        konvaBackgroundImageFloor.draggable(true);
        tr.nodes([]);
        movingBackgroundImage = true;
    } else {
        document.getElementById("canvasDiv").style.cursor = "auto";
        konvaBackgroundImageFloor.moveTo(layerBackgroundImageFloor);
        konvaBackgroundImageFloor.draggable(false);
        konvaBackgroundImageFloor.listening(false);
        movingBackgroundImage = false;
    }

    hideSelect2PointsShapes();
}

function updateBackgroundImageScale() {
    let measurement = document.getElementById('backgroundImageMeasurement').value;

    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (!konvaBackgroundImageFloor) return;

    if (isNaN(measurement) || measurement < 0.1) {
        alert('Please enter a number larger than 0.1');
        return;
    } else {
        let points = distanceLine.points();
        let x1 = points[0];
        let y1 = points[1];
        let x2 = points[2];
        let y2 = points[3];

        let pixelDistance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        let imageHeight = konvaBackgroundImageFloor.height();

        let imageWidth = konvaBackgroundImageFloor.width();

        let pointsActualDistance = pixelDistance / scale;

        konvaBackgroundImageFloor.height(imageHeight * measurement / pointsActualDistance);

        konvaBackgroundImageFloor.width(imageWidth * measurement / pointsActualDistance);

        document.getElementById('btnUpdateImageScale').disabled = true;

        hideSelect2PointsShapes();

    }
}

function hideSelect2PointsShapes() {
    select2PointsRect.hide();
    circleEnd.hide();
    circleStart.hide();
    distanceLine.hide();
    selectingTwoPoints = false;
}

function resetBackgroundImageFloorSettings() {
    hideSelect2PointsShapes();
    document.getElementById('resizeBackgroundImageCheckBox').checked = false;
    changeLayerBackgroundImageFl();
    document.getElementById("canvasDiv").style.cursor = "auto";
}



function creatArrayKeysTypes() {
    eachCategory(videoDevices, 'videoDevices');
    eachCategory(microphones, 'microphones');
    eachCategory(chairs, 'chairs');
    eachCategory(tables, 'tables');
    eachCategory(displays, 'displays');
    eachCategory(stageFloors, 'stageFloors')

    function eachCategory(category, groupName) {
        category.forEach((item) => {

            idKeyObj[item.id] = item.key;

            allDeviceTypes[item.id] = item;
            allDeviceTypes[item.id].parentGroup = groupName;

            keyIdObj[item.key] = { 'groupName': groupName, 'data_deviceid': item.id, name: item.name, 'width': item.width, 'height': item.depth, 'name': item.name };
        });
    }

}

function createShareableLink() {
    listItemsOffStage();
    let strUrlQuery2;
    strUrlQuery2 = `A${roomObj.unit == 'feet' ? '1' : '0'}`;
    strUrlQuery2 += `${roomObj.version}`;
    strUrlQuery2 += `b${expand(roomObj.room.roomWidth)}c${expand(roomObj.room.roomLength)}`;

    if (roomObj.software === 'webex') {
        strUrlQuery2 += `e0`;
    }
    else if (roomObj.software === 'mtr') {
        strUrlQuery2 += 'e1';
    }


    if (!(roomObj.room.roomHeight == 0 || roomObj.room.roomHeight == '')) {
        strUrlQuery2 += 'f' + round(roomObj.room.roomHeight) * 100;
    }

    strUrlQuery2 += `${roomObj.name == '' ? '' : '~' + encodeURIComponent(roomObj.name.replace(/^[\s_]+|[\s_]+$/g, '')).replaceAll('%20', '+') + '~'}`;


    strUrlQuery2 += createShareableLinkItemShading();

    strUrlQuery2 += `${roomObj.authorVersion == '' ? '' : 'C~' + encodeURIComponent(roomObj.authorVersion).replaceAll('%20', '+') + '~'}`;


    let items = roomObj.items;
    let i = 0;
    for (const category in items) {

        items[category].forEach((item) => {
            strUrlQuery2 += createShareableLinkItem(item);
            i += 1;
            previousItem = item;
        })
    }

    fullShareLink = location.origin + location.pathname + '?x=' + strUrlQuery2;
    // fullShareLink = DOMPurify.sanitize(fullShareLink);
    fullShareLink = fullShareLink.replaceAll(' ', '+');
    fullShareLinkCollabExpBase = 'https://collabexperience.com/' + fullShareLink.match(/\?x=.*/);

    document.getElementById('shareLink').setAttribute('href', fullShareLink);

    document.getElementById('qrCodeLinkText').value = 'QR Code Character Length: ' + fullShareLink.length + ' / 2950 max';

    if (fullShareLink.length > 8189 && !firstLoad) {
        document.getElementById('characterLimitWarning').show();
    } else {
        document.getElementById('characterLimitWarning').close();
    }

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

    /* resend workspace postmessage with the updated URL */
    if (workspaceWindow) {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }

    /* only create QR Code if RoomOS and only every 2 seconds for performance */
    if (qrCodeAlwaysOn) {
        let qrImage = document.getElementById('qrCode').firstChild;
        clearTimeout(timerQRcodeOn);

        /* blur the QR code until it is recreated */
        if (qrImage) {
            qrImage.style.filter = 'blur(5px)';
        }

        timerQRcodeOn = setTimeout(() => {
            createQrCode();
        }, 2000);

    }

}

function expand(num) {
    return Math.round(num * 100);
}

function createShareableLinkItem(item) {
    let strItem = '';

    if (itemsOffStageId.includes(item.id)) {
        return '';
    }

    strItem += idKeyObj[item.data_deviceid];

    if ('x' in item) {
        strItem += Math.round(item.x * 100);
    }

    if ('y' in item) {
        strItem += 'a' + Math.round(round(item.y) * 100);
    }

    if ('data_zPosition' in item) {
        if (item.data_zPosition != "") {
            strItem += 'b' + Math.round(round(item.data_zPosition) * 100);
        }
    }

    if ('width' in item) {
        strItem += 'c' + Math.round(round(item.width) * 100);
    }

    if ('length' in item) {
        strItem += 'd' + Math.round(round(item.length) * 100);
    }

    if ('height' in item && item.data_deviceid != 'tblSchoolDesk') { /* tblSchoolDesk has a set length of 0.59m and does not need to be saved in the URL */
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

    if ('tblRectRadius' in item && item.data_deviceid != 'tblSchoolDesk') { /* tblSchoolDesk tblRectRadius and tblRectRadiusRight are set and don't need to be in the URL */
        strItem += 'h' + Math.round(round(item.tblRectRadius) * 100);
    }

    if ('tblRectRadiusRight' in item && item.data_deviceid != 'tblSchoolDesk') {
        strItem += 'i' + Math.round(round(item.tblRectRadiusRight) * 100);
    }

    if ('data_vHeight' in item) {
        if (item.data_vHeight) {
            strItem += 'j' + Math.round(round(item.data_vHeight) * 100);
        }
    }

    if ('data_trapNarrowWidth' in item) {
        if (item.data_trapNarrowWidth) {
            strItem += 'k' + Math.round(round(item.data_trapNarrowWidth) * 100);
        }
    }

    /* don't store data_role index if the value is 0 - this will be the default value */
    if ('data_role' in item && item.data_role) {
        let place = item.data_role.index - 1;
        if (place > -1) {
            strItem += 'l' + place;
        }
    }

    /* don't store data_color index if the value is 0 - this will be the default value */
    if ('data_color' in item && item.data_color) {
        let place = item.data_color.index - 1;
        if (place > -1) {
            strItem += 'm' + place;
        }
    }

    let hiddenShading = createLinkSingleItemShadingDecimal(item);
    if (hiddenShading != 0) {
        strItem += 'n' + hiddenShading;
    }

    if ('data_labelField' in item) {
        if (item.data_labelField) {
            /* Trim all starting/trailing spaces or _underscores, then encode, then replace all spaces (%20) with + */
            strItem += '~' + encodeURIComponent(item.data_labelField.replace(/^[\s_]+|[\s_]+$/g, '')).replaceAll('%20', '+') + '~';
        }
    }

    return strItem;
}

/* This field is stored as a decimal then converted to binary on the decode */
function createLinkSingleItemShadingDecimal(item) {
    let totalDecimal = 0;
    if (item.data_fovHidden) totalDecimal += 1;
    if (item.data_audioHidden) totalDecimal += 2;
    if (item.data_dispDistHidden) totalDecimal += 4;

    return totalDecimal;
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

    if (roomObj.workspace.addCeiling) {
        shadeArray[4] = 1;
    } else {
        shadeArray[4] = 0;
    }


    if (roomObj.workspace.removeDefaultWalls) {
        shadeArray[5] = 1;
    } else {
        shadeArray[5] = 0;
    }

    return 'B' + shadeArray.join('');

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

        let roomName = DOMPurify.sanitize(document.getElementById('roomName').value);

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

    resetBackgroundImageFloorSettings();
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

function openSubTab2(evt, tabName) {
    /* Declare all variables */
    let i, tabcontent, tablinks;

    /* Get all elements with class="tabcontent" and hide them */
    tabcontent = document.getElementsByClassName("subtabcontent2");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    /* Get all elements with class="tablinks" and remove the class "active" */
    tablinks = document.getElementsByClassName("subtablinks2");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    /* Show the current tab, and add an "active" class to the button that opened the tab */
    document.getElementById(tabName).style.display = "block";

    evt.currentTarget.className += " active";

    resetBackgroundImageFloorSettings();

}

function openTabBottom(evt, tabName) {
    var i, tabcontent, tablinks;
    /* Get all elements with class="tabcontent" and hide them */
    tabcontent = document.getElementsByClassName("tabcontent2");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    /* Get all elements with class="tablinks" and remove the class "active" */
    tablinks = document.getElementsByClassName("tablinks2");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    /* Show the current tab, and add an "active" class to the button that opened the tab */
    document.getElementById(tabName).style.display = "block";

    evt.currentTarget.className += " active";
}

/* Get the element with id="defaultOpen" and click on it */
function toggleButton(button) {
    if (button.style['color'] === 'black') {
        button.style["color"] = 'grey'
    } else {
        button.style["color"] = 'black'
    };
}

/* shows an undo dialog and adds a delay on undo / redo on RoomOS devices */
function showUndoRedoRoomOs() {
    if (mobileDevice === 'RoomOS') {
        document.getElementById('dialogUndoRedo').showModal();
        setTimeout(() => {
            document.getElementById('dialogUndoRedo').close();
        }, 500);
    }
}

function openQuestionDialog() {
    document.getElementById('dialogQuestions').showModal();
}

function closeDialogQuestions() {
    document.getElementById('dialogQuestions').close();
}

function btnUndoClicked() {
    showUndoRedoRoomOs();
    zoomInOut('reset');

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
        }, 750);

    }
}

function btnRedoClicked() {
    showUndoRedoRoomOs()
    zoomInOut('reset');
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

let canvasClipBoard = {};

function copyToCanvasClipBoard(items) {
    let itemsObj = { unit: roomObj.unit }

    if (!items) items = tr.nodes();

    let uuids = [];

    let clipBoardArray = [];


    items.forEach(node => {
        let x2Offset, y2Offset, x2, y2; /* new x and new y */
        let attrs = node.attrs;

        let uuid = createUuid();

        uuids.push(uuid);

        if (!('rotation' in attrs)) {
            node.rotation(0);
        }

        let rotation = attrs.rotation;
        let center = {};

        if (node.getParent().name() === 'tables' || node.getParent().name() === 'stageFloors') {
            center.x = node.x();
            center.y = node.y();
        } else {
            center = getShapeCenter(node);
        }

        x2Offset = 0;
        y2Offset = 0;

        x2 = ((center.x - pxOffset) / scale) + x2Offset / scale;
        y2 = ((center.y - pyOffset) / scale) + y2Offset / scale;


        let width = attrs.width / scale;
        let height = attrs.height / scale;
        let deviceId = node.data_deviceid;
        let newAttr = { x: x2, y: y2, width: width, height: height, rotation: rotation };

        if ('data_diagonalInches' in node) {
            newAttr.data_diagonalInches = node.data_diagonalInches;
        }

        if ('data_zPosition' in node) {
            newAttr.data_zPosition = node.data_zPosition;
        }

        if ('data_vHeight' in node) {
            newAttr.data_vHeight = node.data_vHeight;
        }

        if ('cornerRadius' in node.attrs) {
            if (node.attrs.cornerRadius.length > 1) {
                newAttr.tblRectRadius = node.attrs.cornerRadius[2] / scale;
            }

            if (node.attrs.cornerRadius[0] != node.attrs.cornerRadius[2]) {
                newAttr.tblRectRadiusRight = node.attrs.cornerRadius[0] / scale;
            }
        }

        if ('data_labelField' in node) {
            newAttr.data_labelField = node.data_labelField;
        }

        if ('data_fovHidden' in node) {
            newAttr.data_fovHidden = node.data_fovHidden;
        }

        if ('item.data_audioHidden' in node) {
            newAttr.data_audioHidden = node.data_audioHidden
        }

        if ('data_role' in node) {
            newAttr.data_role = node.data_role;
        }

        if ('data_color' in node) {
            newAttr.data_color = node.data_color;
        }

        if ('data_trapNarrowWidth' in node) {
            newAttr.data_trapNarrowWidth = node.data_trapNarrowWidth;
        }


        clipBoardArray.push({ deviceId: deviceId, parent: node.getParent().name(), newAttr: newAttr, uuid: createUuid() });

    });

    itemsObj.items = clipBoardArray;
    canvasClipBoard.items = clipBoardArray;


    /* get transform (tr) upper left hand corner in pixels and adjust for zoom, pan and scale.  */
    let canvasPixelX = (tr.x() + dx) / zoomScaleX;
    let canvasPixelY = (tr.y() + dy) / zoomScaleY;

    let unitX = (canvasPixelX - pxOffset) / scale;
    let unitY = (canvasPixelY - pxOffset) / scale;

    canvasClipBoard.upperLeft = { x: unitX, y: unitY };

    canvasClipBoard.sessionId = sessionId;
    canvasClipBoard.unit = roomObj.unit;
    setItemForLocalStorage('copyItemsObj', JSON.stringify(canvasClipBoard));


}

/* allow copying items between tabs / windows of the same browsers */
window.addEventListener("storage", () => {
    canvasClipBoard = JSON.parse(localStorage.getItem('copyItemsObj'));
});

/* when the ctrl+C / cmd+C shortcut is used */
function copyItems() {
    copyToCanvasClipBoard();
}

/* when the ctrl+X / cmd+X shortcut is used */
function cutItems() {
    copyToCanvasClipBoard();
    deleteTrNodes();
}

loadLastCopyItem();

/* when copying items between tabs/windows, allows for a newly opened tab/window to have a copy of the Canvas Clipboard */
function loadLastCopyItem() {
    let newCanvasClipBoard = JSON.parse(localStorage.getItem('copyItemsObj'));
    if (newCanvasClipBoard) {
        canvasClipBoard = newCanvasClipBoard;
    }
}

/* paste item in canvasClipBoard to canvas.  if duplicate = true, offset from current object. If duplicate = false, paste at the mouse arrow location */
function pasteItems(duplicate = true) {
    let itemsObj = structuredClone(canvasClipBoard);
    let xOffset = 0, yOffset = 0;
    if (itemsObj.unit) {
        if (roomObj.unit != itemsObj.unit) {
            alert('Copy from canvas clipboard unit mismatch. Items in clipboard are ' + itemsObj.unit + '. Current canvas is ' + unit + '. Change either source or destination units.');
            return;
        }
    } else {
        return;
    }
    let uuids = [];

    if (duplicate) {
        xOffset = (stage.width() * 0.04) / scale;
        yOffset = (stage.height() * 0.04) / scale;
    } else if (mouseUnit.x < (unit === 'feet' ? -1.5 : -0.45) || mouseUnit.y < (unit === 'feet' ? -1.5 : -0.45) || mouseUnit.x > (roomObj.room.roomWidth * 1.04) || mouseUnit.y > (roomObj.room.roomLength * 1.04)) {
        /* if the mouse is off the canvas, don't paste */
        return;
    } else {
        /* adjust paste offset based on tr captured location compared to the current mouse location. */
        xOffset = mouseUnit.x - itemsObj.upperLeft.x;
        yOffset = mouseUnit.y - itemsObj.upperLeft.y;
    }

    itemsObj.items.forEach(item => {

        let uuid = createUuid();
        uuids.push(uuid);
        item.newAttr.x = item.newAttr.x + xOffset;
        item.newAttr.y = item.newAttr.y + yOffset;

        insertShapeItem(item.deviceId, item.parent, item.newAttr, uuid);

    })

    trNodesFromUuids(uuids, true);  /* select the newly pasted items */



}




function duplicateItems() {
    copyToCanvasClipBoard();
    pasteItems(true);
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

        if (uuids.length === 1) {
            snapCenterToIncrement(tr.nodes()[0]);
        }

    }, 100);
}

function stageAddLayers() {
    stage.add(layerGrid);

    stage.add(layerBackgroundImageFloor);
    layerTransform.add(groupStageFloors);
    layerTransform.add(grShadingCamera);
    layerTransform.add(groupTables);
    layerTransform.add(groupChairs);

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

    updateFormatDetailsUpdate();

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

    updateFormatDetailsUpdate();

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

    updateFormatDetailsUpdate();

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

        let name = device.name;

        let drpOption = new Option(name, device.id);

        drpInsertVideoDevice.add(drpOption, undefined);
    })

}


function sceneFuncPtz4k(ctx, shape) {
    ctx.beginPath();
    let width = shape.getAttr('width');
    let height = shape.getAttr('height');
    /* don't need to set position of rect, Konva will handle it */
    ctx.rect(0, 0, width, height * 0.65);
    /* (!) Konva specific method, it is very important it will apply are required styles */

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
    /*  don't need to set position of rect, Konva will handle it */
    ctx.rect(0, 0, width, height * 0.65);
    /* (!) Konva specific method, it is very important it will apply are required styles */
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


function getAttributes(device) {
    let attrObj = { x: device.x, y: device.y, rotation: device.rotation }

    if ('height' in device) {
        attrObj.height = device.height;
    }

    if ('width' in device) {
        attrObj.width = device.width;
    }

    if ('tblRectRadius' in device) {
        attrObj.tblRectRadius = device.tblRectRadius;
    }

    if ('tblRectRadiusRight' in device) {
        attrObj.tblRectRadiusRight = device.tblRectRadiusRight;
    }

    if ('data_vHeight' in device && device.data_vHeight != '') {
        attrObj.data_vHeight = device.data_vHeight;
    }

    if ('data_zPosition' in device && device.data_zPosition != '') {
        attrObj.data_zPosition = device.data_zPosition;
    }

    if ('data_labelField' in device) {
        attrObj.data_labelField = device.data_labelField;
    }

    if ('data_fovHidden' in device) {
        attrObj.data_fovHidden = device.data_fovHidden;
    }

    if ('data_audioHidden' in device) {
        attrObj.data_audioHidden = device.data_audioHidden;
    }

    if ('data_dispDistHidden' in device) {
        attrObj.data_dispDistHidden = device.data_dispDistHidden;
    }


    if ('data_trapNarrowWidth' in device) {
        attrObj.data_trapNarrowWidth = device.data_trapNarrowWidth;
    }

    if ('data_role' in device) {
        attrObj.data_role = device.data_role;
    }

    if ('data_color' in device) {
        attrObj.data_color = device.data_color;
    }

    if ('data_diagonalInches' in device && device.data_diagonalInches) {
        attrObj.data_diagonalInches = device.data_diagonalInches;
    }

    return attrObj;

}

function roomObjToCanvas(roomObjItems) {

    layerTransform.data_scale = scale;
    layerTransform.data_pxOffset = pxOffset;
    layerTransform.data_pyOffset = pyOffset;


    if ('videoDevices' in roomObjItems) {
        for (const device of roomObjItems.videoDevices) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'videoDevices', attrObj, device.id);
        }
    }

    if ('microphones' in roomObjItems) {
        for (const device of roomObjItems.microphones) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'microphones', attrObj, device.id);

        }
    }

    if ('speakers' in roomObjItems) {
        for (const device of roomObjItems.speakers) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'speakers', attrObj, device.id);

        }
    }

    if ('displays' in roomObjItems) {
        for (const device of roomObjItems.displays) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'displays', attrObj, device.id);

        }
    }

    if ('chairs' in roomObjItems) {
        for (const device of roomObjItems.chairs) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'chairs', attrObj, device.id);


        }
    }

    if ('tables' in roomObjItems) {
        for (const device of roomObjItems.tables) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'tables', attrObj, device.id);

        }
    }

    if ('stageFloors' in roomObjItems) {
        for (const device of roomObjItems.stageFloors) {

            let attrObj = getAttributes(device);
            insertShapeItem(device.data_deviceid, 'stageFloors', attrObj, device.id);

        }
    }

}

function canvasToJson() {

    if (!addressBarUpdate) return;

    let transformGroups = layerTransform.getChildren();

    transformGroups.forEach((group) => {
        let groupName = group.name();
        /* ignore the shading and the temporary groups - and the guide-line if not destroyed yet */
        if (!(groupName === 'theTransformer' || groupName === 'grShadingMicrophone' || groupName === 'grShadingCamera' || groupName === 'grDisplayDistance' || groupName === 'grShadingSpeaker' || groupName === 'guide-line')) {
            getNodesJson(group);
        }

    })

    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (konvaBackgroundImageFloor && konvaBackgroundImageFloor.attrs.name) {
        roomObj.backgroundImage = {};
        roomObj.backgroundImage.name = konvaBackgroundImageFloor.attrs.name;
        roomObj.backgroundImage.x = ((konvaBackgroundImageFloor.attrs.x - pxOffset) / scale);

        roomObj.backgroundImage.y = ((konvaBackgroundImageFloor.attrs.y - pyOffset) / scale);
        roomObj.backgroundImage.width = konvaBackgroundImageFloor.width() / scale;
        roomObj.backgroundImage.height = konvaBackgroundImageFloor.height() / scale;
        roomObj.backgroundImage.id = konvaBackgroundImageFloor.attrs.id;
        roomObj.backgroundImage.opacity = document.getElementById('transparencySlider').value;
        roomObj.backgroundImage.rotation = konvaBackgroundImageFloor.rotation();
    }

    trNodesUuidToRoomObj();

    setTimeout(() => {
        isQuickSetupEnabled();
        updateQuickSetupItems();
        updateTitleGroup();

    }, 500);

    function getNodesJson(parentGroup) {
        let theObjects = parentGroup.getChildren();
        let groupName = parentGroup.name();

        roomObj.items[groupName] = [];
        let itemAttr = {};

        theObjects.forEach(element => {
            let x, y;
            let attrs = element.attrs;

            if (!('rotation' in attrs)) {
                element.rotation(0);
            }

            let rotation = attrs.rotation;

            if (groupName === 'tables' || groupName === 'stageFloors') {
                x = attrs.x;
                y = attrs.y;
            } else {
                let center = getShapeCenter(element);
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

            if ('cornerRadius' in attrs) {
                if (attrs.cornerRadius.length > 1) {
                    itemAttr.tblRectRadius = round(attrs.cornerRadius[2] / scale);
                    if (attrs.cornerRadius[0] != attrs.cornerRadius[2]) {
                        itemAttr.tblRectRadiusRight = round(attrs.cornerRadius[0] / scale);
                    }
                }
            }


            if ('data_diagonalInches' in element) {
                itemAttr.data_diagonalInches = element.data_diagonalInches;
            }

            if ('data_zPosition' in element) {
                itemAttr.data_zPosition = element.data_zPosition;
            }

            if ('data_vHeight' in element) {
                itemAttr.data_vHeight = element.data_vHeight;
            }

            if (groupName === 'tables' || groupName === 'stageFloors') {
                itemAttr.width = (attrs.width / scale);
                itemAttr.height = (attrs.height / scale);
            }

            if ('name' in attrs) {
                itemAttr.name = attrs.name;
            }

            if ('data_labelField' in element) {
                if (element.data_labelField != '') {
                    itemAttr.data_labelField = element.data_labelField;
                }
            }

            if (element.data_fovHidden) {
                itemAttr.data_fovHidden = element.data_fovHidden;
            }

            if (element.data_audioHidden) {
                itemAttr.data_audioHidden = element.data_audioHidden;
            }

            if (element.data_dispDistHidden) {
                itemAttr.data_dispDistHidden = element.data_dispDistHidden;
            }

            if ('data_trapNarrowWidth' in element) {
                if (element.data_trapNarrowWidth != '') {
                    itemAttr.data_trapNarrowWidth = element.data_trapNarrowWidth;
                } else {
                    itemAttr.data_trapNarrowWidth = 0;
                }
            }

            if ('data_role' in element) {
                itemAttr.data_role = element.data_role;
            }

            if ('data_color' in element) {
                itemAttr.data_color = element.data_color;
            }

            roomObj.items[groupName].push(itemAttr);

        });

    }

    // console.log('canvasToJson() roomObj', roomObj);
    // console.log('canvasToJson() roomObj', JSON.stringify(roomObj, null, 5));

    clearTimeout(undoArrayTimer);
    undoArrayTimer = setTimeout(function timerSaveToUndoArrayCreateShareableLink() {
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


/* Try and catch wrapper for setting local storage */
function setItemForLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.error('Unable to set local storage.  Either local storage is turned off or the item is too big');
    }
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
        /* do nothing */
    } else {
        undoArray.push(structuredClone(roomObj));
        createShareableLink();
    }

    redoArray = [];

    enableBtnUndoRedo();

    if (undoArray.length > maxUndoArrayLength) {
        undoArray.shift();
    }

    setItemForLocalStorage('undoArray', JSON.stringify(undoArray.slice(-30)));  /* only store the last 30 items to local storage to save on space */

    if (workspaceWindow) {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }

}

function insertTable(insertDevice, groupName, attrs, uuid, selectTrNode) {

    let tblWallFlr, data_zPosition, data_vHeight, data_trapNarrowWidth, width2;
    let width = 1220 / 1000 * scale; /* default width:  is about 4 feet */
    let height = 2440 / 1000 * scale; /* default table:  height is about 8 feet */
    let pixelX = scale * attrs.x + pxOffset;
    let pixelY = scale * attrs.y + pyOffset;
    let opacity = 0.8;
    let wallWidth = 0.1 * scale; // 0.1 to 0.166
    let uShapeWidth = 0.85 * scale;
    let unitScale;
    let tblSchoolDeskRadius = 0.122;
    let radius = [];

    let fillColor = 'brown'; /* default color */
    let strokeColor = 'black'; /* default width */

    /* default width of columns 1 ft x 1 ft */
    if (insertDevice.id.startsWith('column')) {
        width = 0.305 * scale;
        height = 0.305 * scale;
    } else if (insertDevice.id === 'tblShapeU') {
        width = 2.5 * scale;
        height = 3.4 * scale;
    }
    else if (insertDevice.id.startsWith('box') || insertDevice.id.startsWith('stageFloor')) {
        width = 1 * scale;
        height = 1 * scale;
    }
    else if (insertDevice.id.startsWith('tblSchoolDesk')) {
        width = 1.4 * scale;
        height = 0.59 * scale;
    }
    else if (insertDevice.id.startsWith('tblPodium')) {
        width = 0.9 * scale;
        height = 0.9 * scale;
    }

    if ('data_vHeight' in attrs) {
        data_vHeight = attrs.data_vHeight;
    }

    if ((insertDevice.id.startsWith('box') || insertDevice.id.startsWith('stageFloor')) && !data_vHeight) {

        if (unit === 'feet') {
            data_vHeight = 3.28;
        } else {
            data_vHeight = 1;
        }
    }

    if (unit === 'feet') {
        width = width * 3.28084;
        wallWidth = wallWidth * 3.28084;
        height = height * 3.28084;
        uShapeWidth = uShapeWidth * 3.28084;
        unitScale = scale * 3.28084;
        tblSchoolDeskRadius = tblSchoolDeskRadius * 3.28084;
    } else {
        unitScale = scale;
    }

    if ('tblRectRadius' in attrs) {
        let tblRectRadius = attrs.tblRectRadius * scale;
        radius[0] = tblRectRadius;
        radius[1] = tblRectRadius;
        radius[2] = tblRectRadius;
        radius[3] = tblRectRadius;
    }

    if ('tblRectRadiusRight' in attrs) {
        radius[0] = attrs.tblRectRadiusRight * scale;
        radius[1] = attrs.tblRectRadiusRight * scale;
    }

    if (insertDevice.id === 'tblSchoolDesk') {
        radius[0] = 0;
        radius[1] = 0;
        radius[2] = tblSchoolDeskRadius * scale;
        radius[3] = tblSchoolDeskRadius * scale;
    }

    if ('width' in attrs) {
        width = attrs.width * scale;
    }

    if (insertDevice.id === 'tblTrap') {
        if ('data_trapNarrowWidth' in attrs) {
            width2 = attrs.data_trapNarrowWidth * scale;
        } else {
            data_trapNarrowWidth = 0.8; /* default width2 in meters */
            if (unit === 'feet') {
                data_trapNarrowWidth = round(data_trapNarrowWidth * 3.2804);
            }

            attrs.data_trapNarrowWidth = data_trapNarrowWidth;

            width2 = data_trapNarrowWidth * scale;
        }

        if (width2 > width) {
            width2 = width;
        }
    }


    if ('height' in attrs) {
        height = attrs.height * scale;
    }

    if ('rotation' in attrs) {
        rotation = attrs.rotation;
    } else {
        rotation = 0;
    }

    if ('data_zPosition' in attrs) {
        data_zPosition = attrs.data_zPosition;

    } else {
        data_zPosition = '';
    }

    if (insertDevice.id === 'tblRect') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            opacity: opacity,
        });
    }

    if (insertDevice.id === 'tblSchoolDesk') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            opacity: opacity,
        });
    }

    if (insertDevice.id === 'tblRect') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            opacity: opacity,
        });
    }

    if (insertDevice.id === 'tblEllip') {
        tblWallFlr = new Konva.Shape({
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

    /* a podium in s just an ellipse with a set width & height (length) */
    if (insertDevice.id === 'tblPodium') {
        tblWallFlr = new Konva.Shape({
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


    if (insertDevice.id === 'tblTrap') {
        tblWallFlr = new Konva.Shape({
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
                ctx.lineTo((width / 2) + (width2 / 2), height);
                ctx.lineTo((width / 2) - (width2 / 2), height);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });
    }


    if (insertDevice.id === 'tblShapeU') {
        tblWallFlr = new Konva.Shape({
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

                if (width < unitScale * 1.85) {
                    width = 1.85 * unitScale;
                    shape.width(width);
                }

                if (height < unitScale * 1.65) {
                    height = 1.65 * unitScale;
                    shape.height(height);
                }
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(uShapeWidth, 0);
                ctx.lineTo(uShapeWidth, height - uShapeWidth);
                ctx.lineTo(width - uShapeWidth, height - uShapeWidth);
                ctx.lineTo(width - uShapeWidth, 0);
                ctx.lineTo(width, 0);
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.lineTo(0, 0);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });
    }

    if (insertDevice.id === 'box') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: '#FFFFFF99',
            stroke: 'black',
            strokeWidth: 2,
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: [7, 5]
        });
    }

    if (insertDevice.id === 'stageFloor') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: '#FFFFFF99',
            stroke: 'grey',
            strokeWidth: 4,
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: [4, 8]
        });
    }

    if (insertDevice.id === 'wallStd') {
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: wallWidth,
            height: height,
            fill: 'gray',
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: opacity,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                let height = shape.height();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wallWidth, 0);

                ctx.lineTo(wallWidth, height);
                ctx.lineTo(0, height);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });
    }

    if (insertDevice.id === 'wallGlass') {
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: wallWidth,
            height: height,
            fill: '#ADD8E6',
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: 0.8,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                let height = shape.height();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wallWidth, 0);

                ctx.lineTo(wallWidth, height);
                ctx.lineTo(0, height);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });
    }



    if (insertDevice.id === 'wallWindow') {
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: wallWidth,
            height: height,
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: 0.8,
            sceneFunc: (ctx, shape) => {
                ctx.beginPath();
                let height = shape.height();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wallWidth, 0);

                ctx.lineTo(wallWidth, height);
                ctx.lineTo(0, height);
                ctx.closePath(0, 0);
                ctx.fillStrokeShape(shape);
            }
        });

        const windowBackgroundObj = new Image();

        windowBackgroundObj.onload = function windowBackgroundObjOnload() {
            tblWallFlr.fillPatternImage(windowBackgroundObj);
            tblWallFlr.fillPatternRepeat('repeat');
            tblWallFlr.fillPatternOffset({ x: 8, y: 0 });
        };
        windowBackgroundObj.src = './assets/images/wallWindowBackground.png';

    }



    if (insertDevice.id === 'columnRect') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: 'gray',
            stroke: strokeColor,
            strokeWidth: 1,
            id: uuid,
            draggable: true,
            opacity: opacity,
        });

    }

    tblWallFlr.data_deviceid = insertDevice.id;

    tblWallFlr.data_zPosition = data_zPosition;

    tblWallFlr.data_vHeight = data_vHeight;

    tblWallFlr.data_labelField = attrs.data_labelField;

    tblWallFlr.data_trapNarrowWidth = attrs.data_trapNarrowWidth;

    tblWallFlr.perfectDrawEnabled(perfectDrawEnabled);

    if ('data_role' in attrs) {
        tblWallFlr.data_role = attrs.data_role;
    }

    if ('data_color' in attrs) {
        tblWallFlr.data_color = attrs.data_color;
    }

    if ('scaleX' in attrs) {
        tblWallFlr.scaleX = attrs.scaleX;
    };

    if ('scaleY' in attrs) {
        tblWallFlr.scaleX = attrs.scaleX;
    };

    if ('name' in attrs) {
        tblWallFlr.name(attrs.name);
    } else {
        tblWallFlr.name(insertDevice.name);
    }

    /* if statement to add incase in future */
    if (groupName === 'tables') {
        groupTables.add(tblWallFlr);
    }
    else if (groupName === 'stageFloors') {
        groupStageFloors.add(tblWallFlr);
    }



    if (selectTrNode) {
        tr.nodes([tblWallFlr]);
        enableCopyDelBtn();
        /* add delay before updateFormatDetails to give time for object to be inserted and roomObj JSON to be updated */
        setTimeout(() => {
            resizeTableOrWall();
            updateFormatDetails(uuid)
        }, 250);
    }

    tblWallFlr.on('dragmove', function tableOnDragMove(e) {

        snapToGuideLines(e);

        snapCenterToIncrement(tblWallFlr);



        if (!tr.nodes().includes(e.target)) {
            tr.nodes([e.target]);
            enableCopyDelBtn();
            /* tables and other objects maybe resizable. */
            if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors) {
                resizeTableOrWall();
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

    tblWallFlr.on('dragend', function tableOnDragEnd(e) {
        layerTransform.find('.guide-line').forEach((l) => l.destroy());
    });

    tblWallFlr.on('transformend', function tableOnTransformed(e) {
        if (tr.nodes().length === 1) updateItem();  /* Use updateItem so table is redrawn to proper shape on transformend. UpdateItem should be replaced with something not dependent on HTML fields */
    });

}

function findUpperLeftXY(shape) {

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

/* Find the four courners of an item in units feet/meter after rotation.  Assumes any item with a 'width' uses upper left as the x,y.  All other objects uese center for x,y */
function findFourCorners(item) {

    let shapeCorners = [];
    let width, height;

    if ('width' in item) {
        width = item.width;
        height = item.height;

        shapeCorners[0] = { x: item.x, y: item.y };
        shapeCorners[1] = findNewTransformationCoordinate(item, -width, 0);
        shapeCorners[2] = findNewTransformationCoordinate(item, -width, -height);
        shapeCorners[3] = findNewTransformationCoordinate(item, 0, -height);

    } else {
        width = allDeviceTypes[item.data_deviceid].width / 1000;
        height = allDeviceTypes[item.data_deviceid].depth / 1000;

        if (roomObj.unit === 'feet') {
            width = width * 3.28084;
            height = height * 3.28084;
        }

        shapeCorners[0] = findNewTransformationCoordinate(item, width / 2, height / 2);
        shapeCorners[1] = findNewTransformationCoordinate(item, -width / 2, height / 2);
        shapeCorners[2] = findNewTransformationCoordinate(item, - width / 2, - height / 2);
        shapeCorners[3] = findNewTransformationCoordinate(item, width / 2, - height / 2);

    }

    return shapeCorners;
}

function findNewTransformationCoordinate(item, deltaX, deltaY) {
    return {
        x:
            item.x
            - (deltaX) * Math.cos(Math.PI / 180 * item.rotation)
            - (deltaY) * Math.sin(Math.PI / 180 * (-item.rotation)),
        y:
            item.y -
            (deltaY) * Math.cos(Math.PI / 180 * item.rotation) -
            (deltaX) * Math.sin(Math.PI / 180 * item.rotation)
    };
}

function updateKonvaBackgroundImageFloor() {


    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (!konvaBackgroundImageFloor) {
        return;
    }

    let oldScale, oldPxOffset, oldPyOffset;
    oldScale = layerTransform.data_scale;
    oldPxOffset = layerTransform.data_pxOffset;
    oldPyOffset = layerTransform.data_pyOffset;

    konvaBackgroundImageFloor.x(pxOffset + ((scale / oldScale) * (konvaBackgroundImageFloor.x() - oldPxOffset)));

    konvaBackgroundImageFloor.y(pxOffset + ((scale / oldScale) * (konvaBackgroundImageFloor.y() - oldPyOffset)));

    konvaBackgroundImageFloor.height(scale / oldScale * konvaBackgroundImageFloor.height());

    konvaBackgroundImageFloor.width(scale / oldScale * konvaBackgroundImageFloor.width());
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

        updateKonvaBackgroundImageFloor();

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
    let height = document.getElementById('itemLength').value;
    let data_diagonalInches = document.getElementById('itemDiagonalTv').value;
    let x = document.getElementById('itemX').value;
    let y = document.getElementById('itemY').value;

    let rotation = document.getElementById('itemRotation').value;

    let data_zPosition = Number(document.getElementById('itemZposition').value);

    let data_vHeight = Number(document.getElementById('itemVheight').value);

    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    let tblRectRadius = document.getElementById('tblRectRadius').value;

    let tblRectRadiusRight = document.getElementById('tblRectRadiusRight').value;

    let data_labelField = DOMPurify.sanitize(document.getElementById('labelField').value);

    let data_trapNarrowWidth = document.getElementById('trapNarrowWidth').value;

    /* Make the button disabled for a short time.  Pushing the button too fast too many times creates an issue where Canvas data is lost */
    document.getElementById("btnUpdateItemId").disabled = true;

    setTimeout(() => {
        document.getElementById("btnUpdateItemId").disabled = false;

    }, 700);

    /* take the item.id from the web page and find it in the RoomObj json. The Canvas shape
        really gets deleted and rebuilt versus updated */
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
                item.height = height;
            }

            if (parentGroup === 'displays') {
                item.data_diagonalInches = data_diagonalInches;
            };

            if ('data_diagonalInches' in item) {

                item.data_diagonalInches = data_diagonalInches;

                if (data_diagonalInches === '' || data_diagonalInches < 5) {
                    item.data_diagonalInches = 75
                }

                if (item.data_deviceid.startsWith('roomKitEqx') && ((Number(data_diagonalInches) > 85) || Number(data_diagonalInches) < 65)) {
                    item.data_diagonalInches = 75;
                }
            }

            if (document.getElementById('drpRole').options.length > 0) {

                item.data_role = {};
                item.data_role.value = document.getElementById('drpRole').value;
                item.data_role.index = document.getElementById('drpRole').selectedIndex;
            }

            if (document.getElementById('drpColor').options.length > 0) {

                item.data_color = {};
                item.data_color.value = document.getElementById('drpColor').value;
                item.data_color.index = document.getElementById('drpColor').selectedIndex;
            }

            if (item.data_deviceid === 'tblRect') {
                if (tblRectRadius != '') {
                    item.tblRectRadius = tblRectRadius;
                }
                else if ('tblRectRadius' in item) {
                    delete item.tblRectRadius;
                }

                if (tblRectRadiusRight != '') {
                    item.tblRectRadiusRight = tblRectRadiusRight;
                    if (tblRectRadius === '') {
                        item.tblRectRadius = 0;
                    }
                }
                else if ('tblRectRadiusRight' in item) {
                    delete item.tblRectRadiusRight;
                }
            }

            if (data_labelField) {
                item.data_labelField = data_labelField;
            } else if ('data_labelField' in item) { /* if field is now blank remove the attribute.  HTML text box can be blank */
                delete item.data_labelField;
            }

            if (item.data_deviceid === 'tblTrap') {

                if (data_trapNarrowWidth) {
                    item.data_trapNarrowWidth = data_trapNarrowWidth;
                    if (data_trapNarrowWidth == 0) {
                        data_trapNarrowWidth = 0.01;
                        item.data_trapNarrowWidth = data_trapNarrowWidth;
                    }
                } else {
                    data_trapNarrowWidth = 0.01;
                    item.data_trapNarrowWidth = data_trapNarrowWidth;
                }
            }

            if (!(data_zPosition === '')) {
                item.data_zPosition = data_zPosition;
            }
            else if ('data_zPosition' in item) { /* if field is now blank remove the attribute.  HTML text box can be blank */
                delete item.data_zPosition;
            }

            if (data_vHeight) {
                item.data_vHeight = data_vHeight;
            }
            else if ('data_vHeight' in item) {  /* if field is now blank remove the attribute.  HTML text box can be blank */
                delete item.data_vHeight;
            }


            item.rotation = rotation;

            if (document.getElementById('isPrimaryCheckBox').disabled === false && document.getElementById('isPrimaryCheckBox').checked === true) {
                arrayMove(roomObj.items[parentGroup], index, 0);
            }

            /*
            right now I destroy the node and rebuild.  It was just easier to quickly code with FOV/guidance shadings.  Should work on updating values including shading instead for efficiency.
            */

            let node = stage.find('#' + id)[0];

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

            insertShapeItem(item.data_deviceid, parentGroup, item, id, true);

            /* give the canvas some time to be updated before updating */
            setTimeout(() => {
                updateFormatDetails(id);
                tr.nodes([stage.find('#' + id)[0]]);
                enableCopyDelBtn();
                canvasToJson();
            }, 100);

            return;


        }
    });

}

function toggleMicShadingSingleItem() {
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    /* this function should note be called if grShadingMicrophone === false, but in case it is, give the user feedback */
    if (roomObj.layersVisible.grShadingMicrophone === false) {
        document.getElementById('dialogSingleItemToggles').showModal();
        return;
    }

    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            let node = stage.find('#' + id)[0];
            if ('data_audioHidden' in item && item.data_audioHidden === true) {
                document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic';
                stage.find('#audio~' + id)[0].visible(true);
                delete node.data_audioHidden;
                delete item.data_audioHidden;
            } else {
                document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic_off';
                stage.find('#audio~' + id)[0].visible(false);
                node.data_audioHidden = true;
                item.data_audioHidden = true;
            }

        }
    });
    canvasToJson();

}

function toggleCamShadeSingleItem() {
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    if (roomObj.layersVisible.grShadingCamera === false) {
        document.getElementById('dialogSingleItemToggles').showModal();
        return;
    }

    roomObj.items[parentGroup].forEach((item, index) => {

        if (item.id === id) {
            let node = stage.find('#' + id)[0];
            if ('data_fovHidden' in item && item.data_fovHidden === true) {
                document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam';
                stage.find('#fov~' + id)[0].visible(true);
                /* insert value direct to canvas */
                delete node.data_fovHidden; /* delete .data_fovHidden value direct in the Konva canvas */
                delete item.data_fovHidden; /* delete .data_fovHidden direct to roomObj */
            } else {
                document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam_off';
                stage.find('#fov~' + id)[0].visible(false);
                node.data_fovHidden = true;
                item.data_fovHidden = true;
            }

        }
    });

    canvasToJson();
}
//
function toggleDisplayDistanceSingleItem() {
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    if (roomObj.layersVisible.grDisplayDistance === false) {
        document.getElementById('dialogSingleItemToggles').showModal();
        return;
    }


    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            let node = stage.find('#' + id)[0];
            if ('data_dispDistHidden' in item && item.data_dispDistHidden === true) {
                document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv';
                stage.find('#dispDist~' + id)[0].visible(true);
                delete item.data_dispDistHidden;
                delete node.data_dispDistHidden;
            } else {
                document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv_off';
                stage.find('#dispDist~' + id)[0].visible(false);
                item.data_dispDistHidden = true;
                node.data_dispDistHidden = true;
            }

        }
    });

    canvasToJson();

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


    function deleteNegShapeGroups(parentGroup, xBound = 1, yBound = 1) {
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

            /* Now get the 4 corner points */
            corners[0] = { x: 0, y: 0 }; // top left
            corners[1] = { x: width, y: 0 }; // top right
            corners[2] = { x: width, y: height }; // bottom right
            corners[3] = { x: 0, y: height }; // bottom left

            /* And rotate the corners using the same transform as the rect. */
            for (let i = 0; i < 4; i++) {
                /* Here be the magic */
                corners[i] = node.getAbsoluteTransform().point(corners[i]); // top left

            }

            if ((corners[0].x < xBound && corners[1].x < xBound && corners[2].x < xBound && corners[3].x < xBound)
                || (corners[0].y < yBound && corners[1].y < yBound && corners[2].y < yBound && corners[3].y < yBound)) {

                let audioShading = stage.find('#audio~' + node.id())[0];
                let videoShading = stage.find('#fov~' + node.id())[0];

                node.destroy();
                if (audioShading) {
                    audioShading.destroy();
                }

                if (videoShading) {
                    videoShading.destroy();
                }

            }

        });
    }
}


/**
 * Helper function to determine whether there is an intersection between the two polygons described
 * by the lists of vertices. Uses the Separating Axis Theorem.
 *
 * @param {Array} a - An array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @param {Array} b - An array of connected points [{x:, y:}, {x:, y:},...] that form a closed polygon
 * @return {boolean} - True if there is any intersection between the 2 polygons, false otherwise
 */
function doPolygonsIntersect(a, b) {
    const polygons = [a, b];
    let minA, maxA, projected, minB, maxB;

    for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];

        for (let i1 = 0; i1 < polygon.length; i1++) {
            const i2 = (i1 + 1) % polygon.length;
            const p1 = polygon[i1];
            const p2 = polygon[i2];

            const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            minA = maxA = undefined;
            for (let j = 0; j < a.length; j++) {
                projected = normal.x * a[j].x + normal.y * a[j].y;
                if (typeof minA === 'undefined' || projected < minA) {
                    minA = projected;
                }
                if (typeof maxA === 'undefined' || projected > maxA) {
                    maxA = projected;
                }
            }

            minB = maxB = undefined;
            for (let j = 0; j < b.length; j++) {
                projected = normal.x * b[j].x + normal.y * b[j].y;
                if (typeof minB === 'undefined' || projected < minB) {
                    minB = projected;
                }
                if (typeof maxB === 'undefined' || projected > maxB) {
                    maxB = projected;
                }
            }

            if (maxA < minB || maxB < minA) {
                return false;
            }
        }
    }
    return true;
}

/* populates the arrary itemsOffStageId.  These are devices not on the stage and not passed to the Shareable Link or the Workspace Designer */
function listItemsOffStage() {
    itemsOffStageId = [];

    /* get the bounds in scale (feet/meters) */
    let xBoundMin = -pxOffset / scale;
    let yBoundMin = -pyOffset / scale;
    let xBoundMax = roomObj.room.roomWidth + pxOffset / scale;
    let yBoundMax = roomObj.room.roomLength + (pyOffset + 30) / scale;

    let border = [];
    border[0] = { x: xBoundMin, y: yBoundMin };
    border[1] = { x: xBoundMax, y: yBoundMin };
    border[2] = { x: xBoundMax, y: yBoundMax };
    border[3] = { x: xBoundMin, y: yBoundMax };

    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let item = structuredClone(roomObj.items[category][i]);
            if (!(xBoundMin < item.x && item.x < xBoundMax && yBoundMin < item.y && item.y < yBoundMax)) {  /* check first if the main point is in the border, as this is simpler than the SAT poly check methord */
                let fourCorners = findFourCorners(item);
                if (!doPolygonsIntersect(fourCorners, border)) {
                    itemsOffStageId.push(item.id);

                };
            }

        }
    }

}

function insertShapeItem(deviceId, groupName, attrs, uuid = '', selectTrNode = false) {

    let hitStrokeWidth = 15; /* px:  allows the user to be close within X pixels to click on shape */

    /* each shape gets a unique uuid for tracking.  This UUID is also in the roomObj JSON and not recreated if it exists */
    if (uuid === '') {
        uuid = createUuid();
    }

    /* scale the attrs to fit grid */
    let pixelX = scale * attrs.x + pxOffset;
    let pixelY = scale * attrs.y + pyOffset;

    let insertDevice = {};
    let group;
    let width, height, rotation, data_zPosition, data_vHeight;
    let abbrUnit = 'm';  /* abbreviated unit - will be m for meters, f for feet. Inserted in the shape rendering. */

    if (unit === 'feet') {
        abbrUnit = 'ft'
    }

    /*
        Check if deviceId is in group tables or stageFloors - which includes the wall, column, box or stageFloors
        if in tables/stageFloors break out of this and go to insertTable.
    */
    if (groupName === 'tables' || groupName === 'stageFloors') {
        for (const device of tables) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupTables;
                break;
            }
        }

        for (const device of stageFloors) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupStageFloors;
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
    /* convert mm to meters * scale */
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

    /* should move Display calculations here */
    let data_diagonalInches = 0;


    if ('data_diagonalInches' in attrs) {
        data_diagonalInches = attrs.data_diagonalInches;
    }
    else if ('diagonalInches' in insertDevice) {
        data_diagonalInches = insertDevice.diagonalInches;
        attrs.data_diagonalInches = data_diagonalInches;
    }

    if ('data_zPosition' in attrs) {
        data_zPosition = attrs.data_zPosition;
    } else {
        data_zPosition = "";
    }

    if ('data_vHeight' in attrs) {
        data_vHeight = attrs.data_vHeight;
    } else {
        data_vHeight = "";
    }

    /*
        Calculate width of displays based on Diagonal inches.
    */
    let displayNumber = 1;
    if (groupName === 'displays' || deviceId.startsWith('roomKitEqx')) {

        if (deviceId === 'displaySngl') {
            displayNumber = 1;
        }
        else if (deviceId === 'displayDbl' || deviceId.startsWith('roomKitEqx')) {
            displayNumber = 2;
        }
        else if (deviceId === 'displayTrpl') {
            displayNumber = 3;
        }

        width = (displayWidth / diagonalInches) * data_diagonalInches / 1000 * scale * displayNumber; /* height is displayDepth, which is constant regardless of diagnol inches */


        if (!deviceId.startsWith('roomKitEqx')) {
            height = displayDepth / 1000 * scale;  /* height is displayDepth, which is constant regardless of diagnol inches. roomKitEqx width is set in the videoDevices object */
        }

        if (unit === 'feet') {
            width = width * 3.28084;
            if (!deviceId.startsWith('roomKitEqx')) height = height * 3.28084;
        }


    }


    /*
        Testing scaling up the microphones and videodevices so they can be found
        Items that are displays and table items should not be scaled.
    */

    /*

    if (groupName === 'videoDevices' || groupName === 'microphones') {


        let scaleMin = 60;
        let scaleMinFactor = 1;
        if (unit === 'meters') {
            scaleMin = scaleMin * 3.28084;
        }
        if (scale < scaleMin) {

            if (!('data_diagonalInches' in attrs)) {
                scaleMinFactor = scaleMin / scale;
                width = width * scaleMinFactor;
                height = height * scaleMinFactor;
            }
        }
    }

    */


    /* convert to upper left pixel position before conversion */
    let cornerXY = findUpperLeftXY({ x: pixelX, y: pixelY, rotation: rotation, width: width, height: height });


    let imageObj = new Image();
    imageObj.onload = function imageObjOnLoad() {
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

        imageItem.hitStrokeWidth(hitStrokeWidth); /* don't need to be close to the image to be selected */

        imageItem.data_deviceid = deviceId;

        /* on a refresh of the page, make sure person is over the chair.  This isn't working, need to figure out why. */
        if (imageItem.data_deviceid.startsWith('person')) {
            imageItem.zIndex(groupChairs.getChildren().length - 1);
        }

        if (imageItem.data_deviceid.startsWith('chair') || imageItem.data_deviceid.startsWith('plant') || imageItem.data_deviceid.startsWith('door')) {
            imageItem.zIndex(0);
        }


        if ('scaleX' in attrs) {
            imageItem.scaleX = attrs.scaleX;
        };

        if ('scaleY' in attrs) {
            imageItem.scaleX = attrs.scaleX;
        };

        if ('data_diagonalInches' in attrs) {
            imageItem.data_diagonalInches = data_diagonalInches;
        }

        if ('data_zPosition' in attrs && !(attrs.data_zPosition === '')) {
            imageItem.data_zPosition = data_zPosition;
        }

        if ('data_vHeight' in attrs && attrs.data_vHeight != '') {
            imageItem.data_vHeight = data_vHeight;
        }

        if ('data_labelField' in attrs) {
            imageItem.data_labelField = attrs.data_labelField;
        }

        if (attrs.data_fovHidden) {
            imageItem.data_fovHidden = attrs.data_fovHidden;
        }

        if (attrs.data_audioHidden) {
            imageItem.data_audioHidden = attrs.data_audioHidden;
        }

        if (attrs.data_dispDistHidden) {
            imageItem.data_dispDistHidden = attrs.data_dispDistHidden;
        }

        if ('data_role' in attrs) {
            imageItem.data_role = attrs.data_role; /* data_role.value & data_role.index */
        }

        if ('data_color' in attrs) {
            imageItem.data_color = attrs.data_color; /* data_color.value & data_color.index */
        }


        if ('name' in insertDevice) {
            imageItem.name(insertDevice.name);
        }

        if ('opacity' in insertDevice) {
            imageItem.opacity(insertDevice.opacity);
        }

        imageItem.on('dragend', function imageItemOnDragEnd() {

            layerTransform.find('.guide-line').forEach((l) => l.destroy());
            canvasToJson();
        });

        imageItem.on('transformstart', function imageItemOnTransformStart() {

        });

        imageItem.on('dragmove', function imageItemOnDragMove(e) {

            snapCenterToIncrement(imageItem);

            snapToGuideLines(e);

            updateShading(imageItem);


            /* in case the dragged item is not the tr.node, make it the tr.node */

            if (!tr.nodes().includes(e.target)) {
                tr.nodes([e.target]);
                enableCopyDelBtn();
                /* tables and other objects maybe resizable. */
                if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors) {
                    resizeTableOrWall();
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

        imageItem.on('mousedown touchstart', function imageItemOnMouseDownTouchstart(e) {

            if (panScrollableOn || selectingTwoPoints || movingBackgroundImage) {
                e.evt.preventDefault();
                return;
            }

            updateShading(imageItem);

        });

        imageItem.on('transform', function imageItemOnTrasform() {
            updateShading(imageItem);
        });

        imageItem.on('transformend', function imageItemOnTransformed() {

        });

        imageItem.on('mousemove touchmove', function imageItemOnMousemoveTouchmove(e) {

        });

        /* add the shape to the layer */
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
    imageObj.src = './assets/images/' + insertDevice.topImage;

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

        if (attrs.data_fovHidden) {
            groupFov.visible(false);
        } else {
            groupFov.visible(true);
        }

        let teleAngle;
        /* teleFullWidth is for multi-lense devices like the Quad Camera were the combined teleAngle equals the wide FOV. */
        if (insertDevice.teleFullWidth) {
            teleAngle = insertDevice.wideHorizontalFOV;
        } else {
            teleAngle = insertDevice.teleHorizontalFOV;
        }

        /* Show narrow field of FOV based on field view for the ptz 4k camera when  */
        if ('data_role' in attrs && attrs.data_role && (attrs.data_role.value === 'extended_reach' || attrs.data_role.value === 'presentertrack')) {
            insertDevice = { ...insertDevice, ...ptz4kNarrowFov }
            teleAngle = ptz4kNarrowFov.teleHorizontalFOV;
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

        if (attrs.data_audioHidden) {
            groupAudioShading.visible(false);
        } else {
            groupAudioShading.visible(true);
        }

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

        if (attrs.data_dispDistHidden) {
            groupItemDisplayDistance.visible(false);
        } else {
            groupItemDisplayDistance.visible(true);
        }

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

}



/* snap the center of the node to the increment. */
function snapCenterToIncrement(node) {
    if (tr.nodes().length === 1) {

        let snapIncrement = Number(document.getElementById('snapToIncrement').value);
        let snapIncrementCheckBox = document.getElementById('snapIncrementCheckBox');

        if (snapIncrement < 0.02 || (snapIncrement > roomObj.room.roomWidth / 2)) {
            snapIncrement = 0.25;
            document.getElementById('snapToIncrement').value = snapIncrement;
        }

        if (snapIncrementCheckBox.checked) {

            /* get the center of the node in pixels */
            let pixelXY = getShapeCenter(node);

            /* convert pixels to feet/meters */
            let x = (pixelXY.x - pxOffset) / scale;
            let y = (pixelXY.y - pyOffset) / scale;

            /* round to increment */
            let newX = Math.round(x / snapIncrement) * snapIncrement;
            let newY = Math.round(y / snapIncrement) * snapIncrement;

            /* get delta of new position - old position */
            let deltaX = newX - x;
            let deltaY = newY - y;

            /* convert the delta back to pixels */
            let deltaPixelX = ((deltaX) * scale);
            let deltaPixelY = ((deltaY) * scale);

            /* add the delta back to the original node */
            node.x(node.x() + deltaPixelX);
            node.y(node.y() + deltaPixelY);

        }
    }
}


/* snap to object start */

/* were can we snap our objects? */
function getLineGuideStops(skipShape) {
    /* we can snap to stage borders and the center of the stage */

    let outerWall = stage.find("#cOuterWall")[0];
    let outerBox = outerWall.getClientRect();
    let vertical = [outerBox.x, outerBox.x + outerBox.width / 2, outerBox.x + outerBox.width];
    let horizontal = [outerBox.y, outerBox.y + outerBox.height / 2, outerBox.y + outerBox.height];

    /* Go through objects on the primary layer.  Only return draggable() items.  and we snap over edges and center of each object on the canvas */
    layerTransform.find(
        node => {
            let groupName = node.getParent().name();
            /* ignore the shading and the temporary groups */
            if (!(groupName === 'theTransformer' || groupName === 'grShadingMicrophone' || groupName === 'grShadingCamera' || groupName === 'grDisplayDistance' || groupName === 'grShadingSpeaker')) {
                return node.draggable();
            }

        }
    ).forEach((guideItem) => {
        if (guideItem === skipShape) {
            return;
        }
        let box = guideItem.getClientRect();
        /* and we can snap to all edges of shapes */
        vertical.push([box.x, box.x + box.width / 2, box.x + box.width]);
        horizontal.push([box.y, box.y + box.height / 2, box.y + box.height]);
    });


    return {
        vertical: vertical.flat(),
        horizontal: horizontal.flat(),
    };
}



/* what points of the object will trigger to snapping?
 it can be just center of the object but we will enable all edges and center */
function getObjectSnappingEdges(node) {
    let box = node.getClientRect();
    let absPos = node.absolutePosition();

    return {
        vertical: [
            {
                guide: Math.round(box.x),
                offset: Math.round(absPos.x - box.x),
                snap: 'start',
            },
            {
                guide: Math.round(box.x + box.width / 2),
                offset: Math.round(absPos.x - box.x - box.width / 2),
                snap: 'center',
            },
            {
                guide: Math.round(box.x + box.width),
                offset: Math.round(absPos.x - box.x - box.width),
                snap: 'end',
            },
        ],
        horizontal: [
            {
                guide: Math.round(box.y),
                offset: Math.round(absPos.y - box.y),
                snap: 'start',
            },
            {
                guide: Math.round(box.y + box.height / 2),
                offset: Math.round(absPos.y - box.y - box.height / 2),
                snap: 'center',
            },
            {
                guide: Math.round(box.y + box.height),
                offset: Math.round(absPos.y - box.y - box.height),
                snap: 'end',
            },
        ],
    };
}

/* find all snapping possibilities */
function getGuides(lineGuideStops, itemBounds) {
    let resultV = [];
    let resultH = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
        itemBounds.vertical.forEach((itemBound) => {
            let diff = Math.abs(lineGuide - itemBound.guide);
            /* if the distance between guild line and object snap point is close we can consider this for snapping */
            if (diff < GUIDELINE_OFFSET) {
                resultV.push({
                    lineGuide: lineGuide,
                    diff: diff,
                    snap: itemBound.snap,
                    offset: itemBound.offset,
                });
            }
        });
    });

    lineGuideStops.horizontal.forEach((lineGuide) => {
        itemBounds.horizontal.forEach((itemBound) => {
            let diff = Math.abs(lineGuide - itemBound.guide);
            if (diff < GUIDELINE_OFFSET) {
                resultH.push({
                    lineGuide: lineGuide,
                    diff: diff,
                    snap: itemBound.snap,
                    offset: itemBound.offset,
                });
            }
        });
    });

    let guides = [];

    /* find closest snap */
    let minV = resultV.sort((a, b) => a.diff - b.diff)[0];
    let minH = resultH.sort((a, b) => a.diff - b.diff)[0];
    if (minV) {
        guides.push({
            lineGuide: minV.lineGuide,
            offset: minV.offset,
            orientation: 'V',
            snap: minV.snap,
        });
    }
    if (minH) {
        guides.push({
            lineGuide: minH.lineGuide,
            offset: minH.offset,
            orientation: 'H',
            snap: minH.snap,
        });
    }
    return guides;
}


function snapToGuideLines(e) {

    if (!document.getElementById('snapGuidelinesCheckBox').checked) return; /* bail out if snap to guidelines not turned on */

    if (tr.nodes().length != 1) return;  /* only work if one node */

    layerTransform.find('.guide-line').forEach((l) => l.destroy());

    /* find possible snapping lines */
    let lineGuideStops = getLineGuideStops(e.target);
    /* find snapping points of current object */
    let itemBounds = getObjectSnappingEdges(e.target);

    /* now find where can we snap current object */
    let guides = getGuides(lineGuideStops, itemBounds);

    /* do nothing of no snapping */
    if (!guides.length) {
        return;
    }

    drawSnapGuides(guides);

    let absPos = e.target.absolutePosition();
    /* now force object position */
    guides.forEach((lg) => {
        switch (lg.orientation) {
            case 'V': {
                absPos.x = lg.lineGuide + lg.offset;
                break;
            }
            case 'H': {
                absPos.y = lg.lineGuide + lg.offset;
                break;
            }
        }
    });
    e.target.absolutePosition(absPos);
}

function drawSnapGuides(guides) {
    guides.forEach((lg) => {
        if (lg.orientation === 'H') {
            let line = new Konva.Line({
                points: [-6000, 0, 6000, 0],
                stroke: 'rgb(247, 0, 255)',
                strokeWidth: 1,
                name: 'guide-line',
                dash: [4, 6],
            });
            layerTransform.add(line);
            line.absolutePosition({
                x: 0,
                y: lg.lineGuide,
            });
        } else if (lg.orientation === 'V') {
            let line = new Konva.Line({
                points: [0, -6000, 0, 6000],
                stroke: 'rgb(247, 0, 255)',
                strokeWidth: 1,
                name: 'guide-line',
                dash: [4, 6],
            });
            layerTransform.add(line);
            line.absolutePosition({
                x: lg.lineGuide,
                y: 0,
            });
        }
    });
}

function defaultUnitChange(e) {
    if (e.srcElement.checked) {
        setItemForLocalStorage('useDefaultUnitCheckBox', 'true');
    } else {
        setItemForLocalStorage('useDefaultUnitCheckBox', 'false');
    }
    saveToUndoArray();
}

function updateRemoveDefaultWallsCheckBox() {
    document.getElementById('removeDefaultWallsCheckBox').checked = roomObj.workspace.removeDefaultWalls;
    document.getElementById('addCeilingCheckBox').checked = roomObj.workspace.addCeiling;
}

function removeDefaultWallsChange(e) {
    if (e.srcElement.checked) {
        roomObj.workspace.removeDefaultWalls = true;
    } else {
        roomObj.workspace.removeDefaultWalls = false;
    }
    saveToUndoArray();
}

addCeilingChange

function addCeilingChange(e) {
    if (e.srcElement.checked) {
        roomObj.workspace.addCeiling = true;
    } else {
        roomObj.workspace.addCeiling = false;
    }
    saveToUndoArray();
}

function snapChange(e) {

    if (e.srcElement.id === 'snapGuidelinesCheckBox' && e.srcElement.checked) {
        document.getElementById('snapIncrementCheckBox').checked = false;
        setItemForLocalStorage('snapGuidelinesCheckBox', 'true');
    }

    if (e.srcElement.id === 'snapIncrementCheckBox' && e.srcElement.checked) {
        document.getElementById('snapGuidelinesCheckBox').checked = false;

    }

    if (document.getElementById('snapIncrementCheckBox').checked) {
        document.getElementById('snapToIncrement').disabled = false;
        setItemForLocalStorage('snapIncrementCheckBox', 'true');
    } else {
        document.getElementById('snapToIncrement').disabled = true;
        setItemForLocalStorage('snapIncrementCheckBox', 'false');
    }

    if (document.getElementById('snapGuidelinesCheckBox').checked) {
        setItemForLocalStorage('snapGuidelinesCheckBox', 'true');
    } else {
        setItemForLocalStorage('snapGuidelinesCheckBox', 'false');
    }

    setItemForLocalStorage('snapToIncrement', document.getElementById('snapToIncrement').value)

}

function updateSnapToIncrement() {
    let snapIncrement = document.getElementById('snapToIncrement').value;
    if (snapIncrement < 0.02 || (snapIncrement > roomObj.room.roomWidth / 2)) {
        snapIncrement = 0.25;
    }
    setItemForLocalStorage('snapToIncrement', snapIncrement);
}



/* Snap to object end */



function updateShading(imageItem) {
    let uuid = imageItem.id();
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

        let center = getShapeCenter(imageItem);
        let centerY = center.y;
        let centerX = center.x;

        if (imageItem.data_deviceid === 'ceilingMic') {
            centerX = (imageItem.height() / 2) * (Math.sin(imageItem.rotation() * Math.PI / 180)) + center.x;
            centerY = (imageItem.height() / 2) * -(Math.cos(imageItem.rotation() * Math.PI / 180)) + center.y;
        }

        if ('data_cameraShadeOffSet' in imageItem) {

            let cameraShadeOffset = imageItem.data_cameraShadeOffSet / 1000 * scale;

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


/* Get center of a shape from upper left x, upper right y cooridnate. A shape comes from Canvas / Konva.js */
function getShapeCenter(shape) {

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

/* Get center of an item from upper left x, y cooridnates. An 'item' is found in roomObj.items[] */
function getItemCenter(item) {

    return {
        x:
            item.x
            + (item.width / 2) * Math.cos(Math.PI / 180 * item.rotation)
            + (item.height / 2) * Math.sin(Math.PI / 180 * (-item.rotation)),
        y:
            item.y +
            (item.height / 2) * Math.cos(Math.PI / 180 * item.rotation) +
            (item.width / 2) * Math.sin(Math.PI / 180 * item.rotation)
    }

}


/* enableCopyButton is enacted anywhere tr.nodes([]) is used and changes from length=0 to lenth >0 */
function enableCopyDelBtn(e) {

    let divItemDetailsVisible = document.getElementById('itemDetailsVisible');
    let txtItemsDetailNote = document.getElementById('txtItemsDetailNote');

    if (tr.nodes().length > 0) {
        document.getElementById('btnDuplicate').disabled = false;
        document.getElementById('btnDelete').disabled = false;

    }
    else {
        document.getElementById('btnDuplicate').disabled = true;
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

function updateRoomDetails() {
    let roomHeight = document.getElementById('roomHeight').value;
    let authorVersion = DOMPurify.sanitize(document.getElementById('authorVersion').value);
    let drpSoftware = document.getElementById('drpSoftware').value;

    if (roomHeight != 0 || roomHeight != '') {
        roomObj.room.roomHeight = Number(roomHeight);
        defaultWallHeight = roomObj.room.roomHeight;
    }


    if (authorVersion != '') {
        roomObj.authorVersion = authorVersion;
    }

    if (drpSoftware != 'select') {
        roomObj.software = drpSoftware;
    } else {
        roomObj.software = '';
    }
    canvasToJson();
}

function updateQuickSetupItems() {
    let primaryVideoDevice = roomObj.items.videoDevices[0];
    let primaryTable = roomObj.items.tables[0];
    let primaryDisplay = roomObj.items.displays[0];

    if (primaryTable) {
        document.getElementById('tableWidth').value = round(primaryTable.width);
        document.getElementById('tableLength').value = round(primaryTable.height);
    }

    if (primaryVideoDevice && primaryTable) {

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
                    if (primaryVideoDevice.data_deviceid.startsWith('roomKitEqx')) {
                        document.getElementById('drpTvNum').value = '2';
                    }
                } else {
                    primaryDeviceIsAllInOne = false;

                    if (primaryDisplay) {


                        document.getElementById('tvDiag').value = primaryDisplay.data_diagonalInches;

                        if (primaryDisplay.data_deviceid === 'displaySngl') {
                            document.getElementById('drpTvNum').value = '1';
                        }
                        else if (primaryDisplay.data_deviceid === 'displayDbl') {
                            document.getElementById('drpTvNum').value = '2';

                        }
                        else if (primaryDisplay.data_deviceid === 'displayDbl') {
                            document.getElementById('drpTvNum').value = '3';
                        }
                    }

                }
            }
        });

    }
}


function parseShadingDecimalToBinary(newItem, decimalInput) {
    let binaryValue = Number(decimalInput).toString(2).split("").reverse();

    if (binaryValue[0] == 1) {
        newItem.data_fovHidden = true;
    }

    if (binaryValue[1] == 1) {
        newItem.data_audioHidden = true;
    }

    if (binaryValue[2] == 1) {
        newItem.data_dispDistHidden = true;
    }

}

function populateColorFromUrl(newItem, place = -1) {
    let index = Number(place) + 1; /* by default index = 0 is the default, */

    videoDevices.forEach(indexToColor);
    chairs.forEach(indexToColor);
    displays.forEach(indexToColor);
    microphones.forEach(indexToColor);

    function indexToColor(device) {
        if (newItem.data_deviceid === device.id) {
            if ('colors' in device && device.colors) {
                let color = device.colors[index];
                newItem.data_color = {};

                /* determine if the object is a string or an object.  */
                if (typeof (color) === 'string') {
                    newItem.data_color.value = color;

                } else {
                    for (const [key, value] of Object.entries(color)) {
                        newItem.data_color.value = key;
                    }
                }
                newItem.data_color.index = index;
            }
        }
    }
}

function populateRoleFromUrl(newItem, place = -1) {
    let index = Number(place) + 1; /* by default index = 0 is the default, */

    videoDevices.forEach(indexToRole);
    chairs.forEach(indexToRole);
    displays.forEach(indexToRole);
    microphones.forEach(indexToRole);

    function indexToRole(device) {
        if (newItem.data_deviceid === device.id) {
            if ('roles' in device && device.roles) {
                let role = device.roles[index];

                newItem.data_role = {};

                /* determine if the object is a string or an object.  */
                if (typeof (role) === 'string') {
                    newItem.data_role.value = role;

                } else {
                    for (const [key, value] of Object.entries(role)) {
                        newItem.data_role.value = key;
                    }
                }
                newItem.data_role.index = index;
            }
        }
    }
}

/* Populate the drpColor drop menu if there are Colors for the item.  Colors are for the Workspace Designer */
function populateDrpColor(item) {

    document.getElementById('drpColor').options.length = 0; /* clear out all previous options */

    document.getElementById('colorDiv').style.display = 'none';

    videoDevices.forEach(populate);

    microphones.forEach(populate);

    chairs.forEach(populate);

    displays.forEach(populate);

    function populate(device) {
        if (item.data_deviceid === device.id) {
            if ('colors' in device && device.colors) {
                document.getElementById('colorDiv').style.display = '';

                device.colors.forEach(color => {
                    let drpOption = new Option();

                    /* determine if the object is a string or an object.  */
                    if (typeof (color) === 'string') {
                        drpOption.text = color;
                        drpOption.value = color;
                    } else {
                        for (const [key, value] of Object.entries(color)) {
                            drpOption.text = value;
                            drpOption.value = key;
                        }
                    }
                    document.getElementById('drpColor').add(drpOption, undefined);
                })
            }
        }
    }
}


/* Populate the drpRole drop menu if there are Roles for the item.  Roles are for the Workspace Designer */
function populateDrpRole(item) {

    document.getElementById('drpRole').options.length = 0; /* clear out all previous options */

    document.getElementById('roleDiv').style.display = 'none';

    videoDevices.forEach(populate);

    microphones.forEach(populate);

    chairs.forEach(populate);

    displays.forEach(populate);

    function populate(device) {
        if (item.data_deviceid === device.id) {
            if ('roles' in device) {
                document.getElementById('roleDiv').style.display = '';

                device.roles.forEach(role => {
                    let drpOption = new Option();
                    /* determine if the object is a string or an object.  */
                    if (typeof (role) === 'string') {
                        drpOption.text = role;
                        drpOption.value = role;
                    } else {
                        for (const [key, value] of Object.entries(role)) {
                            drpOption.text = value;
                            drpOption.value = key;
                        }
                    }
                    document.getElementById('drpRole').add(drpOption, undefined);
                })
            }
        }
    }
}

/* used to updateFormateDetailsTab based on the id shown on the webpage */
function updateFormatDetailsUpdate() {
    if (!document.getElementById('itemId').innerText.startsWith('Unknown')) {
        updateFormatDetails(document.getElementById('itemId').innerText);
    }

}

/* Estimates the top elevation of a display and populates the itemTopElevation text box */
function fillInTopElevationDisplay(item) {
    let zHeightOfDisplay, topElevation, zPosition;
    let defaultDisplayHeight = displayHeight / 1000; /* convert to meters */
    if (roomObj.unit === 'feet') {
        defaultDisplayHeight = defaultDisplayHeight * 3.28084;
    }

    zPosition = item.data_zPosition || 0;

    zHeightOfDisplay = defaultDisplayHeight * (item.data_diagonalInches / diagonalInches);
    topElevation = zPosition + zHeightOfDisplay;
    document.getElementById("itemTopElevation").value = round(topElevation);
}

function updateFormatDetails(eventOrShapeId) {

    let shape; /* 'shape' is direct from canvans, 'item' is in roomObj JSON. */

    let itemTopElevationDiv = document.getElementById('itemTopElevationDiv');

    itemTopElevationDiv.style.display = 'none'; /* make this div invisible, only show for video devices or TV displays */

    if (typeof eventOrShapeId === 'string') {
        shape = stage.find('#' + eventOrShapeId)[0];

    } else {
        shape = eventOrShapeId.target;
    }

    if (!shape) return /* escape out of function in case the specific shape or detail does not exist, usually this happens with a new template load */

    if (shape.data_deviceid === 'backgroundImageFloor') return; /* background image is not editable in the format details pane */

    let id = shape.attrs.id;

    let parentGroup = shape.getParent().name();

    if (parentGroup === 'tables' || parentGroup === 'stageFloors') {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = false;
    } else {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = true;
    }

    /* make execptions for certain tables where only width or length can be changed */
    if (shape.data_deviceid.startsWith('wall')) {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = false;
    }

    if (shape.data_deviceid.startsWith('tblSchoolDesk')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
    }

    if (shape.data_deviceid.startsWith('tblPodium')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
    }

    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            let x, y;

            let isPrimaryDiv = document.getElementById('isPrimaryDiv');
            let isPrimaryCheckBox = document.getElementById('isPrimaryCheckBox');
            let singleShadingDiv = document.getElementById('singleShadingDiv');


            singleShadingDiv.style.visibility = 'hidden'; /* start as hidden, but make visible if item supports shading guidances */

            isPrimaryCheckBox.disabled = true;
            isPrimaryCheckBox.checked = false;
            isPrimaryDiv.style.display = 'none';

            if (parentGroup === 'tables' || parentGroup === 'stageFloors') {
                x = shape.x();
                y = shape.y();

            } else {
                let xy = getShapeCenter(shape);
                x = xy.x;
                y = xy.y;
            }

            if ('data_diagonalInches' in item && !item.data_deviceid.match(/brdPro|boardPro|webexDesk/)) {
                document.getElementById('itemDiagonalTvDiv').style.display = '';
                document.getElementById('itemDiagonalTv').value = shape.data_diagonalInches;
                itemTopElevationDiv.style.display = '';
                if (parentGroup === 'displays') {
                    fillInTopElevationDisplay(item);
                }

            } else {
                document.getElementById('itemDiagonalTvDiv').style.display = 'none';

            }

            if ('data_diagonalInches' in item) {
                singleShadingDiv.style.visibility = 'visible';

                if (roomObj.layersVisible.grDisplayDistance) {
                    document.getElementById('btnDisplayDistanceSingleItem').disabled = false;
                } else {
                    document.getElementById('btnDisplayDistanceSingleItem').disabled = true;
                }

                if (item.data_dispDistHidden) {
                    document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv_off';
                } else {
                    document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv';
                }
            } else {
                document.getElementById('btnDisplayDistanceSingleItem').disabled = true;
                document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'do_not_disturb_on';
            }



            if ('wideHorizontalFOV' in allDeviceTypes[item.data_deviceid]) {
                singleShadingDiv.style.visibility = 'visible';
                itemTopElevationDiv.style.display = '';

                let deviceVertHeight = allDeviceTypes[item.data_deviceid].height / 1000; /* device height in meters */

                if (roomObj.unit === 'feet') {
                    deviceVertHeight = deviceVertHeight * 3.28084;
                }

                document.getElementById('itemTopElevation').value = round((item.data_zPosition || 0) + deviceVertHeight);

                if (roomObj.layersVisible.grShadingCamera) {
                    document.getElementById('btnCamShadeToggleSingleItem').disabled = false;
                } else {
                    document.getElementById('btnCamShadeToggleSingleItem').disabled = true;
                }

                if (item.data_fovHidden) {
                    document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam_off';
                } else {
                    document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam';
                }
            } else {
                document.getElementById('btnCamShadeToggleSingleItem').disabled = true;
                document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'do_not_disturb_on';
            }





            if ('micRadius' in allDeviceTypes[item.data_deviceid]) {
                singleShadingDiv.style.visibility = 'visible';

                if (roomObj.layersVisible.grShadingMicrophone) {
                    document.getElementById('btnMicShadeToggleSingleItem').disabled = false;
                } else {
                    document.getElementById('btnMicShadeToggleSingleItem').disabled = true;
                }

                if (item.data_audioHidden) {
                    document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic_off';
                } else {
                    document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic';
                }

            } else {
                document.getElementById('btnMicShadeToggleSingleItem').disabled = true;
                document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'do_not_disturb_on';
            }



            if (shape.data_deviceid === 'tblRect') {
                document.getElementById('tblRectRadiusDiv').style.display = '';
                document.getElementById('tblRectRadiusRightDiv').style.display = '';
            } else {
                document.getElementById('tblRectRadiusDiv').style.display = 'none';
                document.getElementById('tblRectRadiusRightDiv').style.display = 'none';
            }

            if (shape.data_deviceid === 'tblTrap') {
                document.getElementById('trapNarrowWidthDiv').style.display = '';
            } else {
                document.getElementById('trapNarrowWidthDiv').style.display = 'none';
            }

            if (shape.data_deviceid.startsWith('wall') || shape.data_deviceid.startsWith('column') || parentGroup === 'tables' || parentGroup === 'stageFloors') {
                document.getElementById('itemVheightDiv').style.display = '';
            } else {
                document.getElementById('itemVheightDiv').style.display = 'none';
            }

            if (shape.data_deviceid.startsWith('wall') || shape.data_deviceid.startsWith('column')) {
                let itemVheight = document.getElementById('itemVheight');
                let defaultHeight = defaultWallHeight;


                if (unit === 'feet') {
                    defaultHeight = round(defaultHeight * 3.28084);
                } else {
                    defaultHeight = round(defaultHeight);
                }

                if (document.getElementById('roomHeight').value) {
                    defaultHeight = document.getElementById('roomHeight').value;
                }

                itemVheight.placeholder = round(defaultHeight);

            } else {
                let itemVheight = document.getElementById('itemVheight');
                itemVheight.placeholder = '';

            }

            document.getElementById('itemX').value = round((x - pxOffset) / scale);

            document.getElementById('itemY').value = round((y - pyOffset) / scale);

            document.getElementById('itemId').innerText = item.id;

            document.getElementById('itemType').innerText = item.data_deviceid;

            document.getElementById('itemGroup').innerText = parentGroup;

            populateDrpRole(item);

            populateDrpColor(item);

            if ('data_role' in item && item.data_role) {
                document.getElementById('drpRole').value = item.data_role.value;
            }


            if ('data_color' in item && item.data_color) {
                document.getElementById('drpColor').value = item.data_color.value;
            }

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

            if ('data_zPosition' in item) {  // data_zPosition should never be rendered.
                document.getElementById('itemZposition').value = item.data_zPosition;
            } else {
                document.getElementById('itemZposition').value = "";
            }

            if ('data_labelField' in item && item.data_labelField) {
                document.getElementById('labelField').value = item.data_labelField;
            } else {
                document.getElementById('labelField').value = "";
            }

            if ('data_trapNarrowWidth' in item && (item.data_trapNarrowWidth === 0 || item.data_trapNarrowWidth)) {
                document.getElementById('trapNarrowWidth').value = item.data_trapNarrowWidth;
            } else {
                document.getElementById('trapNarrowWidth').value = "?";
            }

            if ('data_vHeight' in item && item.data_vHeight) {
                document.getElementById('itemVheight').value = item.data_vHeight;
            } else {
                document.getElementById('itemVheight').value = "";
            }


            if ('cornerRadius' in shape.attrs) {


                if (shape.cornerRadius().length > 0) {

                    document.getElementById('tblRectRadius').value = round(shape.attrs.cornerRadius[2] / scale);

                    if (shape.attrs.cornerRadius[2] === shape.attrs.cornerRadius[0]) {
                        document.getElementById('tblRectRadiusRight').value = '';
                    } else {
                        document.getElementById('tblRectRadiusRight').value = round(shape.attrs.cornerRadius[0] / scale);
                    }
                } else {
                    document.getElementById('tblRectRadius').value = '';
                    document.getElementById('tblRectRadiusRight').value = '';
                }
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

    stage.on('dblclick dbltap', function stageOnDblclickDbltap(e) {

        if (!(mobileDevice === 'false' || mobileDevice === 'RoomOS')) {
            countConsectiveTouches();
        }


        if (document.getElementById('resizeBackgroundImageCheckBox').checked) return; /* exit out if resizing the background image */

        document.getElementById("tabItem").click();
        document.getElementById("subTabItemDetails").click();

    });

    stage.on('mousedown touchstart', function stageOnMousedownTouchstart(e) {

        if (e.target.findAncestor('.layerTransform')) {
            return;
        }

        if (panScrollableOn || selectingTwoPoints || movingBackgroundImage) {
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

    stage.on('mousemove touchmove', function stageOnMousemoveTouchmove(e) {

        if (!selecting) {
            return;
        }

        if (panScrollableOn || selectingTwoPoints || movingBackgroundImage) {
            return;
        }

        e.evt.preventDefault();

        if (!(tr.nodes().length === 1 && tr.nodes()[0].id().startsWith('backgroundImageFloor'))) {

            tr.resizeEnabled(false);
        }

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

    stage.on('mouseup touchend', function stageOnMouseupTouchend(e) {

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

        shapes = shapes.concat(groupStageFloors.getChildren());

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

        if (selected.length === 1 && (selected[0].getParent().name() === 'tables' || selected[0].getParent().name() === 'stageFloors')) {
            /* if there is a single table, make it resizable */
            resizeTableOrWall();
        }
        enableCopyDelBtn();
    });

    /* clicks should select/deselect shapes */
    stage.on('click tap', function stageOnClickTap(e) {

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

        /* do we pressed shift or ctrl? */
        const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const isSelected = tr.nodes().indexOf(e.target) >= 0;

        if (!metaPressed && !isSelected) {
            /* if no key pressed and the node is not selected */
            tr.nodes([e.target]);

            /* tables and other objects maybe resizable. */
            if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors) {
                resizeTableOrWall();
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
            // /*v0.1.513 fixed issue with shift multiple select allowing the TR Node to be resizeable if table object was selected first */
            if (tr.nodes().length > 1) {
                tr.resizeEnabled(false);
            }


        }

        enableCopyDelBtn();
    });

    tr.on('transform', function onTransform(e) {

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

    if (canvasPixelX < 10 || canvasPixelY < 10) return; /* break out funciton and do not insert image if the X or Y coordinate is negative with slight buffer */


    let attrs = { x: unitX, y: unitY };

    /* on drag end insert the default height */
    if ('defaultVert' in allDeviceTypes[deviceIdGroupName[1]]) {
        let defaultVert = allDeviceTypes[deviceIdGroupName[1]].defaultVert / 1000;
        if (roomObj.unit === 'feet') {
            defaultVert = round(defaultVert * 3.28084)
        }
        attrs.data_zPosition = defaultVert;
    }

    insertShapeItem(deviceIdGroupName[1], deviceIdGroupName[0], attrs, uuid = '', true);

    dragClientX = 0;
    dragClientY = 0;
    setTimeout(() => { canvasToJson() }, 100);


    checkForMultipleCodecs(deviceIdGroupName[1]);
}

/* Checks to see if the last item dropped is also a codec.
takes a string of the droppedItem id/data_deviceid */
function checkForMultipleCodecs(droppedItem) {

    setTimeout(() => {

        /* verify the device is in the videoDevices group && not a camera  */
        if (allDeviceTypes[droppedItem].parentGroup && allDeviceTypes[droppedItem].parentGroup === 'videoDevices' && !allDeviceTypes[droppedItem].cameraOnly) {

            /* count up all the roomObj.items.videoDevices that are not cameras only. */
            let videoDeviceCount = 0;

            roomObj.items.videoDevices.forEach((item) => {
                if (!(allDeviceTypes[item.data_deviceid].cameraOnly)) {
                    videoDeviceCount++;
                }
            })

            if (videoDeviceCount === 2) {
                /* update this later with a pretty modal and a "Don't show this message again" toggle */
                alert('\u26A0 Multiple Video Device Alert\u26A0\r\n\r\nThere are 2 video devices on the room canvas. This is allowed, but if you meant to add a camera instead, delete/undo the last action and insert a camera.')
            }

        }
    }, 1000);
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
        flexItemImage.src = `./assets/images/${frontImage}`;
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


// let videoDevicesMenu = ['roomBar', 'roomBarPro', 'roomKitEqQuadCam', 'roomKitEqPtz4k', 'roomKitEqQuadPtz4k', 'roomKitProQuadCam'];

let videoDevicesMenu = ['roomBar', 'roomBarPro', 'roomKitEqQuadCam', 'roomKitProQuadCam'];

let videoDevicesAllin1Menu = ['roomKitEqx', 'roomKitEqxFS', 'brdPro55G2', 'brdPro55G2FS', 'brdPro75G2', 'brdPro75G2FS'];

let personalVideoDevicesMenu = ['webexDeskPro', 'webexDesk', 'webexDeskMini'];

// let cameraDevicesMenu = ['ptz4k', 'quadCam', 'quadCamExt', 'quadPtz4kExt', 'roomKitEqQuadCamExt', 'rmBarProVirtualLens'];

// let cameraDevicesMenu = ['ptz4k', 'quadCam', 'roomKitEqPtz4k', 'quadCamExt', 'roomKitEqQuadCamExt', 'rmBarProVirtualLens'];

let cameraDevicesMenu = ['ptz4k', 'quadCam', 'quadCamExt', 'roomKitEqQuadCamExt', 'rmBarProVirtualLens'];

let legacyVideoDevicesMenu = ['room55', 'rmKitMini', 'roomKit', 'cameraP60', 'boardPro55', 'boardPro75'];

let microphonesMenu = ['ceilingMicPro', 'tableMicPro', 'tableMic', 'ceilingMic'];

let displaysMenu = ['displaySngl', 'displayDbl', 'displayTrpl'];

let navigatorsMenu = ['navigatorTable', 'navigatorWall', 'laptop'];

let tablesMenu = ['tblRect', 'tblEllip', 'tblTrap', 'tblShapeU', 'tblSchoolDesk', 'tblPodium'];

let wallsMenu = ['wallStd', 'wallGlass', 'wallWindow', 'columnRect', 'box'];

let chairsMenu = ['chair', 'personStanding', 'plant', 'doorRight', 'doorLeft', 'doorDouble'];

let stageFloorMenu = ['stageFloor'];

let accessibilityMenu = ['wheelchair', 'wheelchairTurnCycle', 'circulationSpace'];

createItemsOnMenu('cameraMenuContainer', videoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraMenuAllin1Container', videoDevicesAllin1Menu, 'videoDevices', videoDevices);

createItemsOnMenu('personalDevicesMenuContainer', personalVideoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraDevicesMenuContainer', cameraDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('cameraLegacyMenuContainer', legacyVideoDevicesMenu, 'videoDevices', videoDevices);

createItemsOnMenu('microphoneMenuContainer', microphonesMenu, 'microphones', microphones);

createItemsOnMenu('displaysMenuContainer', displaysMenu, 'displays', displays);

createItemsOnMenu('navigatorsMenuContainer', navigatorsMenu, 'microphones', microphones);

createItemsOnMenu('tablesMenuContainer', tablesMenu, 'tables', tables);

createItemsOnMenu('wallsMenuContainer', wallsMenu, 'tables', tables);

createItemsOnMenu('chairsMenuContainer', chairsMenu, 'chairs', chairs);

createItemsOnMenu('accessibilityMenuContainer', accessibilityMenu, 'chairs', chairs);

createItemsOnMenu('stageFloorMenuContainer', stageFloorMenu, 'stageFloors', stageFloors);

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
            /* create a new node to drag, then delete it on touchend */
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

        listItemsOffStage();


    }

    // minor update post v0.1.513 update
    /* resend message to Workspace Designer as orphaned objects can appear if you are zoomed in, so remove zoomed in */
    if (zoomValue < 102) {
        setTimeout(() => { postMessageToWorkspace(); }, 250);
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
    /* Primitive types */
    if (!["object", "function"].includes(baseType)) {
        return baseType;
    }

    /* Symbol.toStringTag often specifies the "display name" of the
     object's class. It's used in Object.prototype.toString(). */
    const tag = value[Symbol.toStringTag];
    if (typeof tag === "string") {
        return tag;
    }

    /* If it's a function whose source code starts with the "class" keyword */
    if (
        baseType === "function" &&
        Function.prototype.toString.call(value).startsWith("class")
    ) {
        return "class";
    }

    /* The name of the constructor; for example `Array`, `GeneratorFunction`, `Number`, `String`, `Boolean` or `MyCustomClass` */
    const className = value.constructor.name;
    if (typeof className === "string" && className !== "") {
        return className;
    }

    /*  At this point there's no robust way to get the type of value, so we use the base implementation. */
    return baseType;
}


/*
    Cache Images so if internet is lost, insert images to canvas still works.
    May try to determine a way so images don't need to be cached to reduce file downloads.
*/

function preLoadTopImages(list) {
    list.forEach((item) => {
        if ('topImage' in item) {
            let imageLocation = './assets/images/' + item.topImage;

            groupBackground.add();

            let imageObj = new Image();
            imageObj.onload = function imageObjOnloadPreLoad() {
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

    let typeNumber = 0;
    let errorCorrectionLevel = 'L';
    let qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(fullShareLink);
    qr.make();

    document.getElementById('qrCode').innerHTML = qr.createImgTag(); /* This should be innerHTML, no raw qurey string or raw input data is passed*/

    /*
        QR code library creates an img tag with width & height that changes with QR code.
        Remove that height and width and have it fit in its parent div.
    */

    let qrImage = document.getElementById('qrCode').firstChild;
    qrImage.removeAttribute("width");
    qrImage.removeAttribute("height");
    qrImage.style.width = '50%';

    qrImage.style.filter = '';

}


/* shorten the visible url */

function clearUrlQueryString() {
    const baseUrl = location.origin + location.pathname
    history.replaceState(null, null, baseUrl);
}

/* keep the unit as the last selected value of the end user */
function keepDefaultUnit() {

    if (localStorage.getItem('useDefaultUnitCheckBox') === 'true') return;  /* exit if 'useDefaultUnitCheckBox' was selected */

    let defaultUnit = localStorage.getItem('defaultUnit');

    if (!(defaultUnit === 'none')) {
        if (defaultUnit === 'feet' && roomObj.unit === 'meters') {
            document.getElementById('drpMetersFeet').value = 'feet';
            convertMetersFeet('noDraw');

        }
        else if (defaultUnit === 'meters' && roomObj.unit === 'feet') {
            document.getElementById('drpMetersFeet').value = 'meters';
            convertMetersFeet('noDraw');
        }
    }
}


function loadTemplate(x) {
    if (isLoadingTemplate) return;
    zoomInOut('reset');
    isLoadingTemplate = true;

    document.getElementById('dialogLoadingTemplate').showModal();

    if (mobileDevice === 'RoomOS') {

        loadTemplateTime = 1500;
    }

    resetRoomObj();
    x = x.replaceAll('+', ' ');
    x = x.replace(/(.*\d)v[0-9.]+(.*)/, `$1v${version}$2`); /* regardless of original template verion update to latest version in URL */
    x = decodeURIComponent(x);
    parseShortenedXYUrl(x);

    keepDefaultUnit();

    drawRoom(true, true);
    document.getElementById("defaultOpenTab").click();
    setTimeout(() => {
        zoomInOut('reset');
        drawRoom();
        canvasToJson();
        setTimeout(() => {
            createShareableLink();
            zoomInOut('reset');
        }, 500);


    }, 500);

    setTimeout(() => {
        isLoadingTemplate = false;
        document.getElementById('dialogLoadingTemplate').close();
    }, loadTemplateTime)

}

const fileInputImage = document.getElementById('fileInputImage');

/* change the anchors / handles depending on the selected node. Tables are resizable. Walls are resizable in 2 directions */
function resizeTableOrWall() {
    let nodes = tr.nodes();
    if (nodes.length === 1) {

        if (nodes[0].data_deviceid.startsWith('wall') || nodes[0].data_deviceid.startsWith('backgroundImageFloor')) {
            tr.enabledAnchors(['top-center', 'bottom-center']);
            tr.resizeEnabled(true);
        } else if (nodes[0].data_deviceid.startsWith('tblSchoolDesk') || nodes[0].data_deviceid.startsWith('tblPodium')) {
            tr.enabledAnchors(['middle-right', 'middle-left']);
            tr.resizeEnabled(true);
        }
        else if (nodes[0].data_deviceid.startsWith('tbl') || nodes[0].data_deviceid.startsWith('box') || nodes[0].data_deviceid.startsWith('stageFloor')) {
            tr.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
            tr.resizeEnabled(true);
        } else {
            tr.resizeEnabled(false);
        }

    }

}

/* key commands */
function onKeyDown(e) {
    const { key, target } = e;
    const { tagName } = target;
    const DELTA = 1; /* change in key movement in Canvas pixel */
    let isShortCutKeyUsed = false;

    if (key === 'e' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        downloadFileWorkspace();
    }

    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(tagName)) return;

    if (key === 'Backspace' || key === 'Delete') {
        deleteTrNodes();
        isShortCutKeyUsed = true;
    }
    else if (e.ctrlKey || e.metaKey) {

        if (key === 'y' || key === 'z') {
            e.preventDefault();
        }

        if (key === 'y' & redoArray.length > 0) {

            btnRedoClicked();
            isShortCutKeyUsed = true;
        }
        else if (key === 'z' && undoArray.length > 1) {

            btnUndoClicked();
            isShortCutKeyUsed = true;
        }
        else if (key === 'd' && tr.nodes().length > 0) {
            e.preventDefault();
            duplicateItems();
            isShortCutKeyUsed = true;
        } else if (key === 'c') {
            copyItems();
            isShortCutKeyUsed = true;
        } else if (key === 'v') {
            pasteItems(false);
            isShortCutKeyUsed = true;
        } else if (key === 'x') {
            cutItems();
            isShortCutKeyUsed = true;
        }


    }

    if (tr.nodes().length === 1) {
        let shape = tr.nodes()[0];

        if (e.keyCode === 37) {
            shape.x(shape.x() - DELTA);
            isShortCutKeyUsed = true;
        } else if (e.keyCode === 38) {
            shape.y(shape.y() - DELTA);
            isShortCutKeyUsed = true;
        } else if (e.keyCode === 39) {
            shape.x(shape.x() + DELTA);
            isShortCutKeyUsed = true;
        } else if (e.keyCode === 40) {
            shape.y(shape.y() + DELTA);
            isShortCutKeyUsed = true;
        }

        if (isShortCutKeyUsed) {
            e.preventDefault();
            updateShading(shape);
            updateFormatDetails(shape.id());
            lastKeyDownMovement = true;
        }

    }

}

function onKeyUp(e) {
    if (lastKeyDownMovement) canvasToJson();
    lastKeyDownMovement = false;
}

let lastKeyDownMovement = false;  /* keeps track if the last key command was a keyDown on the canvas to capture keyUp */

document.addEventListener('keydown', onKeyDown);

document.addEventListener('keyup', onKeyUp);

function turnOnBackgroundImageButtons() {
    document.getElementById('resizeBackgroundImageCheckBox').disabled = false;
    document.getElementById('transparencySlider').disabled = false;
    document.getElementById('btnSelect2Points').disabled = false;

}

fileInputImage.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {

        const reader = new FileReader();

        turnOnBackgroundImageButtons();

        reader.onload = function (e) {

            backgroundImageFloor.onload = function () {

                let konvaBackgroundImageFloor = createKonvaBackgroundImageFloor();

                layerBackgroundImageFloor.add(konvaBackgroundImageFloor);

                let roomPixelWidth = (scale * roomObj.room.roomWidth); // scale - pixels / roomwidth
                let roomPixelLength = (scale * roomObj.room.roomLength);

                let ratioRoomToImageWidth = backgroundImageFloor.width / roomPixelWidth;
                let ratioRoomToImageLength = backgroundImageFloor.height / roomPixelLength;


                let scaleImage = 1;

                if (ratioRoomToImageWidth > ratioRoomToImageLength) {
                    console.debug('roomScale width is larger, use roomScaleLength');
                    scaleImage = ratioRoomToImageWidth;
                } else {
                    console.debug('roomScaleLength is larger, use roomScaleWidth')

                    scaleImage = ratioRoomToImageLength;

                }

                console.debug('scaleImage', scaleImage);

                konvaBackgroundImageFloor.width(backgroundImageFloor.width / scaleImage);

                konvaBackgroundImageFloor.height(backgroundImageFloor.height / scaleImage);

                konvaBackgroundImageFloor.name(fileInputImage.value.replace(/C:\\fakepath\\/gm, ''));

                setTimeout(() => {
                    canvasToJson();
                }, 2000);


            };
            backgroundImageFloor.src = e.target.result;


            ;
        };
        reader.readAsDataURL(e.target.files[0]);
        drawScaledLineMode = true;
    }
});

const fileJsonUpload = document.getElementById('fileUpload');

fileJsonUpload.addEventListener('change', function (e) {

    if (e.target.files && e.target.files[0]) {
        let reader = new FileReader();
        reader.readAsText(e.target.files[0]);
        reader.onload = function (e) {
            let jsonFile = JSON.parse(reader.result);


            backgroundImageFloor.src = structuredClone(jsonFile.backgroundImageSrc);

            delete jsonFile.backgroundImageSrc;

            roomObj = structuredClone(jsonFile);

            drawRoom(true);
        };
    }
});

/* The  downloadFileWorkspace() determines if the Unit is meters or feet and converts roomObj temporarily to meters along with the Canvas drawing */

function downloadJsonFile() {
    let downloadRoomName;
    let roomObj2 = structuredClone(roomObj);
    if (konvaBackgroundImageFloor.name() != '') {
        roomObj2.backgroundImageSrc = backgroundImageFloor.src;
    }
    const link = document.createElement("a");
    const content = JSON.stringify(roomObj2, null, 5);
    const file = new Blob([content], { type: 'text/plain' });

    downloadRoomName = roomObj.name;

    if (downloadRoomName == '') {
        downloadRoomName = 'Video Room Calc';
    }
    link.href = URL.createObjectURL(file);
    downloadRoomName = downloadRoomName.replace(/[/\\?%*:|"<>]/g, '-');
    downloadRoomName = downloadRoomName.trim() + '.json';
    link.download = downloadRoomName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function downloadFileWorkspace() {

    let workspaceObj = convertRoomObjToWorkspace(roomObj);

    downloadJsonWorkpaceFile(workspaceObj);
}


function workspaceView(isNewTab = 'false') {
    let urlWorkspaceView = './assets/workspacedesignerview.html';
    let workspaceObj = convertRoomObjToWorkspace(roomObj);
    let localStorageObj = {};
    localStorageObj.sessionId = sessionId;
    localStorageObj.workspace = workspaceObj;
    setItemForLocalStorage('workspace', JSON.stringify(localStorageObj, null, 5));

    urlWorkspaceView += '?session=' + sessionId;

    if (isNewTab === 'newTab') {
        urlWorkspaceView += '&tab';
        window.open(urlWorkspaceView);
    } else {
        window.open(urlWorkspaceView, "_self");
    }
}

/* Opens the Workspace Designer  */
function openWorkspaceWindow() {


    let newTab = "https://prototypes.cisco.com/roomdesigner2/#/room/custom"

    let btnWorkspace = document.getElementById('btnWorkspace');

    lastAction = "btnClick open Workspace Designer";

    if (btnWorkspace.children[0].textContent === 'deployed_code_alert') {
        reloadWorkspaceIcon();
        lastAction = "btnClick Workspace Designer No VPN";
    } else {
        lastAction = "btnClick Workspace Designer";
    }

    postHeartbeat();

    /* VPN and querystring ?testProduction needed to test against production */
    if (testProduction && btnWorkspace.children[0].textContent === 'deployed_code') {
        newTab = "https://www.webex.com/us/en/workspaces/workspace-designer.html#/room/boardroom/1";
    }

    // newTab = 'http://127.0.0.1:5001/assets/receiver.html';   // used for testing.

    workspaceWindow = window.open(newTab, sessionId);

    /* send initial post message 3 times in case page is opening slow */
    setTimeout(() => {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }, 1000);

    setTimeout(() => {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }, 3000);

    setTimeout(() => {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }, 5000);

}

function openModalWorkspace() {
    reloadWorkspaceIcon();
    document.getElementById('modalWorkspace').showModal();
}

function closeModalWorkspace() {
    document.getElementById('modalWorkspace').close();
}

function openDetailsRoomTab() {
    document.getElementById('modalWorkspace').close();
    document.getElementById("tabItem").click();
    document.getElementById("subTabRoomDetails").click();

}


function postMessageToWorkspace() {
    if (workspaceWindow) {
        workspaceWindow.postMessage({ plan: convertRoomObjToWorkspace() }, '*');
    }
}

window.addEventListener(
    "message",
    (event) => {
        if (event.origin.startsWith('https://prototypes.cisco.com/') || event.origin.startsWith('https://www.webex.com/') || event.origin.startsWith('https://collabexperience.com/') || event.origin.startsWith('http://127.0.0.1:5001/')) {
            console.info('received postMessage() back: ', event.data);
        }
    },
    false,
);

/* addDefaultsToWorkspaceObj() - looks at workspaceKey and compares to videoDevices, chairs, displays and microphones and adds the first role, model or color to the workspaceKey - overwriting if it already exists */

addDefaultsToWorkspaceObj();

function returnStringOfDefaultRoleColor(keyValue) {
    let defaultRole;

    if (typeof (keyValue[0]) === 'string') {
        defaultRole = keyValue[0];

    } else {
        for (const [key, value] of Object.entries(keyValue[0])) {
            defaultRole = key;
        }
    }

    return defaultRole;
}

function addDefaultsToWorkspaceObj() {
    compareAdd(videoDevices);
    compareAdd(microphones);
    compareAdd(displays);
    compareAdd(chairs);

    function compareAdd(items) {
        let workspaceKeyArray = Object.keys(workspaceKey)
        workspaceKeyArray.forEach(key => {
            items.forEach((item) => {
                if (item.id === key) {
                    if ('roles' in item && item.roles) {
                        workspaceKey[key].role = returnStringOfDefaultRoleColor(item.roles);
                    }

                    if ('colors' in item && item.colors) {
                        workspaceKey[key].color = returnStringOfDefaultRoleColor(item.colors);
                    }

                    if ('models' in item && item.models) {
                        workspaceKey[key].model = returnStringOfDefaultRoleColor(item.models);
                    }
                }
            })
        })
    }

}


function convertRoomObjToWorkspace() {

    let swapXY = true;

    let roomObj2 = structuredClone(roomObj);  /* clone roomObj to make changes to units */

    roomObj2 = convertToMeters(roomObj2); /* convertToMeters() changes feet to meters and marks anything not on the canvas as data_hiddenInDesigner = true;  */

    let workspaceObj = {};
    workspaceObj.title = '';
    workspaceObj.roomShape = {};
    workspaceObj.roomShape.manual = true;
    if (swapXY) {
        workspaceObj.roomShape.width = roomObj2.room.roomWidth;
        workspaceObj.roomShape.length = roomObj2.room.roomLength;
    } else {
        workspaceObj.roomShape.width = roomObj2.room.roomLength;
        workspaceObj.roomShape.length = roomObj2.room.roomWidth;
    }


    if ('roomHeight' in roomObj2.room) {
        if ((roomObj2.room.roomHeight == 0 || roomObj2.room.roomHeight == '')) {
            workspaceObj.roomShape.height = 2.5;
        } else {
            workspaceObj.roomShape.height = roomObj2.room.roomHeight;
        }
    }


    if (roomObj.software) {
        workspaceObj.meetingPlatform = roomObj.software;
    }

    // workspaceObj.peripherals = {};
    // workspaceObj.peripherals.navigator = true;
    // workspaceObj.peripherals.scheduler = true;

    workspaceObj.customObjects = [];

    workspaceObj.source = {};
    workspaceObj.source.name = 'vrc';
    workspaceObj.source.url = fullShareLinkCollabExpBase;
    workspaceObj.source.version = version;

    if (document.getElementById('removeDefaultWallsCheckBox').checked === true) {
        delete workspaceObj.roomShape;

        let wallWidth = 0.10 + 0.02; /* Add in the floor width to include the outer wall */
        let floor = {
            "x": 0 - wallWidth,
            "y": 0 - wallWidth,
            "rotation": 0,
            "data_deviceid": "wall",
            "id": "primaryFloor",
            "data_zPosition": -0.1,
            "data_vHeight": 0.1,
            "width": roomObj2.room.roomWidth + (wallWidth * 2),
            "height": roomObj2.room.roomLength + (wallWidth * 2)
        };

        if (!swapXY) {
            floor.width = roomObj2.room.roomLength;
            floor.height = roomObj2.room.roomWidth;
        }

        workspaceObjWallPush(floor);
    }

    if (roomObj.workspace.addCeiling === true) {
        let wallWidth = 0;
        let ceiling = {
            "x": 0 - wallWidth,
            "y": 0 - wallWidth,
            "rotation": 0,
            "data_deviceid": "ceiling",
            "id": "primaryCeiling",
            "data_zPosition": roomObj2.room.roomHeight || defaultWallHeight,
            "data_vHeight": 0.01,
            "width": roomObj2.room.roomWidth + (wallWidth * 2),
            "height": roomObj2.room.roomLength + (wallWidth * 2)
        };

        if (!swapXY) {
            ceiling.width = roomObj2.room.roomLength;
            ceiling.height = roomObj2.room.roomWidth;
        }

        workspaceObjWallPush(ceiling);
    }


    if (roomObj2.name == null || roomObj2.name == '') {
        workspaceObj.title = 'Custom Room';
    } else {
        workspaceObj.title = roomObj2.name;
    }

    roomObj2.items.chairs.forEach((item) => {



        if (item.data_deviceid === 'wheelchairTurnCycle') {
            let newItem = structuredClone(item);
            newItem.width = 1.5;
            newItem.height = 1.5;
            let xy = findUpperLeftXY(newItem);
            let fakeTable = { data_deviceid: 'tblEllip', id: 'wheelChairRound-' + item.id, rotation: item.rotation, data_zPosition: -0.07, data_vHeight: 0.1, width: 1.5, height: 1.5, x: xy.x, y: xy.y };

            workspaceObjTablePush(fakeTable);

        }

        workspaceObjItemPush(item);


    });

    roomObj2.items.microphones.forEach((item) => {
        workspaceObjItemPush(item);
    });

    roomObj2.items.tables.forEach((item) => {
        if (item.data_deviceid) {
            if (item.data_deviceid.startsWith('tbl')) {
                workspaceObjTablePush(item);
            } else if (item.data_deviceid.startsWith('wall') || item.data_deviceid.startsWith('column') || item.data_deviceid.startsWith('floor') || item.data_deviceid.startsWith('box')) {
                workspaceObjWallPush(item);
            }
        }
    });

    roomObj2.items.stageFloors.forEach((item) => {
        if (item.data_deviceid) {
            item.id = 'stageFloor~' + item.id;
            if (item.data_deviceid.startsWith('stageFloor')) {
                workspaceObjWallPush(item);
            }
        }
    });

    roomObj2.items.videoDevices.forEach((item) => {
        workspaceObjItemPush(item);
    });

    roomObj2.items.displays.forEach((item) => {
        let displayRatio = 1.02;
        if (item.data_deviceid === 'displayDbl' || item.data_deviceid === 'displayTrpl') {
            let leftDisplay = structuredClone(item);
            let rightDisplay = structuredClone(item);
            let centerDisplay = structuredClone(item);
            let deltaX = (item.data_diagonalInches / 12 / 3.804 * displayRatio) / 2; /* convert inches to meters, multiply by ratio and take half */
            if (item.data_deviceid === 'displayTrpl') {
                deltaX = deltaX * 1.98;
                centerDisplay.data_deviceid = 'displaySngl';
                centerDisplay.id = 'centerScreen~' + centerDisplay.id;
                centerDisplay.role = 'firstScreen';
                workspaceObjDisplayPush(centerDisplay);

            }
            let deltaY = 0;

            let leftDisplayXY = findNewTransformationCoordinate(item, -deltaX, deltaY);
            let rightDisplayXY = findNewTransformationCoordinate(item, deltaX, deltaY);

            leftDisplay.data_deviceid = 'displaySngl';
            leftDisplay.id = 'secondScreen-L~' + leftDisplay.id;
            leftDisplay.x = leftDisplayXY.x;
            leftDisplay.y = leftDisplayXY.y;
            leftDisplay.role = 'secondScreen';
            workspaceObjDisplayPush(leftDisplay);

            rightDisplay.data_deviceid = 'displaySngl';
            rightDisplay.id = 'firstScreen-R~' + rightDisplay.id;

            rightDisplay.x = rightDisplayXY.x;
            rightDisplay.y = rightDisplayXY.y;
            rightDisplay.role = 'firstScreen';

            workspaceObjDisplayPush(rightDisplay);

        } else {
            item.role = 'firstScreen';
            workspaceObjDisplayPush(item);
        }
    })


    function workspaceObjItemPush(newItem) {

        let x, y, attr;
        let z = 0;
        let item = structuredClone(newItem);

        if ((item.data_deviceid in workspaceKey)) {
            attr = workspaceKey[item.data_deviceid];
        } else {
            /* need to write to log and on screen for end user */
            console.info('Item not in workSpaceKey', item.data_deviceid);
            attr = workspaceKey.customVRC;
            attr.model = item.data_deviceid;
        }

        if (item.data_deviceid.startsWith('roomKitEqx')) {

            let newData_zPosition, deltaY;
            let leftDisplay = structuredClone(item);
            let rightDisplay = structuredClone(item);
            let displayRatio = 1.02;

            /* if the data_zPosition (height) is blank or null, set to 0 */
            if (!item.data_zPosition) {
                item.data_zPosition = 0;
            }

            let deltaX = (item.data_diagonalInches / 12 / 3.804 * displayRatio) / 2; /* convert inches to meters, multiply by ratio and take half */

            let newDisplayHeight = item.data_diagonalInches / diagonalInches * displayHeight / 1000;

            if (item.data_deviceid === 'roomKitEqxFS') {
                // newData_zPosition = 1.8 + Number(item.data_zPosition) - newDisplayHeight;
                newData_zPosition = 1.76 + Number(item.data_zPosition) - newDisplayHeight;
                deltaY = -0.07;
            }
            else {
                newData_zPosition = 1.081 + Number(item.data_zPosition) - newDisplayHeight;
                deltaY = -0.12;
            }

            let leftDisplayXY = findNewTransformationCoordinate(item, -deltaX, deltaY);
            let rightDisplayXY = findNewTransformationCoordinate(item, deltaX, deltaY);

            leftDisplay.data_deviceid = 'displaySngl';
            leftDisplay.id = 'secondScreen-L~' + item.data_deviceid + '-' + leftDisplay.id;
            leftDisplay.x = leftDisplayXY.x;
            leftDisplay.y = leftDisplayXY.y;
            leftDisplay.data_zPosition = newData_zPosition;
            leftDisplay.role = 'secondScreen';
            workspaceObjDisplayPush(leftDisplay);

            rightDisplay.data_deviceid = 'displaySngl';
            rightDisplay.id = 'firstScreen-R~' + item.data_deviceid + '-' + rightDisplay.id;

            rightDisplay.x = rightDisplayXY.x;
            rightDisplay.y = rightDisplayXY.y;
            rightDisplay.data_zPosition = newData_zPosition;
            rightDisplay.role = 'firstScreen';

            workspaceObjDisplayPush(rightDisplay);

        }



        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") z = item.data_zPosition;
        }


        if ('yOffset' in attr || 'xOffset' in attr) {
            let yOffset = 0;
            let xOffset = 0;
            if ('yOffset' in attr) yOffset = attr.yOffset;
            if ('xOffset' in attr) xOffset = attr.xOffset;
            let newXY = findNewTransformationCoordinate(item, xOffset, yOffset);
            item.y = newXY.y;
            item.x = newXY.x;
        }

        x = (item.x - (roomObj2.room.roomWidth) / 2);
        y = (item.y - (roomObj2.room.roomLength) / 2);

        if ('vertOffset' in attr) {
            z = z + attr.vertOffset;
        }

        let workspaceItem = {
            id: item.id,
            "position": [
                (swapXY ? x : y),
                z,
                (swapXY ? y : x)
            ],
            "rotation": [
                0,
                (item.rotation * -(Math.PI / 180)),
                0
            ]
        }

        workspaceItem = { ...workspaceItem, ...attr };

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }



        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }

        if ('vertOffset' in workspaceItem) {
            delete workspaceItem.vertOffset;
        }

        if ('yOffset' in workspaceItem) {
            delete workspaceItem.yOffset;
        }

        if ('xOffset' in workspaceItem) {
            delete workspaceItem.xOffset;
        }

        workspaceObj.customObjects.push(workspaceItem);
    }

    function workspaceObjDisplayPush(item) {

        let x, y;
        let z = displayHeight / 1000;
        let displayScale = item.data_diagonalInches / 55;
        let attr = workspaceKey[item.data_deviceid];

        z = z * displayScale / 2; /* center of display */

        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") {
                z = item.data_zPosition + z;
            };
        }
        if ('yOffset' in attr || 'xOffset' in attr) {
            let yOffset = 0;
            let xOffset = 0;
            if ('yOffset' in attr) yOffset = attr.yOffset;
            if ('xOffset' in attr) xOffset = attr.xOffset;
            let newXY = findNewTransformationCoordinate(item, xOffset, yOffset);
            item.y = newXY.y;
            item.x = newXY.x;
        }

        x = (item.x - (roomObj2.room.roomWidth) / 2);
        y = (item.y - (roomObj2.room.roomLength) / 2);

        let workspaceItem = {
            id: item.id,
            "position": [
                (swapXY ? x : y),
                z,
                (swapXY ? y : x)
            ],
            "rotation": [
                0,
                (item.rotation * -(Math.PI / 180)),
                0
            ],
            size: item.data_diagonalInches,
            "role": item.role
        }

        workspaceItem = { ...attr, ...workspaceItem };

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }


        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }

        if ('yOffset' in workspaceItem) {
            delete workspaceItem.yOffset;
        }

        if ('xOffset' in workspaceItem) {
            delete workspaceItem.xOffset;
        }

        workspaceObj.customObjects.push(workspaceItem);
    }

    function workspaceObjTablePush(item) {

        let x, y, z, vh, workspaceItem;
        z = 0;
        vh = 0;

        let xy = getItemCenter(item);

        let attr = workspaceKey[item.data_deviceid];

        x = (xy.x - roomObj2.room.roomWidth / 2);
        y = (xy.y - roomObj2.room.roomLength / 2);

        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") z = item.data_zPosition;
        } else {
            z = 0;
        }

        if ('data_vHeight' in item) {
            if (item.data_vHeight != "") {
                vh = item.data_vHeight + vh;
            } else {
                vh = null;
            }
        }

        workspaceItem = {
            id: item.id,
            "position": [
                (swapXY ? x : y),
                z,
                (swapXY ? y : x)
            ],
            "rotation": [
                0,
                (item.rotation * -(Math.PI / 180)),
                0
            ],
            "width": item.width,
            "length": item.height
        }

        if (vh) {
            workspaceItem.height = vh;
        }

        /* tblSchoolDesk does not support radius or radiusRight in the Workspace Designer, remove if present */
        if ('tblRectRadius' in item && item.data_deviceid != 'tblSchoolDesk') {
            workspaceItem.radius = item.tblRectRadius;
        }

        if ('tblRectRadiusRight' in item && item.data_deviceid != 'tblSchoolDesk') {
            workspaceItem.radiusRight = item.tblRectRadiusRight;
        }

        /* flip school desks around when converting from the VRC to the Designer.  This way the desk is facing forward when rendered */
        if (item.data_deviceid === 'tblSchoolDesk') {
            workspaceItem.rotation = [0, ((item.rotation - 180) * -(Math.PI / 180)), 0];
        }

        /* The Workspace handles trapezoid/tappered tables differently than the VRC.  Make the conversion */
        if (item.data_deviceid === 'tblTrap') {
            if (item.data_trapNarrowWidth < item.width) {
                workspaceItem.width = Number(item.data_trapNarrowWidth);
                workspaceItem.taper = item.width - item.data_trapNarrowWidth;
            }
            else {
                workspaceItem.width = Number(item.width); /* if data_trapNarrowWidth > table.width, just use the table.width */
                workspaceItem.taper = 0;
            }
        }

        workspaceItem = { ...workspaceItem, ...attr };

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }


        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }



        workspaceObj.customObjects.push(workspaceItem);
    }

    function workspaceObjWallPush(item) {

        let x, y, z, verticalHeight, workspaceItem;

        let xy = getItemCenter(item);

        let attr = workspaceKey[item.data_deviceid];

        x = (xy.x - roomObj2.room.roomWidth / 2);
        y = (xy.y - roomObj2.room.roomLength / 2);

        verticalHeight = defaultWallHeight;

        if ('data_vHeight' in item && item.data_vHeight) {
            verticalHeight = item.data_vHeight;
        } else {
            verticalHeight = roomObj2.room.roomHeight || defaultWallHeight;
        }

        if (isNaN(verticalHeight)) {
            verticalHeight = Number(defaultWallHeight);
        }

        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") {
                z = item.data_zPosition + (verticalHeight / 2);
            } else {
                z = (verticalHeight / 2);
            }

        } else {
            z = (verticalHeight / 2);
        }

        workspaceItem = {
            "objectType": "wall",
            id: item.id,
            "position": [
                (swapXY ? x : y),
                z,
                (swapXY ? y : x)
            ],
            "rotation": [
                0,
                ((item.rotation - 90) * -(Math.PI / 180)),
                0
            ],
            "height": verticalHeight,
            "length": item.height,
            "width": item.width
        }

        if (item.id === 'primaryCeiling') {
            workspaceItem.scale = [item.height, verticalHeight, item.width];
            workspaceItem.objectType = 'ceiling';
            delete workspaceItem.height;
            delete workspaceItem.length;
            delete workspaceItem.width;
        }



        workspaceItem = { ...workspaceItem, ...attr };

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }


        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }

        workspaceObj.customObjects.push(workspaceItem);
    }


    return workspaceObj;

}

function parseDataLabelFieldJson(item, workspaceItem) {
    let jsonPart = /{.*?}/.exec(item.data_labelField);
    if (jsonPart) {
        try {
            let newKeyValues = JSON.parse(jsonPart[0]);
            workspaceItem = { ...workspaceItem, ...newKeyValues }
        } catch {
            console.info('Error parsing JSON ', jsonPart);
        }
    }

    return workspaceItem;
}
// function parseDataLabelFieldJson(item, workspaceItem) {
//     let jsonLabelString = /{(.*?)}/.exec(item.data_labelField);

//     jsonLabelString = jsonLabelString.replace()

//         try {
//             let newKeyValues = JSON.parse('{' + newParts.join() + '}');
//             workspaceItem = { ...workspaceItem, ...newKeyValues }
//         } catch {
//             console.info('Error parsing JSON ', jsonParts);
//         }
//     }

//     return workspaceItem;
// }

/* original thought on parseDataLavelFieldJson to parse based on commas, then keep very short wild cards.  However, a 2nd level nested object or array with commas would break this solution.  It is work coming back to */
// function parseDataLabelFieldJson(item, workspaceItem) {
//     let jsonParts = /{(.*?)}/.exec(item.data_labelField);
//     let newParts = [];

//     if (jsonParts && jsonParts[1]) {
//         let jsonPartsArray = jsonParts[1].split(/,(?=(?:(?:[^"[\]{}]*["[\]{}]){2})*[^"[\]{}]*$)/);  /* split string ignoring quotes source: https://stackoverflow.com/questions/11456850/ */

//         jsonPartsArray.forEach((jsonPart, index)=>{
//             let newPart;
//             jsonPart = jsonPart.trim();
//             // newPart = jsonPart.replace(/[Oo]\s*([\d.]+)/,'\"opacity\":\"$1\"')
//             newPart = jsonPart.replace(/hide/i, `"hidden":true`);
//             newParts.push(newPart)
//         })



//         try {
//             let newKeyValues = JSON.parse('{' + newParts.join() + '}');
//             workspaceItem = { ...workspaceItem, ...newKeyValues }
//         } catch {
//             console.info('Error parsing JSON ', jsonParts);
//         }
//     }

//     return workspaceItem;
// }

function downloadJsonWorkpaceFile(workspaceObj) {

    let downloadRoomName;
    const link = document.createElement("a");
    const content = JSON.stringify(workspaceObj, null, 5);
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    downloadRoomName = workspaceObj.title.replace(/[/\\?%*:|"<>]/g, '-');
    downloadRoomName = downloadRoomName.trim() + '.json';
    link.download = downloadRoomName;
    link.click();
    URL.revokeObjectURL(link.href);
}

/* if on Cisco VPN, this icon loads and lets the user know that the Workspace is available */
function workspaceIconLoad() {
    clearTimeout(vpnTestTimer);
    toggleWorkspace(true);
}

function toggleWorkspace(isOn = true) {
    let button = document.getElementById('btnWorkspace');
    if (isOn) {
        button.children[0].textContent = 'deployed_code';
        button.children[0].style.color = '';
        document.getElementById('workspaceIcon').style.display = '';
        document.getElementById('vpnRequiredLabel').classList.remove('highlightRed');

    } else {

        button.children[0].textContent = 'deployed_code_alert';
        button.children[0].style.color = 'lightgray';
        document.getElementById('workspaceIcon').style.display = 'none';
        document.getElementById('vpnRequiredLabel').classList.add('highlightRed');

    }
}

toggleWorkspace(false);


function reloadWorkspaceIcon() {
    let workspaceIcon = document.getElementById('workspaceIcon');
    let source = 'https://prototypes.cisco.com/roomdesigner2/images/appicon.png'
    workspaceIcon.src = source + "?" + new Date().getTime();

    vpnTestTimer = setTimeout(() => {  /* if the workspaceIcon does not load in x milliseconds, timer will change the label to red */
        toggleWorkspace(false)
    }, 1000);
}



/*
    Attribution:

    Konva.js: https://konvajs.org/ - MIT license can be found at https://github.com/konvajs/konva/blob/master/LICENSE

    DOMPurify: https://github.com/cure53/DOMPurify license can be found at https://github.com/cure53/DOMPurify/blob/main/LICENSE

*/