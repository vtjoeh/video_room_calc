const version = "v0.1.637";  /* format example "v0.1" or "v0.2.3" - ver 0.1.1 and 0.1.2 should be compatible with a Shareable Link because ver, v0.0, 0.1 and ver 0.2 are not compatible. */
const isCacheImages = true; /* Images for Canvas are preloaded in case of network disruption while being mobile. Turn to false to save server downloads */
let perfectDrawEnabled = false; /* Konva setting. Turning off helps with performance but reduces image quality of canvas.  */
let versionQueryString;
let timerQRcodeOn;
let roomCanvas = "roomCanvas"; // roomCanvas will replace videoRoomCalcSVG
let pxOffset = 50; // margin on the picture in pixels
let pyOffset = pxOffset;
let outerwallPxOffset = pxOffset;
let outerwallPyOffset = pxOffset;
let scale = 50; /* Scale of image. initial value.  Will be recalculated before drawing image */
let divRmContainerDOMRectwidth;
let roomWidth = 20;  /* initial values */
let roomLength = 20;  /* inital values */
let isRotatingRoom = false; /* keep track if the room is being rotated */
let blockKeyActions = false; /* keep key inputs from happening */
let isActiveRoomPart = false;
let activeRoomPartItem; /* keep track of Node when isActiveRoomPart = true */
let activeRoomLength; /* on zoom of a Room Part, keep track of the active Room Length or Room Width */
let activeRoomWidth;
let activeRoomY = 0;
let activeRoomX = 0;
let activeRoomAbsPoints; /* array of points defining the active room */
let multiUpdateMode = false;

let mobileDevice; /* Either 'true' / 'false' as a string */
let windowOuterWidth = window.outerWidth;  //  keep track of outer width/height for room zoom
let windowOuterHeight = window.outerHeight;
let pxLastGridLineY;
let roomName = '';
let defaultWallHeight = 2.5; /* meters. Overwirtten by Wall Height field */


const defaultWorkspaceTab = "https://www.webex.com/us/en/workspaces/workspace-designer.html#/room/custom"; /* URL for custom rooms. Internal test against "https://prototypes.cisco.com/roomdesigner-007/#/room/custom"; */
let newWorkspaceTab = defaultWorkspaceTab;
let defaultWorkspaceTestSite = 'https://designer.cisco.com/#/room/custom'; /* if the URL is not http://collabexperience.com, then use the test site */
let workspaceWindow; /* window representing the workspace designer window being open */
let iFrameWorkspaceWindow; /* Window reprsenting the iframe */
let firstLoad = true; /* set to false after onLoad is run the first time */
let zoomValue = 100;
let smallItemsHighlight = false; /* keep track if small items have a highlight */
let sizeToAddOultine = 500; /* mm size to make small items highlighted */
let workspaceDesignerTestUrl; /* used to store workspace designer URL when testing only */
let toolTipTextTimeout; /* timer used for toolTipText on coverage buttons */
let toolTipTextTimeout2; /* timer used for toolTipText2 on coverage buttons */

let lastSelectedNodePosition; /* keep track of the last node selected, make a structured clone of it to keep track of position */
let lastSelectionGuideLines = {};
let lastTrNodesWithShading = []; /* keep track of the TR Nodes that have shading */
let rightClickMenuDialogLastPosition = {}; /* last position of the rightClickMenuDialog when last opened. Used when updating the position. */


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

// let layerBackgroundImageFloor = new Konva.Layer({
//     name: 'layerBackgroundImageFloor'
// })

let layerBackgroundImageFloor = new Konva.Group({
    name: 'layerBackgroundImageFloor'
})

const sessionId = createUuid(); /* Each browser session has a unique sessionId to keep track of statistics. No cookies used for this. */
const startTime = new Date(Date.now()); /* startTime is for statistics */
const clientTimeStamp = startTime.toUTCString();
let fullShareLink;
let fullShareLinkCollabExpBase; /* fullSharelink used the full domain and path.  shareLinkCollabExpBase only uses https://collabexperience.com/?x= */
let lastAction = "load";
let isBackgroundImageFloorFileLoad = false; /* keep track if the backgroundImageFloor is being loaded as part of a JSON file */
let quickSetupState = 'disabled'; /* QuickSetupState states are changed by program to 'update', 'disabled' or 'insert' to see if quick setup menu works */
let primaryDeviceIsAllInOne = false; /* keep track if the primary device is all in one */
let idKeyObj = {}; /* keep the vavlue pair { 'id' : 'key' } of the different categories in 1 object */
let keyIdObj = {}; /* keep the vavlue pair { 'key' : 'id' } of the different categories in 1 object */
let allDeviceTypes = {}; /* a list of all device types merged using the id/data_deviceType as the key */
let roomObj = {}; /* used to store the room data in JSON format.  redraw(true) rebuilds the entire room from the roomObj JSON */

roomObj.roomId = createRoomId();
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
roomObj.layersVisible.grLabels = false; /* true or false */

roomObj.items.videoDevices = [];
roomObj.items.chairs = [];
roomObj.items.tables = [];
roomObj.items.stageFloors = [];
roomObj.items.boxes = [];
roomObj.items.rooms = [];
roomObj.items.displays = [];
roomObj.items.speakers = [];
roomObj.items.microphones = [];
roomObj.items.touchPanels = [];

roomObj.workspace.removeDefaultWalls = false; /* Workspace Designer setting to remove the default wall on export */
roomObj.workspace.addCeiling = false; /* Add a semi-transparent ceiling on export to the Workspace Designer */
roomObj.workspace.theme = 'standard'; /* 'christmas' or 'standard' in the Workspace Designer */

let defaultRoomSurfaces = {
    leftwall: { type: 'regular', acousticTreatment: true },
    videowall: { type: 'regular', acousticTreatment: false },
    rightwall: { type: 'regular', acousticTreatment: false },
    backwall: { type: 'regular', acousticTreatment: false }
}

roomObj.roomSurfaces = structuredClone(defaultRoomSurfaces);


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

let defaultWallHighlightTimer; /* timer to make sure default walls highlight gets turned of */

let highlightedSelectNodeTimer; /* when cameras or other objects are highlighted, this insures it gets turned off */

let rightClickTouchTimer; /* timer to allow for right click menu on touch */
let rightClickTouchTimerDelta = 1500;

let characterLimitWarningTimer; /* timer for how long before showing the */
let characterLimitWarningShow = true;

let vpnTestTimer; /* time to see if the VPN is working */

let currentDefaultWall = 'leftwall'; /* 'leftwall', 'rightwall', 'videowall', backwall' */

let stageOriginalWidth;
let stageOriginalLength;
let stageOriginalset = false;

let qrCodeAlwaysOn = false; /* QrCode is only used on RoomOS devices.  Adding &qr to the query string turns on the qrCode options */
let testProduction = false; /* For forcing to test production crosslaunch */
let testNew = false; /* used to toggle on new features */
let testiFrame = false; /* testing iFrame settings, only works on internal Cisco Workspace Designer test site */
let testiFrameInitialized = false; /* Keep track if the testing iFrame settings */
let testOffset = false; /* shows a field that configures xOffset and yOffset which is used in the items workspaceKey */

let zoomScaleX = 1;  /* zoomScaleX zoomScaleY used clicking the + or - button to zoom. */

let zoomScaleY = 1;

const PADDING = 100;

let flexItemDivName = 'flexItem-Div'; /* name of the equipment */

let kGroupLines = new Konva.Group();

let dx = 0; /* dx & dy change based on scrolling when zoomed */

let dy = 0;

let panScrollableOn = false; /* Keeps state if the canvas is scrollable */
let selecting = false; /* keeps state if in the process of selecting 2 points */
let clickedOnItemId = ''; /* keeps track of single clicked on items */

let isSelectingTwoPointsOn = false; /* Keeps state if selecting 2 points to scale background image */

let isMeasuringToolOn = false; /* keeps state of the measuring tool when selecting two points */

let isWallBuilderOn = false; /* keeps state if the wall builder feature is on */

let isShiftKeyDown = false; /* keeps state of shift key */

let isPolyBuilderOn = false; /* keeps state if the isPolyBuilderOn */

let polyBuilderMode = ''; /* '', 'customPathEditor', 'polyRoom' */

let simplePathEditorId = ''; /* keep track of id of node being edited in polyBuilder */

let isWallWriterOn2 = false;

let wallBuilderWritingState = 'none'; /* none, firstNode, writing */

let isWallWriterWriting = false;

let selectingOuterWall = false; /* if an outerwall is clicked on, turn true to keep selectionRectangle from happening */

let movingBackgroundImage = false; /* Keeps state if moving background image */

let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

let scrollContainer = document.getElementById('scroll-container');

/* mm - displayDepth, DisplayHeight, displayWidth, diagonalInches are used as a ratio to determine size of display based on diagonal inches */
let displayDepth = 90;
let displayHeight = 695;
let displayWidth = 1223;
let diagonalInches = 55; /* inches */

let displayDepth21_9 = 90;
let displayHeight21_9 = 1073;
let displayWidth21_9 = 2490;
let diagonalInches21_9 = 105;

/*************************************************/


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

workspaceKey.unknownObj = {}; /* Workspace Designer Unkown Objects on import */
workspaceKey.tblUnknownObj = {}; /* Workspace Designer Unkown Objects on import with width and length */

workspaceKey.switch = { objectType: 'switch' };

workspaceKey.switchC9200CX = { objectType: 'switch', model: "Catalyst 9200CX Series" };

workspaceKey.switchC1200 = { objectType: 'switch', model: 'Catalyst 1200 Series' }


workspaceKey.codec = { objectType: 'codec' };

workspaceKey.codecEQX = { objectType: 'codec', model: 'EQX' };
workspaceKey.codecEQ = { objectType: 'codec', model: 'Room Kit EQ' };
workspaceKey.codecPro = { objectType: 'codec', model: 'Room Kit Pro' };

workspaceKey.phoneUnknown = { objectType: 'phone', role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9841 = { objectType: 'phone', model: "9841", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9851 = { objectType: 'phone', model: "9851", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9861 = { objectType: 'phone', model: "9861", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9871 = { objectType: 'phone', model: "9871", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.roomBar = { objectType: 'videoDevice', model: 'Room Bar', color: 'light', mount: "wall", yOffset: 0.032 };
workspaceKey.roomBarPro = { objectType: 'videoDevice', model: 'Room Bar Pro', color: 'light', mount: "wall", yOffset: 0.045 };
workspaceKey.roomKitEqx = { objectType: 'videoDevice', model: 'EQX', mount: 'wall', color: 'dark', mount: "wall", yOffset: 0.076 };
workspaceKey.roomBarByod = { objectType: 'videoDevice', model: 'Room Bar BYOD', color: 'light', mount: "wall", yOffset: 0.032 };

workspaceKey.roomKitEqQuadCam = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', mount: "wall", yOffset: 0.051 };
workspaceKey.roomKitEqQuadCamExt = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', mount: "wall", yOffset: 0.051 };


workspaceKey.roomKitProQuadCam = { objectType: 'videoDevice', model: 'Room Kit Pro', mount: "wall", color: 'light' };

workspaceKey.boardPro55 = { objectType: 'videoDevice', model: 'Legacy', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046, scale: [1.4, 7, 0.5] };
workspaceKey.boardPro75 = { objectType: 'videoDevice', model: 'Legacy', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475, scale: [1.8, 9.1, 0.5] };

workspaceKey.brdPro55G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro55G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 55, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475 };
workspaceKey.brdPro75G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G2Wheel = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wheelstand', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro55G2Wheel = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wheelstand', size: 55, role: 'firstScreen', yOffset: 0.475 };

workspaceKey.brdPro55G2WS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wallstand', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro75G2WS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wallstand', size: 75, role: 'firstScreen', yOffset: 0.0475 };

workspaceKey.webexDesk = { objectType: 'videoDevice', model: 'Desk', role: 'singleScreen', yOffset: -0.08 };
workspaceKey.webexDeskPro = { objectType: 'videoDevice', model: 'Desk Pro', role: 'singleScreen' };
workspaceKey.webexDeskMini = { objectType: 'videoDevice', model: 'Desk Mini', role: 'singleScreen' };

workspaceKey.room55 = { objectType: 'videoDevice', model: 'Legacy', scale: [1.5, 12, 0.5] };
workspaceKey.rmKitMini = { objectType: 'videoDevice', model: 'Legacy', scale: [0.55, 0.9, 0.9] };
workspaceKey.roomKit = { objectType: 'videoDevice', model: 'Legacy', scale: [0.75, 0.95, 0.95] };

workspaceKey.roomKitEqxFS = { objectType: 'videoDevice', model: 'EQX', mount: 'floor', yOffset: 0.44 };
workspaceKey.roomKitEqxWS = { objectType: 'videoDevice', model: 'EQX', mount: 'wallstand', yOffset: 0.062 };

workspaceKey.cameraP60 = { objectType: 'videoDevice', model: 'Legacy', scale: [0.25, 1.5, 1] };

workspaceKey.quadCam = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadCamExt = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadPtz4kExt = { objectType: 'quadcam', role: 'crossview', yOffset: 0.076 };

workspaceKey.chair = { objectType: 'chair' };
workspaceKey.chairSwivel = { objectType: 'chair', model: 'swivel' };
workspaceKey.chairHigh = { objectType: 'chair', model: 'high' };
workspaceKey.plant = { objectType: 'plant', scale: [1, 1, 1] };
workspaceKey.tree = { objectType: 'tree', scale: [0.533, 0.533, 0.533] }

workspaceKey.tblRect = { objectType: 'table', model: 'regular' };
workspaceKey.tblShapeU = { objectType: 'table', model: 'ushape' };
workspaceKey.tblTrap = { objectType: 'table', model: 'tapered' };
workspaceKey.tblEllip = { objectType: 'table', model: 'round' };
workspaceKey.tblSchoolDesk = { objectType: 'table', model: 'schooldesk' };
workspaceKey.tblPodium = { objectType: 'table', model: 'podium' };
workspaceKey.carpet = { objectType: 'carpet', color: "#aaa" };

workspaceKey.ceilingMicPro = { objectType: 'microphone', model: 'Ceiling Mic Pro' };
workspaceKey.ceilingMount = { objectType: "ceilingMount" };
workspaceKey.tableMicPro = { objectType: 'microphone', model: 'Table Mic Pro' };
workspaceKey.tableMic = { objectType: 'microphone', model: 'Table Mic' };
workspaceKey.ceilingMic = { objectType: 'microphone', model: 'Ceiling Mic', yOffset: 0.275 };

workspaceKey.projector = { objectType: 'projector' };

workspaceKey.shareCableUsbc = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 1, multihead: 0 } };
workspaceKey.shareCableHdmi = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 0, multihead: 0 } };
workspaceKey.shareCableMulti = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 0, multihead: 1 } };
workspaceKey.shareCableUsbcHdmi = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 1, multihead: 0 } };
workspaceKey.shareCableUsbcMulti = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 1, multihead: 1 } };
workspaceKey.shareCableHdmiMulti = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 0, multihead: 1 } };
workspaceKey.shareCableUsbcHdmiMulti = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 1, multihead: 1 } };

workspaceKey.mouse = { objectType: 'mouse' };

workspaceKey.displaySngl = { objectType: 'screen', yOffset: 0.045 };

workspaceKey.displayScreen = { objectType: 'screen', model: 'canvas', yOffset: 0.02 };

workspaceKey.display21_9 = { objectType: 'screen', aspect: '21:9', yOffset: 0.045 };

workspaceKey.displayMonitor = { objectType: "monitor" }


workspaceKey.wallStd = { objectType: 'wall' };
workspaceKey.wallWindow = { objectType: 'wall', model: 'window' };
workspaceKey.ceiling = { objectType: 'ceiling' };
workspaceKey.columnRect = { objectType: 'wall', color: '#808080' };


workspaceKey.box = { objectType: 'box' }

workspaceKey.doorRight = { objectType: 'door', yOffset: -0.47, scale: [1, 1, 1] }
workspaceKey.doorLeft = { objectType: 'door', yOffset: -0.47, scale: [-1, 1, 1] }

workspaceKey.doorDoubleRight = { objectType: 'door', scale: [1, 1, 1] }
workspaceKey.doorDoubleLeft = { objectType: 'door', scale: [-1, 1, 1] }

workspaceKey.doorRight2 = { objectType: 'door', yOffset: -0.47, scale: [1, 1, 2] }
workspaceKey.doorLeft2 = { objectType: 'door', yOffset: -0.47, scale: [-1, 1, 2] }


workspaceKey.doorDouble2Right = { objectType: 'door', scale: [1, 1, 2] }
workspaceKey.doorDouble2Left = { objectType: 'door', scale: [-1, 1, 2] }

workspaceKey.floor = { objectType: 'floor' };

workspaceKey.stageFloor = { objectType: 'box', idRegex: '(^stage$)|(^step-)' };

workspaceKey.personStanding = { objectType: 'person', model: 'woman-standing' };

workspaceKey.personStandingMan = { objectType: 'person', model: 'man-standing-pen' };

workspaceKey.wheelchair = { objectType: 'person', model: 'woman-sitting-wheelchair' };

workspaceKey.wheelchairTurnCycle = { objectType: 'person', model: 'woman-sitting-wheelchair' };

workspaceKey.circulationSpace = { objectType: 'box', opacity: '0.5', color: '#8FDBCE', height: 0.02, length: 1.2, width: 1.2 };

workspaceKey.navigatorTable = { objectType: 'navigator', role: 'navigator', yOffset: 0.0400 };

workspaceKey.navigatorWall = { objectType: 'scheduler', role: 'scheduler', yOffset: 0.0575 };

workspaceKey.laptop = { objectType: 'laptop', role: 'laptop', yOffset: 0.12 };

workspaceKey.pouf = { objectType: 'pouf' };

workspaceKey.couch = { objectType: 'couch', xOffset: -0.05 };

workspaceKey.sphere = { objectType: 'sphere' };
workspaceKey.cylinder = { objectType: 'cylinder' };

workspaceKey.customVRC = { objectType: 'Customer Video Room Calc', kind: '' };

/* newer PTZ mount cameras will change the base when flipped */
workspaceKey.ptz4kMount2 = { objectType: 'camera', model: 'ptz', role: 'extended_reach', yOffset: 0.144 };

workspaceKey.ptzVision2 = { objectType: 'camera', model: 'vision', role: 'extended_reach', yOffset: 0.121 };

/* below are the older ptz cameras that don't change the base position when flipped */
workspaceKey.ptz4kMount = { objectType: 'camera', model: 'ptz', role: 'extended_reach', yOffset: 0.144 };

workspaceKey.ptz4k = { objectType: 'camera', model: 'ptz', role: 'extended_reach', yOffset: 0.183 };

workspaceKey.ptzVision = { objectType: 'camera', model: 'vision', role: 'extended_reach', yOffset: 0.121 };

workspaceKey.webcam4k = { objectType: 'webcam', model: '4k' };

workspaceKey.webcam1080p = { objectType: 'webcam', model: '1080p' };


workspaceKey.quadCam = { objectType: 'camera', model: 'quad', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadCamExt = { objectType: 'camera', model: 'quad', role: 'crossview', yOffset: 0.076 };
workspaceKey.quadPtz4kExt = { objectType: 'camera', model: 'quad', role: 'crossview', yOffset: 0.076 };
workspaceKey.wallGlass = { objectType: 'wall', model: 'glass', length: 0.03, opacity: '0.3' };
workspaceKey.tblCurved = { objectType: 'tableCurved', yOffset: 0.263 };

workspaceKey.headset980 = { objectType: 'headset', model: '980' };
workspaceKey.headset950 = { objectType: 'headset', model: '950' };
workspaceKey.headset730 = { objectType: 'headset', model: '730' };
workspaceKey.headset720 = { objectType: 'headset', model: '720' };
workspaceKey.headset560 = { objectType: 'headset', model: '560' };
workspaceKey.headset530 = { objectType: 'headset', model: '530', yOffset: -0.08 };
workspaceKey.headset320 = { objectType: 'headset', model: '320', yOffset: -0.08 };

workspaceKey.keyboard = { objectType: 'keyboard' };

workspaceKey.pathShape = { objectType: 'shape' };


/* low priority */
workspaceKey.roomKitEqPtz4k = { objectType: 'camera', model: 'ptz', role: 'crossview', yOffset: 0.205 };
workspaceKey.rmBarProVirtualLens = { objectType: 'videoDevice', model: 'Room Bar Pro', yOffset: 0.045 };
workspaceKey.roomKitEqQuadPtz4k = { objectType: 'videoDevice', model: 'Room Kit EQ' };


/* end of defining workSpaceKey */

let layerSelectionBox = new Konva.Layer({
    name: 'layerSelectionBox'
});


let clipShadingBorder = {  /* Outside of the border/wall guidance is feature are not used */
    x: pxOffset,
    y: pyOffset,
    width: activeRoomLength * scale,
    height: activeRoomWidth * scale,
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

let grLabels = new Konva.Group({
    name: 'grLabels',
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

let groupBoxes = new Konva.Group(
    {
        name: 'boxes',
    }
)

let groupRooms = new Konva.Group(
    {
        name: 'rooms',
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


if (localStorage.getItem('testNew') === 'true') {
    testNew = true;
} else {
    testNew = false;
}


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
    rotateAnchorOffset: 25,
});


/* Customize the rotation / rotater anchor */
const rotateImageObj = new Image();

rotateImageObj.onload = function rotateImageObjOnload() {

    tr.anchorStyleFunc((anchor) => {
        updateRotaterAnchor(anchor); /* update v0.1.517 */
    })
};
function updateRotaterAnchor(anchor) {
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
        // anchor.fillPatternImage('no-repeat');

    }
}

rotateImageObj.src = './assets/images/rotateRight.png';


let groupBackground = new Konva.Group(
    {
        name: 'backGround',
    }
)

let select2PointsRect = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'white',
    opacity: 0.01,
    name: 'select2PointsRect'
})

let wallBuilderRect = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'white',
    opacity: 0.01,
    name: 'wallBuilderRect',
})

let polyBuilderRect = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'white',
    opacity: 0.01,
    name: 'polyBuilderRect',
})

let wallWriterRect2 = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'white',
    opacity: 0.01,
    name: 'wallBuilderRect2',
})

/* panRectangle is the highest level shape used to make panning work. It is hidden until pan is enabled. Opacity always = 0 */
let panRectangle = new Konva.Rect({
    x: 0,
    y: 0,
    fill: 'white',
    preventDefault: false,
    opacity: 0,
    name: 'panRectangle',
});

let panX = 0;
let panY = 0;
let panMove = false;

/* distanceLine is used when drawing the line to scale the background floor image */
var distanceLine = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: 'red',
    strokeWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    name: 'distanceLine',
});

layerSelectionBox.add(distanceLine);

distanceLine.hide();

/* circleStart is used when drawing the line to scale the background floor image */
let circleStart = new Konva.Circle({
    radius: 3,
    fill: 'white',
    stroke: 'black',
    strokeWidth: 1,
    name: 'circleStart',
});

layerSelectionBox.add(circleStart);

circleStart.hide();

/* circleEnd is used when drawing the line to scale the background floor image */
let circleEnd = new Konva.Circle({
    x: 20,
    y: 29,
    radius: 3,
    fill: 'white',
    stroke: 'black',
    strokeWidth: 1,
    name: 'circleEnd'
});

layerSelectionBox.add(circleEnd);

circleEnd.hide();




// let measuringToolText = 'DIST m/f';

const measuringToolLabel = new Konva.Label({
    x: 30,
    y: 30,
    opacity: 1,
    id: 'measuringToolLabel',
    name: 'measuringToolLabel',
    listening: false,
});



measuringToolLabel.add(
    new Konva.Tag({
        fill: 'lightgrey',
        stroke: 'black',
        strokeWidth: 1,
        pointerDirection: 'down',
        pointerWidth: 0,
        pointerHeight: 0,
        lineJoin: 'round',
        shadowColor: 'black',
        shadowBlur: 7,
        shadowOffsetX: 5,
        shadowOffsetY: 5,
        shadowOpacity: 0.5,
        cornerRadius: 5,
        name: 'tagMeasuringToolLabel',
    })
);

const measuringToolText = new Konva.Text({
    text: 'DIST m/f',
    fontSize: 16,
    padding: 5,
    fill: 'black',
    name: 'measuringToolText',
})

measuringToolLabel.add(measuringToolText);

layerSelectionBox.add(measuringToolLabel);

measuringToolLabel.hide();


let lastWallBuilderRotation = 0; /* keep track of the last Wall Builder rotation */

let lastWallBuilderNode = new Konva.Circle({
    x: -1000,
    y: 0,
    radius: 3,
    stroke: 'black',
    fill: '',
    strokeWidth: 2,
    name: 'lastWallBuilderNode',
});

layerSelectionBox.add(lastWallBuilderNode);

lastWallBuilderNode.hide();

let beforeLastWallBuilderNode = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 2,
    stroke: 'red',
    fill: 'red',
    strokeWidth: 2,
    name: 'beforeLastWallBuilderNode',
});
layerSelectionBox.add(beforeLastWallBuilderNode);

beforeLastWallBuilderNode.hide();


let hingeNode = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 4,
    fill: '#66ff00',
    stroke: 'black',
    name: 'hingeNode',
    opacity: 0.3,
});
layerSelectionBox.add(hingeNode);

hingeNode.hide();

let degreeNode = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 2,
    fill: 'black',
    stroke: 'black',
    id: 'degreeNode',
    name: 'degreeNode',
    opacity: 0.5,
});
layerSelectionBox.add(degreeNode);

degreeNode.hide();


let newStartNode = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 3,
    stroke: 'black',
    strokeWidth: 0.5,
    fill: '#e764fbff',
    name: 'newStartNode',
});
layerSelectionBox.add(newStartNode);

newStartNode.hide();

let newStartNode2 = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 3,
    stroke: 'black',
    strokeWidth: 0.5,
    fill: '#00fff7ff',
    name: 'newStartNode2',
});
layerSelectionBox.add(newStartNode2);

newStartNode2.hide();


let newCornerNode = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 3,
    stroke: 'red',
    strokeWidth: 1,
    fill: '#6b64fbff',
    name: 'newStartNode',
});
layerSelectionBox.add(newCornerNode);

newCornerNode.hide();

const rectHeight = 10;

let wallBuilderType = 'wallStd'; /* wallStd, wallGlass or wallWindow */
let wallBuilderLabelField = ''; /* insert a data_label into the Wall Builder field */

const wallBuilderConnectorLine = new Konva.Line({
    stroke: 'grey',
    strokeWidth: 1,
    opacity: 0.5,
    name: 'wallBuilderConnectorLine'
});
wallBuilderConnectorLine.hide();

layerSelectionBox.add(wallBuilderConnectorLine);

const wallBuilderLineArray = new Konva.Line({
    stroke: 'purple',
    strokeWidth: 1,
    opacity: 0.5,
    name: 'wallBuilderLineArray'
});

wallBuilderLineArray.hide();

layerSelectionBox.add(wallBuilderLineArray);


const wallWriterConnectorLine2 = new Konva.Line({

    stroke: 'grey',
    strokeWidth: 1
});




wallWriterConnectorLine2.hide();

layerSelectionBox.add(wallWriterConnectorLine2);


function setWallBuilderHelperDefaults() {
    lastWallBuilderNode.radius(3);
    beforeLastWallBuilderNode.radius(3);
    hingeNode.radius(3);
    degreeNode.radius(3);
    newStartNode.radius(3);
    newStartNode2.radius(3);
    newCornerNode.radius(3);
    lastWallBuilderNode.radius(3);
}


function changeWallBuilderWall(key) {

    let btnWallBuilderWall = document.querySelectorAll('.btnWallBuilderWall');

    btnWallBuilderWall.forEach(element => {
        element.classList.remove('wallBuilderWallSelected');
    });

    if (key === 's') {
        wallBuilderType = 'wallStd';
        wallBuilderConnectorLine.stroke('grey');
        wallBuilderConnectorLine.dash([]);
        wallBuilderLabelField = '';
        document.getElementById('btnWallBuilderStd').classList.add('wallBuilderWallSelected');
    }
    else if (key === 'w') {
        wallBuilderType = 'wallWindow';
        wallBuilderConnectorLine.stroke('#8993ff');
        wallBuilderLabelField = '';
        document.getElementById('btnWallBuilderWindow').classList.add('wallBuilderWallSelected');
    } else if (key === 'g') {
        wallBuilderType = 'wallGlass';
        wallBuilderConnectorLine.stroke('#ADD8E6');
        wallBuilderConnectorLine.dash([]);
        wallBuilderLabelField = '';
        document.getElementById('btnWallBuilderGlass').classList.add('wallBuilderWallSelected');
    } else if (key === 'c') {
        wallBuilderType = 'wallStd';
        wallBuilderConnectorLine.stroke('#5e3b50cc');
        wallBuilderConnectorLine.dash([]);
        wallBuilderLabelField = `{"color":"#9DD9F3", "opacity":"0.4"}`;
        document.getElementById('btnWallBuilderCustom').classList.add('wallBuilderWallSelected');
    }

}



wallBuilderRect.on('pointerdown', function wallBuilderRectPointerDown(pointer) {

    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let canvasX = canvasXY.canvasPixel.x;
    let canvasY = canvasXY.canvasPixel.y;

    let strokeWidth = scale * 0.1;
    if (roomObj.unit === 'feet') {
        strokeWidth = strokeWidth * 3.2808;
    }



    wallBuilderConnectorLine.strokeWidth(strokeWidth);

    wallBuilderLineArray.strokeWidth(strokeWidth);

    wallBuilderConnectorLine.hide();


    if (wallBuilderWritingState === 'firstNode' || wallBuilderWritingState === 'writing') {

        wallBuilderWritingState = 'writing';

        let points = wallBuilderConnectorLine.points();

        insertWallBasedOnPixelXY(points[0], points[1], points[2], points[3]);

        beforeLastWallBuilderNode.x(points[0]);
        beforeLastWallBuilderNode.y(points[1]);

        // beforeLastWallBuilderNode.show();

        lastWallBuilderNode.x(points[2]);
        lastWallBuilderNode.y(points[3]);
        //   lastWallBuilderNode.show();

        document.getElementById('btnNextWallBuilderSegment').disabled = false;

        canvasToJson();

    } else {


        setWallBuilderHelperDefaults();

        lastWallBuilderNode.x(canvasX);
        lastWallBuilderNode.y(canvasY);
        //  lastWallBuilderNode.show();

        wallBuilderWritingState = 'firstNode';

        wallBuilderLineArray.points([canvasX, canvasY]);


    }

});


wallBuilderRect.on('pointermove', function wallBuilderRectPointerDown(pointer) {


    if (wallBuilderWritingState === 'none') return;

    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let pointerX = canvasXY.canvasPixel.x;
    let pointerY = canvasXY.canvasPixel.y;



    let lastX = lastWallBuilderNode.x();
    let lastY = lastWallBuilderNode.y();


    let adjLastX, adjLastY;

    let canvasXYNode;

    canvasXYNode = stage.findOne('#canvasNode');

    if (!canvasXYNode) {
        canvasXYNode = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 3,
            fill: '#5e5c5cff',
            stroke: 'black',
            id: 'canvasNode',
            opacity: 0.5,
            listening: false,
        });
        layerSelectionBox.add(canvasXYNode);
        canvasXYNode.hide();
    }

    canvasXYNode.x(pointerX);
    canvasXYNode.y(pointerY);


    if (wallBuilderWritingState === 'writing') {
        let firstX = beforeLastWallBuilderNode.x();
        let firstY = beforeLastWallBuilderNode.y();

        //  wallBuilderLineArray.hide();
        wallBuilderConnectorLine.show();

        let width = (roomObj.unit === 'feet') ? (3.28084 / 10) : 0.10;
        width = width / 2;

        width = scale * width * 0.97;

        let newDegreePoint = pointAtDistanceFromP2TowardP1(firstX, firstY, lastX, lastY, width)

        let deg = getVectorAngleDegrees({ x: firstX, y: firstY }, { x: newDegreePoint.x, y: newDegreePoint.y }, { x: pointerX, y: pointerY })

        let factor = 1;
        if (deg > 89) {
            factor = 1;
        }
        else if (deg < -89) {
            factor = -1;
        }
        else if (deg >= 0) {
            factor = -1;
        }
        else if (deg < 0) {
            factor = 1;
        }

        if (isShiftKeyDown) {
            if (Math.abs(newDegreePoint.x - pointerX) > Math.abs(newDegreePoint.y - pointerY)) {
                pointerY = newDegreePoint.y;
            } else {
                pointerX = newDegreePoint.x;
            }
        }


        let XY = findEndPointCoordinates(lastX, lastY, factor * width, lastWallBuilderRotation);
        hingeNode.x(XY.x);
        hingeNode.y(XY.y);
        //  hingeNode.show();

        let endCorners = rightTriangleThirdPointFromHypotenuse(XY.x, XY.y, pointerX, pointerY, width);

        let endCornerXY;
        if (endCorners.length < 1) {
            return;
        }
        else if (endCorners.length === 1) {
            endCornerXY = endCorners[0];
        }
        else if (deg < 0) {
            endCornerXY = endCorners[0];
        } else {
            endCornerXY = endCorners[1];
        }

        newCornerNode.x(endCornerXY.x);
        newCornerNode.y(endCornerXY.y);
        //  newCornerNode.show();

        let newXYpoints = rightAnglePoint(XY.x, XY.y, endCornerXY.x, endCornerXY.y, width)

        let newXY1 = newXYpoints[0];

        let newXY2 = newXYpoints[1];

        newStartNode.x(newXY1.x)
        newStartNode.y(newXY1.y)
        // newStartNode.show();

        if (newXY2 && 'x' in newXY2) {
            newStartNode2.x(newXY2.x)
            newStartNode2.y(newXY2.y)
            //     newStartNode2.show();
        }


        if (deg < 0) {

            adjLastX = newXY2.x;
            adjLastY = newXY2.y;


            if (isShiftKeyDown) {
                if (Math.abs(adjLastX - pointerX) > Math.abs(adjLastY - pointerY)) {
                    pointerY = adjLastY;
                } else {
                    pointerX = adjLastX;
                }
            }

        } else {

            adjLastX = newXY1.x;
            adjLastY = newXY1.y;

            if (isShiftKeyDown) {
                if (Math.abs(adjLastX - pointerX) > Math.abs(adjLastY - pointerY)) {
                    pointerY = adjLastY;
                } else {
                    pointerX = adjLastX;
                }
            }
        }
    } else {

        adjLastX = lastX;
        adjLastY = lastY;
    }


    if (isShiftKeyDown) {
        if (Math.abs(lastX - pointerX) > Math.abs(lastY - pointerY)) {
            pointerY = adjLastY;
        } else {
            pointerX = adjLastX;
        }
    }

    wallBuilderConnectorLine.show();
    wallBuilderConnectorLine.points([adjLastX, adjLastY, pointerX, pointerY]);

});


polyBuilderRect.on('pointerdown', function polyBuilderRectPointerDown(pointer) {

    let polyBuilderConnectorLine = stage.findOne('#polyBuilderConnectorLine');

    if (!polyBuilderConnectorLine) {
        polyBuilderConnectorLine = new Konva.Line({
            stroke: 'black',
            strokeWidth: 1,
            opacity: 1,
            id: 'polyBuilderConnectorLine',
            closed: false,
            fill: '#55555533',
            listening: false,
        });

        polyBuilderConnectorLine.points([]);
        layerSelectionBox.add(polyBuilderConnectorLine);
    }

    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let pointerX = canvasXY.canvasPixel.x;
    let pointerY = canvasXY.canvasPixel.y;

    let points = polyBuilderConnectorLine.clone().points();
    points.push(pointerX, pointerY);

    if (!polylineSelfIntersects(points, { closed: false })) {

        polyBuilderConnectorLine.points(points);

        let newCircle = new Konva.Circle({
            x: pointerX,
            y: pointerY,
            radius: 3,
            stroke: 'black',
            fill: 'white',
            strokeWidth: 1,
            name: 'polyBuilderCircle',
        });

        layerSelectionBox.add(newCircle);


        if (points.length === 2) {
            newCircle.radius(5);
            setTimeout(() => {
                newCircle.on('pointerover', function newCirclePointerOver(pointer) {
                    newCircle.radius(9);
                    newCircle.fill('yellow');
                });

                newCircle.on('pointerdown', finishPolyBuilder);
            }, 500);

            newCircle.on('pointerleave', function newCirclePointerOver(pointer) {
                newCircle.radius(5);
                newCircle.fill('white');
            });

        }

        let polyBuilderNextLine = stage.findOne('#polyBuilderNextLine');

        if (polyBuilderNextLine) {
            if (polylineSelfIntersects(points, { closed: true })) {
                polyBuilderNextLine.fill('#6d04023e')
            } else {
                polyBuilderNextLine.fill('#55555533')
            }
        }
    }
});

polyBuilderRect.on('pointermove', function polyBuilderRectPointerDown(pointer) {

    let polyBuilderConnectorLine = stage.findOne('#polyBuilderConnectorLine');

    if (!polyBuilderConnectorLine) return;

    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let pointerX = canvasXY.canvasPixel.x;
    let pointerY = canvasXY.canvasPixel.y;

    let polyBuilderNextLine = stage.findOne('#polyBuilderNextLine');



    if (!polyBuilderNextLine) {
        polyBuilderNextLine = new Konva.Line({
            stroke: 'black',
            opacity: 0.3,
            id: 'polyBuilderNextLine',
            strokeWidth: 1,
            closed: true,
            listening: false,
            dash: [10, 5, 10]
        });
        layerSelectionBox.add(polyBuilderNextLine);
    }

    polyBuilderNextLine.show();
    polyBuilderNextLine.zIndex(1);
    let points = polyBuilderConnectorLine.clone().points();
    points.push(pointerX, pointerY);

    if (!polylineSelfIntersects(points, { ignoreEndpointTouches: false })) {
        polyBuilderNextLine.points(points);
    }



});

function finishPolyBuilder() {
    let points;
    let polyBuilderConnectorLine = stage.findOne('#polyBuilderConnectorLine');

    if (polyBuilderConnectorLine) {

        points = polyBuilderConnectorLine.clone().points();

        if (polylineSelfIntersects(points, { closed: true })) {

            alertDialog('Polyline intersects itself', 'Please try again. Lines cannot intersect.');

            polyBuilderOn(false);

            setTimeout(() => {
                selecting = false;
            }, 250)

            updateItem();



        } else {
            polyBuilderConnectorLine.closed(true);

            if (polyBuilderMode === 'polyRoom') {
                let attrs = convertPointsToUnit(points);
                delete attrs.pointsInMeters;
                delete attrs.metersX;
                delete attrs.metersY;
                let uuid = createUuid();
                insertShapeItem('polyRoom', allDeviceTypes['polyRoom'].parentGroup, attrs, uuid, true);

                attrs.id = uuid;
                attrs.data_deviceid = 'polyRoom';
                roomObj.items[allDeviceTypes['polyRoom'].parentGroup].push(attrs);

                polyBuilderOn(false);

            } else if (polyBuilderMode === 'customPathEditor') {

                let attrs = convertPointsToUnit(points, true);


                document.getElementById('itemX').value = round(attrs.x);
                document.getElementById('itemY').value = round(attrs.y);
                document.getElementById('labelPath').value = attrs.path;
                document.getElementById('itemRotation').value = '0';

                polyBuilderOn(false);

                updateItem();

            }
        }
    }

}


function convertPointsToUnit(points, xyCenter = false) {

    if (!points || points.length < 2) {
        console.error('convertPointsToUnit() points array insufficient length. points:', points);
        return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let x, y, metersX, metersY, width, height;
    let newPoints = [];
    let pointsInMeters = [];
    let factor = (roomObj.unit === 'meters') ? 1 : 3.28084;
    /* convert the points to the local unit */

    points.forEach((point, i) => {
        if (i % 2 === 0) {
            let pointX = ((point - pxOffset) / scale) + activeRoomX;
            newPoints[i] = pointX

            if (newPoints[i] < minX) {
                minX = pointX;
            }

            if (newPoints[i] > maxX) {
                maxX = pointX;
            }

        } else {
            let pointY = ((point - pyOffset) / scale) + activeRoomY;
            newPoints[i] = pointY;


            if (newPoints[i] < minY) {
                minY = pointY;

            }
            if (newPoints[i] > maxY) {
                maxY = pointY;
            }

        }
    });


    if (xyCenter) {
        x = (minX + maxX) / 2;
        y = (minY + maxY) / 2;
    } else {
        x = minX;
        y = minY;
    }

    width = maxX - minX;
    height = maxY - minY;


    newPoints.forEach((newPoint, i) => {
        if (i % 2 === 0) {
            newPoints[i] = newPoint - x;
        } else {
            newPoints[i] = newPoint - y;
        }
    });

    pointsInMeters = newPoints.slice();

    for (let i = 0; i < pointsInMeters.length; i++) {
        pointsInMeters[i] = pointsInMeters[i] / factor;
    };

    metersX = x * factor;

    metersY = y * factor;

    let path = 'M ';

    pointsInMeters.forEach((newPoint, i) => {

        if (i === 2) {
            path = path + 'L '
        }

        path = path + round(newPoint) + ' ';
    });

    path = path + 'z'

    path = path.replaceAll(/\s-/g, '-');

    return { x: x, y: y, points: newPoints, pointsInMeters: pointsInMeters, metersX: x, metersY: y, path: path, width: width, height: height };
}

function convertPointsToPixel(points) {
    if (!points || points.length < 2) {
        console.error('convertPointsToPixel() points array insufficient length. points:', points);
        return;
    }

    let newPoints = [];
    /* convert the points to the local unit */
    points.forEach((point, i) => {

        if (i % 2 !== 0) {
            newPoints[i] = scale * point;

        } else {
            newPoints[i] = scale * point;
        }
    });

    return newPoints;
}

/**
 * Returns true if a polyline has any self-intersection.
 *
 * points: [x1,y1,x2,y2,...]
 * opts.closed: boolean (default false)  -> if true, last vertex connects to first
 * opts.ignoreEndpointTouches: boolean (default true)
 *    - when true: intersections that occur only at endpoints of BOTH segments are ignored
 *    - when false: any segment intersection counts
 */
function polylineSelfIntersects(points, opts = {}) {
    const {
        closed = false,
        ignoreEndpointTouches = true,
        eps = 1e-9,
    } = opts;

    const n = (points.length / 2) | 0;
    if (n < 4) return false;

    const segCount = closed ? n : (n - 1);
    if (segCount < 2) return false;

    const eq = (x1, y1, x2, y2) => Math.abs(x1 - x2) <= eps && Math.abs(y1 - y2) <= eps;

    const orient = (ax, ay, bx, by, cx, cy) => {
        const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (Math.abs(v) <= eps) return 0;
        return v > 0 ? 1 : -1;
    };

    const onSeg = (ax, ay, bx, by, px, py) =>
        px >= Math.min(ax, bx) - eps && px <= Math.max(ax, bx) + eps &&
        py >= Math.min(ay, by) - eps && py <= Math.max(ay, by) + eps;

    const isEndpointOf = (ax, ay, bx, by, px, py) => eq(px, py, ax, ay) || eq(px, py, bx, by);

    const pointOnSegmentInterior = (ax, ay, bx, by, px, py) =>
        onSeg(ax, ay, bx, by, px, py) && !isEndpointOf(ax, ay, bx, by, px, py);

    // If segments intersect, return:
    // - null if no intersection
    // - {type:'point', x, y} if they intersect at a point
    // - {type:'overlap'} if they overlap colinearly
    function segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy) {
        const o1 = orient(ax, ay, bx, by, cx, cy);
        const o2 = orient(ax, ay, bx, by, dx, dy);
        const o3 = orient(cx, cy, dx, dy, ax, ay);
        const o4 = orient(cx, cy, dx, dy, bx, by);

        // Colinear case
        if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
            // bounding box overlap
            const minAx = Math.min(ax, bx), maxAx = Math.max(ax, bx);
            const minAy = Math.min(ay, by), maxAy = Math.max(ay, by);
            const minCx = Math.min(cx, dx), maxCx = Math.max(cx, dx);
            const minCy = Math.min(cy, dy), maxCy = Math.max(cy, dy);

            const overlap =
                maxAx + eps >= minCx && maxCx + eps >= minAx &&
                maxAy + eps >= minCy && maxCy + eps >= minAy;

            return overlap ? { type: "overlap" } : null;
        }

        // Any intersection/touching
        const intersects =
            (o1 !== o2 && o3 !== o4) ||
            (o1 === 0 && onSeg(ax, ay, bx, by, cx, cy)) ||
            (o2 === 0 && onSeg(ax, ay, bx, by, dx, dy)) ||
            (o3 === 0 && onSeg(cx, cy, dx, dy, ax, ay)) ||
            (o4 === 0 && onSeg(cx, cy, dx, dy, bx, by));

        if (!intersects) return null;

        // Compute intersection point for non-parallel lines (best-effort)
        const rX = bx - ax, rY = by - ay;
        const sX = dx - cx, sY = dy - cy;
        const denom = rX * sY - rY * sX;

        if (Math.abs(denom) <= eps) {
            // parallel-ish touch; point is sufficient for endpoint filtering
            return { type: "point", x: cx, y: cy };
        }

        const t = ((cx - ax) * sY - (cy - ay) * sX) / denom;
        return { type: "point", x: ax + t * rX, y: ay + t * rY };
    }

    const getPt = (idx) => [points[2 * idx], points[2 * idx + 1]];

    for (let i = 0; i < segCount; i++) {
        const i2 = closed ? ((i + 1) % n) : (i + 1);
        const [ax, ay] = getPt(i);
        const [bx, by] = getPt(i2);

        for (let j = i + 1; j < segCount; j++) {
            // Skip adjacent segments that share an endpoint
            if (j === i) continue;
            if (j === i + 1) continue;
            if (closed && i === 0 && j === segCount - 1) continue; // first and last are adjacent only when closed

            const j2 = closed ? ((j + 1) % n) : (j + 1);
            const [cx, cy] = getPt(j);
            const [dx, dy] = getPt(j2);

            const hit = segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy);
            if (!hit) continue;

            if (!ignoreEndpointTouches) return true;
            if (hit.type === "overlap") return true;

            // Ignore only if the intersection point is an endpoint of BOTH segments
            const pIsEndpointAB = isEndpointOf(ax, ay, bx, by, hit.x, hit.y);
            const pIsEndpointCD = isEndpointOf(cx, cy, dx, dy, hit.x, hit.y);
            if (pIsEndpointAB && pIsEndpointCD) continue;

            // If it hits interior of either segment, count it
            if (pointOnSegmentInterior(ax, ay, bx, by, hit.x, hit.y)) return true;
            if (pointOnSegmentInterior(cx, cy, dx, dy, hit.x, hit.y)) return true;

            return true; // fallback
        }
    }

    return false;
}


function addConnectedWall(wall1, width, point2) {

    let firstX = wall1[0];
    let firstY = wall1[1];
    let lastX = wall1[2];
    let lastY = wall1[3];

    let pointerX = point2.x;
    let pointerY = point2.y;

    width = width / 2;

    let newDegreePoint = pointAtDistanceFromP2TowardP1(firstX, firstY, lastX, lastY, width)

    let deg = getVectorAngleDegrees({ x: firstX, y: firstY }, { x: newDegreePoint.x, y: newDegreePoint.y }, { x: pointerX, y: pointerY })

    let factor = 1;
    if (deg > 89.9) {
        factor = 1;
    }
    else if (deg < -89.9) {
        factor = -1;
    }
    else if (deg >= 0) {
        factor = -1;
    }
    else if (deg < 0) {
        factor = 1;
    }

    let XY = findEndPointCoordinates(lastX, lastY, factor * width, lastWallBuilderRotation);

    let endCorners = rightTriangleThirdPointFromHypotenuse(XY.x, XY.y, pointerX, pointerY, width);

    let endCornerXY;
    if (endCorners.length < 1) {
        console.error('endCorners.length less than 1')
        return;
    }
    else if (endCorners.length === 1) {
        endCornerXY = endCorners[0];
    }
    else if (deg < 0) {
        endCornerXY = endCorners[0];
    } else {
        endCornerXY = endCorners[1];
    }

    let newXYpoints = rightAnglePoint(XY.x, XY.y, endCornerXY.x, endCornerXY.y, width)

    let newXY1 = newXYpoints[0];

    let newXY2 = newXYpoints[1];


    if (deg < 0) {
        adjLastX = newXY2.x;
        adjLastY = newXY2.y;
    } else {
        adjLastX = newXY1.x;
        adjLastY = newXY1.y;
    }

    return [adjLastX, adjLastY, point2.x, point2.y];
}

let wallCounter = 0;

function insertWallBasedOnPixelXY(startX, startY, endX, endY) {

    let x1 = ((startX - pxOffset) / scale) + activeRoomX;
    let y1 = ((startY - pyOffset) / scale) + activeRoomY;

    let x2 = ((endX - pxOffset) / scale) + activeRoomX;
    let y2 = ((endY - pyOffset) / scale) + activeRoomY;

    let rotation = lineAngleDegrees(x1, y1, x2, y2);

    lastWallBuilderRotation = rotation;

    let height = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    height = round(height);

    let width = (roomObj.unit === 'feet') ? 0.3048 : 0.1;

    let XY = findEndPointCoordinates(x2, y2, width / 2, rotation);

    let attrs = { x: XY.x, y: XY.y, rotation: rotation - 180, height: height, width: width, data_labelField: wallBuilderLabelField };


    wallCounter = wallCounter + 1;

    let uuid = createUuid();

    if (!isNaN(width) && width > 0.01 && !isNaN(height) && (height > 0.01)) {

        insertShapeItem(wallBuilderType, 'tables', attrs, uuid, false);

        attrs.id = uuid;
        attrs.data_deviceid = wallBuilderType;

        roomObj.items.tables.push(attrs);
    }



}

function pointAtDistanceFromP2TowardP1(x1, y1, x2, y2, D) {
    const dx = x1 - x2, dy = y1 - y2;
    const s = Math.hypot(dx, dy);
    if (s === 0) return null; // direction undefined if P1==P2
    const t = D / s;
    return { x: x2 + dx * t, y: y2 + dy * t };
}

/**
 * Angle (slope) of the line from (x1,y1) to (x2,y2), in degrees.
 * 0° points along +X, 90° along +Y. Returns in (-180, 180].
 */
function lineAngleDegrees(x1, y1, x2, y2) {
    const dy = y2 - y1;
    const dx = x2 - x1;
    return (Math.atan2(dy, dx) * (180 / Math.PI)) - 90;
}

/**
 * Calculates the rotation of an endpoint from another endpoints.
 */

function findEndPointCoordinates(x1, y1, length, angleDegrees) {
    // Convert angle from degrees to radians


    const angleRadians = (angleDegrees * (Math.PI / 180));

    // Calculate X2 and Y2
    const x2 = x1 + length * Math.cos(angleRadians);
    const y2 = y1 + length * Math.sin(angleRadians);

    return { x: x2, y: y2 };
}

/**
 * Calculates the angle at point B between vectors BA and BC in degrees.
 * @param {object} A - The first point {x, y}.
 * @param {object} B - The middle point (vertex) {x, y}.
 * @param {object} C - The third point {x, y}.
 * @returns {number} The angle in degrees, in the range (-180, 180].
 */
function getVectorAngleDegrees(A, B, C) {

    const BA_x = A.x - B.x;
    const BA_y = A.y - B.y;
    const BC_x = C.x - B.x;
    const BC_y = C.y - B.y;

    const angleRadians = Math.atan2(BA_y * BC_x - BA_x * BC_y, BA_x * BC_x + BA_y * BC_y);

    // Convert radians to degrees
    const angleDegrees = angleRadians * 180 / Math.PI;

    return angleDegrees;
}



function rightTriangleThirdPointFromHypotenuse(x1, y1, x2, y2, L, eps = 1e-12) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);           // hypotenuse length

    if (d < eps) return [];                 // degenerate hypotenuse
    if (L <= 0) return [];                  // invalid length
    if (L > d + eps) return [];             // impossible: leg longer than hypotenuse

    // |P1P3| = R, derived from Pythagoras: d^2 = R^2 + L^2
    const R2 = d * d - L * L;
    if (R2 < -eps) return [];               // impossible (numerical safety)
    const R = Math.sqrt(Math.max(0, R2));

    // Circle-circle intersection:
    // c1=(x2,y2), r1=L ; c0=(x1,y1), r0=R
    const r0 = R, r1 = L;

    // Check for non-intersection / containment
    if (d > r0 + r1 + eps) return [];               // too far apart
    if (d < Math.abs(r0 - r1) - eps) return [];     // one inside the other

    // a = distance from c0 to the line-of-centers projection point
    const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
    const h2 = r0 * r0 - a * a;

    // Base point along the line from c0 to c1
    const xBase = x1 + (a * dx) / d;
    const yBase = y1 + (a * dy) / d;

    if (Math.abs(h2) <= eps) {
        // tangent: one solution
        return [{ x: xBase, y: yBase }];
    }

    const h = Math.sqrt(Math.max(0, h2));

    // Perpendicular unit vector to (dx,dy)
    const ux = -dy / d;
    const uy = dx / d;

    const p3a = { x: xBase + h * ux, y: yBase + h * uy };
    const p3b = { x: xBase - h * ux, y: yBase - h * uy };

    return [p3a, p3b];
}

function rightAnglePoint(x1, y1, x2, y2, d) {
    // Vector AB
    const dx = x2 - x1;
    const dy = y2 - y1;

    const len = Math.hypot(dx, dy);
    if (len === 0) return null;

    // Unit vector along AB
    const ux = dx / len;
    const uy = dy / len;

    // Perpendicular unit vectors
    const px1 = -uy;
    const py1 = ux;

    const px2 = uy;
    const py2 = -ux;

    // Two possible right-angle points
    const C1 = {
        x: x1 + px1 * d,
        y: y1 + py1 * d
    };

    const C2 = {
        x: x1 + px2 * d,
        y: y1 + py2 * d
    };

    return [C1, C2];
}

wallWriterRect2.on('pointerdown', function wallBuilderRectPointerDown(pointer) {

    if (isWallWriterWriting) {
        wallBuilderRestart2();
    }

    isWallWriterWriting = true;
    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let canvasX = canvasXY.canvasPixel.x;
    let canvasY = canvasXY.canvasPixel.y;

    let strokeWidth = scale * 0.1;
    if (roomObj.unit === 'feet') {
        strokeWidth = strokeWidth * 3.2808;
    }

    // wallBuilderConnectorLine2.points([]);
    wallWriterConnectorLine2.points([]);

    wallWriterConnectorLine2.strokeWidth(strokeWidth);

    wallBuilderConnectorLine.strokeWidth(strokeWidth);



    wallWriterConnectorLine2.show();

    const wallNode = new Konva.Circle({
        x: canvasX,
        y: canvasY,
        radius: 0.5,
        stroke: 'black',
        strokeWidth: 1,
        name: 'nodeWallBuilder',

    });



    let x2 = ((wallNode.x() - pxOffset) / scale) + activeRoomX;
    let y2 = ((wallNode.y() - pyOffset) / scale) + activeRoomY;
    let points = wallWriterConnectorLine2.points();

    points.push(canvasX, canvasY);

    if (lastWallBuilderNode) {

        lastWallBuilderNode = wallNode;

        canvasToJson();

    } else {
        lastWallBuilderNode = wallNode;
        return;
    }

});


wallWriterRect2.on('pointermove', function wallBuilderRectPointerDown(pointer) {

    if (!lastWallBuilderNode.x() === -1000) return;

    const canvasXY = convertMouseToCanvasPixel(pointer.evt.clientX, pointer.evt.clientY);
    let canvasX = canvasXY.canvasPixel.x;
    let canvasY = canvasXY.canvasPixel.y;

    let freeForm = true;

    if (freeForm) {

        let points = wallWriterConnectorLine2.points();

        points.push(canvasX, canvasY);

        wallWriterConnectorLine2.points(points);

        //  wallBuilderConnectorLine.show();

        let lastX = lastWallBuilderNode.x();
        let lastY = lastWallBuilderNode.y();

        //    wallBuilderConnectorLine.points([lastX, lastY, canvasX, canvasY]);
    } else {
        wallBuilderConnectorLine.show();

        let lastX = lastWallBuilderNode.x();
        let lastY = lastWallBuilderNode.y();
        wallBuilderConnectorLine.points([lastX, lastY, canvasPixel.x, canvasPixel.y]);
    }

});





select2PointsRect.on('pointerdown', function select2PointsRectOnMousedown(mouse) {
    circleEnd.radius(3);
    circleStart.radius(3);

    /* RoomOS touch likes time for logMouseMovements() to update to canvasPixel.x/.y  */
    setTimeout(() => {
        distanceLine.hide();
        circleStart.show();
        circleEnd.hide();
        measuringToolLabel.hide();
        circleStart.x(canvasPixel.x);
        circleStart.y(canvasPixel.y);
    }, 1)

});

select2PointsRect.on('pointermove', function select2PointsRectOnMousemove(mouse) {

    // if (mobileDevice === 'RoomOS') return;

    if (circleStart.isVisible() && !(circleEnd.isVisible())) {
        if (isMeasuringToolOn) {
            measuringToolLabel.show();
        }

        distanceLine.show();
        distanceLine.points([circleStart.x(), circleStart.y(), canvasPixel.x, canvasPixel.y]);

        if (mouseUnit.x < 0) {
            measuringToolLabel.x(pxOffset);
        }
        else if (mouseUnit.x > roomObj.room.roomWidth) {
            measuringToolLabel.x(pxOffset + roomObj.room.roomWidth * scale)
        } else {
            measuringToolLabel.x(canvasPixel.x);
        }

        if (mouseUnit.y > 0.1) {
            measuringToolLabel.y(canvasPixel.y - 25);
        } else {
            measuringToolLabel.y(canvasPixel.y + 60);
        }


        let lineDistance = Math.sqrt((circleStart.x() - canvasPixel.x) ** 2 + (circleStart.y() - canvasPixel.y) ** 2);
        lineDistance = round(lineDistance / scale);
        let txtUnit = 'ft';
        if (roomObj.unit === 'meters') {
            txtUnit = 'm';
        }
        measuringToolText.text(lineDistance + ' ' + txtUnit);
    }
});

select2PointsRect.on('pointerup', function select2PointsRectOnMouseup(event) {

    circleEnd.show();
    distanceLine.show();

    if (isMeasuringToolOn) {
        measuringToolLabel.show();
    }
    circleEnd.x(canvasPixel.x);
    circleEnd.y(canvasPixel.y);

    distanceLine.points([circleStart.x(), circleStart.y(), canvasPixel.x, canvasPixel.y]);

    measuringToolLabel.x(canvasPixel.x);

    if (mouseUnit.x < 0) {
        measuringToolLabel.x(pxOffset);
    }
    else if (mouseUnit.x > roomObj.room.roomWidth) {
        measuringToolLabel.x(pxOffset + roomObj.room.roomWidth * scale)
    } else {
        measuringToolLabel.x(canvasPixel.x);
    }

    if (mouseUnit.y > 0.1) {
        measuringToolLabel.y(canvasPixel.y - 25);
    } else {
        measuringToolLabel.y(canvasPixel.y + 60);
    }

    let lineDistance = Math.sqrt((circleStart.x() - canvasPixel.x) ** 2 + (circleStart.y() - canvasPixel.y) ** 2);
    lineDistance = round(lineDistance / scale);
    let txtUnit = 'ft';
    if (roomObj.unit === 'meters') {
        txtUnit = 'm';
    }
    measuringToolText.text(lineDistance + ' ' + txtUnit);


    if (isSelectingTwoPointsOn && !isMeasuringToolOn) {
        document.getElementById('btnUpdateImageScale').disabled = false;
    }

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

wallBuilderRect.hide();
wallWriterRect2.hide();
polyBuilderRect.hide();
panRectangle.hide(); /* use .hide() for panRectangle to hide, but .show() to pan on the canvas.  */


layerSelectionBox.add(wallBuilderRect);
layerSelectionBox.add(wallWriterRect2);
layerSelectionBox.add(polyBuilderRect);
layerSelectionBox.add(panRectangle);
layerSelectionBox.add(select2PointsRect);


/************************************************************************** */

document.getElementById('lblVersion').innerText = version;




/*
    videoDevices key starts with A or B
    videoDevices requires either: onePersonZoom & twoPersonZoom OR onePersonDistance & twoPersonDistance (OR codecParent or  cameraParent with those fields)
*/
let videoDevices = [

    { name: "Room Bar", id: 'roomBar', key: 'AB', wideHorizontalFOV: 120, teleHorizontalFOV: 120, onePersonZoom: 2.94, twoPersonDistance: 4.456, topImage: 'roomBar-top.png', frontImage: 'roomBar-front.png', width: 534, depth: 64.4, height: 82, micRadius: 2951, micDeg: 140, speakerRadius: 4500, speakerDeg: 160, cameraShadeOffSet: 20, defaultVert: 930, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },

    { name: "Room Bar Pro", id: 'roomBarPro', key: 'AC', wideHorizontalFOV: 110, teleHorizontalFOV: 44, onePersonDistance: 5.45, twoPersonDistance: 8, topImage: 'roomBarPro-top.png', frontImage: 'roomBarPro-front.png', width: 960, depth: 90, height: 120, micRadius: 4000, micDeg: 100, speakerRadius: 5100, speakerDeg: 140, defaultVert: 900, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },

    { name: 'Room Kit EQX: Wall Mount', id: 'roomKitEqx', key: 'AD', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqx-top.png', frontImage: 'roomKitEqx-front.png', width: 3362, depth: 152, height: 1230, diagonalInches: 75, defaultVert: 681, colors: null, speakerRadius: 7000, speakerDeg: 140, },

    { name: "Room Kit EQ: Quad Camera", key: 'AE', id: 'roomKitEqQuadCam', cameraParent: 'quadCam', topImage: 'quadCam-top.png', frontImage: 'roomKitEqQuadCam-menu.png' },

    { name: "_Kit EQ: Quad Cam Extended (720p)", key: 'AF', id: 'roomKitEqQuadCamExt', cameraParent: 'quadCamExt' },

    { name: "_Room Kit EQ: PTZ 4K Camera", key: 'AG', id: 'roomKitEqPtz4k', cameraParent: 'ptz4k' },

    { name: "_Room Kit EQ: Quad Cam + PTZ 4K Extended", key: 'AH', id: 'roomKitEqQuadPtz4k', cameraParent: 'quadPtz4kExt', topImage: 'roomKitEqQuadPtz4k-top.png', frontImage: 'roomKitEqQuadPtz4k-front.png', defaultVert: 1900 },

    { name: "Room Kit Pro: Quad Camera", id: 'roomKitProQuadCam', key: 'AI', cameraParent: "quadCam", frontImage: 'roomKitEqQuadCam-menu.png' },

    { name: "Board Pro 55*", id: 'boardPro55', key: 'AJ', codecParent: "boardPro75", topImage: 'boardPro55-top.png', frontImage: 'boardPro55-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, defaultVert: 974 },

    { name: "Board Pro 75*", id: 'boardPro75', key: 'AK', wideHorizontalFOV: 120, teleHorizontalFOV: 85, onePersonZoom: 2.39, twoPersonZoom: 3.82, topImage: 'boardPro75-top.png', frontImage: 'boardPro75-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, defaultVert: 760 },

    { name: "Board Pro 55 G2: Wall Mount", id: 'brdPro55G2', key: 'AL', codecParent: 'roomBarPro', topImage: 'brdPro55G2-top.png', frontImage: 'brdPro55G2-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, micRadius: 4000, micDeg: 100, defaultVert: 970 },

    { name: "Board Pro 75 G2: Wall Mount", id: 'brdPro75G2', key: 'AM', codecParent: 'roomBarPro', topImage: 'brdPro75G2-top.png', frontImage: 'brdPro75G2-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, micRadius: 4000, micDeg: 100, defaultVert: 760 },

    { name: "Desk [RoomOS]", id: 'webexDesk', key: 'AN', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDesk-top.png', frontImage: 'webexDesk-front.png', width: 565, depth: 160, height: 474, diagonalInches: 24, defaultVert: 710, micRadius: 1049, micDeg: 140 },

    { name: "Desk Pro", id: 'webexDeskPro', key: 'AO', wideHorizontalFOV: 71, teleHorizontalFOV: 71, onePersonDistance: 1.45, twoPersonDistance: 2.45, topImage: 'webexDeskPro-top.png', frontImage: 'webexDeskPro-front.png', width: 627.7, depth: 169.9, height: 497.8, diagonalInches: 27, cameraShadeOffSet: 40, defaultVert: 710, micRadius: 1049, micDeg: 140 },

    { name: "Desk Mini [RoomOS]", id: 'webexDeskMini', key: 'AP', wideHorizontalFOV: 64, teleHorizontalFOV: 64, onePersonZoom: 1, twoPersonZoom: 1, topImage: 'webexDeskMini-top.png', frontImage: 'webexDeskMini-front.png', width: 371, depth: 135, height: 162.5, diagonalInches: 15, cameraShadeOffSet: 30, defaultVert: 710, micRadius: 1049, micDeg: 140 },

    { name: "Room 55*", id: 'room55', key: 'AQ', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'room55-top.png', frontImage: 'room55-front.png', width: 1245, depth: 775, height: 1593, diagonalInches: 55, displayOffSetY: 370 },

    { name: "Room Kit Mini*", id: 'rmKitMini', key: 'AR', wideHorizontalFOV: 112, teleHorizontalFOV: 112, onePersonZoom: 2.04, twoPersonZoom: 3.41, topImage: 'rmKitMini-top.png', frontImage: 'rmKitMini-front.png', width: 500, depth: 77, height: 80, defaultVert: 710 },

    { name: "Room Kit*", id: 'roomKit', key: 'AS', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 2.72, twoPersonZoom: 3.99, topImage: 'roomKit-top.png', frontImage: 'roomKit-front.png', width: 700, depth: 88, height: 106, defaultVert: 1200 },

    { name: "Virtual Lens Bar Pro", id: 'rmBarProVirtualLens', key: 'AT', codecParent: 'roomBarPro', wideHorizontalFOV: 112, teleHorizontalFOV: 70, onePersonZoom: 4.335, twoPersonZoom: 3.5, defaultVert: 1200 },

    { name: 'Room Kit EQX: Floor Stand', id: 'roomKitEqxFS', key: 'AU', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqxFS-top.png', frontImage: 'roomKitEqxFS-front.png', width: 3362, depth: 924, height: 1910, diagonalInches: 75, displayOffSetY: 450, defaultVert: 0, colors: null, speakerRadius: 7000, speakerDeg: 140 },

    { name: "Board Pro 55 G2: Floor Stand", id: 'brdPro55G2FS', key: 'AV', codecParent: 'roomBarPro', topImage: 'brdPro55G2FS-top.png', frontImage: 'brdPro55G2FS-front.png', width: 1278, depth: 944, height: 1778, diagonalInches: 55, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },

    { name: "Board Pro 75 G2: Floor Stand", id: 'brdPro75G2FS', key: 'AW', codecParent: 'roomBarPro', topImage: 'brdPro75G2FS-top.png', frontImage: 'brdPro75G2FS-front.png', width: 1719, depth: 926, height: 1866, diagonalInches: 75, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },

    { name: 'Room Kit EQX: Wall Stand', id: 'roomKitEqxWS', key: 'AX', codecParent: "roomKitEqQuadCam", cameraParent: "quadCam", topImage: 'roomKitEqx-top.png', frontImage: 'roomKitEqx-front.png', width: 3362, depth: 152, height: 1892, diagonalInches: 75, defaultVert: 0, colors: null, speakerRadius: 7000, speakerDeg: 140 },

    { name: "Board Pro 75 G2: Wheel Stand", id: 'brdPro75G2Wheel', key: 'AY', codecParent: 'roomBarPro', topImage: 'brdPro75G2Wheel-top.png', frontImage: 'brdPro75G2FS-front.png', width: 1719, depth: 950, height: 1905, diagonalInches: 75, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },

    { name: "Board Pro 55 G2: Wheel Stand", id: 'brdPro55G2Wheel', key: 'AZ', codecParent: 'roomBarPro', topImage: 'brdPro55G2FS-top.png', frontImage: 'brdPro55G2FS-front.png', width: 1278, depth: 944, height: 1778, diagonalInches: 55, micRadius: 4000, micDeg: 100, displayOffSetY: 420, defaultVert: 0 },

    { name: "Board Pro 55 G2: Wall Stand", id: 'brdPro55G2WS', key: 'BA', codecParent: 'roomBarPro', topImage: 'brdPro55G2-top.png', frontImage: 'brdPro55G2-front.png', width: 1278, depth: 92, height: 823, diagonalInches: 55, micRadius: 4000, micDeg: 100, defaultVert: 0 },

    { name: "Board Pro 75 G2: Wall Stand", id: 'brdPro75G2WS', key: 'BB', codecParent: 'roomBarPro', topImage: 'brdPro75G2-top.png', frontImage: 'brdPro75G2-front.png', width: 1719, depth: 95, height: 1102, diagonalInches: 75, micRadius: 4000, micDeg: 100, defaultVert: 0 },

    { name: "Room Bar BYOD", id: 'roomBarByod', key: 'BC', wideHorizontalFOV: 120, teleHorizontalFOV: 120, onePersonZoom: 2.94, twoPersonDistance: 4.456, topImage: 'roomBar-top.png', frontImage: 'roomBar-front.png', width: 534, depth: 64.4, height: 82, micRadius: 2951, micDeg: 140, speakerRadius: 4500, speakerDeg: 160, cameraShadeOffSet: 20, defaultVert: 930, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },
]


let videoDevicesNoCameras = structuredClone(videoDevices);

let ptzCameraRoles = [{ crossview: 'Cross-View' }, { extended_reach: 'Extended Speaker View' }, { presentertrack: 'PresenterTrack' }, { presentertrack2: 'Manual Camera' }]

let roomVisionRoles = [...ptzCameraRoles, { crossviewPresenterTrack: 'Cross-View & PresenterTrack' }]

/*
    camera key starts with C

    cameras requires either onePersonZoom & twoPersonZoom or onePersonDistance & twoPersonDistance
*/

let ptzCameraMounts = [{ stdMount: 'Standard' }, { flipped: 'Flipped' }, { flippedPole: 'Flipped & Ceiling Pole' }];

let cameras = [
    { name: "Precision 60 Camera*", id: 'cameraP60', key: 'CA', wideHorizontalFOV: 83, teleHorizontalFOV: 83, onePersonZoom: 20, twoPersonZoom: 20, topImage: 'cameraP60-top.png', frontImage: 'cameraP60-front.png', width: 268.1, depth: 162.5, height: 151.9, cameraShadeOffSet: 40, displayOffSetY: 35, defaultVert: 1900 },

    { name: "_PTZ 4K Camera*", id: 'ptz4k', key: 'CB', wideHorizontalFOV: 70, teleHorizontalFOV: 70, onePersonZoom: 2.4, twoPersonZoom: 3, topImage: 'ptz4k-top.png', frontImage: 'ptz4k-front.png', width: 158.4, depth: 200.2, height: 177.5, cameraShadeOffSet: 50, displayOffSetY: 60, defaultVert: 1900, mounts: ptzCameraMounts, roles: ptzCameraRoles },

    { name: "Quad Camera", id: 'quadCam', key: 'CC', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonDistance: 5.96, twoPersonDistance: 10.96, teleFullWidth: true, topImage: 'quadCam-top.png', frontImage: 'quadCam-front.png', width: 950, depth: 102.5, height: 120, defaultVert: 890, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }], speakerRadius: 4000, speakerDeg: 140, },

    { name: "_Quad Cam Extended (720p)", id: 'quadCamExt', key: 'CD', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 4, twoPersonZoom: 4, teleFullWidth: true, topImage: 'quadCamExt-top.png', frontImage: 'quadCamExt-front.png', width: 950, depth: 102.5, height: 120, defaultVert: 890, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },

    { name: "_Quad Cam + PTZ 4K Extended*", id: 'quadPtz4kExt', key: 'CE', wideHorizontalFOV: 83, teleHorizontalFOV: 50, onePersonZoom: 2.64, twoPersonZoom: 5, teleFullWidth: true, topImage: 'quadPtz4kExt-top.png', frontImage: 'quadPtz4kExt-front.png', width: 950, depth: 200.2, height: 177.5, displayOffSetY: 60, defaultVert: 1900 },

    { name: "_Room Vision PTZ", id: 'ptzVision', key: 'CF', wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 5, twoPersonDistance: 10, topImage: 'ptzVision-top.png', frontImage: 'ptzVision-menu.png', width: 165, depth: 248, height: 193, cameraShadeOffSet: 34, defaultVert: 1900, mounts: ptzCameraMounts, roles: ptzCameraRoles, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },

    { name: "_PTZ 4K & Bracket", id: 'ptz4kMount', key: 'CG', wideHorizontalFOV: 70, teleHorizontalFOV: 70, onePersonZoom: 2.4, twoPersonZoom: 3, topImage: 'ptz4kMount-top.png', frontImage: 'ptz4kMount-menu.png', width: 158.4, depth: 290, height: 177.5, cameraShadeOffSet: 50, displayOffSetY: 60, defaultVert: 1900, mounts: ptzCameraMounts, roles: ptzCameraRoles },

    { name: "Room Vision PTZ Cam & Bracket", id: 'ptzVision2', key: 'CH', wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 5, twoPersonDistance: 10, topImage: 'ptzVision-top.png', frontImage: 'ptzVision-menu.png', width: 165, depth: 248, height: 193, cameraShadeOffSet: 34, defaultVert: 1900, mounts: ptzCameraMounts, roles: roomVisionRoles, colors: [{ light: 'First Light' }, { dark: 'Carbon Black' }] },

    { name: "PTZ 4K Cam & Bracket", id: 'ptz4kMount2', key: 'CI', wideHorizontalFOV: 70, teleHorizontalFOV: 70, onePersonZoom: 2.4, twoPersonZoom: 3, topImage: 'ptz4kMount-top.png', frontImage: 'ptz4kMount-menu.png', width: 158.4, depth: 290, height: 177.5, cameraShadeOffSet: 50, displayOffSetY: 60, defaultVert: 1900, mounts: ptzCameraMounts, roles: ptzCameraRoles },

]

/* used for ptz4kNarrowFov crossview and extended_reach */
let ptz4kExtendedReach = { wideHorizontalFOV: 33, teleHorizontalFOV: 33, onePersonDistance: 8, twoPersonDistance: 18 };

let ptz4kPresenterTrack = { wideHorizontalFOV: 33, teleHorizontalFOV: 33, onePersonDistance: 8, twoPersonDistance: 16 };
/* ptz4k */
cameras[1].extended_reach = ptz4kExtendedReach;
cameras[1].presentertrack = ptz4kPresenterTrack;
cameras[1].presentertrack2 = ptz4kPresenterTrack;
cameras[1].rolesDialog = 'How do you want to use the camera?';

/* ptz4kmount - backwards compatible object  */
cameras[6].extended_reach = ptz4kExtendedReach;
cameras[6].presentertrack = ptz4kPresenterTrack;
cameras[6].presentertrack2 = ptz4kPresenterTrack;
cameras[6].rolesDialog = 'How do you want to use the camera?';

/* ptz4kMount2 */
cameras[8].extended_reach = ptz4kExtendedReach;
cameras[8].presentertrack = ptz4kPresenterTrack;
cameras[8].presentertrack2 = ptz4kPresenterTrack;
cameras[8].rolesDialog = 'How do you want to use the camera?';

/* ptzVision - backwards compatible object */
cameras[5].extended_reach = { wideHorizontalFOV: 33, teleHorizontalFOV: 33, onePersonDistance: 13, twoPersonDistance: 26 };
cameras[5].presentertrack = { wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 10, twoPersonDistance: 22 };
cameras[5].presentertrack2 = { wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 10, twoPersonDistance: 22 };
cameras[5].rolesDialog = 'How do you want to use the camera?';

/* ptzVision2 */
cameras[7].extended_reach = { wideHorizontalFOV: 33, teleHorizontalFOV: 33, onePersonDistance: 13, twoPersonDistance: 26 };
cameras[7].presentertrack = { wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 10, twoPersonDistance: 22 };
cameras[7].presentertrack2 = { wideHorizontalFOV: 80, teleHorizontalFOV: 80, onePersonDistance: 10, twoPersonDistance: 22 };
cameras[7].rolesDialog = 'How do you want to use the camera?';

/* Room Bar Pro */
videoDevices[1].multiLensReach = [
    { rotation: videoDevices[1].teleHorizontalFOV / 2 + 90, teleAngle: 13, onePersonDistance: 2.5, twoPersonDistance: 6.85 },
    { rotation: (180 - videoDevices[1].wideHorizontalFOV) / 2 + ((videoDevices[1].wideHorizontalFOV - videoDevices[1].teleHorizontalFOV) / 2) - 13, teleAngle: 13, onePersonDistance: 2.5, twoPersonDistance: 6.85 },
    { rotation: videoDevices[1].teleHorizontalFOV / 2 + 90 + 13, teleAngle: 20, onePersonDistance: 1.4, twoPersonDistance: 4 },
    { rotation: (180 - videoDevices[1].wideHorizontalFOV) / 2, teleAngle: 20, onePersonDistance: 1.4, twoPersonDistance: 4 },
]


/* Microphone & Navigators - key starts with M */
let microphones = [
    {
        name: "Table Microphone",
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
        name: "Table Microphone Pro",
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
        name: "Ceiling Microphone",
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
        name: "Ceiling Microphone Pro",
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
        mounts: [{ ceilingMount: 'Wired Hanging Mount' }, { ceilingBracket: 'Ceiling Bracket Mount' }, { dropCeilingGrid: 'Drop Ceiling Grid Mount' }]
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
        defaultVert: 1100,
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
        defaultVert: 720,
        roles: [{ firstMonitor: 'First Monitor' }, { secondMonitor: 'Second Monitor' }],

    },
    {
        name: "_Phone (unknown)",
        id: "phoneUnknown",
        key: "MH",
        topImage: 'phone9861-top.png',
        frontImage: 'phone9861-top.png',
        width: 210,
        depth: 190,
        height: 160,
        defaultVert: 720,
    },
    {
        name: "Phone 9841",
        id: "phone9841",
        key: "MI",
        topImage: 'phone9861-top.png',
        frontImage: 'phone9861-top.png',
        width: 210,
        depth: 190,
        height: 160,
        defaultVert: 720,
        colors: [{ dark: 'Carbon Black' }, { light: 'First Light' }],
    },
    {
        name: "Phone 9851",
        id: "phone9851",
        key: "MJ",
        topImage: 'phone9861-top.png',
        frontImage: 'phone9861-top.png',
        width: 210,
        depth: 190,
        height: 160,
        defaultVert: 720,
        colors: [{ dark: 'Carbon Black' }, { light: 'First Light' }],
    },
    {
        name: "Phone 9861",
        id: "phone9861",
        key: "MK",
        topImage: 'phone9861-top.png',
        frontImage: 'phone9861-top.png',
        width: 210,
        depth: 190,
        height: 160,
        defaultVert: 720,
        colors: [{ dark: 'Carbon Black' }, { light: 'First Light' }],
    },
    {
        name: "Phone 9871",
        id: "phone9871",
        key: "ML",
        topImage: 'phone9861-top.png',
        frontImage: 'phone9871-menu.png',
        width: 210,
        depth: 190,
        height: 160,
        defaultVert: 720,
        colors: [{ dark: 'Carbon Black' }, { light: 'First Light' }],
    },
    {
        name: "_Cable Lid",
        id: "shareCableLid",
        key: "MM",
        topImage: 'shareCableUsbc-top.png',
        frontImage: 'shareCableUsbc-top.png',
        width: 500,
        depth: 685,
        height: 10,
        defaultVert: 720,
    },
    {
        name: "Desk Camera 4K (webcam)",
        id: "webcam4k",
        key: "MN",
        topImage: 'webcam-top.png',
        frontImage: 'webcam4k-menu.png',
        width: 92,
        depth: 67,
        height: 73,
        defaultVert: 1180,
    },
    {
        name: "B&O Cisco 980",
        id: "headset980",
        key: "MO",
        topImage: 'headset-top.png',
        frontImage: 'headset980-menu.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "B&O Cisco 950",
        id: "headset950",
        key: "MP",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Headset 730",
        id: "headset730",
        key: "MQ",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Headset 720",
        id: "headset720",
        key: "MR",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Headset 560",
        id: "headset560",
        key: "MS",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Headset 530",
        id: "headset530",
        key: "MT",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Headset 320",
        id: "headset320",
        key: "MU",
        topImage: 'headset-top.png',
        frontImage: 'headset-top.png',
        width: 175,
        depth: 175,
        height: 73,
        defaultVert: 720,
    },
    {
        name: "Keyboard",
        id: "keyboard",
        key: "MV",
        topImage: 'keyboard-top.png',
        frontImage: 'keyboard-menu.png',
        width: 360,
        depth: 130,
        height: 13,
        defaultVert: 720,
    },
    {
        name: "Ceiling Projector",
        id: "projector",
        key: "MW",
        topImage: 'projector-top.png',
        frontImage: 'projector-menu.png',
        width: 580,
        depth: 680,
        height: 200,
        defaultVert: 2500,
    },
    {
        name: "Ceiling Speaker Round**",
        id: "speaker",
        key: "MX",
        topImage: 'tblPodium-menu.png',
        frontImage: 'tblPodium-menu.png',
        width: 500,
        depth: 500,
        height: 10,
        defaultVert: 2500,
        speakerRadius: 1500,
        speakerDeg: 360,
    },
    {
        name: "Desk Camera 1080p (webcam)",
        id: "webcam1080p",
        key: "MY",
        topImage: 'webcam-top.png',
        frontImage: 'webcam4k-menu.png',
        width: 92,
        depth: 67,
        height: 73,
        defaultVert: 1180,
    },
]

/* Tables & Walls & resizableItems. Table keys starts with T, Wall keys start with W */
let tables = [{
    name: 'Table Rect (round corners)',
    id: 'tblRect',
    key: 'TA',
    frontImage: 'tblRect-front.png',
    family: 'resizeItem',
    resizeable: ['width', 'depth', 'vheight']
},
{
    name: 'Table Ellipse',
    id: 'tblEllip',
    key: 'TB',
    frontImage: 'tblEllip-front.png',
    family: 'resizeItem',
    resizeable: ['width', 'depth', 'vheight']
},
{
    name: 'Table Tapered (trapezoid)',
    id: 'tblTrap',
    key: 'TC',
    frontImage: 'tblTrap-front.png',
    family: 'resizeItem',
    resizeable: ['width', 'depth', 'vheight']
},
{
    name: 'Table U-Shaped',
    id: 'tblShapeU',
    key: 'TD',
    frontImage: 'tblShapeU-menu.png',
    family: 'tableBox',
    resizeable: ['width', 'depth', 'vheight']
},
{
    name: 'Desk',
    id: 'tblSchoolDesk',
    key: 'TE',
    depth: 590,
    frontImage: 'tblSchoolDesk-menu.png',
    family: 'resizeItem',
    resizeable: ['width', 'vheight']
},
{
    name: 'Podium, round',
    id: 'tblPodium',
    key: 'TF',
    frontImage: 'tblPodium-menu.png',
    family: 'resizeItem',
    resizeable: ['width', 'vheight']
},
{
    name: 'Wall Standard (10 cm / 3.9")',
    id: 'wallStd',
    key: 'WA',
    frontImage: 'wallStd-front.png',
    family: 'wallBox',
    resizeable: ['depth', 'vheight']
},
{
    name: 'Glass Wall',
    id: 'wallGlass',
    key: 'WB',
    frontImage: 'wallGlass-front.png',
    family: 'wallBox',
    resizeable: ['depth', 'vheight']
},

{
    name: 'Column',
    id: 'columnRect',
    key: 'WC',
    frontImage: 'columnRect-front.png',
    family: 'wallBox',
    resizeable: ['width', 'depth', 'vheight']
},

{
    name: 'Wall with Windows',
    id: 'wallWindow',
    key: 'WE',
    frontImage: 'wallWindow-front.png',
    topImage: 'wallWindow-top.png',
    family: 'wallBox',
    resizeable: ['depth', 'vheight']
},
{
    name: 'Row of Chairs',
    id: 'wallChairs',
    key: 'WF',
    topImage: 'chair-top.png',
    frontImage: 'wallChairs-menu.png',
    family: 'resizeItem',
    resizeable: ['depth']
},
{
    name: 'Table Curved',
    id: 'tblCurved',
    key: 'WG',
    frontImage: 'tblCurved-menu.png',
    family: 'resizeItem',
    resizeable: []
},
{
    name: 'Couch',
    id: 'couch',
    key: 'WH',
    frontImage: 'couch-menu.png',
    family: 'resizeItem',
    resizeable: ['depth']
},
{
    name: 'Unknown Resizeable Workspace* Designer Object*',
    id: 'tblUnknownObj',
    key: 'WI',
    frontImage: 'tblUnknownObj-menu.png',
    family: 'resizeItem',
    stroke: 'purple',
    strokeWidth: 3,
    dash: [4, 4],
    resizeable: ['width', 'depth', 'vheight']
},
{
    name: 'Sphere',
    id: 'sphere',
    key: 'WJ',
    frontImage: 'sphere-menu.png',
    family: 'resizeItem',
    stroke: 'black',
    strokeWidth: 0.5,
    resizeable: []

},
{
    name: 'Column / Cylinder',
    id: 'cylinder',
    key: 'WK',
    frontImage: 'cylinder-menu.png',
    family: 'resizeItem',
    stroke: 'black',
    strokeWidth: 1,
    opacity: 0.4,
    resizeable: []
},
{
    name: 'Custom Path Shape',
    id: 'pathShape',
    key: 'WL',
    frontImage: 'pathShape-menu.png',
    strokeWidth: 1 / scale,
    resizeable: []
}
]

/* Chair, doors and people. Key ID start with S or U */
let chairs = [
    {
        name: "Chair",
        id: "chair",
        key: "SA",
        topImage: 'chair-top.png',
        frontImage: 'chair-front.png',
        width: 640,
        depth: 640,
        opacity: 0.7,
    },
    {
        name: "Person Standing (woman)",
        id: "personStanding",
        key: "SC",
        topImage: 'person-top.png',
        frontImage: 'person-front.png',
        width: 640,
        depth: 640,
        opacity: 1,
    },
    {
        name: "Door Right (thin frame)**",
        id: "doorRight",
        key: "SB",
        topImage: 'doorRight-top.png',
        frontImage: 'doorRight-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Door Left (thin frame)**",
        id: "doorLeft",
        key: "SD",
        topImage: 'doorLeft-top.png',
        frontImage: 'doorLeft-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Double Door (thin frame)**",
        id: "doorDouble",
        key: "SE",
        topImage: 'doorDouble-top.png',
        frontImage: 'doorDouble-menu.png',
        width: 2134,
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
        name: "Circulation space (120cm/4')",
        id: 'circulationSpace',
        key: "SI",
        topImage: 'circulationSpace-top.png',
        frontImage: 'circulationSpace-menu.png',
        width: 1200,
        depth: 1200,
        opacity: 0.8,
    },
    {
        name: "Pouf (round stool)",
        id: 'pouf',
        key: 'SJ',
        width: 440,
        depth: 440,
        frontImage: 'tblPodium-menu.png',
        topImage: 'pouf-top.png'
    },
    {
        name: "Door Right",
        id: "doorRight2",
        key: "SK",
        topImage: 'doorRight-top.png',
        frontImage: 'doorRight-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Door Left",
        id: "doorLeft2",
        key: "SL",
        topImage: 'doorLeft-top.png',
        frontImage: 'doorLeft-menu.png',
        width: 1117,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Double Door",
        id: "doorDouble2",
        key: "SM",
        topImage: 'doorDouble-top.png',
        frontImage: 'doorDouble-menu.png',
        width: 2134, /* 2008 */
        depth: 1004,
        opacity: 1,
    },
    {
        name: "Door Right (part of double)**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "doorDoubleRight",
        key: "SN",
        topImage: 'doorRight-top.png',
        frontImage: 'doorRight-menu.png',
        width: 1059,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Door Left (part of double)**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "doorDoubleLeft",
        key: "SO",
        topImage: 'doorLeft-top.png',
        frontImage: 'doorLeft-menu.png',
        width: 1059,
        depth: 1016,
        opacity: 1,
    },
    {
        name: "Unknown Workspace Designer* Object*",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "unknownObj",
        key: "SP",
        topImage: 'unknownObj-top.png',
        frontImage: 'unknownObj-menu.png',
        width: 350,
        depth: 350,
        opacity: 0.6,
    },
    {
        name: "_Switch (cable map)",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "switch",
        key: "SQ",
        topImage: 'switch-top.png',
        frontImage: 'switch-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
        roles: [{ ceiling: 'ceiling' }, { table: 'table' }]
    },
    {
        name: "_Codec (cable map)",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "codec",
        key: "SR",
        topImage: 'codec-top.png',
        frontImage: 'codec-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
    },
    {
        name: "Person Standing (man)",
        id: "personStandingMan",
        key: "SS",
        topImage: 'person-top.png',
        frontImage: 'person-front.png',
        width: 640,
        depth: 640,
        opacity: 1,
    },
    {
        name: 'PC Monitor 27"',
        id: 'displayMonitor',
        key: 'ST',
        frontImage: 'displayMonitor-menu.png',
        topImage: 'displayMonitor-top.png',
        width: 615,
        depth: 35,
        height: 450,
        defaultVert: 710,
        roles: [{ firstMonitor: 'First Monitor' }, { secondMonitor: 'Second Monitor' }],
    },

    {
        name: "USB-C Cable",
        id: "shareCableUsbc",
        key: "SU",
        topImage: 'shareCableUsbc-top.png',
        frontImage: 'shareCableUsbc-menu.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "HDMI Cable",
        id: "shareCableHdmi",
        key: "SV",
        topImage: 'shareCableHdmi-top.png',
        frontImage: 'shareCableHdmi-menu.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "Multi-Head Cable",
        id: "shareCableMulti",
        key: "SW",
        topImage: 'shareCableMulti-top.png',
        frontImage: 'shareCableMulti-menu.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "Swivel Chair",
        id: "chairSwivel",
        key: "SX",
        topImage: 'chairSwivel-top.png',
        frontImage: 'chairSwivel-top.png',
        width: 640,
        depth: 640,
        opacity: 0.7,
    },
    {
        name: "USB-C & HDMI",
        id: "shareCableUsbcHdmi",
        key: "SY",
        topImage: 'shareCableUsbcHdmi-top.png',
        frontImage: 'shareCableUsbcHdmi-top.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "USB-C & Multi-Head",
        id: "shareCableUsbcMulti",
        key: "SZ",
        topImage: 'shareCableUsbcMulti-top.png',
        frontImage: 'shareCableUsbcMulti-top.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,
    },
    {
        name: "HDMI & Multi-Head",
        id: "shareCableHdmiMulti",
        key: "UA",
        topImage: 'shareCableHdmiMulti-top.png',
        frontImage: 'shareCableHdmiMulti-top.png',
        width: 499,
        depth: 499,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "HDMI & USB-C & Multi-Head",
        id: "shareCableUsbcHdmiMulti",
        key: "UB",
        topImage: 'shareCableUsbcHdmiMulti-top.png',
        frontImage: 'shareCableUsbcHdmiMulti-top.png',
        width: 499,
        depth: 683,
        height: 10,
        defaultVert: 710,

    },
    {
        name: "Mouse",
        id: "mouse",
        key: "UC",
        topImage: 'mouse-top.png',
        frontImage: 'mouse-menu.png',
        width: 45,
        depth: 85,
        height: 33,
        defaultVert: 730,
    },
    {
        name: "Stool Chair",
        id: "chairHigh",
        key: "UD",
        topImage: 'chairHigh-top.png',
        frontImage: 'chairHigh-top.png',
        width: 640,
        depth: 640,
        opacity: 0.7,
    },
    {
        name: "Codec-Room Kit Pro**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "codecPro",
        key: "UE",
        topImage: 'codec-top.png',
        frontImage: 'codec-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
    },
    {
        name: "Codec-Room Kit EQ**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "codecEQ",
        key: "UF",
        topImage: 'codec-top.png',
        frontImage: 'codec-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
    },
    {
        name: "Codec-Room Kit EQX**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "codecEQX",
        key: "UG",
        topImage: 'codec-top.png',
        frontImage: 'codec-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
    },
    {
        name: "Switch Catalyst 9200CX series**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "switchC9200CX",
        key: "UH",
        topImage: 'switch-top.png',
        frontImage: 'switch-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
        roles: [{ ceiling: 'ceiling' }, { table: 'table' }]
    },
    {
        name: "Switch Catalyst 1200 series**",  /* only created on export from VRC to Workspace Designer, then on re-import */
        id: "switchC1200",
        key: "UI",
        topImage: 'switch-top.png',
        frontImage: 'switch-top.png',
        width: 720,
        depth: 300,
        opacity: 0.8,
        roles: [{ ceiling: 'ceiling' }, { table: 'table' }]
    },
    {
        name: "Christmas Tree**",
        id: "tree",
        key: "UJ",
        topImage: 'tree.png',
        frontImage: 'tree.png',
        width: 800,
        depth: 800,
        opacity: 1,
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
        defaultVert: 1010,
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
        defaultVert: 1010,
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
        defaultVert: 1010,

    },

    {
        name: 'Single 21:9 (MTR Only) display',
        id: 'display21_9',
        key: 'DD',
        frontImage: 'display21_9-front.png',
        topImage: 'displaySngl-top.png',
        width: displayWidth21_9,
        depth: displayDepth21_9,
        height: displayHeight21_9,
        diagonalInches: diagonalInches21_9,
        defaultVert: 1010,
    },
    {
        name: 'Projector Screen',
        id: 'displayScreen',
        key: 'DE',
        frontImage: 'displayScreen-menu.png',
        topImage: 'displayScreen-top.png',
        width: displayWidth * 2,
        depth: displayDepth * 0.7,
        height: displayHeight & 2,
        diagonalInches: diagonalInches * 2,
        defaultVert: 1010,
        roles: [{ 'singleScreen': 'Single Screen' }, { 'firstScreen': 'First Screen' }, { 'secondScreen': 'Second Screen' }, { 'thirdScreen': 'PresenterTrack Display' }]
    },



]

/* Floor keys start with F */
let stageFloors = [
    {
        name: 'Stage Floor (Box)',
        id: 'stageFloor',
        key: 'FA',
        frontImage: 'box-front.png',
        family: 'wallBox',
        stroke: 'black',
        strokeWidth: 2,
        dash: [4, 8],
        resizeable: ['width', 'depth', 'vheight']
    },
    {
        name: 'Carpet*',
        id: 'carpet',
        key: 'FB',
        frontImage: 'box-front.png',
        family: 'wallBox',
        stroke: 'grey',
        strokeWidth: 4,
        dash: [8, 3],
        resizeable: ['width', 'depth', 'vheight']
    }
]


/*  Boxes are a higher level than tables and can start with W */
let boxes = [
    {
        name: 'Box',
        id: 'box',
        key: 'WD',
        frontImage: 'box-front.png',
        family: 'wallBox',
        stroke: 'black',
        strokeWidth: 2,
        dash: [7, 5],
        resizeable: ['width', 'depth', 'vheight']
    },
    {
        name: 'Wall Builder - Multiple walls',
        id: 'wallBuilder',
        key: 'ZX',
        frontImage: 'wallBuilder-menu.png',
        strokeWidth: 1,
        resizeable: []
    }
]

let rooms = [
    {
        name: 'Irregular Room (polyRoom) Experimental**',
        id: 'polyRoom',
        key: 'ZY',
        frontImage: 'pathShape-menu.png',
        strokeWidth: 1,
        fill: 'lightblue',
        resizeable: []
    },
    {
        name: 'Room Part (Experimental)**',
        id: 'boxRoomPart',
        key: 'ZZ',
        frontImage: 'box-front.png',
        family: 'wallBox',
        stroke: 'darkgrey',
        strokeWidth: 3,
        fill: 'lightblue',
        resizeable: ['width', 'depth', 'vheight']
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

function createRoomId() {
    let roomId = createUuid();
    return roomId;
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

            if (!multiUpdateMode) {
                updateItem();
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
        let displayNumber, width;
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

        if (data_deviceid === 'display21_9') {
            width = (displayWidth21_9 / diagonalInches21_9) * inches / 1000 * displayNumber * unitRatio;
        } else {
            width = (displayWidth / diagonalInches) * inches / 1000 * displayNumber * unitRatio;
        }




        itemWidth.value = width.toFixed(2);



    }
}

function addEventUpdateItemsDropDown() {
    let drp = document.querySelectorAll(".selectRole");

    drp.forEach((drpItem) => {

        drpItem.addEventListener("change", (event) => {

            updateItem();

        });
    })

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

            if (!multiUpdateMode) {
                updateItem();
            }
        })
    }

    let degreeInputs = document.querySelectorAll(".degreeInput");

    for (var i = 0; i < degreeInputs.length; i++) {
        degreeInputs[i].addEventListener("input", (event) => {
            event.target.value = event.target.value.replace(/[^0-9.-]/i, '');
        })

        degreeInputs[i].addEventListener("blur", () => {

            if (!multiUpdateMode) {
                updateItem();
            }
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

            if (event.target.value == ' ' && event.target.id === 'labelField2') {
                event.target.value = '{}'; /* set this value so it will delete in the multiItemUpdate*/
            }
            event.target.value = event.target.value.replace(/^[\s_]+|[\s_]+$/g, '');  /* trim spaces or _ */

            event.target.value = event.target.value.replace(/[<]/gi, '\uFF1C');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[>]/gi, '\uFF1E');  /* don't allow scripting tags be typed, replace with similar unicode. */
            event.target.value = event.target.value.replace(/[~]/gi, '\u301C'); /* tilde ~ is a control character in the URL and is replaced with a similar unicode character */

            if (event.target.id === 'roomName') {
                roomObj.name = event.target.value.replace(/^[\s_]+|[\s_]+$/g, ''); /* trim spaces or _ before sending adding to the roomObj */
            }

            if (!multiUpdateMode) {
                updateItem();
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

    if (isTeslaBrowser()) {
        mobileDevice = 'Tesla';
    }

}

setMouseEventListeners();

function setMouseEventListeners() {

    document.addEventListener('pointerdown', (event) => {
        logMouseMovements(event);
    });

    document.addEventListener('pointermove', (event) => {
        logMouseMovements(event);
    });

    document.addEventListener('click', (event) => {
        logMouseMovements(event);
    });

    document.addEventListener('pointerup', (event) => {
        logMouseMovements(event);
    });


}

let mouse = {}; /* mouse.x .y position pixels */
mouse.x = 0;
mouse.y = 0;

let mouseUnit = {}; /* mouseUnit.x .y are the position on the canvas in feet or meters, properly updated for scale and zoom */
mouseUnit.x = 0;
mouseUnit.y = 0;

let quickAddMouse = {}; /* keep track of where the mouse was when initiating the toggleQuickAdd() */
quickAddMouse.x = 0;
quickAddMouse.y = 0;

/* log last mouse movement for Copy / Cut / Paste */


function logMouseMovements(event) {

    // let canvas = document.getElementById('canvasDiv');
    // let canvasDivBound = canvas.getBoundingClientRect();

    // dx = scrollContainer.scrollLeft;
    // dy = scrollContainer.scrollTop;

    if (event.clientX) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    }


    // canvasPixel.x = (mouse.x - canvasDivBound.x + dx) / zoomScaleX;
    // canvasPixel.y = (mouse.y - canvasDivBound.y + dy) / zoomScaleY;

    // let unitX = (canvasPixel.x - pxOffset) / scale + activeRoomX;
    // let unitY = (canvasPixel.y - pxOffset) / scale + activeRoomY;

    // mouseUnit.x = round(unitX);

    // mouseUnit.y = round(unitY);

    const location = convertMouseToCanvasPixel(mouse.x, mouse.y);

    canvasPixel.x = location.canvasPixel.x;
    canvasPixel.y = location.canvasPixel.y;
    mouseUnit.x = location.mouseUnit.x;
    mouseUnit.y = location.mouseUnit.y;
};


function convertMouseToCanvasPixel(mouseX, mouseY) {

    let canvas = document.getElementById('canvasDiv');
    let canvasDivBound = canvas.getBoundingClientRect();

    let canvasPixel = {};
    let mouseUnit = {};

    dx = scrollContainer.scrollLeft;
    dy = scrollContainer.scrollTop;


    canvasPixel.x = (mouseX - canvasDivBound.x + dx) / zoomScaleX;
    canvasPixel.y = (mouseY - canvasDivBound.y + dy) / zoomScaleY;

    let unitX = (canvasPixel.x - pxOffset) / scale + activeRoomX;
    let unitY = (canvasPixel.y - pxOffset) / scale + activeRoomY;

    mouseUnit.x = round(unitX);
    mouseUnit.y = round(unitY);

    return ({ mouseUnit, canvasPixel, mouse: { x: mouseX, y: mouseY } });
};


let resizeWindowTimer;

windowResizeEvent(); /* initialize first time */

let scrollContDim = {};

scrollContDim.width = 0;
scrollContDim.height = 0;
scrollContDim.rectWidth = 0;
scrollContDim.rectHeight = 0;

function windowResizeEventName() {

    let blurryDiv = document.getElementById('scroll-container');
    blurryDiv.classList.add('my-blurred-div');

    trNodesUuidToRoomObj();
    toggleMoreMenu('close');
    closeAllMenus();
    closeRightClickMenu();

    clearTimeout(resizeWindowTimer);

    resizeWindowTimer = setTimeout(function resizingCanvas() {
        zoomInOut('reset');
        drawRoom(true, false, true);

        setTimeout(() => {
            blurryDiv.classList.remove('my-blurred-div');
        }, 500);

        // setTimeout(updatWallChairsOnResize, 100);
    }, 550);


    positionCloseArrow();
}

positionCloseArrow();


function positionCloseArrow() {
    let element = document.getElementById('ContainerRoomSvg');
    let closeOpenMenu = document.getElementById('closeOpenMenu');

    const rect = element.getBoundingClientRect();

    let position = {
        x: rect.left + window.pageXOffset,
        y: rect.top + window.pageYOffset
    };


    if (position.x < 120) {
        closeOpenMenu.style.transform = 'translate(0px,0px)';
    } else {
        closeOpenMenu.style.transform = 'translate(25px,140px)';
    }


}


function blurRoom() {
    let blurryDiv = document.getElementById('scroll-container');
    blurryDiv.classList.add('my-blurred-div');

    setTimeout(() => {
        blurryDiv.classList.remove('my-blurred-div');
    }, 500);
}


function hasScrollbar(element) {

    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}




function windowResizeEvent() {
    window.addEventListener('resize', windowResizeEventName);
}



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
        () => { alert('Hyperlink copied to clipboard') },
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

    let roomX;
    let roomY;



    Object.keys(roomObj2.items).forEach(key => {
        roomObjTemp.items[key] = [];
    });

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

    for (const category in roomObj2.items) {
        roomObjTemp.items[category] = [];
        for (const i in roomObj2.items[category]) {

            const isItemOnStage = !itemsOffStageId.includes(roomObj2.items[category][i].id)

            if (isItemOnStage || isActiveRoomPart) {    /* only add the node if it is onstage */

                let item = roomObj2.items[category][i];

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

                if ('tblRectRadius' in item) {
                    item.tblRectRadius = round(item.tblRectRadius * ratio);
                }

                if ('data_trapNarrowWidth' in item) {
                    item.data_trapNarrowWidth = round(item.data_trapNarrowWidth * ratio);
                }

                if ('tblRectRadiusRight' in item) {
                    item.tblRectRadiusRight = round(item.tblRectRadiusRight * ratio);
                }

                if (isItemOnStage) {
                    item.data_isItemOnStage = true;
                } else {
                    item.data_isItemOnStage = false;
                }

                roomObjTemp.items[category].push(item);
            }
        }

    }

    return roomObjTemp;

}

function toggleFeetMeters() {
    if (roomObj.unit === 'feet') {
        convertMetersFeet(true, 'meters')
    } else {
        convertMetersFeet(true, 'feet')
    }

    document.getElementById('roomWidth2').value = roomObj.room.roomWidth;
    document.getElementById('roomLength2').value = roomObj.room.roomLength;

}

function updateFeetMetersToggleBtn() {
    let unitPartsFeet = document.querySelectorAll('.btnPartFoot');
    let unitPartsMeters = document.querySelectorAll('.btnPartMeters');

    unitPartsFeet.forEach(unitPartFeet => {
        if (roomObj.unit === 'feet') {
            unitPartFeet.style.fontWeight = 'bold';
            unitPartFeet.style.color = 'black';

        } else {
            unitPartFeet.style.fontWeight = 'normal';
            unitPartFeet.style.color = 'grey';
        }
    });

    unitPartsMeters.forEach(unitPartMeter => {
        if (roomObj.unit === 'meters') {
            unitPartMeter.style.fontWeight = 'bold';
            unitPartMeter.style.color = 'black';
        } else {
            unitPartMeter.style.fontWeight = 'normal';
            unitPartMeter.style.color = 'grey';
        }
    });
}


function convertItemUnitBasedOnRatio(item, ratio) {


    if ('x' in item) {
        item.x = item.x * ratio;
    }

    if ('y' in item) {
        item.y = item.y * ratio;
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

    if ('data_trapNarrowWidth' in item && !isNaN(item.data_trapNarrowWidth)) {
        item.data_trapNarrowWidth = round(item.data_trapNarrowWidth * ratio);
    }

    if ('tblRectRadiusRight' in item) {
        item.tblRectRadiusRight = round(item.tblRectRadiusRight * ratio);
    }

    if ('tblRectRadius' in item) {
        item.tblRectRadius = round(item.tblRectRadius * ratio);
    }

    if ('points' in item) {
        item.points.forEach((point, index) => {
            item.points[index] = round(point * ratio);
        });
    }

    return item;

}

function convertMetersFeet(isDrawRoom, newUnit = null) {

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

    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let item = roomObj.items[category][i];
            item = convertItemUnitBasedOnRatio(item, ratio);
        }

    }

    if (isDrawRoom != 'noDraw') {
        drawRoom(true);
    }




}

function getQueryString() {
    // TODO temp fix for not having online connection
    // return;

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    roomName = urlParams.get('roomName');
    roomName = DOMPurify.sanitize(roomName);
    roomObj.name = roomName;

    if (urlParams.has('x')) {
        let x = urlParams.get('x');
        parseShortenedXYUrl(x);

        keepDefaultUnit();

        drawRoom(true, true, false);

    }

    else if (urlParams.has('ver')) {
        if (urlParams.has('ver')) versionQueryString = DOMPurify.sanitize(urlParams.get('ver'));
        //  if (urlParams.has('ver')) versionQueryString = urlParams.get('ver');

        lastAction = 'load from querystring';

        /* possibley remove the below code */
        if (!(versionQueryString == version)) {
            versionQueryString = DOMPurify.sanitize(versionQueryString);
            lastAction = "redirect to " + versionQueryString;
        }
    } else {
        loadTemplate('A1v0b2600c2000B100100'); /* create a default */
        openNewRoomDialog();
    }

    /* Google search shows an old URL format, which then auto redirects to the v0.0. Block that redirect, but still support older formats */
    let googleWrongUrl = "https://collabexperience.com/?drpMetersFeet=feet&roomWidth=12&roomLength=20&tableWidth=4&tableLength=10&distDisplayToTable=5&frntWallToTv=0.5&tvDiag=65&drpTvNum=1&drpVideoDevice=roomBarPro&wideFOV=112&teleFOV=70&zoom=5&fieldOfViewDist=5&roomName=";

    if ((urlParams.has('roomWidth')) && window.location.href != googleWrongUrl) {
        responseRedirect('rc/v0.1.599/RoomCalculator.html'); /* redirect version v0.1.599 is just to update querystring values and then redirect back to the current version */
    }

    function responseRedirect(newPath) {
        let redirectLink = location.origin + '/' + newPath + '?' + queryString.replace(/^\?/, '');
        window.location.href = redirectLink;
    }

    if (urlParams.has('qr')) {
        qrCodeButtonsVisible = true;
        qrCodeAlwaysOn = true;
        makeButtonsVisible();
    }

    if (urlParams.has('test')) {
        let testValue = urlParams.get('test');
        if (testValue === '' || testValue == 1 || testValue == 'on') {
            console.info('test in querystring. Test fields shown.  Test fields are highly experimental and unstable.');
            if (document.getElementById('test')) {
                document.getElementById('test').setAttribute('style', 'visibility: visible;');
            }

            setItemForLocalStorage('test', 'true');
        }
        else if (testValue == '0' || testValue === 'off') {
            console.info('"test" fields are turned off and the setting is removed from local storage');
            localStorage.removeItem('test');
        }

    } else if (localStorage.getItem('test') === 'true') {

        if (document.getElementById('test')) {
            document.getElementById('test').setAttribute('style', 'visibility: visible;');
        }

    }

    /* simulate RoomOS for testing only */
    if (urlParams.has('RoomOS') || urlParams.has('roomos')) {
        mobileDevice = 'RoomOS';
    }

    if (urlParams.has('tesla') || urlParams.has('Tesla')) {
        mobileDevice = 'Tesla';
    }

    /* RoomOS does not support the Workspace Designer cross-launch */

    if ((mobileDevice === 'RoomOS')) {
        loadDrpDownOverrideScript();
        testiFrame = true;
        newWorkspaceTab = defaultWorkspaceTestSite;
        testNew = true;
    }
    else if ((mobileDevice === 'Tesla')) {
        loadDrpDownOverrideScript();
        document.getElementById('testA').setAttribute('style', 'visibility: visible;');
        document.getElementById('testB').style.display = '';
    } else {
        document.getElementById('testA').setAttribute('style', 'visibility: visible;');
        document.getElementById('testB').style.display = '';
    }


    if (urlParams.has('testProduction')) {
        testProduction = true;
    }

    if (urlParams.has('offset')) {
        testOffset = true;
    }

    /* testNew parameters relate to the new orientation settings for the Workspace Designer */
    if (urlParams.has('testNew')) {
        let testNewQueryString = urlParams.get('testNew');
        if (testNewQueryString == '0') {
            console.info('urlParams testNew=0, new feature test is off');
            testNew = false;
            localStorage.removeItem('testNew');
        }
        else {

            setItemForLocalStorage('testNew', 'true');
            testNew = true;
        }
    } else {
        if (localStorage.getItem('testNew') === 'true') {
            testNew = true;
        } else {
            testNew = false;
            localStorage.removeItem('testNew');
        }
    }




    if (urlParams.has('testiFrame')) {
        let testiFrameQueryString = urlParams.get('testiFrame');
        if (testiFrameQueryString == '0') {
            console.info('urlParams testiFramee=0, new feature test is off');
            testiFrame = false;
            localStorage.removeItem('testiFrame');
        }
        else {

            setItemForLocalStorage('testiFrame', 'true');
            testiFrame = true;
        }
    } else {
        if (localStorage.getItem('testiFrame') === 'true') {
            testiFrame = true;
        } else {
            testiFrame = false;
        }
    }

    if (testiFrame) {
        console.info('Testing iFrame is turned On. To turn off use ?testiFrame=0');

    }

    if (urlParams.has('wd')) {
        let wd = urlParams.get('wd');
        let testNewString = 'false';
        if (wd == '0') {
            console.info('urlParams wd=0, custom Workspace Designer tab is turned off');
            localStorage.removeItem('wd');
            workspaceDesignerTestUrl = null;
        }
        else {
            /* ?wd=https%3A%2F%2Flocalhost%3A3000 */
            let base = decodeURIComponent(wd);
            if (wd === '1') {
                workspaceDesignerTestUrl = defaultWorkspaceTab;
                testNew = false;
            } else {
                workspaceDesignerTestUrl = `${base}/#/room/custom`;
            }

            console.info('urlParams wd=', workspaceDesignerTestUrl, 'custom Workspace Designer tab is set.');
            setItemForLocalStorage('wd', workspaceDesignerTestUrl);
            setItemForLocalStorage('testNew', testNew)
        }
    } else {
        workspaceDesignerTestUrl = localStorage.getItem('wd');
    }

    if (urlParams.has('test2')) {
        console.info('test2 in querystring. Test & test2 fields shown.  Try fields are works in progress, highly experimental and unstable.');
    }

    if (workspaceDesignerTestUrl) {
        let wdSite = document.getElementById('wdSite');
        let wdSiteDiv = document.getElementById('wdSiteDiv');
        let regex = /^https:\/\/www\.webex\.com\//i
        if (!regex.test(workspaceDesignerTestUrl)) {
            testiFrame = true;
        }

        wdSiteDiv.style.display = '';
        wdSite.value = workspaceDesignerTestUrl;
    } else {
        document.getElementById('wdSiteDiv').style.display = 'none';
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

    function isNumberLike(character) {   /* includes numbers and version numbers.  For example: 2, 0.05, -2, 0.1.1.2 or a series of numbers separarted by a space*/
        return /[\-.0-9+ ]/.test(character);
    }

    let i = 0;

    let objCount = 0;

    const charType = {
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
                } else {
                    roomObj.workspace.removeDefaultWalls = false;
                }

                if (shadeArray[6] == '1') {
                    roomObj.layersVisible.grLabels = true;
                } else {
                    roomObj.layersVisible.grLabels = false;
                }

                if (shadeArray[7] == '1') {
                    roomObj.layersVisible.grShadingSpeaker = true;
                } else {
                    roomObj.layersVisible.grShadingSpeaker = false;
                }

                if (shadeArray[8] === '1') {
                    roomObj.workspace.theme = 'christmas';
                } else {
                    roomObj.workspace.theme = 'regular';
                }


            }

        } else if (item.sid === "C") { /* authorVersion */
            if ('text' in item) {
                roomObj.authorVersion = DOMPurify.sanitize(item.text);
            }
        }
        else if (item.sid === "D" || item.sid === "E" || item.sid === "F" || item.sid === "G") {
            let roomSurface = {};
            let wall;

            if ('value' in item) {
                if (item.value === '0') {
                    roomSurface.type = 'regular';
                }
                else if (item.value === '1') {
                    roomSurface.type = 'glass';
                }
                else if (item.value === '2') {
                    roomSurface.type = 'window';
                }
            }

            if ('a' in item) {
                if (item.a === '0') {
                    roomSurface.acousticTreatment = false;
                }
                else if (item.a === '1') {
                    roomSurface.acousticTreatment = true;
                }
            }

            if ('b' in item) {
                if (item.b === '0') {
                    roomSurface.door = 'left';
                }
                else if (item.b === '1') {
                    roomSurface.door = 'center';
                }
                else if (item.b === '2') {
                    roomSurface.door = 'right';
                }
            }

            if (item.sid === "D") {
                wall = 'leftwall';
            } else if (item.sid === 'E') {
                wall = 'rightwall';
            } else if (item.sid === 'F') {
                wall = 'videowall';
            } else if (item.sid === 'G') {
                wall = 'backwall';
            }

            roomObj.roomSurfaces[wall] = roomSurface;
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

            if ('o' in item) {
                newItem.data_tilt = item.o / 10;
            }

            if ('p' in item) {
                newItem.data_slant = item.p / 10;
            }

            if ('q' in item) {
                populateMountFromUrl(newItem, item.q);
            } else {
                populateMountFromUrl(newItem);
            }

            if ('r' in item) {
                newItem.points = parseUrlPoints(item.r)
            }


            if ('text' in item) {
                newItem.data_labelField = DOMPurify.sanitize(item.text);
            }

            newItem.id = createUuid();


        }


    })

    return output;

}

function parseUrlPoints(itemPoints) {
    const points = itemPoints.split(' ');

    const newPoints = points.map(point => {
        return point / 100;
    });

    return newPoints;
}

function deleteBackgroundImageConfirmation() {
    let text = "Delete Room Floor Plan Background?";
    if (confirm(text) == true) {
        deleteBackgroundImage();
    }
}

function deleteBackgroundImage() {
    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (konvaBackgroundImageFloor) {
        konvaBackgroundImageFloor.destroy();
        document.getElementById('fileInputImage').value = '';

    }


    delete roomObj.backgroundImage;
    delete roomObj.backgroundImageFile;

    document.getElementById('transparencySlider').value = 50
    document.getElementById('transparencyOutput').innerText = 50;

    turnOffBackgroundImageButtons();


}

function resetRoomObj() {

    roomObj.name = ''; /* Pre-creating objects now so the order shows up on top in JSON file. */
    roomObj.trNodes = []; /* These are the selected shape items used for undo / redo. Does not need to be saved in URL */
    roomObj.layersVisible.grShadingCamera = true;  /* true or false */
    roomObj.layersVisible.grDisplayDistance = false; /* true or false */
    roomObj.layersVisible.grShadingMicrophone = false;  /* true or false */
    roomObj.layersVisible.gridLines = true; /* true or false */
    roomObj.layersVisible.grShadingSpeaker = false;  /* true or false */
    roomObj.layersVisible.grLabels = false;

    roomObj.items.videoDevices = [];
    roomObj.items.chairs = [];
    roomObj.items.tables = [];
    roomObj.items.stageFloors = [];
    roomObj.items.boxes = [];
    roomObj.items.displays = [];
    roomObj.items.speakers = [];
    roomObj.items.microphones = [];
    roomObj.items.rooms = [];

    roomObj.workspace.theme = 'standard';

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


    roomObj.roomSurfaces =
    {
        leftwall: { type: 'regular', acousticTreatment: false },
        videowall: { type: 'regular', acousticTreatment: false },
        rightwall: { type: 'regular', acousticTreatment: false },
        backwall: { type: 'regular', acousticTreatment: false }
    }

    deleteBackgroundImage();

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

    wallBuilderOn(false);
    polyBuilderOn(false);
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

    redirectToCollabExpereince();


    undoArray = JSON.parse(localStorage.getItem('undoArray'));

    if (!Array.isArray(undoArray)) undoArray = [];  /* for first run, if local storage not set */
    updateSelectVideoDeviceOptions();
    getQueryString();
    saveToUndoArray();
    postHeartbeat();
    setTimeout(() => {
        addressBarUpdate = true;
        //  canvasToJson();
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

    if (localStorage.getItem('useNonWorkspaceItems') === 'true') {
        document.getElementById('useNonWorkspaceItemsCheckBox').checked = true;
    } else {
        document.getElementById('useNonWorkspaceItemsCheckBox').checked = false;
    }

    if (localStorage.getItem('showTiltSlant') === 'true') {
        document.getElementById('showTiltSlantCheckBox').checked = true;
    } else {
        document.getElementById('showTiltSlantCheckBox').checked = false;
    }

    if (localStorage.getItem('convertDefaultWallsOff') === 'true') {
        document.getElementById('convertDefaultWallsOffCheckBox').checked = true;
    } else {
        document.getElementById('convertDefaultWallsOffCheckBox').checked = false;
    }

    if (localStorage.getItem('snapIncrementCheckBox') === 'true') {
        document.getElementById('snapIncrementCheckBox').checked = true;
        document.getElementById('snapToIncrement').disabled = false;
    } else {
        document.getElementById('snapIncrementCheckBox').checked = false;
        document.getElementById('snapToIncrement').disabled = true;
    }

    if (localStorage.getItem('snapRotationOffCheckBox') === 'true') {
        document.getElementById('snapRotationOffCheckBox').checked = true;
        tr.rotationSnaps([]);
    } else {
        document.getElementById('snapRotationOffCheckBox').checked = false;
        tr.rotationSnaps([0, 45, 90, 135, 180, 225, 270, 315, 360]);
    }

    if (localStorage.getItem('snapToIncrement')) {
        document.getElementById('snapToIncrement').value = localStorage.getItem('snapToIncrement');
    }

    populateTemplates();

    firstLoad = false;

    createEquipmentMenu();

    addEventUpdateItemsDropDown()

    makeButtonsVisible();

    updateRemoveDefaultWallsCheckBox();
}



function createTemplateButton(template) {
    const { name, url, note, noteUrl, image } = template;
    const box = document.createElement('div');
    box.className = 'room-template';
    const button = document.createElement('button');
    const label = document.createElement('span');
    label.innerText = name;
    button.className = 'templateLinks';
    button.onclick = () => loadTemplate(url);
    box.appendChild(button);

    const img = document.createElement('img');
    img.src = `./assets/images/templates/${image}`;
    img.inert = true; /* used to remove the Edge image search */
    button.appendChild(img);

    button.appendChild(label);

    if (note) {
        const a = document.createElement('a');
        a.innerText = note;
        a.href = noteUrl;
        a.target = '_blank';
        a.className = 'infoText';
        box.appendChild(a);
    }

    return box;
}

function populateTemplates() {
    const parent = document.querySelector('#room-templates');
    templates.forEach(template => {
        parent.appendChild(createTemplateButton(template));
    })
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

    let roomHeight = document.getElementById('roomHeight').value;
    if (roomHeight != 0 || roomHeight != '') {
        roomObj.room.roomHeight = Number(roomHeight);
        defaultWallHeight = roomObj.room.roomHeight;
    }

    updateRoomDetails();
    drawRoom(true);
    makeButtonsVisible();
}



/*
if site is wwww.collabexperienc.com redirect to collabexperience.com
*/
function redirectToCollabExpereince() {
    if (location.href.match(/^https:\/\/www\.collabexperience\.com/)) {
        let redirectUrl = location.href;
        window.location.href = redirectUrl.replace(/^https:\/\/www\.collabexperience\.com/, 'https://collabexperience.com');
    }
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
    let boxesNum = roomObj.items.boxes.length;
    let touchPanlesNum = roomObj.items.touchPanels.length;
    let microphones = roomObj.items.microphones.length;
    let otherDevices = chairsNum + boxesNum + touchPanlesNum + microphones;

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
    roomObj.items.boxes = [];
    roomObj.items.rooms = [];
    roomObj.room.roomWidth = document.getElementById('roomWidth2').value;
    roomObj.room.roomLength = document.getElementById('roomLength2').value;
    roomObj.name = document.getElementById('roomName2').value;

    drawRoom(true, true, true);
    setTimeout(() => { quickSetupInsert() }, 100);
}


function addItemToRoomObj(attrs) {
    if ('x' in attrs && 'y' in attrs && 'id' in attrs && 'data_deviceid' in attrs) {
        roomObj.items[allDeviceTypes[attrs.data_deviceid].parentGroup].push(attrs);
    } else {
        console.error('Attrs missing x, y, id or data_deviceid');
    }
}

function createTableChairs(table, tableUuid) {
    let baseUuid;
    let chairWidth = 2.35; /* width in feet */
    chairWidth = (roomObj.unit === 'meters') ? chairWidth / 3.28084 : chairWidth;

    let numberOfChairsLength = Math.floor(table.height / chairWidth);

    let numberOfChairsWidth = Math.floor(table.width / chairWidth);

    let startingPointY = table.y + chairWidth / 2 + (table.height - (numberOfChairsLength * chairWidth)) / 2;

    let startingPointX = table.x + chairWidth / 2 + (table.width - (numberOfChairsWidth * chairWidth)) / 2;

    if ('id' in table) {
        baseUuid = table.id;
    }
    else if (tableUuid) {
        baseUuid = tableUuid;
    }
    else {
        baseUuid = createUuid();
    }

    /* Chairs on left site of table */
    for (let i = 0; i < numberOfChairsLength; i++) {
        let chairAttr = {};
        chairAttr.x = table.x - chairWidth / 2.5;
        chairAttr.y = startingPointY + chairWidth * i;
        chairAttr.rotation = -90;
        chairAttr.data_deviceid = 'chair';
        chairUuid = 'autoChair-L-' + i + '-' + baseUuid;
        chairAttr.id = chairUuid;
        addItemToRoomObj(chairAttr);
        insertItem(chairAttr, chairUuid);






    }

    /* Chairs on right site of table */
    for (let i = 0; i < numberOfChairsLength; i++) {
        let chairAttr = {};
        chairAttr.x = table.x + table.width + chairWidth / 2.5;
        chairAttr.y = startingPointY + chairWidth * i;
        chairAttr.rotation = 90;
        chairAttr.data_deviceid = 'chair';
        chairUuid = 'autoChair-R-' + i + '-' + baseUuid;
        chairAttr.id = chairUuid;
        insertItem(chairAttr, chairUuid);
        addItemToRoomObj(chairAttr);
    }

    /* Chairs head of table */
    for (let i = 0; i < numberOfChairsWidth; i++) {
        let chairAttr = {};
        chairAttr.x = startingPointX + chairWidth * i;

        chairAttr.y = table.y + table.height + chairWidth / 2.5;

        chairAttr.rotation = 180;
        chairAttr.data_deviceid = 'chair';
        chairUuid = 'autoChair-H-' + i + '-' + baseUuid;
        chairAttr.id = chairUuid;
        insertItem(chairAttr, chairUuid);
        addItemToRoomObj(chairAttr);
    }

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
    tblAttrs.data_deviceid = 'tblRect';
    tblAttrs.id = tableUuid;
    tblAttrs.rotation = 0;
    insertItem(tblAttrs, tableUuid);
    addItemToRoomObj(tblAttrs);


    createTableChairs(tblAttrs, tableUuid);

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

                /* get defaultVert if available */
                if ('defaultVert' in allDeviceTypes[displayId]) {
                    let defaultVert = allDeviceTypes[displayId].defaultVert / 1000;
                    defaultVert = defaultVert - 0.23;

                    if (roomObj.unit === 'feet') {
                        defaultVert = round(defaultVert * 3.28084)
                    }
                    displayAttr.data_zPosition = defaultVert;
                }

                displayAttr.data_deviceid = displayId;
                displayAttr.id = displayUuid;

                // insertShapeItem(displayId, 'displays', displayAttr, displayUuid, false);
                insertItem(displayAttr, displayUuid);

                addItemToRoomObj(displayAttr);

                videoAttr.data_zPosition = fillInTopElevationDisplay(displayAttr, false);
            }
        }
    });

    // insertShapeItem(videoDeviceId, 'videoDevices', videoAttr, videoDeviceUuid, false);

    videoAttr.id = videoDeviceId;
    videoAttr.data_deviceid = videoDeviceId;
    insertItem(videoAttr, videoDeviceId);
    addItemToRoomObj(videoAttr);


    setTimeout(() => {
        canvasToJson()
    }, 250);


};



function quickUpdateButton() {

    zoomInOut('reset');

    roomObj.roomId = createRoomId();

    lastAction = 'quickupdate button';
    postHeartbeat();

    quickSetupUpdate();

    closeNewRoomDialog()
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
        document.getElementById('RoomOSmessage').setAttribute('style', 'visibility: visible;');
        testiFrame = true;
    }
    else if (qrCodeButtonsVisible == true || mobileDevice === 'Tesla') {
        document.getElementById('RoomOSmessage').setAttribute('style', 'visibility: visible;');
        document.getElementById('downloadButtons').setAttribute('style', 'visibility: visible;');
    }
    else {
        document.getElementById('downloadButtons').setAttribute('style', 'visibility: visible;');
        document.getElementById('RoomOSmessage').style.display = 'none';
    }

    if (testiFrame) {
        document.getElementById('btnModalWorkspace').style.display = '';
    }
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

/*  Geomerty reference: https://www2.clarku.edu/faculty/djoyce/trig/right.html
 formula distanceA = distanceB / (Tan degreeB) */

function getDistanceA(degreeB, distanceB) {

    return distanceB / (Math.tan((degreeB * Math.PI) / 180));
}

function getDistanceB(degreeB, distanceA) {
    return (Math.tan((degreeB * Math.PI) / 180)) * distanceA;
}



function drawOutsideWall(grOuterWall) {

    let outsideWallThickness = 0.115;

    if (roomObj.unit === 'feet') {
        outsideWallThickness = outsideWallThickness * 3.28084;
    }


    let outsideWall = new Konva.Rect({
        x: pxOffset - outsideWallThickness * scale,
        y: pyOffset - outsideWallThickness * scale,
        width: (roomWidth + outsideWallThickness * 2) * scale,
        height: (roomLength + outsideWallThickness * 2) * scale,
        stroke: '#CCCCCC',
        strokeWidth: 1,
        id: 'outsideWall',
        listening: false,
        preventDefault: false,
    });

    grOuterWall.add(outsideWall);

    let defaultWallColor = '#cccccc';
    let defaultWallOpacity = 0.6;

    if (!roomObj.workspace.removeDefaultWalls) {

        outsideWall.stroke('#888888');

        let outsideWallLeft = new Konva.Rect({
            x: pxOffset - outsideWallThickness * scale,
            //   y: pyOffset - outsideWallThickness * scale,
            y: pyOffset,
            width: outsideWallThickness * scale,
            //   height: (roomLength + outsideWallThickness * 2) * scale,
            height: roomLength * scale,
            // stroke: '#8f8d8d',
            // strokeWidth: 1,
            fill: defaultWallColor,
            opacity: defaultWallOpacity,
            id: 'defaultOutsideWallLeft',
            name: 'leftwall',
            listening: true,
            preventDefault: false,
        });

        outsideWallLeft.data_deviceid = 'outsideWallLeft';

        grOuterWall.add(outsideWallLeft);

        let outsideWallRight = new Konva.Rect({
            x: pxOffset + (roomWidth + outsideWallThickness) * scale,
            y: pxOffset + roomLength * scale,
            rotation: 180,
            width: outsideWallThickness * scale,
            height: roomLength * scale,
            // stroke: '#8f8d8d',
            // strokeWidth: 1,
            fill: defaultWallColor,
            opacity: defaultWallOpacity,
            id: 'defaultOutsideWallRight',
            name: 'rightwall',
            listening: true,
            preventDefault: false,
        });

        outsideWallLeft.data_deviceid = 'outsideWallRight';
        grOuterWall.add(outsideWallRight);

        let outsideWallUpper = new Konva.Rect({
            x: pxOffset + (roomWidth + outsideWallThickness) * scale,
            y: pyOffset - outsideWallThickness * scale,
            rotation: 90,
            width: outsideWallThickness * scale,
            height: (roomWidth + (outsideWallThickness * 2)) * scale,
            fill: defaultWallColor,
            opacity: defaultWallOpacity,
            id: 'defaultOutsideWallUpper',
            name: 'videowall',
            listening: true,
            preventDefault: false,
        });

        outsideWallLeft.data_deviceid = 'outsideWallUpper';

        grOuterWall.add(outsideWallUpper);

        let outsideWallLower = new Konva.Rect({
            x: pxOffset - outsideWallThickness * scale,
            y: pyOffset + (roomLength + outsideWallThickness) * scale,
            rotation: 270,
            width: outsideWallThickness * scale,
            height: (roomWidth + (outsideWallThickness * 2)) * scale,
            fill: defaultWallColor,
            opacity: defaultWallOpacity,
            id: 'defaultOutsideWallLower',
            name: 'backwall',
            listening: true,
            preventDefault: false,
        });

        outsideWallLeft.data_deviceid = 'outsideWallLower';

        grOuterWall.add(outsideWallLower);

        addListeners(outsideWallLeft);
        addListeners(outsideWallRight);
        addListeners(outsideWallUpper);
        addListeners(outsideWallLower);

        ['leftwall', 'videowall', 'backwall', 'rightwall'].forEach(type => {
            updateDefaultWallTypeOnCanvas(type);
        })

        insertDefaultDoorsOnCanvas();

        function addListeners(wallItem) {

            wallItem.on('mousedown touchstart', function outsideWallOnMouseDownTouchstart(e) {
                /* tempWall is just for flashing purple when the wall is selected */
                let tempWall = stage.findOne('#tempWall');
                if (tempWall) {
                    tempWall.destroy();
                }

                selectingOuterWall = true;
                tr.nodes([]);

                e.evt.preventDefault();
                if (panScrollableOn || isSelectingTwoPointsOn || movingBackgroundImage || isWallBuilderOn || isWallWriterOn2 || isPolyBuilderOn) {
                    e.evt.preventDefault();
                    return;
                }

                tempWall = e.target.clone();

                tempWall.id('tempWall');
                tempWall.fill('purple');
                tempWall.opacity(0.2);

                grOuterWall.add(tempWall);

                document.getElementById("tabItem").click();
                document.getElementById("subTabDefaultWalls").click();
                //   document.getElementById("drpRoomSurfaces").value = e.target.name();
                updateDefaultWallsMenu(e.target.name());

                clickedOnItemId = e.target.id();

                clearTimeout(defaultWallHighlightTimer);

                /* sometimes the pointerout event does not trigger on touch devices, so set a timer to turn off highlighting */
                defaultWallHighlightTimer = setTimeout(() => {
                    let tempWall = stage.findOne('#tempWall');
                    if (tempWall) {
                        tempWall.destroy();
                    }
                }, 2000);
            });

            wallItem.on('mouseup touchend pointerout', function outsideWallMouseUpTouchend(e) {
                clearTimeout(defaultWallHighlightTimer);
                e.evt.preventDefault();
                selectingOuterWall = false;
                clickedOnItemId = '';
                let tempWall = stage.findOne('#tempWall');
                if (tempWall) {
                    tempWall.destroy();
                }
            });

        }

    } else {
        let offset = scale / 20;
        if (roomObj.unit === 'meters') {
            offset = offset / 3.28084;
        }
        let outsideGreyWall = new Konva.Rect({

            x: pxOffset - offset / 2,
            y: pyOffset - offset / 2,
            width: (roomWidth) * scale + offset,
            height: (roomLength) * scale + offset,
            stroke: '#777777',
            strokeWidth: offset,
            id: 'outsideWall',
            listening: false,
            preventDefault: false,
        });

        grOuterWall.add(outsideGreyWall);
    }

}

function kDrawGrid(startX, startY, endX, endY, scale, increment = 1) {

    kGroupLines = new Konva.Group();

    let smallIncrementTextOffset = 0; /* if there is small increment, change the offset of the x position */
    let outerWallWidth = 0.1 * scale;
    if (roomObj.unit === 'feet') (outerWallWidth = outerWallWidth * 3.28084);
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

    // if (increment < 1) {
    //     toFixedValue = 2;
    //     smallIncrementTextOffset = 25;
    // }

    if (increment < 1) {
        toFixedValue = 1;
        smallIncrementTextOffset = 15;
    }

    if (increment === 0.5) {
        toFixedValue = 1;
        smallIncrementTextOffset = 15;
    }

    let countY = 0;
    let countX = 0;
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

        // kAddCenteredText(measurementY.toFixed(toFixedValue), 0 - smallIncrementTextOffset, pxMeasurementY, startX, pxMeasurementY, kGroupLines);

        if (countY++ % 2 !== 0) {
            kAddCenteredText(measurementY.toFixed(toFixedValue), 0 - smallIncrementTextOffset, pxMeasurementY, startX - outerWallWidth, pxMeasurementY, kGroupLines);
        }


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

        if (countX++ % 2 !== 0) {
            kAddCenteredText(measurementX.toFixed(toFixedValue), pxMeasurementX, 0 + 20, pxMeasurementX, startY - outerWallWidth, kGroupLines);
        }
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
    let text = '';
    if (roomObj.items.videoDevices.length > 0) {
        text = 'Primary Device: ' + roomObj.items.videoDevices[0].name;
    }

    if (nodes.length > 0) {
        nodes[0].text(text);
    }

}

/* Adds the title and unit measurement for the layer grid */
function drawTitleGroup() {

    //  let txtPrimaryDeviceLabel = 'Video Devices: ';
    let groupTitle = new Konva.Group({
        name: 'groupTitle',
    })

    let unitWidth = pxOffset * 2;

    let unitText = new Konva.Text({
        x: pxOffset / 3,
        y: (pyOffset / 5),
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

    // if (roomObj.items.videoDevices.length > 0) {

    //     if (roomObj.items.videoDevices.length > 1) {
    //         txtPrimaryDeviceLabel = 'Video Devices: ';
    //     } else {
    //         txtPrimaryDeviceLabel = 'Video Device: ';
    //     }
    //     roomObj.items.videoDevices.forEach(videoDevice => {
    //         txtPrimaryDeviceLabel += ' ' + videoDevice.name + ';';
    //     });

    //     txtPrimaryDeviceLabel = txtPrimaryDeviceLabel.replace(/;$/, '');
    // }

    // let txtPrimaryDevice = new Konva.Text({
    //     x: pxOffset,
    //     y: pyOffset + roomLength * scale + 5,
    //     text: txtPrimaryDeviceLabel,
    //     fontSize: 13,
    //     fontFamily: 'Arial, Helvetica, sans-serif',
    //     padding: 1,
    //     opacity: 0.8,
    //     id: 'txtPrimaryDevice',

    // })


    // var txtName = new Konva.Label({
    //     x: pxOffset,
    //     y: pyOffset + roomLength * scale + 22,
    //     opacity: 1,
    // });

    // txtName.add(
    //     new Konva.Tag({
    //         // fill: 'lightgrey',
    //     })
    // );

    // txtName.add(
    //     new Konva.Text({
    //         text: roomObj.name,
    //         fontFamily: 'Arial, Helvetica, sans-serif',
    //         fontSize: 18,
    //         padding: 1,
    //         fill: 'black',
    //     })
    // );

    // if (txtName.width() > roomObj.room.roomWidth * scale) {
    //     let newScale = (roomObj.room.roomWidth * scale) / txtName.width();
    //     txtName.scaleX(newScale);
    //     txtName.scaleY(newScale);
    // } else {
    //     txtName.scaleX(1);
    //     txtName.scaleY(1);
    // }

    // if (txtPrimaryDevice.width() > roomObj.room.roomWidth * scale - 30) {
    //     let newScale = (roomObj.room.roomWidth * scale) / txtPrimaryDevice.width();
    //     txtPrimaryDevice.scaleX(newScale);
    //     txtPrimaryDevice.scaleY(newScale);
    // } else {
    //     txtPrimaryDevice.scaleX(1);
    //     txtPrimaryDevice.scaleY(1);
    // }

    groupTitle.add(txtAttribution);
    // groupTitle.add(txtName);
    //     groupTitle.add(txtPrimaryDevice);
    groupTitle.add(unitText);

    return groupTitle;
}

function getKonvaBackgroundImageFloor() {
    let konvaBackgroundImageFloor = stage.find('#konvaBackgroundImageFloor')[0];
    return konvaBackgroundImageFloor;
}

function showEntireFloor() {
    blurRoom();
    disableRoomSettings(false);
    document.getElementById('btnBackToFloorPlan').style.display = 'none';
    zoomInOut('reset');
    activeRoomLength = roomObj.room.roomLength;
    activeRoomWidth = roomObj.room.roomWidth;
    activeRoomX = 0;
    activeRoomY = 0;
    isActiveRoomPart = false;
    activeRoomPartItem = null;

    const boxRoomParts = stage.find('.boxRoomPart');
    boxRoomParts.forEach(boxRoomPart => {
        boxRoomPart.show();
        boxRoomPart.listening(true);
    });


    const polyRoom = stage.find('.polyRoom');
    polyRoom.forEach(boxRoomPart => {
        polyRoom.show();
        polyRoom.listening(true);
    });



    drawRoom(true);
}


function zoomRoomPart(roomPart) {
    blurRoom();
    if (zoomValue !== 100) { } {
        zoomInOut('reset');
    }

    disableRoomSettings(true);

    /* keep track of the activeRoomPartItem in the roomObj */
    let data_deviceid = roomPart.data_deviceid;
    let id = roomPart.id();

    roomObj.items[allDeviceTypes[data_deviceid].parentGroup].forEach(item => {
        if (item.id === id) {
            activeRoomPartItem = item;
        };
    });

    document.getElementById('btnBackToFloorPlan').style.display = '';

    let boundingBox = getBoundingBoxInUnit(roomPart);

    activeRoomLength = boundingBox.height;
    activeRoomWidth = boundingBox.width;
    activeRoomX = boundingBox.x;
    activeRoomY = boundingBox.y;
    if ('corners' in boundingBox) {
        activeRoomAbsPoints = boundingBox.corners;
    }


    isActiveRoomPart = true;
    tr.nodes([]);

    drawRoom(true, true, true, true);

    let newNode = stage.findOne('#' + id);
    if (newNode) {
        newNode.show();
        newNode.listening(false);
        newNode.draggable(false);
        newNode.fill('');
    }

    let oldScale = scale;

    let backgroundImageFloor = getKonvaBackgroundImageFloor();

    if (backgroundImageFloor) {

        backgroundImageFloor.x(backgroundImageFloor.x() - activeRoomX * scale);
        backgroundImageFloor.y(backgroundImageFloor.y() - activeRoomY * scale);
        backgroundImageFloor.width(backgroundImageFloor.width() * oldScale / scale);
        backgroundImageFloor.height(backgroundImageFloor.height() * oldScale / scale);
    }

}

/* redrawShapes "true" redraw all shapes, "false" resize shapes using updateShapesBasedOnNewScale() */
function drawRoom(redrawShapes = false, dontCloseDetailsTab = false, dontSaveUndo = false, isZoomingRoomPart = false) {

    stage.off();

    layerGrid.destroyChildren();

    unit = roomObj.unit;

    document.getElementById('drpMetersFeet').value = unit;

    updateFeetMetersToggleBtn();

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


    let containerHeaderHeight = getFullHeightIncludingMargin(document.getElementById('ContainerHeader'));


    let ctrlBtnsBndHeight = getFullHeightIncludingMargin(document.getElementById('controlButtons'));

    let canvasWindowHeight = window.innerHeight - ctrlBtnsBndHeight - containerHeaderHeight - 20;

    let minWindowWidth = 300;
    let minWindowHeight = 600;
    /* getting full width */
    let rightBuffer = 82;
    let bottomBuffer = 180;

    if (windowWidth < minWindowWidth) {
        windowWidth = minWindowWidth;
    }

    if (canvasWindowHeight < minWindowHeight) {
        canvasWindowHeight = minWindowHeight;
    }

    if (roomObj.backgroundImage) {
        turnOnBackgroundImageButtons();
        document.getElementById('transparencySlider').value = roomObj.backgroundImage.opacity || 50;
        document.getElementById('transparencyOutput').innerText = roomObj.backgroundImage.opacity || 50;
    }

    scrollContainer.setAttribute('style', 'height:' + (canvasWindowHeight) + 'px');

    roomWidth = getNumberValue('roomWidth');
    roomObj.room.roomWidth = roomWidth;
    roomLength = getNumberValue('roomLength');
    roomObj.room.roomLength = roomLength;

    if (isActiveRoomPart === false) {
        activeRoomLength = roomLength;
        activeRoomWidth = roomWidth;
    }

    let divRmContainerDOMRect = document.getElementById('scroll-container').getBoundingClientRect();

    // pxOffset = ((roomObj.unit === 'feet') ? 3.28084 : 1) * 68 / roomWidth + 40;
    // pyOffset = ((roomObj.unit === 'feet') ? 3.28084 : 1) * 68 / roomLength + 40;

    updateDefaultWallsMenu(currentDefaultWall);

    pxOffset = ((roomObj.unit === 'feet') ? 3.28084 : 1) * 68 / activeRoomWidth + ((roomObj.unit === 'feet') ? 0.115 : 0.115 * 3.284) + 40;
    pyOffset = ((roomObj.unit === 'feet') ? 3.28084 : 1) * 68 / activeRoomLength + 40;

    pyOffset = pxOffset;

    let xScale = (divRmContainerDOMRect.width - pxOffset * 2) / activeRoomWidth;

    let yScale = (canvasWindowHeight - pyOffset * 2) / activeRoomLength;


    if (xScale < yScale) {
        scale = xScale;
    } else {
        scale = yScale;
    }


    /* redo scale based on pxOffset ratio */
    if (pxOffset < (scale * ((roomObj.unit === 'feet') ? 0.397 : 0.1) * 3)) {
        pxOffset = (scale * ((roomObj.unit === 'feet') ? 0.397 : 0.1) * 3);
        pyOffset = pxOffset;

        let xScale2 = (divRmContainerDOMRect.width - pxOffset * 2) / activeRoomWidth;

        let yScale2 = (canvasWindowHeight - pyOffset * 2) / activeRoomLength;

        if (xScale2 < yScale2) {
            scale = xScale;
        } else {
            scale = yScale;
        }
    }

    clipShadingBorder.x = pxOffset;
    clipShadingBorder.y = pyOffset;
    clipShadingBorder.width = (activeRoomWidth * scale);
    clipShadingBorder.height = (activeRoomLength * scale);

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

    let canvasWidth = activeRoomWidth + (pxOffset * 2) / scale;
    let canvasLength = activeRoomLength + (pxOffset * 2) / scale;

    stageOriginalWidth = canvasWidth * scale;
    stageOriginalLength = (canvasLength * scale);

    stage.width(canvasWidth * scale);
    stage.height(canvasWidth * scale);

    stage.on('contextmenu', function (event) {
        event.evt.preventDefault(); /* Prevent the default context menu */
        createRightClickMenu();
    });

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

    wallBuilderRect.setAttrs({
        width: stage.width(),
        height: stage.height(),
    })

    polyBuilderRect.setAttrs({
        width: stage.width(),
        height: stage.height(),
    })

    wallWriterRect2.setAttrs({
        width: stage.width(),
        height: stage.height(),
    })

    groupBackground.add(backGroundImage);

    layerGrid.add(groupBackground);

    /* create the outerWall (border) */
    let innerWall = new Konva.Rect({
        x: pxOffset,
        y: pyOffset,
        width: activeRoomWidth * scale,
        height: activeRoomLength * scale,
        stroke: '#3e3d3d',
        strokeWidth: 2,
        id: 'cOuterWall',
        listening: false,
        preventDefault: false,
    });

    let groupOuterWall = new Konva.Group();

    groupOuterWall.id('groupOuterWall');

    groupOuterWall.add(innerWall);

    layerGrid.add(groupOuterWall);
    stage.add(layerGrid);

    if (!isActiveRoomPart) {
        drawOutsideWall(groupOuterWall);
    }


    let increment = 1.0;

    if (unit === 'meters') {
        increment = 0.25;
    }

    let kGrid = kDrawGrid(pxOffset, pxOffset, (activeRoomWidth * scale) + pxOffset, (activeRoomLength * scale) + pxOffset, scale, increment);

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

    labelsVisible(roomObj.layersVisible.grLabels)
    gridLinesVisible(roomObj.layersVisible.gridLines);
    shadingMicrophoneVisible(roomObj.layersVisible.grShadingMicrophone);
    displayDistanceVisible(roomObj.layersVisible.grDisplayDistance);
    shadingCameraVisible(roomObj.layersVisible.grShadingCamera);
    shadingSpeakerVisible(roomObj.layersVisible.grShadingSpeaker);

    updateRemoveDefaultWallsCheckBox();

    if (redrawShapes) {

        updateShapesBasedOnNewScale(true);

        roomObjToCanvas(roomObj.items);

        if (isZoomingRoomPart) {
            roomObj.trNodes = [];
        } else {
            trNodesFromUuids(roomObj.trNodes, false);
        }

        insertKonvaBackgroundImageFloor();

        if (!dontSaveUndo) {
            /* canvasToJSON() needs a little time before running or else it won't capture the recenlty drawn room */
            setTimeout(() => {

                canvasToJson();
            }, 100);
        }

    } else {
        updateShapesBasedOnNewScale();
    }

    setTimeout(() => {

        deleteNegativeShapes();

    }, 250);

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

    postMessageToWorkspace();

    clearSelect2Points();
    /* turn off the measuring tool if on */
    setTimeout(() => {

        if (isMeasuringToolOn) {
            clearSelect2Points();
            measuringToolOn(true);
        } else if (isSelectingTwoPointsOn) {

            document.getElementById('btnUpdateImageScale').disabled = true;
            select2Points();
        }
    }, 300);


    hideSimplePathEditorId();

    if (isWallBuilderOn || isWallWriterOn2) {
        document.getElementById("canvasDiv").style.cursor = "crosshair";
    }



}

function getFullHeightIncludingMargin(element) {
    const style = window.getComputedStyle(element);
    const marginTop = parseFloat(style.marginTop);
    const marginBottom = parseFloat(style.marginBottom);
    return element.offsetHeight + marginTop + marginBottom;
}

function changeTransparency(value = 50) {
    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();
    if (!konvaBackgroundImageFloor) return;

    document.getElementById('transparencyOutput').innerText = value;
    konvaBackgroundImageFloor.opacity(value / 100);

    if (!roomObj.backgroundImage) {
        roomObj.backgroundImage = {};
    }
    roomObj.backgroundImage.opacity = value;
}

function select2Points() {
    measuringToolOn(false);
    resetBackgroundImageFloorSettings();
    document.getElementById("canvasDiv").style.cursor = "crosshair";
    tr.nodes([]);
    enableCopyDelBtn();
    isSelectingTwoPointsOn = true;
    select2PointsRect.show();
}

function measuringToolOn(event = true) {
    let turnOn;
    tr.nodes([]);

    enableCopyDelBtn();
    if (typeof event === 'boolean') {
        turnOn = event;
    }
    else {
        turnOn = event.target.checked;
    }

    if (turnOn && mobileDevice === 'RoomOS') {
        hideMeasuringTool();
    }

    if (isSelectingTwoPointsOn && !isMeasuringToolOn && turnOn === true) {
        alert('Measuring Tool not allowed at this step. Use Select 2 Points button.');
        document.getElementById('measureTool').checked = false;
        return;
    }

    if (turnOn) {
        document.getElementById("canvasDiv").style.cursor = "crosshair";
        tr.nodes([]);
        isMeasuringToolOn = true;
        isSelectingTwoPointsOn = true;
        select2PointsRect.show();
        document.getElementById('measureTool').checked = true;

    } else {
        hideMeasuringTool();
        document.getElementById('measureTool').checked = false;
    }

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

        document.getElementById('transparencySlider').value = roomObj.backgroundImage.opacity;
        document.getElementById('transparencyOutput').innerText = roomObj.backgroundImage.opacity;

        konvaBackgroundImageFloor.data_deviceid = 'backgroundImageFloor';

        layerBackgroundImageFloor.add(konvaBackgroundImageFloor);

        konvaBackgroundImageFloor.on('dragend', function konvaBackgroundImageFloorOnDragEnd() {
            canvasToJson();
        });


    }

}

function wallBuilderRestart() {
    hingeNode.hide();
    newStartNode.hide();
    newStartNode2.hide();
    newCornerNode.hide();
    wallBuilderConnectorLine.hide();
    beforeLastWallBuilderNode.hide();
    lastWallBuilderNode.x(-1000);
    lastWallBuilderNode.hide();
    wallBuilderWritingState = 'none';
    wallBuilderLineArray.points([]);
    document.getElementById("canvasDiv").style.cursor = "crosshair";
    document.getElementById('btnNextWallBuilderSegment').disabled = true;
}


function wallBuilderRestart2() {
    let convert = true;

    if (convert) {
        const points = wallWriterConnectorLine2.points();

        points.splice(0, 2);

        for (let i = 0; i <= points.length - 4; i += 2) {
            const x1 = points[i];
            const y1 = points[i + 1];
            const x2 = points[i + 2];
            const y2 = points[i + 3];

            insertWallBasedOnPixelXY(x1, y1, x2, y2);

        }

        canvasToJson();



    } else {
        let newWall = wallWriterConnectorLine2.clone();
        newWall.draggable(true);
        if (newWall) {
            layerTransform.add(newWall);
        }
    }



    wallWriterConnectorLine2.hide();
    wallBuilderConnectorLine.hide();
    wallWriterConnectorLine2.points([]);
    lastWallBuilderNode.hide();
    lastWallBuilderNode.x(-1000);
    isWallWriterWriting = false;
}

function wallBuilderOn(event) {
    let turnOn;


    if (typeof event === 'boolean') {
        turnOn = event;
    }
    else {
        turnOn = event.target.checked;
    }



    lastWallBuilderNode.hide();

    let wallBuilderToolCheckBox = document.getElementById('wallBuilderTool')

    if (turnOn) {

        document.getElementById('ContainerInputs').style.display = 'none';
        document.getElementById('wallBuilderDiv').style.display = '';

        wallBuilderRestart();

        wallBuilderRect.show();
        isWallBuilderOn = true;
        document.getElementById("canvasDiv").style.cursor = "crosshair";

        if (wallBuilderToolCheckBox) {
            wallBuilderToolCheckBox.checked = true;
        }


        changeWallBuilderWall('s');

    } else {

        document.getElementById('ContainerInputs').style.display = '';
        document.getElementById('wallBuilderDiv').style.display = 'none';

        wallBuilderRestart();

        isWallBuilderOn = false;
        wallBuilderConnectorLine.hide();
        wallBuilderRect.hide();
        lastWallBuilderNode.x(-1000);
        document.getElementById("canvasDiv").style.cursor = "auto";

        if (wallBuilderToolCheckBox) {
            wallBuilderToolCheckBox.checked = false;
        }

    }

}




function hideSimplePathEditorId(hide = true) {
    if (!simplePathEditorId) return;
    let node = stage.findOne('#' + simplePathEditorId);
    if (node) {
        if (hide) {
            node.hide();
        }
        else {
            node.show();
        }

    }
}

function simplePathEditor() {
    let id = document.getElementById('itemId').innerText;

    let node = stage.findOne('#' + id);
    if (node) {
        node.hide();
        simplePathEditorId = id;
    } else {
        alert('item.id not found', id);
    }

    polyBuilderOn(true, 'customPathEditor');
}

function polyBuilderOn(event, mode = 'polyRoom') {
    let turnOn;

    polyBuilderMode = mode; /* 'polyRoom' or 'customPathEditor' */
    tr.nodes([]);

    if (typeof event === 'boolean') {
        turnOn = event;
    }
    else {
        turnOn = event.target.checked;
    }

    if (turnOn) {


        polyBuilderRect.show();
        isPolyBuilderOn = true;
        document.getElementById("canvasDiv").style.cursor = "crosshair";

        let polyBuilderToolCheckbox = document.getElementById('polyBuilderTool');

        if (polyBuilderToolCheckbox) {
            polyBuilderToolCheckbox.checked = true;

        }


        if (polyBuilderMode === 'customPathEditor') {
            let headerHtml = `<style="fontSize: large">Draw a Simple Path</b>`;
            let mainHtml = `<li>Draw a simple path using only straight lines.</li>
        <li>Lines cannot intersect. No holes are allowed.</li>
        <li>X & Y coordinates are center of object.</li>
        <li>Close the path when done.</li>
        <li>Path units are always in meters</li>
        <li>For more complex paths use a Path editor like <a href="https://yqnn.github.io/svg-path-editor/" target="_blank" rel="noopener noreferrer">SvgPathEditor</a>.
        `
                ;
            alertDialog(headerHtml, mainHtml);

        } else if (polyBuilderMode === 'polyRoom') {
            let headerHtml = `<style="fontSize: large">Draw an Irregular Room</b>`;
            let mainHtml = `<li>Draw a simple path using only straight lines.</li>
        <li>Lines cannot intersect.</li>
        <li>Close the path when done.</li>`


            alertDialog(headerHtml, mainHtml);
        }


    } else {
        hideSimplePathEditorId(false);
        isPolyBuilderOn = false;
        wallBuilderConnectorLine.hide();
        polyBuilderRect.hide();
        document.getElementById("canvasDiv").style.cursor = "auto";

        polyBuilderMode = 'none';

        simplePathEditorId = '';

        let polyBuilderToolCheckbox = document.getElementById('polyBuilderTool');

        if (polyBuilderToolCheckbox) {
            polyBuilderToolCheckbox.checked = false;
        }


        let polyBuilderConnectorLine = stage.find('#polyBuilderConnectorLine');

        polyBuilderConnectorLine.forEach(node => {
            node.points([]);
            node.destroy();
        });

        let polyBuilderNextLine = stage.find('#polyBuilderNextLine');

        polyBuilderNextLine.forEach(node => {
            node.points([]);
            node.destroy();
        });

        let polyCircles = stage.find('.polyBuilderCircle');

        polyCircles.forEach(node => {

            node.destroy();
        });
    }

}


function wallBuilderOn2(event) {
    let turnOn;
    if (typeof event === 'boolean') {
        turnOn = event;
    }
    else {
        turnOn = event.target.checked;
    }
    lastWallBuilderNode.hide();

    let wallBuilderToolCheckBox2 = document.getElementById('wallBuilderTool2')

    if (turnOn) {

        wallWriterRect2.show();
        isWallWriterOn2 = true;

        document.getElementById("canvasDiv").style.cursor = "crosshair";

        if (wallBuilderToolCheckBox2) {
            wallBuilderToolCheckBox2.checked = true;
        }
    } else {

        isWallWriterOn2 = false;
        wallWriterConnectorLine2.hide();
        wallWriterRect2.hide();

        document.getElementById("canvasDiv").style.cursor = "auto";

        if (wallBuilderToolCheckBox2) {
            wallBuilderToolCheckBox2.checked = false;
        }

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

function hideMeasuringTool() {
    hideSelect2PointsShapes();
}

function hideSelect2PointsShapes() {
    select2PointsRect.hide();
    circleEnd.hide();
    circleStart.hide();
    distanceLine.hide();
    measuringToolLabel.hide();
    isSelectingTwoPointsOn = false;
    isMeasuringToolOn = false;
    document.getElementById('measureTool').checked = false;
    document.getElementById("canvasDiv").style.cursor = "auto";
}

/* Reset the 2 select points if the page is resized */
function clearSelect2Points() {
    if (isSelectingTwoPointsOn) {
        circleEnd.hide();
        circleStart.hide();
        distanceLine.hide();
        measuringToolLabel.hide();
        document.getElementById("canvasDiv").style.cursor = "auto";
    }
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
    eachCategory(stageFloors, 'stageFloors');
    eachCategory(boxes, 'boxes');
    eachCategory(rooms, 'rooms');

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
        strUrlQuery2 += 'f' + Math.round(roomObj.room.roomHeight * 100);
    }

    strUrlQuery2 += `${roomObj.name == '' ? '' : '~' + encodeURIComponent(roomObj.name.replace(/^[\s_]+|[\s_]+$/g, '')).replaceAll('%20', '+') + '~'}`;


    strUrlQuery2 += createShareableLinkItemShading();

    strUrlQuery2 += `${roomObj.authorVersion == '' ? '' : 'C~' + encodeURIComponent(roomObj.authorVersion).replaceAll('%20', '+') + '~'}`;

    if ('roomSurfaces' in roomObj) {

        ['leftwall', 'rightwall', 'videowall', 'backwall'].forEach(wall => {
            let strWall = '';
            if (wall in roomObj.roomSurfaces) {
                if ('type' in roomObj.roomSurfaces[wall]) {
                    if (roomObj.roomSurfaces[wall].type === 'regular') {
                        strWall += '0';
                    }
                    else if (roomObj.roomSurfaces[wall].type === 'glass') {
                        strWall += '1';
                    }
                    else if (roomObj.roomSurfaces[wall].type === 'window') {
                        strWall += '2';
                    } else {
                        strWall += '0';
                    }
                }

                if ('acousticTreatment' in roomObj.roomSurfaces[wall]) {
                    if (roomObj.roomSurfaces[wall].acousticTreatment === true) {
                        strWall += 'a1';
                    }
                }

                if ('door' in roomObj.roomSurfaces[wall] && roomObj.roomSurfaces[wall] != 'none') {
                    strWall += 'b';
                    if (roomObj.roomSurfaces[wall].door === 'left') {
                        strWall += '0';
                    }
                    else if (roomObj.roomSurfaces[wall].door === 'center') {
                        strWall += '1';
                    }
                    else if (roomObj.roomSurfaces[wall].door === 'right') {
                        strWall += '2';
                    }
                    else {
                        strWall += '1'; /* default to center of wall for door */
                    }

                }

                if (strWall != '0') {  /* if it is just a regular wall, don't save anything to the URL */
                    if (wall === 'leftwall') {
                        strWall = 'D' + strWall;
                    }
                    else if (wall === 'rightwall') {
                        strWall = 'E' + strWall;
                    }
                    else if (wall === 'videowall') {
                        strWall = 'F' + strWall;
                    }
                    else if (wall === 'backwall') {
                        strWall = 'G' + strWall;
                    }

                    strUrlQuery2 += strWall;
                }

            }
        })
    }

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

        if (characterLimitWarningShow) {
            document.getElementById('characterLimitWarning').show();
            characterLimitWarningShow = false;
        }

        fullShareLink = 'https://collabexperience.com/'
        fullShareLink = location.origin + location.pathname;
        document.getElementById('shareLink').style.display = 'none'

    } else {
        document.getElementById('characterLimitWarning').close();
        document.getElementById('shareLink').style.display = ''
    }

    if (fullShareLink.length > 2500) {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#ffffc5';
    } else {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#ffffff';
    }

    if (fullShareLink.length > 2950) {
        document.getElementById('qrCodeLinkText').style.backgroundColor = '#f9bfbf';
    }

    let regex = /^A[01]v[0-9\.]+b(2[56][09]|79)\dc(200|61)\dB[01]{4,10}(D0a1)?$/;
    let queryParams = new URLSearchParams(window.location.search);



    if (regex.test(strUrlQuery2) || fullShareLink.length > 8189) {
        queryParams.delete("x", strUrlQuery2);
        history.replaceState(null, null, location.origin + location.pathname);
    } else {
        queryParams.set("x", strUrlQuery2);
        history.replaceState(null, null, fullShareLink);
    }



    /* resend workspace postmessage with the updated URL */
    postMessageToWorkspace();

    /* only create QR Code if RoomOS and only every 2 seconds for performance */
    if (qrCodeAlwaysOn && document.getElementById('dialogSave').open) {
        let qrImage = document.getElementById('qrCode').firstChild;
        clearTimeout(timerQRcodeOn);

        /* blur the QR code until it is recreated */
        if (qrImage) {
            qrImage.style.filter = 'blur(5px)';
        }

        timerQRcodeOn = setTimeout(() => {
            createQrCode();
        }, 500);

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

    if ('width' in item && item.width && item.data_deviceid != 'pathShape' && item.data_deviceid != 'polyRoom') {
        strItem += 'c' + Math.round(round(item.width) * 100);
    }

    if ('length' in item && item.length && item.data_deviceid != 'pathShape' && item.data_deviceid != 'polyRoom') {
        strItem += 'd' + Math.round(round(item.length) * 100);
    }

    if ('height' in item && item.data_deviceid != 'tblSchoolDesk' && item.height) { /* tblSchoolDesk has a set length of 0.59m and does not need to be saved in the URL */
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
        if (item.data_trapNarrowWidth && !isNaN(item.data_trapNarrowWidth)) {
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

    if ('data_tilt' in item) {
        let tilt = Math.round(item.data_tilt);
        if (tilt != 0) {
            strItem += 'o' + Math.round(round(item.data_tilt) * 10);
        }
    }

    if ('data_slant' in item) {
        let slant = Math.round(item.data_slant);
        if (slant != 0) {
            strItem += 'p' + Math.round(round(item.data_slant) * 10);
        }
    }

    /* don't store data_role index if the value is 0 - this will be the default value */
    if ('data_mount' in item && item.data_mount) {
        let place = item.data_mount.index - 1;
        if (place > -1) {
            strItem += 'q' + place;
        }
    }

    if ('points' in item && item.points.length > 0) {

        const points = item.points.map(point => {
            return Math.round(round(point) * 100)
        });

        strItem += 'r' + points.join(' ');
    }


    if ('data_labelField' in item) {
        if (item.data_labelField && item.data_labelField.trim() !== '{}') {
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

    if (roomObj.layersVisible.grLabels) {
        shadeArray[6] = 1;
    } else {
        shadeArray[6] = 0;
    }

    if (roomObj.layersVisible.grShadingSpeaker) {
        shadeArray[7] = 1;
    } else {
        shadeArray[7] = 0;
    }

    if (roomObj.workspace.theme === 'christmas') {
        shadeArray[8] = 1;
    } else {
        shadeArray[8] = 0;
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
    if (location.hostname === 'localhost') return
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
            .catch(() => console.info('heart beat failed'))

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
    checkIfScrollable();
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

    checkIfScrollable();

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

    let undoTime = 350;


    if (mobileDevice === 'RoomOS') {
        undoTime = 500;
        document.getElementById('dialogUndoRedo').style.display = '';
    } else {
        document.getElementById('dialogUndoRedo').style.display = 'none';
    }

    document.getElementById('dialogUndoRedo').showModal();

    setTimeout(() => {
        document.getElementById('dialogUndoRedo').close();
    }, undoTime);
}

function showNewRoomSection(sectionId) {
    const showTemplates = sectionId === 'room-templates';
    document.querySelector('#room-templates').style.display = showTemplates ? 'flex' : 'none'
    document.querySelector('#quick-setup').style.display = !showTemplates ? 'flex' : 'none'

    document.querySelector('#roomTemplateBtn').className = showTemplates ? 'buttonHighlight' : '';
    document.querySelector('#quickSetupBtn').className = !showTemplates ? 'buttonHighlight' : '';

}

function onDialogClick(e) {
    const clickedOutside = e.target.tagName === 'DIALOG'
    if (clickedOutside) {
        e.target.close()
        closeAllDialogModals();
    }
}

function openSaveDialog() {
    document.getElementById('dialogSave').showModal();

    let qrCodeDiv = document.getElementById('qrCode');
    if ((mobileDevice === 'RoomOS' || qrCodeAlwaysOn || mobileDevice === 'Tesla')) {

        if (!qrCodeDiv.hasChildNodes()) {
            loadQRCodeScript();
        } else {
            createShareableLink();
        }

    }

}

function openNewRoomDialog() {
    document.getElementById('roomWidth2').value = roomObj.room.roomWidth;
    document.getElementById('roomLength2').value = roomObj.room.roomLength;
    document.getElementById('roomName2').value = roomObj.name;
    document.getElementById('newRoomDialog').showModal();
}

function closeNewRoomDialog() {
    document.getElementById('newRoomDialog').close();
}

function openQuestionDialog() {
    document.getElementById('dialogQuestions').showModal();
}

function closeDialogQuestions() {
    document.getElementById('dialogQuestions').close();
}

function btnUndoClicked() {

    if (!(polyBuilderMode === 'none' || polyBuilderMode === '')) {
        closeAllDialogModals();
        polyBuilderOn(false);
        updateItem();
        return;
    };


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
            createShareableLink();
        }, 750);

    }
}

function btnRedoClicked() {

    if (!(polyBuilderMode === 'none' || polyBuilderMode === '')) {
        closeAllDialogModals();
        polyBuilderOn(false);
        updateItem();
        return;
    };

    showUndoRedoRoomOs()
    zoomInOut('reset');

    if (redoArray.length > 0) {
        undoArray.push(redoArray.pop())
        roomObj = structuredClone(undoArray[undoArray.length - 1]);
        drawRoom(true, true, true);
        setTimeout(() => {
            createShareableLink();

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

function copyToCanvasClipBoard(nodes) {
    let itemsObj = { unit: roomObj.unit }

    if (!nodes) nodes = tr.nodes();

    let uuids = [];

    let clipBoardArray = [];


    nodes.forEach(node => {
        let x2Offset, y2Offset, x2, y2; /* new x and new y */
        let attrs = node.attrs;

        let uuid = createUuid();

        uuids.push(uuid);

        if (!('rotation' in attrs)) {
            node.rotation(0);
        }

        let rotation = attrs.rotation;
        let center = {};

        if (node.getParent().name() === 'tables' || node.getParent().name() === 'stageFloors' || node.getParent().name() === 'boxes' || node.getParent().name() === 'rooms') {
            center.x = node.x();
            center.y = node.y();
        } else {
            center = getNodeCenter(node);
        }

        x2Offset = 0;
        y2Offset = 0;

        x2 = ((center.x - pxOffset) / scale) + x2Offset / scale;
        y2 = ((center.y - pyOffset) / scale) + y2Offset / scale;


        let width = attrs.width / scale;
        let height = attrs.height / scale;
        let deviceId = node.data_deviceid;
        let newAttr = { x: x2, y: y2, width: width, height: height, rotation: rotation };

        if ('points' in attrs) {
            let newPoints = [];
            attrs.points.forEach((point, index) => {
                newPoints[index] = point / scale;
            });

            newAttr.points = newPoints;
        }

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

        if ('data_mount' in node) {
            newAttr.data_mount = node.data_mount;
        }

        if ('data_tilt' in node) {
            newAttr.data_tilt = node.data_tilt;
        }

        if ('data_slant' in node) {
            newAttr.data_slant = node.data_slant;
        }

        if ('data_trapNarrowWidth' in node && !isNaN(node.data_trapNarrowWidth)) {
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
    tr.nodes([]);
    let itemsObj = structuredClone(canvasClipBoard);
    let xOffset = 0, yOffset = 0;
    if (itemsObj.unit) {

        if (roomObj.unit != itemsObj.unit) {
            let newItems = [];
            let ratio = 3.28084;
            if (roomObj.unit === 'feet') {
                ratio = ratio;
            } else {
                ratio = 1 / ratio;
            }

            itemsObj.items.forEach((item, index) => {
                item.newAttr = convertItemUnitBasedOnRatio(item.newAttr, ratio);
            });

        }

        checkForMultipleCodecsOnPaste(itemsObj.items);

    } else {
        return;
    }
    let uuids = [];

    if (duplicate) {


        if (itemsObj.items.length === 1 && itemsObj.items[0].deviceId.startsWith('chair')) {
            let itemAttr = itemsObj.items[0].newAttr;
            let offset = (roomObj.unit === 'feet') ? 2.35 : 2.35 / 3.28084;
            let rotation = itemAttr.rotation;
            if (rotation === 180) {
                offset = offset * -1;
            }
            if (rotation < 0) {
                offset = offset * -1;
            };

            let newLocation = findNewTransformationCoordinate({ x: itemAttr.x, y: itemAttr.y, rotation: rotation }, offset, 0);
            xOffset = itemAttr.x - newLocation.x;
            yOffset = itemAttr.y - newLocation.y;


        } else {
            xOffset = (stage.width() * 0.04) / scale;
            yOffset = (stage.height() * 0.04) / scale;
        }


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

    // stage.draw();

}




function duplicateItems() {
    copyToCanvasClipBoard();
    pasteItems(true);
}

/* enter an array of UUIDs and select as part of trnodes */
function trNodesFromUuids(uuids, save = true) {
    let trNodes = [];
    setTimeout(() => {
        /* select newly copy items for tr nodes. Timeout is so canvas/Konva has time to update. */
        uuids.forEach((uuid) => {
            let node = stage.find('#' + uuid)[0];
            //      if (node && !(isActiveRoomPart && (node.data_deviceid === 'boxRoomPart' || node.data_deviced === 'polyRoom'))){
            if (node) {
                trNodes.push(node);
            }

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

    }, 200);
}

function stageAddLayers() {


    layerGrid.add(layerBackgroundImageFloor);
    layerTransform.add(groupStageFloors);
    layerTransform.add(grShadingCamera);
    layerTransform.add(groupTables);
    layerTransform.add(groupChairs);
    layerTransform.add(groupBoxes);



    layerTransform.add(grShadingMicrophone);
    layerTransform.add(grDisplayDistance);
    layerTransform.add(grShadingSpeaker);

    layerTransform.add(groupDisplays);
    layerTransform.add(groupSpeakers);
    layerTransform.add(groupTouchPanel);

    layerTransform.add(groupVideoDevices);
    layerTransform.add(groupMicrophones);

    layerTransform.add(groupRooms);

    layerTransform.add(grLabels);

    stage.add(layerTransform);

    stage.add(layerSelectionBox);

    tr.zIndex(layerTransform.getChildren().length - 1);   // make the TR node the highest node in layerTransform

}


/* update once labels are created */
document.getElementById('btnLabelToggle').disabled = true;


function displayDistanceVisible(state = 'buttonPress') {
    closeTooltipTitleText();

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
        button.classList.toggle('active', true);
        // button.style["color"] = toggleButtonOnColor;
        grDisplayDistance.visible(true);
        // button.children[0].textContent = 'tv';
        roomObj.layersVisible.grDisplayDistance = true;

    } else {
        button.classList.toggle('active', false);
        // button.style["color"] = toggleButtonOffColor;
        grDisplayDistance.visible(false);
        // button.children[0].textContent = 'tv_off';
        roomObj.layersVisible.grDisplayDistance = false;
    }

    // updateFormatDetailsUpdate();

    if (saveToUndo) saveToUndoArray();
}


function labelsVisible(state = 'buttonPress') {
    let saveToUndo = false;
    let button = document.getElementById('btnLabelsToggle');

    if (state === 'buttonPress') {
        saveToUndo = true;
        if (grLabels.visible() === true) {
            state = false;
        } else {
            state = true;
        }
    }

    if (state === true) {

        grLabels.visible(true);
        button.classList.toggle('active', true);
        roomObj.layersVisible.grLabels = true;
    }
    else {
        grLabels.visible(false);
        button.classList.toggle('active', false);
        roomObj.layersVisible.grLabels = false;
    }



    if (saveToUndo) {
        saveToUndoArray();
    }
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
        button.classList.toggle('active', true);
        roomObj.layersVisible.gridLines = true;
    }
    else {
        button.classList.toggle('active', false);
        layerGrid.visible(true);
        kGroupLines.visible(false);
        titleGroup.visible(false);
        grShadingCamera.clip(clipShadingBorder);
        grShadingMicrophone.clip(clipShadingBorder);
        gridToggleState = 'off';
        roomObj.layersVisible.gridLines = false;
    }



    if (saveToUndo) saveToUndoArray();
}


function shadingCameraVisible(state = 'buttonPress') {

    closeTooltipTitleText();

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
        button.classList.toggle('active', true);
        grShadingCamera.visible(true);
        roomObj.layersVisible.grShadingCamera = true;
    } else {
        button.classList.toggle('active', false);
        grShadingCamera.visible(false);
        roomObj.layersVisible.grShadingCamera = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function shadingMicrophoneVisible(state = 'buttonPress') {
    closeTooltipTitleText();

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

        button.classList.toggle('active', true);
        roomObj.layersVisible.grShadingMicrophone = true;
    } else {

        button.classList.toggle('active', false);
        grShadingMicrophone.visible(false);
        roomObj.layersVisible.grShadingMicrophone = false;
    }

    // updateFormatDetailsUpdate();

    if (saveToUndo) saveToUndoArray();
}

function shadingSpeakerVisible(state = 'buttonPress') {
    closeTooltipTitleText();

    let button = document.getElementById('btnSpeakerShadeToggle');
    let saveToUndo = false;
    if (state === 'buttonPress') {
        saveToUndo = true;
        if (grShadingSpeaker.visible() === true) {
            state = false;
        } else {
            state = true;
        }
    }

    if (state === true) {
        grShadingSpeaker.visible(true);

        button.classList.toggle('active', true);
        roomObj.layersVisible.grShadingSpeaker = true;
    } else {

        button.classList.toggle('active', false);
        grShadingSpeaker.visible(false);
        roomObj.layersVisible.grShadingSpeaker = false;
    }

    if (saveToUndo) saveToUndoArray();
}


function toggleSelectPan() {
    let button = document.getElementById('btnSelectPan');
    if (button.children[0].dataset.type === 'select') {
        button.children[0].dataset.type = 'pan_tool';
        button.style.color = '';

        button.classList.remove('active');

        document.getElementById("canvasDiv").style.cursor = "auto";

        panScrollableOn = false;
        panRectangle.hide();

    } else {

        button.children[0].dataset.type = 'select';
        //      button.style.color = 'var(--active)'
        button.classList.add('active');

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

        let parentGroup = allDeviceTypes[node.data_deviceid].parentGroup;
        let id = node.id();

        let audioShading = stage.find('#audio~' + node.id())[0];
        let speakerShading = stage.find('#speaker~' + node.id())[0];
        let videoShading = stage.find('#fov~' + node.id())[0];
        let displayShading = stage.find('#dispDist~' + node.id())[0];
        let labelText = stage.find('#label~' + node.id())[0];

        node.destroy();
        if (audioShading) {
            audioShading.destroy();
        }

        if (speakerShading) {
            speakerShading.destroy();
        }

        if (videoShading) {
            videoShading.destroy();
        }

        if (displayShading) {
            displayShading.destroy();
        }
        if (labelText) {

            labelText.destroy();
        }


        /* remove from the roomObj */
        for (let index = roomObj.items[parentGroup].length - 1; index >= 0; index--) {
            if (roomObj.items[parentGroup][index].id === id) {
                roomObj.items[parentGroup].splice(index, 1);
            }
        }

    });

    tr.nodes([]);

    enableCopyDelBtn();

    if (save) {

        canvasToJson();
    }
}


function roomObjToCanvas(roomObjItems) {
    layerTransform.data_scale = scale;
    layerTransform.data_pxOffset = pxOffset;
    layerTransform.data_pyOffset = pyOffset;

    if ('chairs' in roomObjItems) {
        for (const device of roomObjItems.chairs) {
            insertItem(device, device.id);
        }
    }

    if ('stageFloors' in roomObjItems) {
        for (const device of roomObjItems.stageFloors) {
            insertItem(device, device.id);
        }
    }

    if ('boxes' in roomObjItems) {
        for (const device of roomObjItems.boxes) {
            insertItem(device, device.id);
        }
    }

    if ('rooms' in roomObjItems) {
        for (const device of roomObjItems.rooms) {
            insertItem(device, device.id);
        }
    }

    if ('tables' in roomObjItems) {
        for (const device of roomObjItems.tables) {
            insertItem(device, device.id);
        }
    }

    if ('videoDevices' in roomObjItems) {
        for (const device of roomObjItems.videoDevices) {

            insertItem(device, device.id);
        }
    }

    if ('microphones' in roomObjItems) {
        for (const device of roomObjItems.microphones) {
            insertItem(device, device.id);
        }
    }

    if ('speakers' in roomObjItems) {
        for (const device of roomObjItems.speakers) {
            insertItem(device, device.id);
        }
    }

    if ('displays' in roomObjItems) {
        for (const device of roomObjItems.displays) {
            insertItem(device, device.id);
        }
    }

}

function canvasToJson() {
    if (!addressBarUpdate) return;

    updateRoomObjFromTrNode();

    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();

    if (konvaBackgroundImageFloor && konvaBackgroundImageFloor.attrs.name) {
        roomObj.backgroundImage = {};
        roomObj.backgroundImage.name = konvaBackgroundImageFloor.attrs.name;
        roomObj.backgroundImage.x = ((konvaBackgroundImageFloor.attrs.x - pxOffset) / scale) + activeRoomX;
        roomObj.backgroundImage.y = ((konvaBackgroundImageFloor.attrs.y - pyOffset) / scale) + activeRoomY;
        roomObj.backgroundImage.width = konvaBackgroundImageFloor.width() / scale;
        roomObj.backgroundImage.height = konvaBackgroundImageFloor.height() / scale;
        roomObj.backgroundImage.id = konvaBackgroundImageFloor.attrs.id;
        roomObj.backgroundImage.opacity = document.getElementById('transparencySlider').value;
        roomObj.backgroundImage.rotation = konvaBackgroundImageFloor.rotation();
    }

    trNodesUuidToRoomObj();



    function getNodesJson(parentGroup) {

        let theObjects = parentGroup.getChildren();
        let groupName = parentGroup.name();

        roomObj.items[groupName] = [];
        let itemAttr = {};

        theObjects.forEach(node => {
            let x, y;
            let attrs = node.attrs;
            if (!('rotation' in attrs)) {
                node.rotation(0);
            }

            let rotation = attrs.rotation;

            if (groupName === 'tables' || groupName === 'stageFloors' || groupName === 'boxes' || groupName === 'rooms') {
                x = attrs.x;
                y = attrs.y;
            } else {
                let center = getNodeCenter(node);
                x = center.x;
                y = center.y;
            }

            itemAttr = {
                x: ((x - pxOffset) / scale) + activeRoomX,
                y: ((y - pyOffset) / scale) + activeRoomY,
                rotation: rotation,
                type: node.data_type,
                data_deviceid: node.data_deviceid,
                id: node.attrs.id,
                name: node.attrs.name,
            }

            if ('cornerRadius' in attrs) {
                if (attrs.cornerRadius.length > 1) {
                    itemAttr.tblRectRadius = round(attrs.cornerRadius[2] / scale);
                    if (attrs.cornerRadius[0] != attrs.cornerRadius[2]) {
                        itemAttr.tblRectRadiusRight = round(attrs.cornerRadius[0] / scale);
                    }
                }
            }


            if ('data_diagonalInches' in node) {
                itemAttr.data_diagonalInches = node.data_diagonalInches;
            }

            if ('data_zPosition' in node) {
                itemAttr.data_zPosition = node.data_zPosition;
            }

            if ('data_vHeight' in node) {
                itemAttr.data_vHeight = node.data_vHeight;
            }

            if (groupName === 'tables' || groupName === 'stageFloors' || groupName === 'boxes' || groupName === 'rooms') {
                itemAttr.width = (attrs.width / scale);
                itemAttr.height = (attrs.height / scale);
            }

            if ('name' in attrs) {
                itemAttr.name = attrs.name;
            }

            if ('data_labelField' in node) {
                if (node.data_labelField !== '' && node.data_labelField.trim() !== '{}') {
                    itemAttr.data_labelField = node.data_labelField;
                }
            }

            if (node.data_fovHidden) {
                itemAttr.data_fovHidden = node.data_fovHidden;
            }

            if (node.data_audioHidden) {
                itemAttr.data_audioHidden = node.data_audioHidden;
            }

            if (node.data_dispDistHidden) {
                itemAttr.data_dispDistHidden = node.data_dispDistHidden;
            }

            if ('data_trapNarrowWidth' in node) {
                if (!isNaN(item.data_trapNarrowWidth)) {
                    itemAttr.data_trapNarrowWidth = node.data_trapNarrowWidth;
                } else {
                    itemAttr.data_trapNarrowWidth = 0;
                }
            }

            if ('data_role' in node) {
                itemAttr.data_role = node.data_role;
            }

            if ('data_color' in node) {
                itemAttr.data_color = node.data_color;
            }

            if ('data_mount' in node) {
                itemAttr.data_mount = node.data_mount;
            }

            if ('data_tilt' in node) {
                itemAttr.data_tilt = node.data_tilt;
            }

            if ('data_slant' in node) {
                itemAttr.data_slant = node.data_slant;
            }

            if ('points' in attrs) {
                let points = attrs.points;

                const newPoints = points.map(function (point, index) {
                    if (index % 2 !== 0) {
                        point = (point / scale);
                    } else {
                        point = (point / scale);;
                    }
                    return point;
                })

                itemAttr.points = newPoints;
            }

            roomObj.items[groupName].push(itemAttr);

        });

    }


    clearTimeout(undoArrayTimer);

    if (!isRotatingRoom) {
        undoArrayTimer = setTimeout(function timerSaveToUndoArrayCreateShareableLink() {
            saveToUndoArray();
            createShareableLink();

            document.title = roomObj.name ? `VRC: ${roomObj.name}` : 'Video Room Calculator by Joe Hughes';

        }, undoArrayTimeDelta)
    } else {
        isRotatingRoom = false;
        tr.nodes([]);
        roomObj.trNodes = [];
        drawRoom(true, true, true);
    }


}


function updateRoomObjFromTrNode() {
    tr.nodes().forEach(node => {
        let x, y;
        let attrs = node.attrs;
        if (!('rotation' in attrs)) {
            node.rotation(0);
        }

        let rotation = attrs.rotation;
        let parentGroup = allDeviceTypes[node.data_deviceid]?.parentGroup;

        if (!parentGroup) {
            console.error('parentGroup not found for node:', attrs);
            return;
        }

        if (parentGroup === 'tables' || parentGroup === 'stageFloors' || parentGroup === 'boxes' || parentGroup === 'rooms') {
            x = attrs.x;
            y = attrs.y;
        } else {
            let center = getNodeCenter(node);
            x = center.x;
            y = center.y;
        }

        itemAttr = {
            x: ((x - pxOffset) / scale) + activeRoomX,
            y: ((y - pyOffset) / scale) + activeRoomY,
            rotation: rotation,
            type: node.data_type,
            data_deviceid: node.data_deviceid,
            id: node.attrs.id,
            name: node.attrs.name,
        }

        if ('cornerRadius' in attrs) {
            if (attrs.cornerRadius.length > 1) {
                itemAttr.tblRectRadius = round(attrs.cornerRadius[2] / scale);
                if (attrs.cornerRadius[0] != attrs.cornerRadius[2]) {
                    itemAttr.tblRectRadiusRight = round(attrs.cornerRadius[0] / scale);
                }
            }
        }

        if ('points' in attrs) {
            let points = attrs.points;

            const newPoints = points.map(function (point, index) {
                if (index % 2 !== 0) {
                    point = (point / scale);
                } else {
                    point = (point / scale);;
                }
                return point;
            })

            itemAttr.points = newPoints;
        }

        if ('data_diagonalInches' in node) {
            itemAttr.data_diagonalInches = node.data_diagonalInches;
        }

        if ('data_zPosition' in node) {
            itemAttr.data_zPosition = node.data_zPosition;
        }

        if ('data_vHeight' in node) {
            itemAttr.data_vHeight = node.data_vHeight;
        }

        if (parentGroup === 'tables' || parentGroup === 'stageFloors' || parentGroup === 'boxes' || parentGroup === 'rooms') {
            itemAttr.width = (attrs.width / scale);
            itemAttr.height = (attrs.height / scale);
        }

        if ('name' in attrs) {
            itemAttr.name = attrs.name;
        }

        if ('data_labelField' in node) {
            if (node.data_labelField != '') {
                itemAttr.data_labelField = node.data_labelField;
            }
        }

        if (node.data_fovHidden) {
            itemAttr.data_fovHidden = node.data_fovHidden;
        }

        if (node.data_audioHidden) {
            itemAttr.data_audioHidden = node.data_audioHidden;
        }

        if (node.data_dispDistHidden) {
            itemAttr.data_dispDistHidden = node.data_dispDistHidden;
        }

        if ('data_trapNarrowWidth' in node) {
            if (!isNaN(node.data_trapNarrowWidth)) {
                itemAttr.data_trapNarrowWidth = node.data_trapNarrowWidth;
            } else {
                itemAttr.data_trapNarrowWidth = 0;
            }
        }

        if ('data_role' in node) {
            itemAttr.data_role = node.data_role;
        }

        if ('data_color' in node) {
            itemAttr.data_color = node.data_color;
        }

        if ('data_mount' in node) {
            itemAttr.data_mount = node.data_mount;
        }

        if ('data_tilt' in node) {
            itemAttr.data_tilt = node.data_tilt;
        }

        if ('data_slant' in node) {
            itemAttr.data_slant = node.data_slant;
        }

        let found = false;

        roomObj.items[parentGroup].forEach((item, index) => {

            if (item.id === node.id()) {
                found = true;
                item = itemAttr;
                roomObj.items[parentGroup][index] = itemAttr;
            }
        });

        if (!found) {
            roomObj.items[parentGroup].push(itemAttr);
        }
    });
};

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
        console.error('Unable to set local storage.  Either local storage is turned off or the item is too big. Reseting local storage.');
    }
}

function saveToUndoArray() {

    let strUndoArrayLastItem;
    let roomObj2 = structuredClone(roomObj);
    delete roomObj2.backgroundImageFile;

    let strRoomObj = JSON.stringify(roomObj2);

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
        undoArray.push(structuredClone(roomObj2));
        createShareableLink();
    }

    redoArray = [];

    enableBtnUndoRedo();

    if (undoArray.length > maxUndoArrayLength) {
        undoArray.shift();
    }


    setItemForLocalStorage('undoArray', JSON.stringify(undoArray.slice(-30)));  /* only store the last 30 items to local storage to save on space */

    postMessageToWorkspace();

}


function insertTable(insertDevice, groupName, attrs, uuid, selectTrNode) {

    let tblWallFlr, data_zPosition, data_vHeight, data_trapNarrowWidth, width2;
    let width = 1220 / 1000 * scale; /* default width:  is about 4 feet */
    let height = 2440 / 1000 * scale; /* default table:  height is about 8 feet */
    let pixelX = scale * attrs.x + pxOffset - activeRoomX * scale;
    let pixelY = scale * attrs.y + pyOffset - activeRoomY * scale;
    let opacity = 0.8;
    let wallWidth = 0.1 * scale;
    let uShapeWidth = 0.85 * scale;
    let unitScale;
    let tblSchoolDeskRadius = 0.122;
    let radius = [];
    let points = [];

    let fillColor = 'white'; /* default color */
    let strokeColor = 'black'; /* default width */

    /* default width of columns 1 ft x 1 ft */
    if (insertDevice.id.startsWith('column')) {
        width = 0.305 * scale;
        height = 0.305 * scale;
    } else if (insertDevice.id === 'tblShapeU') {
        width = 2.5 * scale;
        height = 3.4 * scale;
    }
    else if (insertDevice.id.startsWith('boxRoomPart')) {
        width = 3 * scale;
        height = 3 * scale;
    }
    else if (insertDevice.id.startsWith('box') || insertDevice.id.startsWith('stageFloor') || insertDevice.id.startsWith('carpet')) {
        width = 1 * scale;
        height = 1 * scale;
    }
    else if (insertDevice.id.startsWith('tblSchoolDesk')) {
        width = 1.4 * scale;
        height = 0.59 * scale;
    }
    else if (insertDevice.id.startsWith('tblPodium')) {
        width = 1 * scale;
        height = 1 * scale;
    } else if (insertDevice.id.startsWith('wallChair')) {
        wallWidth = 0.65 * scale;
    } else if (insertDevice.id.startsWith('tblCurved')) {
        width = 4.26 * scale;
        height = 1.01 * scale;
    }
    else if (insertDevice.id.startsWith('couch')) {
        width = 0.9 * scale;
        height = 2.2 * scale;
    }
    else if (insertDevice.id === 'cylinder') {
        width = 0.45 * scale;
        height = 0.45 * scale;
    }
    else if (insertDevice.id.startsWith('sphere')) {
        width = 1 * scale;
        height = 1 * scale;
    }

    if ('data_vHeight' in attrs) {
        data_vHeight = attrs.data_vHeight;
    }

    if ((insertDevice.id.startsWith('box') || insertDevice.id.startsWith('stageFloor') || insertDevice.id.startsWith('sphere')) && !data_vHeight) {
        if (unit === 'feet') {
            data_vHeight = 3.28;
        } else {
            data_vHeight = 1;
        }

    }

    if (insertDevice.id === 'carpet') {
        if (unit === 'feet') {
            data_vHeight = .03;
        } else {
            data_vHeight = .01;
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
        if ('data_trapNarrowWidth' in attrs && !isNaN(attrs.data_trapNarrowWidth)) {
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

    if ('points' in attrs) {
        points = convertPointsToPixel(attrs.points);
    }

    if (insertDevice.id === 'pathShape') {
        let label;
        let jsonScaleX = 1;
        let jsonScaleY = 1;
        let path = "M-0.5-0.5 h1.2 l0.1 1 l-0.5 -0.4 L-0.5 0.5z";

        if ('data_labelField' in attrs && attrs.data_labelField && attrs.data_labelField.trim() !== '{}') {
            label = attrs.data_labelField;
        }
        else {
            label = '{"path":"' + path + '"}';
            attrs.data_labelField = label;
        }

        let match = label.match(/{.*"path"\s*:\s*"\s*([Mm]\s*[0-9.-].*?)".*}/)


        if (match && match[1]) {
            path = match[1];
        }

        let matchScale = label.match(/{.*"scale"\s*:\s*\[\s*([\-0-9.]+)\s*,\s*[\-0-9.]+\s*,\s*([\-0-9.]+)\s*\].*?}/)
        if (matchScale) {
            jsonScaleX = matchScale[1];
            jsonScaleY = matchScale[2];
        }

        tblWallFlr = new Konva.Path({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            data: path,
            fill: '#D3D3D3' || fillColor,
            stroke: strokeColor,
            id: uuid,
            strokeWidth: allDeviceTypes['pathShape'].strokeWidth,
            draggable: true,
            opacity: opacity,
            scale: {
                x: scale * ((roomObj.unit === 'feet') ? 3.28084 : 1) * jsonScaleX,
                y: scale * ((roomObj.unit === 'feet') ? 3.28084 : 1) * jsonScaleY,
            }
        })

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
            opacity: allDeviceTypes[insertDevice.id].opacity ?? opacity,
        });
    }

    if (insertDevice.id === 'tblUnknownObj') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: '#FFFFFF99',
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: allDeviceTypes[insertDevice.id].dash,
            stroke: allDeviceTypes[insertDevice.id].stroke,
            strokeWidth: allDeviceTypes[insertDevice.id].strokeWidth,
            opacity: allDeviceTypes[insertDevice.id].opacity ?? opacity,
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
            opacity: allDeviceTypes[insertDevice.id].opacity ?? opacity,
            sceneFunc: (context, shape) => {
                context.beginPath();
                /* don't need to set position of ellipse, Konva will handle it */
                context.ellipse(shape.getAttr('width') / 2, shape.getAttr('height') / 2, shape.getAttr('width') / 2, shape.getAttr('height') / 2, 0, 0, 2 * Math.PI);
                /* (!) Konva specific method, it is very important - it will apply are required styles */
                context.fillStrokeShape(shape);
            }
        });
    }

    if (insertDevice.id === 'sphere') {
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            // fill: fillColor,
            stroke: strokeColor,
            strokeWidth: allDeviceTypes['sphere'].strokeWidth,
            id: uuid,
            draggable: true,
            opacity: allDeviceTypes[insertDevice.id].opacity ?? opacity,

            sceneFunc: (context, shape) => {
                context.beginPath();
                context.ellipse(shape.getAttr('width') / 2, shape.getAttr('height') / 2, shape.getAttr('width') / 2, shape.getAttr('height') / 2, 0, 0, 2 * Math.PI);
                shape.fillRadialGradientStartPoint({ x: shape.width() * 0.3, y: shape.height() * 0.3 });
                shape.fillRadialGradientStartRadius(0)
                shape.fillRadialGradientEndPoint({ x: shape.width() * 0.3, y: shape.height() * 0.3 });
                shape.fillRadialGradientEndRadius(shape.width());
                shape.fillRadialGradientColorStops([0, 'white', 0.5, 'grey', 1, 'grey']);
                context.fillStrokeShape(shape);
            }


        });

    }

    if (insertDevice.id === 'cylinder') {
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: 'grey',
            stroke: strokeColor,
            strokeWidth: allDeviceTypes['cylinder'].strokeWidth,
            id: uuid,
            draggable: true,
            opacity: allDeviceTypes[insertDevice.id].opacity ?? opacity,
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
                let podWidth = shape.width() * 0.8;
                let podHeight = shape.height() * 0.8;
                context.beginPath();
                /* don't need to set position of ellipse, Konva will handle it */
                context.ellipse(shape.width() / 2, shape.height() / 2, podWidth / 2, podHeight / 2, 0, 0, 2 * Math.PI);
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



    if (insertDevice.id === 'tblCurved') {
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

                let width = shape.width();
                let height = shape.height();
                let outerRadius = 510 / 426 * width; /* cm */
                let innerRadius = 432 / 426 * width;
                let outerStartAngle = 66 * Math.PI / 180;
                let outerEndAngle = 114 * Math.PI / 180;
                let innerStartAngle = 69 * Math.PI / 180;
                let innerEndAngle = 111 * Math.PI / 180;


                ctx.beginPath();
                ctx.beginPath();
                ctx.arc(width / 2, -outerRadius + height, outerRadius, outerStartAngle, outerEndAngle);
                ctx.arc(width / 2, -innerRadius + (0.27 * height), innerRadius, innerEndAngle, innerStartAngle, true);
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
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: allDeviceTypes[insertDevice.id].dash,
            stroke: allDeviceTypes[insertDevice.id].stroke || 'black',
            strokeWidth: allDeviceTypes[insertDevice.id].strokeWidth || '1',
        });
    }


    if (insertDevice.id === 'carpet') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: '#FFFFFF99',
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: allDeviceTypes[insertDevice.id].dash,
            stroke: allDeviceTypes[insertDevice.id].stroke,
            strokeWidth: allDeviceTypes[insertDevice.id].strokeWidth,
            opacity: 1,
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
            id: uuid,
            cornerRadius: radius,
            draggable: true,
            dash: allDeviceTypes[insertDevice.id].dash,
            stroke: allDeviceTypes[insertDevice.id].stroke,
            strokeWidth: allDeviceTypes[insertDevice.id].strokeWidth,
            opacity: 1,
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

    if (insertDevice.id === 'wallChairs') {
        let chairScale = scale / 24 * 0.65;
        if (roomObj.unit === 'meters') {
            chairScale = chairScale / 3.28084;
        }
        tblWallFlr = new Konva.Shape({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: wallWidth,
            height: height,
            stroke: '#aaaaaa',
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
            tblWallFlr.fillPatternOffset({ x: 0, y: 0 });
            tblWallFlr.fillPatternScale({ x: chairScale, y: chairScale });
        };
        windowBackgroundObj.src = './assets/images/chairs-top.png';

    }

    if (insertDevice.id === 'couch') {
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


                let height = shape.height();
                let width = shape.width();
                let radius = 10;
                let x = 0;
                let y = 0;

                let heightA = height - 8;
                let widthA = width * 0.3;
                let radiusA = 6;
                let xA = 0;
                let yA = 4;

                if (width < unitScale * 0.3) {
                    width = 0.3 * unitScale;
                    shape.width(width);
                }

                if (height < unitScale * 0.3) {
                    height = 0.3 * unitScale;
                    shape.height(height);
                }

                ctx.beginPath();

                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);

                /* inner shape */
                ctx.moveTo(xA + radiusA, yA);
                ctx.lineTo(xA + widthA - radiusA, yA);
                ctx.quadraticCurveTo(xA + widthA, yA, xA + widthA, yA + radiusA);
                ctx.lineTo(xA + widthA, yA + heightA - radiusA);

                ctx.quadraticCurveTo(xA + widthA, yA + heightA, xA + widthA - radiusA, yA + heightA);
                ctx.lineTo(xA + radiusA, yA + heightA);
                ctx.quadraticCurveTo(xA, yA + heightA, xA, yA + heightA - radiusA);
                ctx.lineTo(xA, yA + radiusA);
                ctx.quadraticCurveTo(xA, yA, xA + radiusA, yA);

                ctx.fillStrokeShape(shape);
            }
        });
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

    if (insertDevice.id === 'boxRoomPart') {
        tblWallFlr = new Konva.Rect({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            width: width,
            height: height,
            fill: '#ADD8E655',
            name: 'boxRoomPart',
            stroke: allDeviceTypes['boxRoomPart'].stroke || 'black',
            strokeWidth: allDeviceTypes['boxRoomPart'].strokeWidth || 1,
            id: uuid,
            draggable: true,
            opacity: 1,
        });
    }


    if (insertDevice.id === 'polyRoom') {
        tblWallFlr = new Konva.Line({
            x: pixelX,
            y: pixelY,
            rotation: rotation,
            points: points,
            fill: '#ADD8E655',
            stroke: 'black' || strokeColor,
            id: uuid,
            strokeWidth: 1,
            draggable: true,
            opacity: opacity,
            closed: true,
        })
    }

    if (isActiveRoomPart && (insertDevice.id === 'polyRoom' || insertDevice.id === 'boxRoomPart')) {
        tblWallFlr.hide();
        tblWallFlr.listening(false);
        tblWallFlr.draggable(false);
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

    if ('data_mount' in attrs) {
        tblWallFlr.data_mount = attrs.data_mount;
    }

    if (attrs.data_tilt) {
        tblWallFlr.data_tilt = attrs.data_tilt;
    }

    if (attrs.data_slant) {
        tblWallFlr.data_slant = attrs.data_slant;
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

    if (groupName === 'tables') {
        groupTables.add(tblWallFlr);
    }
    else if (groupName === 'stageFloors') {
        groupStageFloors.add(tblWallFlr);
    }
    else if (groupName === 'boxes') {
        groupBoxes.add(tblWallFlr);
    } else if (groupName === 'rooms') {
        groupRooms.add(tblWallFlr);
    }

    if (allDeviceTypes[tblWallFlr.data_deviceid].parentGroup === 'tables') {
        if (tblWallFlr.data_deviceid.startsWith('wallChairs') || tblWallFlr.data_deviceid.startsWith('couch')) {
            tblWallFlr.moveToTop();
        } else {
            tblWallFlr.zIndex(0);
        }
    }


    if (selectTrNode) {
        tr.nodes([tblWallFlr]);
        enableCopyDelBtn();
        /* add delay before updateFormatDetails to give time for object to be inserted and roomObj JSON to be updated */
        setTimeout(() => {
            tr.nodes([tblWallFlr]);
            resizeTableOrWall();
            updateFormatDetails(uuid)
        }, 250);
    }


    tblWallFlr.on('transform', function tableOnTransform(e) {
        snapToGuideLines(e, true);
        if (tblWallFlr.data_labelField) {
            updateShading(tblWallFlr);
        }
    });

    tblWallFlr.on('dblclick', function doubleClick(e) {
        if (tblWallFlr.data_deviceid === 'boxRoomPart' || tblWallFlr.data_deviceid === 'polyRoom') {
            zoomRoomPart(tblWallFlr);
        }
    });

    tblWallFlr.on('dragmove', function tableOnDragMove(e) {
        snapToGuideLines(e);

        snapCenterToIncrement(tblWallFlr);



        if (!tr.nodes().includes(e.target)) {
            tr.nodes([e.target]);
            enableCopyDelBtn();
            /* tables and other objects maybe resizable. */
            if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors || e.target.getParent() === groupBoxes || e.target.getParent() === groupRooms) {
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

        if (tblWallFlr.data_labelField) {

            updateShading(tblWallFlr);
        }
    });

    tblWallFlr.on('dragend', function tableOnDragEnd(e) {

        layerTransform.find('.guide-line').forEach((l) => l.destroy());
    });

    tblWallFlr.on('transformstart', function tableOnTransformStart(e) {
        lastSelectedNodePosition = deepCopyNode(tblWallFlr);
        if (e.target.data_deviceid === 'wallChairs' && tr.nodes().length === 1) {
            tr.nodes()[0].shadowColor('grey').shadowBlur(10).shadowOpacity(0.5).shadowEnabled(true).opacity(0.4);

        }
    });

    tblWallFlr.on('transformend', function tableOnTransformed(e) {
        let theDeviceId = e.target.data_deviceid;
        /* round out the wallChairs width to a singleChairWidth */
        if (e.target.data_deviceid === 'wallChairs' && tr.nodes().length === 1) {
            let chairs = tr.nodes()[0];
            let singleChairWidth = 2.35;
            if (roomObj.unit === 'meters') {
                singleChairWidth = 2.35 / 3.28084;
            }
            chairs.shadowEnabled(false).opacity(1);
            let height = Math.round((chairs.height()) / singleChairWidth / scale) * singleChairWidth * scale;

            if (height < singleChairWidth * scale) {
                height = singleChairWidth * scale;
            }

            document.getElementById('itemLength').value = height / scale;

            chairs.attrs.height = height;

        }

        layerTransform.find('.guide-line').forEach((l) => l.destroy());

        if (tr.nodes().length === 1)

            setTimeout((theDeviceId) => {

                if (theDeviceId === 'tblShapeU' || theDeviceId === 'tblTrap' || theDeviceId === 'wallChairs' || theDeviceId === 'couch' || theDeviceId === 'sphere') {
                    updateItem();
                }

            }, 100, theDeviceId);
        layerTransform.draw()
        /* Use updateItem so table is redrawn to proper shape on transformend. UpdateItem should be replaced with something not dependent on HTML fields */
    });

    if (attrs.data_labelField) {
        addLabel(tblWallFlr, attrs);
    }

}

/* returns a clone of the node include the data_  items */
function deepCopyNode(node) {
    let newNode = node.clone();
    let keys = Object.keys(node);
    keys.forEach(key => {
        if (key.startsWith('data_')) {
            newNode[key] = node[key];
        }
    })

    return newNode;
}

/* The wallChairs object needs to be resized by deleting and reinserting or the background image does not size correctly */
function updatWallChairsOnResize() {
    let redoTrNodes = false;
    roomObj.items.tables.forEach((item) => {
        if (item.data_deviceid === 'wallChairs') {
            let node = groupTables.findOne('#' + item.id);
            redoTrNodes = true;
            if (node) {
                node.destroy();
                insertShapeItem(item.data_deviceid, 'tables', item, item.id, false)
            }
        }
    });

    /* only redraw tr.nodes() if wallChairs were used */
    if (redoTrNodes) trNodesFromUuids(roomObj.trNodes, false);
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

/* Find the four courners of an item in units feet/meter after rotation.  Assumes any item with a 'width' uses upper left as the x,y.
SVG path shapes are more simplified and use the bounding getClientRect(). All other objects use center for x,y.

boudingBox = true means use the getClientRect() bounding box.

*/
function findFourCorners(item) {

    let shapeCorners = [];

    let width, height;

    /* for pathshape, determine if it is on the canvas by using the Node object and Konva .getClientRect to get four corners. */
    if (item.data_deviceid === 'pathShape' || item.data_deviceid === 'polyRoom') {
        const node = stage.findOne('#' + item.id);
        if (node) {
            let b = node.getClientRect();
            let x = (b.x - pxOffset) / scale;
            let y = (b.y - pxOffset) / scale;
            let width = b.width / scale;
            let height = b.height / scale;

            shapeCorners[0] = { x: x, y: y };
            shapeCorners[1] = { x: x + width, y: y };
            shapeCorners[2] = { x: x + width, y: y + height };
            shapeCorners[3] = { x: x, y: y + height };
        }
        else {
            /* if the node does not exist, return fake corners */
            shapeCorners[0] = { x: -20, y: -20 };
            shapeCorners[1] = { x: -20, y: -10 };
            shapeCorners[2] = { x: -10, y: -10 };
            shapeCorners[3] = { x: -10, y: -20 };

        }
    }
    else if ('width' in item) {
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

function findFourCornersOfNode(node) {
    let width = node.width();
    let height = node.height();
    let x = node.x();
    let y = node.y();
    let rotation = node.rotation();
    let shapeCorners = [];

    if (!rotation) {
        rotation = 0;
    }

    if (width === null || height === null || node.data_deviceid === 'pathShape') {
        let b = node.getClientRect();
        let x = b.x;
        let y = b.y;
        let width = b.width;
        let height = b.height;

        shapeCorners[0] = { x: x, y: y };
        shapeCorners[1] = { x: x + width, y: y };
        shapeCorners[2] = { x: x + width, y: y + height };
        shapeCorners[3] = { x: x, y: y + height };
    } else {
        let attrs = {};
        attrs.x = x;
        attrs.y = y;
        attrs.rotation = rotation;

        shapeCorners[0] = { x: x, y: y };
        shapeCorners[1] = findNewTransformationCoordinate(attrs, -width, 0);
        shapeCorners[2] = findNewTransformationCoordinate(attrs, -width, -height);
        shapeCorners[3] = findNewTransformationCoordinate(attrs, 0, -height);
    }

    return shapeCorners;
}

/* returns the bounding box of a node in the local unit (meters/feet) */
function getBoundingBoxInUnit(node) {


    if (node instanceof Konva.Line) {

        return getAbsolutePointsOfLine(node);

    } else {
        let item;
        let shapeCorners = [];
        roomObj.items[allDeviceTypes[node.data_deviceid].parentGroup].forEach(shape => {
            if (shape.id === node.id()) {
                item = shape;
            }
        });

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;



        shapeCorners[0] = { x: item.x, y: item.y };
        shapeCorners[1] = findNewTransformationCoordinate(item, -item.width, 0);
        shapeCorners[2] = findNewTransformationCoordinate(item, -item.width, -item.height);
        shapeCorners[3] = findNewTransformationCoordinate(item, 0, -item.height);

        shapeCorners.forEach(point => {

            if (point.x < minX) {
                minX = point.x;
            }

            if (point.y < minY) {
                minY = point.y;
            }

            if (point.x > maxX) {
                maxX = point.x;
            }

            if (point.y > maxY) {
                maxY = point.y;
            }

        });





        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, corners: shapeCorners };
    }

}

// Function to get absolute positions of all points in a line for konva.
function getAbsolutePointsOfLine(node, pixelUnit = false) {
    const localPoints = node.points();
    const absoluteTransform = node.getAbsoluteTransform(); // Get the combined transform
    const absolutePoints = [];
    const unitPoints = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Konva points array is flat: [x1, y1, x2, y2, ...]
    for (let i = 0; i < localPoints.length; i += 2) {
        const localPoint = {
            x: localPoints[i],
            y: localPoints[i + 1]
        };

        // Apply the absolute transform to the local point to get the stage position
        const absolutePoint = absoluteTransform.point(localPoint);
        absolutePoints.push(absolutePoint);
    }


    absolutePoints.forEach((point, index) => {

        let x, y;

        if (pixelUnit) {
            x = point.x;
            y = point.y;
        } else {
            x = (point.x - pxOffset) / scale;
            y = (point.y - pyOffset) / scale;
        }


        if (x > maxX) {
            maxX = x;
        }

        if (y > maxY) {
            maxY = y;
        }

        if (x < minX) {
            minX = x;
        }

        if (y < minY) {
            minY = y;
        }

        unitPoints[index] = { x: x, y: y };
    });


    return { corners: unitPoints, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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

function updateLayerSelectionOnNewScale() {
    layerSelectionBox
}

/*
    Take an item and insert into proper layerTransform group.
    deviceId e.g. roomBar found in devices.
  attrs { x: x, y: y, rotation: rotation }
  Insert based on un-scaled values.
  if UUID does not exist, create one for the object

*/
function updateShapesBasedOnNewScale(layerSelectionBoxOnly = false) {
    let oldScale, oldPxOffset, oldPyOffset;
    /* data_scale keeps track of the scale of the stage related to units of metric/feet */

    if (!('data_scale' in stage)) {
        oldScale = layerTransform.data_scale;
        oldPxOffset = layerTransform.data_pxOffset;
        oldPyOffset = layerTransform.data_pyOffset;

        if (isNaN(oldScale)) return;

        if (oldScale / scale === 1) return;

        if (!layerSelectionBoxOnly) {
            updateNodeScaleLayer(layerTransform);
            updateKonvaBackgroundImageFloor();
        }

        updateLayerSelection(layerSelectionBox);


        function updateNodeScaleLayer(layer) {

            layer.getChildren().forEach((parentGroup) => {

                let theObjects = parentGroup.getChildren();

                for (let i = 0; i < theObjects.length; i++) {

                    updateNode(theObjects[i]);
                };

            })
        }

        function updateLayerSelection(layer) {

            layer.getChildren().forEach(child => {
                if ('name' in child && child !== wallBuilderRect && child !== wallWriterRect2 && child !== select2PointsRect && child !== panRectangle && child != polyBuilderRect) {

                    updateNode(child);
                }

            });
        }

        function updateNode(node) {

            let attrs = node.attrs;

            if (node.data_deviceid === 'wallChairs') {
                let fillScaleX = scale / oldScale * node.fillPatternScaleX();
                node.fillPatternScaleX(fillScaleX);
                let fillScaleY = scale / oldScale * node.fillPatternScaleY();
                node.fillPatternScaleY(fillScaleY);

            }

            if (node.data_deviceid === 'pathShape') {
                let newScaleX = scale / oldScale * node.scaleX();
                let newScaleY = scale / oldScale * node.scaleY();
                node.scaleX(newScaleX);
                node.scaleY(newScaleY);
            }

            if ('x' in attrs) {

                let newX = pxOffset + ((scale / oldScale) * (node.x() - oldPxOffset));
                node.x(newX);
            }

            if ('points' in attrs) {
                let points = attrs.points;

                const newPoints = points.map(function (point, index) {
                    if (index % 2 !== 0) {
                        point = pxOffset + ((scale / oldScale) * (point - oldPxOffset));
                    } else {
                        point = pyOffset + ((scale / oldScale) * (point - oldPyOffset));
                    }
                    return point;
                })

                node.points(newPoints);


            }


            /* for the shading_group, scaling works. */
            if ('name' in attrs) {
                if (attrs.name === 'shading_group') {
                    let newScaleX = scale / oldScale * node.scaleX();
                    let newScaleY = scale / oldScale * node.scaleY();
                    node.scaleX(newScaleX);
                    node.scaleY(newScaleY);
                }

                if (attrs.name === 'wallBuilderConnectorLine') {
                    let newStrokeWidth = scale / oldScale * node.strokeWidth();
                    node.strokeWidth(newStrokeWidth);
                }
            }

            if ('y' in attrs) {
                let newY = pyOffset + ((scale / oldScale) * (node.y() - oldPyOffset));
                node.y(newY);
            }

            if ('width' in attrs) {
                let newWidth = scale / oldScale * node.width();
                node.width(newWidth);
            }

            if ('height' in attrs) {
                let newHeight = scale / oldScale * node.height();
                node.height(newHeight);
            }

            if ('radius' in attrs) {
                let newRadius = scale / oldScale * node.radius();
                node.radius(newRadius);
            }

            if ('fillRadialGradientEndRadius' in attrs) {
                let newFillRadialGradientEndRadius = scale / oldScale * node.fillRadialGradientEndRadius();
                node.fillRadialGradientEndRadius(newFillRadialGradientEndRadius);
            }
        }
    }

    layerTransform.data_scale = scale;
    layerTransform.data_pxOffset = pxOffset;
    layerTransform.data_pyOffset = pyOffset;

}

function removeShadingTrNodes() {

    if (mobileDevice === 'iOS' || mobileDevice === 'Android') return;
    lastTrNodesWithShading.forEach(node => {

        if ('image' in node.attrs) {
            node.strokeEnabled(false);
            node.stroke();
        } else {

            node.strokeEnabled(true);
            node.stroke('#000000');
            node.strokeWidth(1);

            if (node.data_deviceid.startsWith('wallChairs')) {
                node.stroke('#aaaaaa');
            }
            if ('stroke' in allDeviceTypes[node.data_deviceid]) {
                node.stroke(allDeviceTypes[node.data_deviceid].stroke);
            }

            if ('strokeWidth' in allDeviceTypes[node.data_deviceid]) {
                node.strokeWidth(allDeviceTypes[node.data_deviceid].strokeWidth);
            }

            if ('dash' in allDeviceTypes[node.data_deviceid]) {
                node.dash(allDeviceTypes[node.data_deviceid].dash);
            }

        }
    });

    lastTrNodesWithShading = [];
}

function updateTrNodesShadingTimer() {
    setTimeout(updateTrNodesShading, 40);
}


/* Show items as outlined in blue and shadded when selected */
function updateTrNodesShading() {
    if (mobileDevice === 'iOS' || mobileDevice === 'Android') return;

    let trNodes = tr.nodes();

    if (trNodes.length === 1) {
        lastSelectedNodePosition = trNodes[0].clone();
    }

    removeShadingTrNodes();
    trNodes.forEach(node => {

        node.strokeEnabled(true);
        node.strokeWidth(2);


        if (node.data_deviceid === 'pathShape') {
            node.strokeWidth(allDeviceTypes['pathShape'].strokeWidth);
        }

        if ('image' in node.attrs) {
            node.stroke("rgb(0, 161, 255)");

            if (node.data_deviceid === 'chair') {
                node.strokeWidth(3);

            }
        } else {
            node.stroke("rgb(0, 161, 255)");
        }


        if (node.data_deviceid === 'backgroundImageFloor') {
            node.strokeEnabled(false);
            node.stroke();
            node.shadowEnabled(false);
        } else {
            lastTrNodesWithShading.push(node);
        }
    })


}

function setDefaultBlankElements() {
    const elementsWithClass = document.querySelectorAll(".defaultBlank");

    // You can use forEach directly on the NodeList
    elementsWithClass.forEach(element => {
        element.value = "";
    });


};

function isNumeric(value) {
    return !(typeof value === 'string' && value.trim() === '') && Number.isFinite(Number(value));
}

function updateMultipleItems() {



    let width = document.getElementById('itemWidth2').value;
    let height = document.getElementById('itemLength2').value;
    let x = document.getElementById('itemX2').value;
    let y = document.getElementById('itemY2').value;
    let labelField = document.getElementById('labelField2').value;

    let rotation = document.getElementById('itemRotation2').value;

    let data_vHeight = document.getElementById('itemVheight2').value;

    let data_labelField = DOMPurify.sanitize(document.getElementById('labelField2').value);

    let data_zPosition = document.getElementById('itemZposition2').value;

    document.getElementById("btnMultiUpdateItemId").disabled = true;


    setTimeout(() => {
        document.getElementById("btnMultiUpdateItemId").disabled = false;

    }, 700);

    tr.nodes().forEach(node => {

        let parentGroup = node.getParent().name();
        let length = roomObj.items[parentGroup].length;

        for (let i = 0; i < length; i++) {

            if (node.id() === roomObj.items[parentGroup][i].id) {

                let item = roomObj.items[parentGroup][i];

                let xyUpdated = false;

                if (isNumeric(x) || isNumeric(y)) {
                    xyUpdated = true;
                }



                if (data_labelField && item.data_deviceid !== 'pathShape') {

                    updateLabel(node, { data_labelField: data_labelField });
                    redraw = true;
                }




                if (xyUpdated) {

                    let rotation;
                    if ('rotation' in item && item.rotation) {
                        rotation = item.rotation;
                    } else {
                        rotation = 0;
                    }


                    if (('width' in allDeviceTypes[item.data_deviceid])) {

                        let x2, y2;

                        if (isNumeric(x)) {
                            x2 = Number(x);

                        } else {
                            x2 = item.x - activeRoomX;
                        }


                        if (isNumeric(y)) {
                            y2 = Number(y);

                        } else {
                            y2 = item.y - activeRoomY;
                        }

                        let pixelX = scale * x2 + pxOffset;
                        let pixelY = scale * y2 + pyOffset;
                        let width = allDeviceTypes[item.data_deviceid].width / 1000 * scale;
                        let height = allDeviceTypes[item.data_deviceid].depth / 1000 * scale;

                        if (roomObj.unit === 'feet') {
                            width = width * 3.28084;
                            height = height * 3.28084;
                        }


                        let cornerXY = findUpperLeftXY({ x: pixelX, y: pixelY, rotation: rotation, width: width, height: height });

                        node.x(cornerXY.x);
                        node.y(cornerXY.y);

                    } else {

                        let x2, y2;
                        let center = getItemCenter(item);


                        let deltaX = item.x - center.x;
                        let deltaY = item.y - center.y;

                        if (isNumeric(x)) {
                            x2 = Number(x) + deltaX;
                        } else {
                            x2 = item.x - activeRoomX;
                        }

                        if (isNumeric(y)) {
                            y2 = Number(y) + deltaY;
                        } else {
                            y2 = item.y - activeRoomY;
                        }

                        let pixelX = scale * x2 + pxOffset;
                        let pixelY = scale * y2 + pyOffset;

                        node.x(pixelX);
                        node.y(pixelY);

                    }
                }

                if (isNumeric(rotation)) {
                    rotation = normalizeDegree(rotation);
                    rotateAroundCenter2(node, rotation);

                }

                if (isNumeric(data_vHeight)) {
                    if (!('width' in allDeviceTypes[item.data_deviceid]) && 'resizeable' in allDeviceTypes[item.data_deviceid] && allDeviceTypes[item.data_deviceid].resizeable.includes('vheight')) {

                        item.data_vHeight = Number(data_vHeight);
                        node.data_vHeight = item.data_vHeight;
                    }

                }

                if (isNumeric(data_zPosition)) {
                    item.data_zPosition = Number(data_zPosition);
                    node.data_zPosition = item.data_zPosition;
                }

                if (isNumeric(width) && 'resizeable' in allDeviceTypes[item.data_deviceid] && allDeviceTypes[item.data_deviceid].resizeable.includes('width')) {
                    node.width(width * scale);
                }

                if (isNumeric(height) && 'resizeable' in allDeviceTypes[item.data_deviceid] && allDeviceTypes[item.data_deviceid].resizeable.includes('depth')) {
                    node.height(height * scale);
                }

                if (labelField !== '' && item.data_deviceid !== 'pathShape') {
                    node.data_labelField = labelField;
                    item.data_labelField = labelField;
                }



                updateShading(node);


            }
        }



    });


    tr.nodes().forEach(node => {
        updateShading(node);
    });

    canvasToJson();

    if (data_labelField === '{}') {
        document.getElementById('labelField2').value = '';
    }

}


/* Item is updated after clicking Update item on web page from Details tab */
function updateItem() {
    let parentGroup = document.getElementById('itemGroup').innerText;
    if (!parentGroup) {
        console.info('parentGroup for itemUpdate not found');
        return; /* if itemGroup/parent group not found on the webpage, exit out */
    }
    let width = Number(document.getElementById('itemWidth').value);
    let height = Number(document.getElementById('itemLength').value);
    let data_diagonalInches = document.getElementById('itemDiagonalTv').value;
    let x = Number(document.getElementById('itemX').value);
    let y = Number(document.getElementById('itemY').value);


    let rotation = Number(document.getElementById('itemRotation').value);
    rotation = normalizeDegree(rotation);

    let data_zPosition = Number(document.getElementById('itemZposition').value);

    let data_tilt = Number(document.getElementById('itemTilt').value);
    data_tilt = normalizeDegree(data_tilt);

    let data_slant = Number(document.getElementById('itemSlant').value);
    data_slant = normalizeDegree(data_slant);

    let data_vHeight = Number(document.getElementById('itemVheight').value);

    let id = document.getElementById('itemId').innerText;

    let data_deviceid = document.getElementById('itemName').value;


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


    let deleteDuplicateItemsArray = [];


    roomObj.items[parentGroup].forEach((item, index) => {

        if (item.id === id) {
            /*once found, incoroprate the new parentGroup based on changes */

            if (parentGroup !== allDeviceTypes[data_deviceid].parentGroup) {
                deleteDuplicateItemsArray.push({ oldParentGroup: parentGroup, id: item.id });
            }

            parentGroup = allDeviceTypes[data_deviceid].parentGroup;

            item.data_deviceid = data_deviceid;

            if ('x' in item) {
                item.x = x + activeRoomX;
            }

            if ('y' in item) {
                item.y = y + activeRoomY;
            }

            if ('width' in item) {
                item.width = width;
            }


            if ('height' in item) {
                item.height = height;
            }

            if (data_deviceid === 'sphere' || data_deviceid === 'cylinder') {
                item.height = width;
            }

            if (data_deviceid === 'sphere') {
                item.data_vHeight = width;
                data_vHeight = width;

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

            if (document.getElementById('drpMount').options.length > 0) {

                item.data_mount = {};
                item.data_mount.value = document.getElementById('drpMount').value;
                item.data_mount.index = document.getElementById('drpMount').selectedIndex;
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

            if (item.data_deviceid === 'pathShape') {
                data_labelField = combinePathShapeLabel(data_labelField, document.getElementById('labelPath').value);
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



            if (!(data_tilt === '')) {
                item.data_tilt = Math.round(data_tilt * 10) / 10;
            }
            else if ('data_tilt' in item) {  /* if field is now blank remove the attribute.  HTML text box can be blank */
                delete item.data_tilt;
            }

            if (!(data_slant === '')) {
                item.data_slant = Math.round(data_slant * 10) / 10;
            }
            else if ('data_slant' in item) {  /* if field is now blank remove the attribute.  HTML text box can be blank */
                delete item.data_slant;
            }

            if (testOffset) {
                workspaceKey[item.data_deviceid].xOffset = document.getElementById('itemXoffset').value;
                workspaceKey[item.data_deviceid].yOffset = document.getElementById('itemYoffset').value;
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
            let speakerShading = stage.find('#speaker~' + node.id())[0];
            let videoShading = stage.find('#fov~' + node.id())[0];
            let displayShading = stage.find('#dispDist~' + node.id())[0];
            let labelText = stage.find('#label~' + node.id());

            node.destroy();

            if (audioShading) {
                audioShading.destroy();
            }

            if (speakerShading) {
                speakerShading.destroy();
            }

            if (videoShading) {
                videoShading.destroy();
            }

            if (displayShading) {
                displayShading.destroy();
            }

            if (labelText) {
                labelText.forEach(label => {
                    label.destroy();
                })

            }


            /* if the displaySngl is swapped with displayTrpl or displayDbl, then those objects get an incorrect .data_role, so remove */
            if (item.data_deviceid === 'displayTrpl' || item.data_deviceid === 'displayDbl') {
                delete item.data_role;
            }

            insertShapeItem(item.data_deviceid, parentGroup, item, id, false);

            /* give the canvas some time to be updated before updating */
            setTimeout(() => {
                // updateFormatDetails(id);  /* value is contained in enableCopyDelBtn */
                tr.nodes([stage.find('#' + id)[0]]);
                enableCopyDelBtn();
                canvasToJson();
            }, 100);

            return;


        }
    });


    deleteDuplicateItemsArray.forEach(duplicateItem => {

        let length = roomObj.items[duplicateItem.oldParentGroup].length;

        for (let i = length - 1; i >= 0; i--) {

            if (duplicateItem.id === roomObj.items[duplicateItem.oldParentGroup][i].id) {
                roomObj.items[duplicateItem.oldParentGroup].splice(i, 1);
            }

            break; /* assuumig only one match, break early */
        };
    });

}


let timerMenuHoverButton;
let hoverTimeMenuButtons = 1000;
let menuExisted = false; /* used on mouseUp on menuButtons to determine if the menu existed */

addButtonListeners();

function addButtonListeners() {
    let parentButtonAttributes = [
        ['btnMicShadeToggle', 'hasMic'],
        ['btnCamShadeToggle', 'hasCamera'],
        ['btnDisplayDistance', 'hasDisplay'],
        ['btnSpeakerShadeToggle', 'hasSpeaker']
    ];

    parentButtonAttributes.forEach(parentButtonAttribute => {
        let parentButton = document.getElementById(parentButtonAttribute[0]);;
        let attributeType = parentButtonAttribute[1];
        parentButton.title = '';

        parentButton.addEventListener('pointerup', () => {
            clearTimeout(timerMenuHoverButton);
            buttonMouseUp(attributeType);
        });

        parentButton.addEventListener('pointerdown', (event) => {

            buttonMouseDown(attributeType);

            closeAllMenus();

            timerMenuHoverButton = setTimeout(() => {

                createDeviceMenu(parentButton, attributeType);
                buttonTurnOn(attributeType);
            }, hoverTimeMenuButtons);

            document.addEventListener('pointerdown', event => {

                const menu = document.getElementById(`deviceMenu-${attributeType}`);
                if (menu && !menu.contains(event.target) && event.target !== parentButton) {
                    checkForAllUnchecked();
                    closeDeviceMenu(attributeType);
                    saveToUndoArray();
                }

            });

        });


    })
}


/* turn off the buttons not pressed */
function buttonMouseDown(attributeType) {

    if (attributeType === 'hasMic') {
        displayDistanceVisible(false);
        shadingCameraVisible(false);
        shadingSpeakerVisible(false);
    }
    else if (attributeType === 'hasCamera') {
        displayDistanceVisible(false);
        shadingMicrophoneVisible(false);
        shadingSpeakerVisible(false);
    }
    else if (attributeType === 'hasDisplay') {
        shadingCameraVisible(false);
        shadingMicrophoneVisible(false);
        shadingSpeakerVisible(false);
    } else if (attributeType === 'hasSpeaker') {
        displayDistanceVisible(false);
        shadingCameraVisible(false);
        shadingMicrophoneVisible(false);

    }

}

/* on mouseUp over button, if there is no menu, toggle the button */
function buttonMouseUp(attributeType) {
    const menu = document.getElementById(`deviceMenu-${attributeType}`);

    if (menu) return;

    if (attributeType === 'hasMic') {
        shadingMicrophoneVisible();
    }
    else if (attributeType === 'hasCamera') {
        shadingCameraVisible();
    }
    else if (attributeType === 'hasDisplay') {
        displayDistanceVisible();
    } else if (attributeType === 'hasSpeaker') {
        shadingSpeakerVisible();
    }

}

function buttonTurnOn(attributeType) {

    if (attributeType === 'hasMic') {
        shadingMicrophoneVisible(true);
    }
    else if (attributeType === 'hasCamera') {
        shadingCameraVisible(true);
    }
    else if (attributeType === 'hasDisplay') {
        displayDistanceVisible(true);
    }
    else if (attributeType === 'hasSpeaker') {
        shadingSpeakerVisible(true);
    }
}

function closeAllMenus() {
    let attributeTypeArray = ['hasMic', 'hasCamera', 'hasDisplay', 'hasSpeaker'];
    attributeTypeArray.forEach((attributeType) => {
        let menu = document.getElementById(`deviceMenu-${attributeType}`);
        if (menu) menu.remove();
    });

}



function closeDeviceMenu(attributeType) {
    const menu = document.getElementById(`deviceMenu-${attributeType}`);
    if (menu) { menu.remove(); }
}

function closeOpenSidebar(tabToOpen) {

    let closeOpenMenu = document.getElementById('closeOpenMenu');
    let sideBar = document.getElementById('sidebar');
    let openSidebarDiv = document.getElementById('openSideBar');
    let containerRoomSvg = document.getElementById('ContainerRoomSvg');
    if (sideBar.style.display === 'none') {
        sideBar.style.display = '';
        openSidebarDiv.style.display = 'none';
        containerRoomSvg.style.paddingLeft = '';


    } else {
        sideBar.style.display = 'none';
        openSidebarDiv.style.display = '';
        containerRoomSvg.style.paddingLeft = '0px';

    }

    if (tabToOpen) {

        document.getElementById(tabToOpen).click();

    }


    windowResizeEventName();

}

function checkForAllUnchecked() {
    let attributeTypeArray = ['hasMic', 'hasCamera', 'hasDisplay', 'hasSpeaker'];
    attributeTypeArray.forEach((attributeType) => {
        let menu = document.getElementById(`deviceMenu-${attributeType}`);
        if (menu) {
            let checkedboxes = document.querySelectorAll('input[name=menuReachItemCheckBox]:checked');
            let allUnchecked = true;

            checkedboxes.forEach(checkbox => {
                if (checkbox.checked === true) {
                    allUnchecked = false;
                }
            });

            let opt = {};
            opt.value = 'none';
            if (allUnchecked) {

                previewCheckedDevices(opt, attributeType);
            }

        }
    });

}


function createDeviceMenu(parentButton, attributeType) {

    /* Create the menu container and position it below the button. */

    const rect = parentButton.getBoundingClientRect();
    let unavailableTextColor = 'darkgrey';
    menuExisted = true;
    const menuReach = document.createElement('div');
    menuReach.id = `deviceMenu-${attributeType}`;
    menuReach.classList.add('menuReach');
    menuReach.style = `
            top: ${rect.bottom + window.scrollY}px;
            left: ${rect.left + window.scrollX}px;
        `;




    let defaultOptions;
    if (attributeType === 'hasCamera') {
        defaultOptions = [
            { text: 'All Cameras', value: 'all' },
            { text: 'No Cameras', value: 'none' }
        ];
    } else if (attributeType === 'hasMic') {
        defaultOptions = [
            { text: 'All Microphones', value: 'all' },
            { text: 'No Microphones', value: 'none' }
        ];
    } else if (attributeType === 'hasDisplay') {
        defaultOptions = [
            { text: 'All Displays', value: 'all' },
            { text: 'No Displays', value: 'none' }
        ];
    } else if (attributeType === 'hasSpeaker') {
        defaultOptions = [
            { text: 'All Speakers', value: 'all' },
            { text: 'No Speakers', value: 'none' }
        ];
    }

    const devices = menuReachItemList(attributeType);
    if (devices.length < 1) menuReach.style.color = unavailableTextColor;

    const options = devices;
    options.forEach(opt => {
        const menuReachItem = document.createElement('div');
        menuReachItem.className = 'menuReach-item';
        menuReachItem.setAttribute('data-device-id', opt.value);

        const checkbox = document.createElement('input');
        // For non-default options, add a checkbox.
        if (opt.value !== 'all' && opt.value !== 'none') {

            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-device-id', opt.value);
            checkbox.name = 'menuReachItemCheckBox';
            checkbox.className = 'menuReachItem-checkbox';
            checkbox.checked = !opt.isHidden;
            checkbox.addEventListener('click', event => {
                event.stopPropagation();
                previewCheckedDevices(opt, attributeType);
            });
            menuReachItem.appendChild(checkbox);
        }

        // Create label.
        const menuReachlabel = document.createElement('label');
        menuReachlabel.textContent = opt.text;
        menuReachlabel.style.cursor = 'pointer';
        menuReachItem.appendChild(menuReachlabel);

        // Click event for menu items.
        menuReachItem.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            previewCheckedDevices(opt, attributeType, false, checkbox);
        });

        menuReachItem.style.marginLeft = '4px';
        menuReachItem.style.marginRight = '4px';
        menuReachItem.addEventListener('mouseover', () => {
            if (devices.length < 1) return;

            // menuReachItem.style.backgroundColor = '#555';
            menuReachItem.style.backgroundColor = '#d6eaff';
            menuReachItem.style.borderRadius = '25px';


            hightlightOverlayForDevice(opt, attributeType, true, checkbox);

            clearTimeout(highlightedSelectNodeTimer);

            highlightedSelectNodeTimer = setTimeout((opt, attributeType, highlight, checkbox) => {
                hightlightOverlayForDevice(opt, attributeType, false, checkbox);
            }, 2000, opt, attributeType, false, checkbox);
        });

        menuReachItem.addEventListener('mouseout', () => {
            menuReachItem.style.backgroundColor = 'transparent';
            hightlightOverlayForDevice(opt, attributeType, false, checkbox);
        });

        // menuReachItem.addEventListener('touchend', () => {
        //     menuReachItem.style.backgroundColor = 'transparent';
        //     hightlightOverlayForDevice(opt, attributeType, false, checkbox);
        // } )

        menuReach.appendChild(menuReachItem);
    });


    const firstRow = document.createElement('div');
    menuReach.prepend(firstRow);
    const clearButton = document.createElement('div');
    clearButton.id = `clearButton-${attributeType}`;
    clearButton.textContent = (devices.length < 1) ? 'No items' : 'Uncheck All';

    clearButton.classList.add('menuReachClearButton');

    if (devices.length < 1) clearButton.style.color = unavailableTextColor;
    clearButton.addEventListener('click', () => {

        let checkedBoxes = document.querySelectorAll('input[name=menuReachItemCheckBox]');
        let checkBoxChecked;
        if (clearButton.textContent === 'Uncheck All') {
            clearButton.textContent = 'Check All';
            checkBoxChecked = false;
        }
        else if (clearButton.textContent === 'Check All') {
            clearButton.textContent = 'Uncheck All';
            checkBoxChecked = true;
        }


        checkedBoxes.forEach(checkBox => {
            let opt = {};
            checkBox.checked = checkBoxChecked;
            opt.value = checkBox.getAttribute('data-device-id');
            opt.checkBoxChecked = checkBoxChecked;
            previewCheckedDevices(opt, attributeType);

        });
    });

    firstRow.appendChild(clearButton);

    const dragButton = document.createElement('i');
    dragButton.id = menuReach.id + '-dragger';
    dragButton.classList.add('icon');
    dragButton.classList.add('icon-dragger-vertical-bold');
    dragButton.style = "position: absolute; right: 3px; top: 5px; cursor: all-scroll;"

    firstRow.appendChild(dragButton);







    // const applyButton = document.createElement('div');
    // applyButton.id = `applyButton-${attributeType}`;
    // applyButton.textContent = 'Apply';
    // applyButton.style = "padding: 8px 12px; cursor: pointer; text-align: center; margin-top: 5px; background-color: #28a745; color: #fff;";
    // if(devices.length < 1) {
    //     applyButton.style.color = unavailableTextColor;
    //     applyButton.style.backgroundColor = 'rgb(14, 110, 36);'

    // }

    // applyButton.addEventListener('click', () => {
    //     closeAllMenus(); /* applyButton doesn't really do anything except close the menu */
    //     saveToUndoArray();
    // });

    // menuReach.appendChild(applyButton);
    document.body.appendChild(menuReach);

    dragElement(menuReach);
}

function menuReachItemList(attributeType) {
    let attributeItemArray = getDevicesWithAttribute(attributeType);
    let menuItems = getMenuItems(attributeItemArray, attributeType);

    return menuItems;
}

function getMenuItems(itemArray, attributeType) {
    let menuItemArray = [];
    let data_field = '';

    data_field = (attributeType === 'hasMic') ? 'data_audioHidden' : (attributeType === 'hasSpeaker') ? 'data_speakerHidden' : (attributeType === 'hasCamera') ? 'data_fovHidden' : (attributeType === 'hasDisplay') ? 'data_dispDistHidden' : 'unknown';

    itemArray.forEach(item => {
        let menuItem = {};
        menuItem.value = item.id;
        menuItem.text = item.name;

        if ('data_labelField' in item) {
            let nonJsonPart = item.data_labelField.replaceAll(/{.*?}/g, '').trim();
            if (nonJsonPart != '') {
                menuItem.text = nonJsonPart;
            }
        }

        if (data_field in item) {
            menuItem.isHidden = item[data_field];
        } else {
            menuItem.isHidden = false;
        }
        menuItemArray.push(menuItem);
    });

    return menuItemArray;
}


function getDevicesWithAttribute(attributeType) {
    let itemArray = [];

    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let item = roomObj.items[category][i];

            if (attributeType === 'hasMic' && 'micRadius' in allDeviceTypes[item.data_deviceid]) {
                itemArray.push(item);
            }

            if (attributeType === 'hasSpeaker' && 'speakerRadius' in allDeviceTypes[item.data_deviceid]) {
                itemArray.push(item);
            }


            if (attributeType === 'hasDisplay' && 'data_diagonalInches' in item) {
                itemArray.push(item);
            }

            if (attributeType === 'hasCamera' && 'wideHorizontalFOV' in allDeviceTypes[item.data_deviceid]) {
                itemArray.push(item);
            }


        }
    }

    return itemArray;
}


function previewCheckedDevices(opt, attributeType) {

    let attributeString = (attributeType === 'hasMic') ? 'audio' : (attributeType === 'hasSpeaker') ? 'speaker' : (attributeType === 'hasCamera') ? 'fov' : (attributeType === 'hasDisplay') ? 'dispDist' : 'unknown';

    let attributeHidden = (attributeType === 'hasMic') ? 'data_audioHidden' : (attributeType === 'hasSpeaker') ? 'data_speakerHidden' : (attributeType === 'hasCamera') ? 'data_fovHidden' : (attributeType === 'hasDisplay') ? 'data_dispDistHidden' : 'unknown';

    let roomObjItems = getDevicesWithAttribute(attributeType);







    roomObjItems.forEach((item) => {

        let parentNode = stage.findOne('#' + item.id);
        let reachNode = stage.findOne(`#${attributeString}~${item.id}`);
        let allItemsUnchecked = true;


        if ('checkBoxChecked' in opt) {
            if ((opt.checkBoxChecked === true)) {
                reachNode.visible(true);
                /* insert value direct to canvas */
                delete parentNode[attributeHidden]; /* delete .data_fovHidden etc. value direct in the Konva canvas */
                delete item[attributeHidden]; /* delete .data_fovHidden ect. direct to roomObj */
                allItemsUnchecked = false;
            } else if (opt.checkBoxChecked === false) {
                reachNode.visible(false);
                parentNode[attributeHidden] = true;
                item[attributeHidden] = true;
            }

        } else if (item.id === opt.value) {
            if ((attributeHidden in item && item[attributeHidden] === true)) {
                reachNode.visible(true);
                /* insert value direct to canvas */
                delete parentNode[attributeHidden]; /* delete .data_fovHidden etc. value direct in the Konva canvas */
                delete item[attributeHidden]; /* delete .data_fovHidden ect. direct to roomObj */
                allItemsUnchecked = false;
            } else {
                reachNode.visible(false);
                parentNode[attributeHidden] = true;
                item[attributeHidden] = true;
            }

        }
        else if (opt.value === 'all') {
            reachNode.visible(true);
            /* insert value direct to canvas */
            delete parentNode[attributeHidden]; /* delete .data_fovHidden etc. value direct in the Konva canvas */
            delete item[attributeHidden]; /* delete .data_fovHidden etc. direct to roomObj */
            closeAllMenus();
        }

        if (opt.value === 'none') {
            reachNode.visible(true);
            /* insert value direct to canvas */
            delete parentNode[attributeHidden]; /* delete .data_fovHidden value direct in the Konva canvas */
            delete item[attributeHidden]; /* delete .data_fovHidden direct to roomObj */
            closeAllMenus();
            displayDistanceVisible(false);
            shadingMicrophoneVisible(false);
            shadingCameraVisible(false);
            shadingSpeakerVisible(false);
        }

    });


}

let defaultOpacity = 0.3; /* used to store the default opacity of the device */

function hightlightOverlayForDevice(opt, attributeType, highlight, checkbox) {

    let overlayType = (attributeType === 'hasMic') ? 'audio' : (attributeType === 'hasSpeaker') ? 'speaker' : (attributeType === 'hasCamera') ? 'fov' : (attributeType === 'hasDisplay') ? 'dispDist' : 'unknown';

    let blurColor = (attributeType === 'hasMic') ? 'blue' : (attributeType === 'hasSpeaker') ? 'blue' : (attributeType === 'hasCamera') ? 'green' : (attributeType === 'hasDisplay') ? 'blue' : 'unknown';


    const targetId = '#' + overlayType + "~" + opt.value;

    const overlayGroup = stage.findOne(targetId);

    const node = stage.findOne('#' + opt.value);
    if (!overlayGroup) return;
    overlayGroup.visible(true);
    overlayGroup.getChildren().forEach(child => {

        if (highlight) {
            child.shadowColor(blurColor);
            node.shadowColor('blue');

            child.shadowBlur(5);
            node.shadowBlur(10);
            child.shadowEnabled(true);
            node.shadowEnabled(true);

        } else {
            child.shadowEnabled(false);
            node.shadowEnabled(false);
        }
    });

    if (!highlight) {

        overlayGroup.visible(checkbox.checked);
    }

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
                // document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic';
                stage.find('#audio~' + id)[0].visible(true);
                delete node.data_audioHidden;
                delete item.data_audioHidden;
            } else {
                stage.find('#audio~' + id)[0].visible(false);
                node.data_audioHidden = true;
                item.data_audioHidden = true;
            }

        }
    });
    canvasToJson();

}

function toggleSpeakerShadingSingleItem() {
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    /* this function should not be called if grShadingSpeaker === false, but in case it is, give the user feedback */
    if (roomObj.layersVisible.grShadingSpeaker === false) {
        document.getElementById('dialogSingleItemToggles').showModal();
        return;
    }

    roomObj.items[parentGroup].forEach((item, index) => {
        if (item.id === id) {
            let node = stage.find('#' + id)[0];
            if ('data_speakerHidden' in item && item.data_speakerHidden === true) {
                stage.find('#speaker~' + id)[0].visible(true);
                delete node.data_speakerHidden;
                delete item.data_speakerHidden;
            } else {
                stage.find('#speaker~' + id)[0].visible(false);
                node.data_speakerHidden = true;
                item.data_speakerHidden = true;
            }

        }
    });
    canvasToJson();

}

function toggleCamShadeSingleItem() {
    let id = document.getElementById('itemId').innerText;
    let parentGroup = document.getElementById('itemGroup').innerText;

    if (roomObj.layersVisible.grShadingCamera === false) {
        alert('To toggle this button, first toggle on the parent mics, cameras or display button found above the canvas drawing.');
        // document.getElementById('dialogSingleItemToggles').showModal();
        return;
    }

    roomObj.items[parentGroup].forEach((item, index) => {

        if (item.id === id) {
            let node = stage.find('#' + id)[0];
            if ('data_fovHidden' in item && item.data_fovHidden === true) {
                // document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam';
                stage.find('#fov~' + id)[0].visible(true);
                /* insert value direct to canvas */
                delete node.data_fovHidden; /* delete .data_fovHidden value direct in the Konva canvas */
                delete item.data_fovHidden; /* delete .data_fovHidden direct to roomObj */
            } else {
                // document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam_off';
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
                // document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv';
                stage.find('#dispDist~' + id)[0].visible(true);
                delete item.data_dispDistHidden;
                delete node.data_dispDistHidden;
            } else {
                // document.getElementById("btnDisplayDistanceSingleItem").children[0].textContent = 'tv_off';
                stage.find('#dispDist~' + id)[0].visible(false);
                item.data_dispDistHidden = true;
                node.data_dispDistHidden = true;
            }

        }
    });

    canvasToJson();

}

dragElement(document.getElementById('floatingWorkspace'));

/* Makes an html element draggable. If the element has an ID of {element.id}-dragger, use the that -dragger element as the part to drag, otherwise make the whole element draggable. Works on touch devices too. */
function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const dragger = document.getElementById(element.id + "-dragger");

    if (dragger) {
        dragger.onmousedown = dragMouseDown;
        dragger.ontouchstart = dragTouchStart;
    } else {
        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.style.boxShadow = "10px 10px 20px rgba(0, 0, 0, 0.8)";
    }

    function dragTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
        element.style.boxShadow = "10px 10px 20px rgba(0, 0, 0, 0.8)";
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        moveElement();
    }

    function elementTouchDrag(e) {
        e.preventDefault();
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        moveElement();
    }

    function moveElement() {
        let elementTop = (element.offsetTop - pos2);
        let elementLeft = (element.offsetLeft - pos1);

        let boundRect = element.getBoundingClientRect();

        if (elementTop < 0) {
            elementTop = 0;
        }

        if (elementTop > window.innerHeight - 40) {
            elementTop = window.innerHeight - 40;
        }

        if (elementLeft < (0 - boundRect.width + 50)) {
            elementLeft = (0 - boundRect.width + 50);
        }

        if (elementLeft > window.innerWidth - 150) {
            elementLeft = window.innerWidth - 150;
        }

        element.style.top = elementTop + 'px';
        element.style.left = elementLeft + 'px';
        element.style.boxShadow = "10px 10px 20px rgba(0, 0, 0, 0.8)";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }

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
                let speakerShading = stage.find('#speaker~' + node.id())[0];
                let videoShading = stage.find('#fov~' + node.id())[0];

                node.destroy();
                if (audioShading) {
                    audioShading.destroy();
                }

                if (speakerShading) {
                    speakerShading.destroy();
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
 * by the lists of vertices. Uses the   .
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

    let xBoundMin, xBoundMax, yBoundMin, yBoundMax;

    let border = [];

    /* get the bounds in scale (feet/meters) */

    if (isActiveRoomPart === false) {
        xBoundMin = -pxOffset / scale;
        yBoundMin = -pyOffset / scale;
        xBoundMax = roomObj.room.roomWidth + pxOffset / scale;
        yBoundMax = roomObj.room.roomLength + (pyOffset + 30) / scale;
        border[0] = { x: xBoundMin, y: yBoundMin };
        border[1] = { x: xBoundMax, y: yBoundMin };
        border[2] = { x: xBoundMax, y: yBoundMax };
        border[3] = { x: xBoundMin, y: yBoundMax };

    } else if (activeRoomPartItem) {
        let x1 = activeRoomPartItem.x;
        let y1 = activeRoomPartItem.y;
        let points = activeRoomPartItem.points;

        // for (i = 0, j = 0; i < points.length; i = i + 2) {
        //     border[j] = { x: points[i] + x1, y: points[i + 1] + y1 };
        //     j = j + 1;
        // };

        xBoundMin = activeRoomX;
        yBoundMin = activeRoomY;
        xBoundMax = activeRoomX + activeRoomWidth;
        yBoundMax = activeRoomY + activeRoomLength;


        border = activeRoomAbsPoints;



    } else {


        xBoundMin = activeRoomX;
        yBoundMin = activeRoomY;
        xBoundMax = activeRoomX + activeRoomWidth;
        yBoundMax = activeRoomY + activeRoomLength;


        border[0] = { x: xBoundMin, y: yBoundMin };
        border[1] = { x: xBoundMax, y: yBoundMin };
        border[2] = { x: xBoundMax, y: yBoundMax };
        border[3] = { x: xBoundMin, y: yBoundMax };

    }


    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let item = structuredClone(roomObj.items[category][i]);
            if (!(item.data_deviceid === 'boxRoomPart' || item.data_deviceid === 'polyRoom') && 'data_deviceid' in item) {


                let fourCorners = findFourCorners(item);

                if (!doPolygonsIntersect2(border, fourCorners)) {
                    itemsOffStageId.push(item.id);
                }

            }
        }
    }

}



/**
 * Determines if two polygons intersect
 * @param {Array<{x: number, y: number}>} polygon1 - First polygon (can be concave)
 * @param {Array<{x: number, y: number}>} polygon2 - Second polygon (convex)
 * @returns {boolean} - True if polygons intersect, false otherwise
 */
function doPolygonsIntersect2(polygon1, polygon2) {
    // Early validation
    if (!polygon1 || !polygon2 || polygon1.length < 3 || polygon2.length < 3) {
        return false;
    }

    // Method 1: Bounding Box Check (fastest preliminary test)
    if (!boundingBoxesIntersect(polygon1, polygon2)) {
        return false;
    }

    // Method 2: Check if any vertex of one polygon is inside the other
    if (isPointInPolygon(polygon1[0], polygon2) || isPointInPolygon(polygon2[0], polygon1)) {
        return true;
    }

    // Method 3: Check if any edges intersect (Separating Axis Theorem optimization)
    if (doEdgesIntersect(polygon1, polygon2)) {
        return true;
    }

    return false;
}

/**
 * Method 1: Check if bounding boxes intersect (O(n) complexity)
 */
function boundingBoxesIntersect(polygon1, polygon2) {
    const bbox1 = getBoundingBox(polygon1);
    const bbox2 = getBoundingBox(polygon2);

    return !(bbox1.maxX < bbox2.minX ||
        bbox1.minX > bbox2.maxX ||
        bbox1.maxY < bbox2.minY ||
        bbox1.minY > bbox2.maxY);
}

function getBoundingBox(polygon) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const point of polygon) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    return { minX, maxX, minY, maxY };
}

/**
 * Method 2: Point-in-polygon test using ray casting algorithm
 * Works correctly for concave polygons
 */
function isPointInPolygon(point, polygon) {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Method 3: Check if any edges of the two polygons intersect
 */
function doEdgesIntersect(polygon1, polygon2) {
    const n1 = polygon1.length;
    const n2 = polygon2.length;

    // Check all edge pairs
    for (let i = 0; i < n1; i++) {
        const p1 = polygon1[i];
        const p2 = polygon1[(i + 1) % n1];

        for (let j = 0; j < n2; j++) {
            const p3 = polygon2[j];
            const p4 = polygon2[(j + 1) % n2];

            if (lineSegmentsIntersect(p1, p2, p3, p4)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if two line segments intersect using cross product method
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
    const d1 = direction(p3, p4, p1);
    const d2 = direction(p3, p4, p2);
    const d3 = direction(p1, p2, p3);
    const d4 = direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    // Check for collinear cases
    if (d1 === 0 && onSegment(p3, p4, p1)) return true;
    if (d2 === 0 && onSegment(p3, p4, p2)) return true;
    if (d3 === 0 && onSegment(p1, p2, p3)) return true;
    if (d4 === 0 && onSegment(p1, p2, p4)) return true;

    return false;
}

/**
 * Calculate direction using cross product
 */
function direction(p1, p2, p3) {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/**
 * Check if point p lies on segment (p1, p2)
 */
function onSegment(p1, p2, p) {
    return Math.min(p1.x, p2.x) <= p.x && p.x <= Math.max(p1.x, p2.x) &&
        Math.min(p1.y, p2.y) <= p.y && p.y <= Math.max(p1.y, p2.y);
}


/*
    insert(item)
    insertItem(item,uuid,selectTrNode)

    insert an item based on the current roomObj.unit scale.
    insertItem() is a wrapper for insertShapeItem.
    If no uuid is provided, one is created, event if there is an item.id uuid.
    selectTrNode means the inserted device will be selected and outlined in blue on insertion.
*/
function insertItem(item, uuid, selectTrNode) {
    let deviceId = item.data_deviceid;
    let parentGroup = allDeviceTypes[item.data_deviceid].parentGroup;
    let newUuid = uuid || '';
    let newSelectTrNode = selectTrNode || false;

    insertShapeItem(deviceId, parentGroup, item, newUuid, newSelectTrNode);

}

function insertShapeItem(deviceId, groupName, attrs, uuid = '', selectTrNode = false) {

    let hitStrokeWidth = 10; /* px:  allows the user to be close within X pixels to click on shape */

    /* each shape gets a unique uuid for tracking.  This UUID is also in the roomObj JSON and not recreated if it exists */
    if (uuid === '') {
        uuid = createUuid();
    }

    /* scale the attrs to fit grid */
    let pixelX = scale * attrs.x + pxOffset - activeRoomX * scale;
    let pixelY = scale * attrs.y + pyOffset - activeRoomY * scale;

    let insertDevice = {};
    let group;
    let width, height, rotation, data_zPosition, data_vHeight, data_slant, data_tilt;
    let abbrUnit = 'm';  /* abbreviated unit - will be m for meters, f for feet. Inserted in the shape rendering. */

    if (unit === 'feet') {
        abbrUnit = 'ft'
    }



    /*
        Check if deviceId is in group tables or stageFloors - which includes the wall, column, box or stageFloors
        if in tables/stageFloors break out of this and go to insertTable.
    */
    if (groupName === 'tables' || groupName === 'stageFloors' || groupName === 'boxes' || groupName === 'rooms') {
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

        for (const device of boxes) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupBoxes;
                break;
            }
        }

        for (const device of rooms) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupRooms;
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



    if (groupName === 'boxes') {
        for (const device of boxes) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupBoxes;
                break;
            }
        }
    }

    if (groupName === 'rooms') {
        for (const device of rooms) {
            if (device.id === deviceId) {
                insertDevice = device;
                group = groupRooms;
                break;
            }
        }
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

    let addHighlight = false;

    /* add circular highlight to any device smaller than sizeToAddOutline. Added after image obj is created */
    if (smallItemsHighlight && insertDevice.width < sizeToAddOultine && insertDevice.depth < sizeToAddOultine) {
        width = sizeToAddOultine / 1000 * scale;
        height = sizeToAddOultine / 1000 * scale;
        addHighlight = true;
    }

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

    if ('data_tilt' in attrs) {
        data_tilt = attrs.data_tilt;
    } else {
        data_tilt = "";
    }

    if ('data_slant' in attrs) {
        data_slant = attrs.data_slant;
    } else {
        data_slant = "";
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

        if (deviceId === 'display21_9') {
            width = (displayWidth21_9 / diagonalInches21_9) * data_diagonalInches / 1000 * scale * displayNumber;
        } else {
            width = (displayWidth / diagonalInches) * data_diagonalInches / 1000 * scale * displayNumber; /* height is displayDepth, which is constant regardless of diagnol inches */
        }

        if (deviceId.startsWith('displayScreen')) {
            height = allDeviceTypes['displayScreen'].depth / 1000 * scale;
        }
        else if (!deviceId.startsWith('roomKitEqx')) {
            height = displayDepth / 1000 * scale;  /* height is displayDepth, which is constant regardless of diagnol inches. roomKitEqx width is set in the videoDevices object */
        }



        if (unit === 'feet') {
            width = width * 3.28084;
            if (!deviceId.startsWith('roomKitEqx')) height = height * 3.28084;
        }


    }

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

        if ('data_tilt' in attrs && attrs.data_tilt != '') {
            imageItem.data_tilt = data_tilt;
        }

        if ('data_slant' in attrs && attrs.data_slant != '') {
            imageItem.data_slant = data_slant;
        }

        if ('data_labelField' in attrs && attrs.data_labelField.trim() !== '{}') {
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


        if ('data_mount' in attrs) {
            imageItem.data_mount = attrs.data_mount; /* data_mount.value & data_mount.index */
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



        imageItem.on('dragmove', function imageItemOnDragMove(e) {
            snapCenterToIncrement(imageItem);

            snapToGuideLines(e);


            updateShading(imageItem);


            /* in case the dragged item is not the tr.node, make it the tr.node */

            if (!tr.nodes().includes(e.target)) {
                tr.nodes([e.target]);
                enableCopyDelBtn();
                /* tables and other objects maybe resizable. */
                if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors || e.target.getParent() === groupBoxes || e.target.getParent() === groupRooms) {
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

            if (panScrollableOn || isSelectingTwoPointsOn || movingBackgroundImage || isWallBuilderOn || isWallWriterOn2 || isPolyBuilderOn) {
                e.evt.preventDefault();
                return;
            }

            updateShading(imageItem);
            clickedOnItemId = imageItem.id();
        });

        imageItem.on('mouseup touchend', function imageItemMouseUpTouchend(e) {

            clickedOnItemId = '';
        });

        imageItem.on('transform', function imageItemOnTrasform() {

            updateShading(imageItem);
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

        /* on insert and refresh of the page, make sure person is over the chair. */
        if (imageItem.data_deviceid.startsWith('person')) {
            imageItem.moveToTop();
        }

        if (imageItem.data_deviceid.startsWith('chair') || imageItem.data_deviceid.startsWith('plant') || imageItem.data_deviceid.startsWith('door') || imageItem.data_deviceid.startsWith('pouf')) {
            imageItem.zIndex(0);
        }

        if (allDeviceTypes[imageItem.data_deviceid].parentGroup === 'videoDevices') {
            if (imageItem.data_deviceid.startsWith('ptz')) {
                imageItem.moveToTop();
            } else {
                imageItem.zIndex(0);
            }
        }

        /* only add labels to Video Devices and Microphones, or devices that have labels */
        if (groupName === 'videoDevices' || groupName === 'microphones' || 'data_labelField' in attrs) {

            if ((groupName === 'videoDevices' || groupName === 'microphones') && (deviceId != 'laptop')) {
                addLabel(imageItem, attrs, true);
            }
            else if (attrs.data_labelField) {
                addLabel(imageItem, attrs);
            }

        }


    };


    if (addHighlight) {
        createHighlightImage(deviceId, imageObj);
    } else {
        imageObj.src = './assets/images/' + insertDevice.topImage;
    }

    /* add coverage for cameras */
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
        if ('data_role' in attrs && attrs.data_role && (attrs.data_role.value.startsWith('extended_reach') || attrs.data_role.value.startsWith('presentertrack') || attrs.data_role.value === 'virtualLens')) {
            insertDevice = { ...insertDevice, ...insertDevice[attrs.data_role.value] };
            teleAngle = insertDevice[attrs.data_role.value].teleHorizontalFOV;
        }

        let onePersonCrop = defaultOnePersonCrop;
        let twoPersonCrop = defaultTwoPersonCrop;

        if (unit == 'feet') {
            /*  feet  */
            twoPersonCrop = twoPersonCrop * 3.28084;
            onePersonCrop = onePersonCrop * 3.28084;
        }


        let onePersonDistance = (insertDevice.onePersonDistance * (roomObj.unit === 'feet' ? 3.28084 : 1)) || getDistanceA(insertDevice.teleHorizontalFOV / 2, onePersonCrop / 2) * insertDevice.onePersonZoom;

        let twoPersonDistance = (insertDevice.twoPersonDistance * (roomObj.unit === 'feet' ? 3.28084 : 1)) || getDistanceA(insertDevice.teleHorizontalFOV / 2, twoPersonCrop / 2) * insertDevice.twoPersonZoom;

        let gradientRatio = onePersonDistance / twoPersonDistance;

        let gradientStop1 = gradientRatio * 0.9;

        let gradientStop2 = gradientRatio * 1.1;

        let onePersonCropColor = "#8FBC8B";
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

        /* multiLens shows multiple lens ranges on the outside for Room Bar Pro and Board Pros*/
        if ('multiLensReach' in insertDevice) {

            insertDevice.multiLensReach.forEach((lensReach, index) => {

                let gradientRatio = lensReach.onePersonDistance / lensReach.twoPersonDistance;

                let gradientStop1 = gradientRatio * 0.9;

                let gradientStop2 = gradientRatio * 1.1;

                let twoPersonDistMultiLens = lensReach.twoPersonDistance * scale * (roomObj.unit === 'feet' ? 3.28084 : 1)

                let teleMultiTwoPersonFOV = new Konva.Wedge({
                    /* x and y should be tracked in the group only */
                    opacity: 0.55,
                    radius: twoPersonDistMultiLens,
                    angle: lensReach.teleAngle,
                    stroke: '#8989894D',
                    strokeWidth: 0.5,
                    name: 'singleMutliLensTeleFOV-' + index + '-' + deviceId + '-' + groupName,
                    rotation: lensReach.rotation,
                    listening: false,
                    perfectDrawEnabled: perfectDrawEnabled,
                    fillRadialGradientStartPoint: { x: 0, y: 0 },
                    fillRadialGradientStartRadius: 0,
                    fillRadialGradientEndPoint: { x: 0, y: 0 },
                    fillRadialGradientEndRadius: twoPersonDistMultiLens,
                    fillRadialGradientColorStops: [0, onePersonCropColor, gradientStop1, onePersonCropColor, gradientStop2, twoPersonCropColor, 1, twoPersonCropColor + '64'],
                });

                groupFov.add(teleMultiTwoPersonFOV.clone());

            })
        };


        /* make the ptz4k more closely match hte Workspace Designer limit, and only show green */
        if ((deviceId.startsWith('ptz')) && onePersonDistance === 0) {
            teleTwoPersonFOV.fillRadialGradientColorStops([0, onePersonCropColor, gradientStop2, onePersonCropColor, 1, onePersonCropColor + '64'])
            wideFOV.radius(twoPersonDistance * scale * 1.3 * 2);

        }


        if (!(deviceId.startsWith('ptz'))) {
            groupFov.add(txtOnePersonFov);
            groupFov.add(txtTwoPersonFov);
        }

        groupFov.add(teleOnePersonFOV);
        groupFov.add(wideFOV);
        groupFov.add(teleTwoPersonFOV);
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

        let audioShadingLine = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: micRadius,
            angle: insertDevice.micDeg,
            name: 'audio-' + deviceId + '-' + groupName,
            rotation: 90 - insertDevice.micDeg / 2,
            opacity: 0.3,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
            opacity: 0.3,
            stroke: '#00000080',
            strokeWidth: 1,
        });

        /* audioShadingLine & audioShadingShade combine to form the coverage */
        let audioShadingShade = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: micRadius * 1.2,
            angle: insertDevice.micDeg,
            stroke: '',
            strokeWidth: 3,
            name: 'audio-' + deviceId + '-' + groupName,
            rotation: 90 - insertDevice.micDeg / 2,
            opacity: 0.3,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
            opacity: 0.3,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint: { x: 0, y: 0 },
            fillRadialGradientEndRadius: micRadius * 1.2,
            fillRadialGradientColorStops: [0, 'purple', 0.6, '#800080EE', 0.8, '#80008088', 1, '#80008000'],
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

        groupAudioShading.add(audioShadingLine);
        groupAudioShading.add(audioShadingShade);
        groupAudioShading.add(txtAudio);
        grShadingMicrophone.add(groupAudioShading);
    }

    if ('speakerRadius' in insertDevice && 'speakerDeg' in insertDevice) {

        let groupSpeakerCoverage = new Konva.Group({
            id: 'speaker~' + uuid,
            x: pixelX,
            y: pixelY,
            listening: false,
            rotation: 0,
            name: 'shading_group',
        })

        if (attrs.data_speakerHidden) {
            groupSpeakerCoverage.visible(false);
        } else {
            groupSpeakerCoverage.visible(true);
        }

        let speakerRadius = insertDevice.speakerRadius / 1000 * scale;

        let lblSpeakerRadius = insertDevice.speakerRadius / 1000;

        if (unit === 'feet') {
            speakerRadius = speakerRadius * 3.28084;
            lblSpeakerRadius = lblSpeakerRadius * 3.28084;
        }

        let speakerShadingLine = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: speakerRadius,
            angle: insertDevice.speakerDeg,
            name: 'speaker-' + deviceId + '-' + groupName,
            rotation: 90 - insertDevice.speakerDeg / 2,
            opacity: 0.3,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
            opacity: 0.3,
            stroke: '#96969680',
            strokeWidth: 1,
        });

        /* audioShadingLine & audioShadingShade combine to form the coverage */
        let speakerShadingShade = new Konva.Wedge({
            /* x and y should be tracked in the group only */
            radius: speakerRadius * 1.2,
            angle: insertDevice.speakerDeg,
            stroke: '',
            strokeWidth: 3,
            name: 'speaker-' + deviceId + '-' + groupName,
            rotation: 90 - insertDevice.speakerDeg / 2,
            opacity: 0.3,
            listening: false,
            perfectDrawEnabled: perfectDrawEnabled,
            opacity: 0.3,
            fillRadialGradientStartPoint: { x: 0, y: 0 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndPoint: { x: 0, y: 0 },
            fillRadialGradientEndRadius: speakerRadius * 1.2,
            fillRadialGradientColorStops: [0, 'blue', 0.6, '#001c80ee', 0.8, '#02629da8', 1, 'rgba(36, 0, 128, 0)'],
        });


        let txtSpeaker = new Konva.Text({
            x: -1000,
            y: speakerRadius - 10,
            width: 2000,
            text: lblSpeakerRadius.toFixed(1) + ' ' + abbrUnit + ' from mic',
            fontSize: 12,
            fill: 'purple',
            padding: 3,
            align: 'center',
        });

        groupSpeakerCoverage.add(speakerShadingLine);
        groupSpeakerCoverage.add(speakerShadingShade);
        // groupSpeakerCoverage.add(txtSpeaker);
        grShadingSpeaker.add(groupSpeakerCoverage);
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
        let distance1unit = diagonalUnit;
        let xc2 = diagonalUnit * scale * widthRatio;

        if (deviceId === 'display21_9') {
            distance1 = distance1 * 1.07 / 1.33;
            distance1unit = distance1unit * 1.07 / 1.33;
        }

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
            text: 'Ideal closest participant to display: ' + distance1unit.toFixed(1) + ' ' + abbrUnit,
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
            text: 'Ideal farthest participant from display: ' + (distance1unit * 3).toFixed(1) + ' ' + abbrUnit,
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
            text: 'Max farthest participant from display: ' + (distance1unit * 4).toFixed(1) + ' ' + abbrUnit,
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
        //       imageDataUrl = groupItemDisplayDistance.toDataURL();
        grDisplayDistance.add(groupItemDisplayDistance);
    }



}

function updateLabel(node, attrs) {
    let label = stage.findOne('#label~' + node.id())
    let text;
    let textCandidate = '';

    node.data_labelField = attrs.data_labelField;

    if ('data_labelField' in attrs) {
        textCandidate = attrs.data_labelField.replace(/{.*?}/g, '');
        if (textCandidate) {
            text = textCandidate;
        }
    }

    if (label && (textCandidate.trim() === '' || textCandidate.trim() === '{}')) {
        label.destroy();
    } else if (label && textCandidate) {

        let children = label.getChildren();


        children.forEach(child => {
            if (child instanceof Konva.Text) {
                child.text(text);
            }
        });


    } else if (textCandidate) {
        addLabel(node, attrs);
    }

}


function addLabel(node, attrs, alwaysLabel = false) {
    let text = node.name();
    let textCandidate = '';

    if ('data_labelField' in attrs) {
        textCandidate = attrs.data_labelField.replace(/{.*?}/g, '');
        if (textCandidate) {
            text = textCandidate;
        }
    }

    if (textCandidate === '' && !alwaysLabel) return

    let fontSize = 10;

    let boundingBox = node.getClientRect();
    let center = getNodeCenter(node);
    let bottomY = center.y + boundingBox.height / 2 * (100 / zoomValue);
    let centerX = center.x;

    const labelTip = new Konva.Label({
        x: centerX,
        y: bottomY,
        opacity: 0.85,
        id: 'label~' + node.id(),
        name: 'labelText',
        listening: false,
    });

    labelTip.add(
        new Konva.Tag({
            fill: 'black',
            stroke: 'darkgrey',
            strokeWidth: 0.5,
            pointerDirection: 'up',
            pointerWidth: 10,
            pointerHeight: 10,
            lineJoin: 'round',
            shadowColor: 'black',
            shadowBlur: 7,
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            shadowOpacity: 0.5,
            cornerRadius: 2,
        })
    );

    labelTip.add(
        new Konva.Text({
            text: text,
            fontSize: fontSize,
            padding: 5,
            fill: 'white'
        })
    );

    grLabels.add(labelTip);

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
            let pixelXY = getNodeCenter(node);

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

/* were can we snap our objects? If resize = true, ignore center */
function getLineGuideStops(skipShape, resize = false) {
    /* we can snap to stage borders and the center of the stage */

    let outerWall = stage.find("#cOuterWall")[0];
    let outerBox = outerWall.getClientRect();
    let outsideBox;
    let vertical = [outerBox.x, outerBox.x + outerBox.width / 2, outerBox.x + outerBox.width];
    let horizontal = [outerBox.y, outerBox.y + outerBox.height / 2, outerBox.y + outerBox.height];

    /* remove center items*/
    if (resize) {
        vertical.splice(1, 1);
        horizontal.splice(1, 1);
    }


    let outsideWall = stage.find("#outsideWall")[0];
    if (outsideWall) {
        outsideBox = outsideWall.getClientRect();
        if (resize) {
            vertical.push([outsideBox.x, outsideBox.x + outsideBox.width]);
            horizontal.push([outsideBox.y, outsideBox.y + outsideBox.height])
        } else {
            vertical.push([outsideBox.x, outsideBox.x + outsideBox.width / 2, outsideBox.x + outsideBox.width]);
            horizontal.push([outsideBox.y, outsideBox.y + outsideBox.height / 2, outsideBox.y + outsideBox.height]);
        }
    }



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
        /* and we can snap to all edges of shapes. If resize equals true, don't grab center values */
        if (resize) {
            vertical.push([box.x, box.x + box.width]);
            horizontal.push([box.y, box.y + box.height]);
        } else {
            vertical.push([box.x, box.x + box.width / 2, box.x + box.width]);
            horizontal.push([box.y, box.y + box.height / 2, box.y + box.height]);
        }

    });


    return {
        vertical: vertical.flat(),
        horizontal: horizontal.flat(),
    };
}



/* what points of the object will trigger to snapping?
 If it is resize, igonore center of objects.  */
function getObjectSnappingEdges(node, resize = false) {
    let box = node.getClientRect();
    let absPos = node.absolutePosition();
    let objectSnap = {}


    objectSnap.vertical = [
        {
            guide: round(box.x),
            offset: round(absPos.x - box.x),
            snap: 'start',
        },
        {
            guide: round(box.x + box.width),
            offset: round(absPos.x - box.x - box.width),
            snap: 'end',
        },
    ];

    objectSnap.horizontal = [
        {
            guide: round(box.y),
            offset: round(absPos.y - box.y),
            snap: 'start',
        },
        {
            guide: round(box.y + box.height),
            offset: round(absPos.y - box.y - box.height),
            snap: 'end',
        },
    ];

    if (!resize) {

        objectSnap.vertical[2] = {

            guide: Math.round(box.x + box.width / 2),
            offset: Math.round(absPos.x - box.x - box.width / 2),
            snap: 'center',

        };

        objectSnap.horizontal[2] = {
            guide: Math.round(box.y + box.height / 2),
            offset: Math.round(absPos.y - box.y - box.height / 2),
            snap: 'center',
        };
    }

    return objectSnap;
}

/* find all snapping possibilities */
function getGuides(lineGuideStops, itemBounds) {
    // console.log('lineGuideStops', JSON.stringify(lineGuideStops, null, 5));
    // console.log('itemBounds', JSON.stringify(itemBounds, null, 5 ));
    let resultV = [];
    let resultH = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
        itemBounds.vertical.forEach((itemBound) => {
            let diff = Math.abs(lineGuide - itemBound.guide);
            /* if the distance between guild line and object snap point is close we can consider this for snapping */
            if (diff < GUIDELINE_OFFSET && !itemBound.ignore) {
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
            if (diff < GUIDELINE_OFFSET && !itemBound.ignore) {
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


function snapToGuideLinesResize(moved) {
    let original = lastSelectedNodePosition;
    if (snapGuidesDrawn && moved.rotation() === 0) {
        // lastSelectedNodePosition.height(lastSelectedNodePosition.y() + guides[0].lineGuide + 300);
        // e.target.height(Math.abs(lastSelectedNodePosition.y() - guides[0].lineGuide));
        // e.target.y(lastSelectedNodePosition.y());
        updateFormatDetails(e.target.id());
    }
}

function snapToGuideLines(e, resize = false) {

    if (!document.getElementById('snapGuidelinesCheckBox').checked) return; /* bail out if snap to guidelines not turned on */

    if (tr.nodes().length != 1) return;  /* only work if one node */

    layerTransform.find('.guide-line').forEach((l) => l.destroy());

    /* find possible snapping lines */
    let lineGuideStops = getLineGuideStops(e.target, resize);

    // drawSnapGuides(guides);

    let absPos = e.target.absolutePosition();
    if (resize === true) {
        return;
        let original = lastSelectedNodePosition;
        let moved = e.target;
        /* make sure it is a resize transformation and not a rotation, and is 0, 90, 180, 270 */
        if (Math.round(original.rotation() * 10) === Math.round(moved.rotation() * 10) && (moved.rotation() % 90) === 0) {

            /* find snapping points of current object .guide, .offset, .snap: start & end */
            let itemBounds = getObjectSnappingEdges(e.target, resize);
            let cf = 0.01; /* ccoefficient factor */


            let itemOriginalBounds = getObjectSnappingEdges(original, resize);
            // console.log('itemBounds', JSON.stringify(itemBounds));
            // console.log('itemOrigin', JSON.stringify(itemOriginalBounds));

            if (!itemOriginalBounds) return;
            if (!itemBounds) return;



            // console.log('1', Math.abs(itemBounds.vertical[1].guide - itemOriginalBounds.vertical[1].guide));
            //  console.log('0', Math.abs(itemBounds.vertical[0].guide - itemOriginalBounds.vertical[0].guide));
            if (Math.abs(itemBounds.vertical[1].guide - itemOriginalBounds.vertical[1].guide) > Math.abs(itemBounds.vertical[0].guide - itemOriginalBounds.vertical[0].guide)) {
                itemBounds.vertical[0].ignore = true;

            } else {
                itemBounds.vertical[1].ignore = true;
            }

            if (Math.abs(itemBounds.horizontal[1].guide - itemOriginalBounds.horizontal[1].guide) > Math.abs(itemBounds.horizontal[0].guide - itemOriginalBounds.horizontal[0].guide)) {
                itemBounds.horizontal[0].ignore = true;
            } else {
                itemBounds.horizontal[1].ignore = true;
            }


            /* now find where can we snap current object */
            let guides = getGuides(lineGuideStops, itemBounds);

            /* do nothing of no snapping */
            if (!guides.length) {
                return;
            }

            // console.log('original', original.id(), original.x(), original.y(), original.width(), original.height());
            // console.log('moved', moved.id(), moved.x(), moved.y(), moved.width(), moved.height());
            // console.log('guides', JSON.stringify(guides));

            /* only show vertical guides */
            if (Math.round(original.width() * 1000) === Math.round(moved.width() * 1000) && ((moved.rotation() % 180) === 0)) {
                let snapGuidesDrawn = drawSnapGuides(guides, 'H');
                lastSelectionGuideLines.type = 'H';
                lastSelectionGuideLines.guides = guides;

                console.log('H');


            }
            else {
                drawSnapGuides(guides, 'V');

            }
        }

    } else {

        /* find snapping points of current object */
        let itemBounds = getObjectSnappingEdges(e.target, resize);

        /* now find where can we snap current object */
        let guides = getGuides(lineGuideStops, itemBounds);

        /* do nothing of no snapping */
        if (!guides.length) {
            return;
        }
        drawSnapGuides(guides);

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

}

function drawSnapGuides(guides, direction = 'both') {
    let snapGuidesDrawn = false;
    guides.forEach((lg) => {
        if (lg.orientation === 'H' && (direction === 'both' || direction === 'H')) {
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
            snapGuidesDrawn = true;
        } else if (lg.orientation === 'V' && (direction === 'both' || direction === 'V')) {
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
            snapGuidesDrawn = true;
        }
    });

    return snapGuidesDrawn;
}

function defaultUnitChange(e) {
    if (e.srcElement.checked) {
        setItemForLocalStorage('useDefaultUnitCheckBox', 'true');
    } else {
        setItemForLocalStorage('useDefaultUnitCheckBox', 'false');
    }
    saveToUndoArray();
}

function showNonWorkspaceItems(e) {
    if (e.srcElement.checked) {
        setItemForLocalStorage('useNonWorkspaceItems', 'true');
    } else {
        setItemForLocalStorage('useNonWorkspaceItems', 'false');
    }
    createEquipmentMenu();
}

function showTiltSlant(e) {
    if (e.srcElement.checked) {
        setItemForLocalStorage('showTiltSlant', 'true');
    } else {
        setItemForLocalStorage('showTiltSlant', 'false');
    }

    updateFormatDetailsUpdate();
}

function convertDefaultWallsOff(e) {
    if (e.srcElement.checked) {
        setItemForLocalStorage('convertDefaultWallsOff', 'true');
    } else {
        setItemForLocalStorage('convertDefaultWallsOff', 'false');
    }
}

function updateRemoveDefaultWallsCheckBox() {
    document.getElementById('removeDefaultWallsCheckBox').checked = roomObj.workspace.removeDefaultWalls;
    document.getElementById('removeDefaultWallsCheckBox2').checked = roomObj.workspace.removeDefaultWalls;

    document.getElementById('addCeilingCheckBox').checked = roomObj.workspace.addCeiling;

    if (roomObj.workspace.theme === 'christmas') {
        document.getElementById('changeThemeCheckBox').checked = true;
    } else {
        document.getElementById('changeThemeCheckBox').checked = false;
    }

    if (roomObj.workspace.removeDefaultWalls === false) {
        document.getElementById('addCeilingCheckBox').checked = true;
        //  roomObj.workspace.addCeiling = true;
        //  document.getElementById('addCeilingCheckBox').disabled = true;
        document.getElementById('addCeilingDiv').style.display = 'none';
        document.getElementById('addCeilingAutoDiv').style.display = '';
        document.getElementById('defaultWallSettings').style.display = "";

    } else {
        document.getElementById('addCeilingCheckBox').disabled = false;
        //    document.getElementById('addCeilingCheckBox').checked = roomObj.workspace.addCeiling;
        document.getElementById('defaultWallSettings').style.display = "none";
        document.getElementById('addCeilingDiv').style.display = '';
        document.getElementById('addCeilingAutoDiv').style.display = 'none';
    }

}

function removeDefaultWallsChange(e) {
    if (e.srcElement.checked) {
        roomObj.workspace.removeDefaultWalls = true;
    } else {
        roomObj.workspace.removeDefaultWalls = false;
    }

    updateRemoveDefaultWallsCheckBox();

    zoomInOut('reset');
    drawRoom(true, true, false);


    // saveToUndoArray();
}


function btnWallSelected(wallSelected) {
    // setDefaultWallsMenu(wallSelected);
    // updateBtnWallUpateMenu(wallSelected);
    currentDefaultWall = wallSelected;

    updateDefaultWallsMenu(wallSelected);

}

function updateBtnWallUpateMenu(wallSelected) {
    ['leftwall', 'rightwall', 'videowall', 'backwall'].forEach(wall => {
        let buttonWall = document.getElementById(wall);
        let wallButtonSelected = 'wallButtonSelected';
        if (wall === wallSelected) {
            buttonWall.classList.add(wallButtonSelected);
        } else {
            buttonWall.classList.remove(wallButtonSelected);
        }

    });
}


function updateDefaultWallsMenuAndCanvas() {

    let wall = currentDefaultWall;
    let wallType = document.getElementById('drpWallType').value;
    let accousticTreatment = document.getElementById('acousticTreatment').checked;

    roomObj.roomSurfaces[wall].type = wallType;
    roomObj.roomSurfaces[wall].acousticTreatment = accousticTreatment;

    if (wallType === 'window') {
        delete roomObj.roomSurfaces[wall].door;
    } else {
        //      roomObj.roomSurfaces[wall].door = defaultWallDoor || 'none';

    }

    canvasToJson();

    updateDefaultWallTypeOnCanvas(wall);
    insertDefaultDoorsOnCanvas();
    updateDefaultWallsMenu(wall);


}

/* roomSurfaces = leftwall, rightwall, videowall or backwall */
function updateDefaultWallsMenu(event) {

    let wall;
    let rotateSelectionDiv = 0;
    let doorSelectionDiv = document.getElementById('doorSelectionDiv');
    let doorNoneDiv = document.getElementById('doorNone');
    if (typeof event === 'string') {
        wall = event;
    }
    else {
        wall = event.target.value;
    }

    currentDefaultWall = wall;
    document.getElementById('drpWallType').value = roomObj.roomSurfaces[wall].type;
    document.getElementById('acousticTreatment').checked = roomObj.roomSurfaces[wall].acousticTreatment;

    if (wall === 'backwall') {
        rotateSelectionDiv = 0;
    }
    else if (wall === 'rightwall') {
        rotateSelectionDiv = 90;
    } else if (wall === 'videowall') {
        rotateSelectionDiv = 180;
    } else if (wall === 'leftwall') {
        rotateSelectionDiv = 270;
    }

    doorSelectionDiv.style.transform = `rotate(-${rotateSelectionDiv}deg)`;
    doorNoneDiv.style.transform = `rotate(${rotateSelectionDiv}deg)`;

    if (roomObj.roomSurfaces[wall].type === 'window') {

        document.getElementById('pickDoorSelection').style.display = 'none';
        document.getElementById('noDoorSelectionDiv').style.display = '';
    } else {
        document.getElementById('pickDoorSelection').style.display = '';
        document.getElementById('noDoorSelectionDiv').style.display = 'none';
        ///  document.getElementById('drpDefaultWallDoor').value = roomObj.roomSurfaces[wall].door || 'none';
    }


    //  btnWallSelected(wall);

    updateBtnWallUpateMenu(wall);


    showSelectedWallDoorMenu(roomObj.roomSurfaces[wall].door || 'none');


}

function doorSelected(door) {
    if (door === 'none') {
        delete roomObj.roomSurfaces[currentDefaultWall].door;
    } else {
        roomObj.roomSurfaces[currentDefaultWall].door = door;
    }

    updateDefaultWallsMenuAndCanvas();

}

function showSelectedWallDoorMenu(doorLocation) {


    ['leftDoor', 'rightDoor', 'centerDoor'].forEach(door => {

        let location = door.replace('Door', '');
        if (location === doorLocation) {
            document.getElementById(door).classList.add('doorSelected');

        } else {
            document.getElementById(door).classList.remove('doorSelected');
        }

    })

    if (doorLocation === 'none') {
        document.getElementById('doorNone').classList.add('noDoorSelected');
    }
    else {
        document.getElementById('doorNone').classList.remove('noDoorSelected');
    }


}


function updateDefaultWallTypeOnCanvas(defaultWallName) {
    let defaultWall = stage.findOne('.' + defaultWallName);
    let xOffset = 8; /* default for leftwall */
    let yOffset = 0;


    if (!defaultWall) {
        console.info('Default wall name not found', defaultWallName);
        return;
    }


    let type = roomObj.roomSurfaces[defaultWall.name()].type;

    if (type === 'regular') {
        defaultWall.fill('#cccccc');
    }
    else if (type === 'glass') {
        defaultWall.fill('lightblue');
    } else if (type === 'window') {
        defaultWall.fill('');
        const windowBackgroundObj = new Image();

        windowBackgroundObj.onload = function windowBackgroundObjOnload() {
            defaultWall.fillPatternImage(windowBackgroundObj);
            defaultWall.fillPatternRepeat('repeat');

            defaultWall.fillPatternOffset({ x: xOffset, y: yOffset });
        };
        windowBackgroundObj.src = './assets/images/wallWindowBackground.png';
    }


}

function insertDefaultDoorsOnCanvas() {
    /* first delete all existing doors, then create */

    let imageOffset;
    let leftRightOffset = 1.47 * scale;

    let doorWidth = allDeviceTypes['doorLeft'].width / 1000 * scale;
    let doorDepth = allDeviceTypes['doorLeft'].depth / 1000 * scale;
    let wallWidth = 0.11 * scale;

    if (roomObj.unit === 'meters') {
        imageOffset = imageOffset / 3.28084;
        leftRightOffset = leftRightOffset / 3.28084;
    } else {
        doorWidth = doorWidth * 3.28084;
        doorDepth = doorDepth * 3.28084;
        wallWidth = wallWidth * 3.28084;
    }

    imageOffset = doorDepth;

    let groupOuterWall = stage.findOne('#groupOuterWall');

    let existingDoors = stage.find('.defaultDoorFamily');
    /* destroy existing doors */
    for (let i = existingDoors.length - 1; i >= 0; i--) {
        existingDoors[i].x(-200);
        existingDoors[i].y(-200);
        existingDoors[i].hide();
        existingDoors[i].destroy();
    }

    ['leftwall', 'rightwall', 'videowall', 'backwall'].forEach(wallType => {
        let doorRightImg = 'doorRight-top.png';
        let doorLeftImg = 'doorLeft-top.png';
        let x, y;

        let img = doorRightImg;

        if (roomObj.roomSurfaces[wallType].door && roomObj.roomSurfaces[wallType].door != 'none') {
            let rotation = 0;
            let door = roomObj.roomSurfaces[wallType].door;


            if (wallType === 'leftwall') {
                rotation = 90;
                x = pxOffset + imageOffset - wallWidth;

                if (door === 'left') {
                    y = pyOffset + (roomLength * scale) - leftRightOffset - doorWidth;
                }
                else if (door === 'right') {
                    img = doorLeftImg;
                    y = pyOffset + leftRightOffset;
                }
                else {
                    img = doorLeftImg;
                    y = pyOffset + - doorWidth / 2 + (roomLength * scale) / 2;
                }

            }
            else if (wallType === 'rightwall') {
                rotation = 270;
                x = pxOffset + (roomWidth * scale) - imageOffset + wallWidth;

                if (door === 'left') {
                    y = pyOffset + leftRightOffset + doorWidth;
                }
                else if (door === 'right') {
                    img = doorLeftImg;
                    y = pyOffset + (roomLength * scale) - leftRightOffset;
                }
                else {
                    img = doorLeftImg;
                    y = pyOffset + doorWidth / 2 + (roomLength * scale) / 2;
                }
            }
            else if (wallType === 'videowall') {
                rotation = 180;
                y = pyOffset + doorDepth - wallWidth;

                if (door === 'left') {
                    x = pxOffset + leftRightOffset - wallWidth + doorWidth;
                }
                else if (door === 'right') {
                    img = doorLeftImg;
                    x = pxOffset + (roomWidth * scale) - leftRightOffset + wallWidth;
                }
                else {
                    img = doorLeftImg;
                    x = pxOffset + doorWidth / 2 + (roomWidth * scale) / 2;
                }

            }
            else if (wallType === 'backwall') {
                rotation = 0;
                y = pyOffset + (roomLength * scale) - doorDepth + wallWidth;

                if (door === 'left') {
                    x = pxOffset + (roomWidth * scale) - leftRightOffset - doorWidth + wallWidth;
                }
                else if (door === 'right') {
                    img = doorLeftImg;
                    x = pxOffset + leftRightOffset - wallWidth;
                }
                else {
                    img = doorLeftImg;
                    x = pxOffset + - doorWidth / 2 + (roomWidth * scale) / 2;
                }

            }


            let imageObj = new Image();
            imageObj.onload = function () {
                const doorShape = new Konva.Image({
                    x: x,
                    y: y,
                    image: imageObj,
                    width: doorWidth,
                    height: doorDepth,
                    id: 'defaultDoor-' + wallType + '-' + door,
                    rotation: rotation,
                    name: 'defaultDoorFamily',
                    opacity: 0.5,
                    listening: false,
                });

                groupOuterWall.add(doorShape);
            };

            imageObj.src = `./assets/images/${img}`;


        }





    });



}

// addCeilingChange

function addCeilingChange(e) {
    if (e.srcElement.checked) {
        roomObj.workspace.addCeiling = true;
    } else {
        roomObj.workspace.addCeiling = false;
    }
    saveToUndoArray();
}

function changeTheme(e) {
    if (e.srcElement.checked) {
        roomObj.workspace.theme = 'christmas';
    } else {
        roomObj.workspace.theme = 'standard';
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

function snapRotationOffChange(e) {

    if (e.srcElement.checked) {
        setItemForLocalStorage('snapRotationOffCheckBox', 'true');
        tr.rotationSnaps([]);
    } else {
        setItemForLocalStorage('snapRotationOffCheckBox', 'false');
        tr.rotationSnaps([0, 45, 90, 135, 180, 225, 270, 315, 360]);
    }
}

function updateSnapToIncrement() {
    let snapIncrement = document.getElementById('snapToIncrement').value;
    if (snapIncrement < 0.02 || (snapIncrement > roomObj.room.roomWidth / 2)) {
        snapIncrement = 0.25;
    }
    setItemForLocalStorage('snapToIncrement', snapIncrement);
}

function moveLabel(imageItem, labelTip) {
    let boundingBox = imageItem.getClientRect();
    let center = getNodeCenter(imageItem);
    let bottomY = center.y + boundingBox.height / 2 * (100 / zoomValue);
    let centerX = center.x;

    labelTip.x(centerX);
    labelTip.y(bottomY);
}

function updateShading(node) {


    let uuid = node.id();
    let fovShading = stage.find(`#fov~${uuid}`);
    let audioShading = stage.find(`#audio~${uuid}`);
    let dispDistShading = stage.find(`#dispDist~${uuid}`);
    let speakerShading = stage.find(`#speaker~${uuid}`);

    let textLabel = stage.find(`#label~${uuid}`);

    if (fovShading.length === 1) {
        moveShading(node, fovShading[0]);
    }

    if (audioShading.length === 1) {
        moveShading(node, audioShading[0]);
    }

    if (dispDistShading.length === 1) {
        moveShading(node, dispDistShading[0]);
    }

    if (speakerShading.length === 1) {
        moveShading(node, speakerShading[0]);
    }

    if (textLabel.length > 0) {
        moveLabel(node, textLabel[0])
    }





    function moveShading(imageItem, shadingItem) {

        let center = getNodeCenter(imageItem);
        let centerY = center.y;
        let centerX = center.x;

        /* determine the imageItemHeight ignoring the Highlight image created */
        let imageItemHeight = allDeviceTypes[imageItem.data_deviceid].depth / 1000 * scale * ((roomObj.unit === 'feet') ? 3.28084 : 1)

        if (imageItem.data_deviceid === 'ceilingMic') {
            centerX = (imageItemHeight / 2) * (Math.sin(imageItem.rotation() * Math.PI / 180)) + center.x;
            centerY = (imageItemHeight / 2) * -(Math.cos(imageItem.rotation() * Math.PI / 180)) + center.y;
        }

        if ('cameraShadeOffSet' in allDeviceTypes[imageItem.data_deviceid]) {

            let cameraShadeOffset = allDeviceTypes[imageItem.data_deviceid].cameraShadeOffSet / 1000 * scale;

            if (unit === 'feet') {
                cameraShadeOffset = cameraShadeOffset * 3.28084;
            }

            centerX = ((imageItemHeight / 2) - cameraShadeOffset) * -(Math.sin(imageItem.rotation() * Math.PI / 180)) + center.x;
            centerY = ((imageItemHeight / 2) - cameraShadeOffset) * (Math.cos(imageItem.rotation() * Math.PI / 180)) + center.y;

        }

        shadingItem.rotation(imageItem.rotation());

        shadingItem.x(centerX);
        shadingItem.y(centerY);

    }

}


/* Get center of a shape from upper left x, upper right y cooridnate. A shape comes from Canvas / Konva.js */
function getNodeCenter(node) {

    return {

        x:
            node.x()
            + (node.width() / 2) * Math.cos(Math.PI / 180 * node.rotation())
            + (node.height() / 2) * Math.sin(Math.PI / 180 * (-node.rotation())),
        y:
            node.y() +
            (node.height() / 2) * Math.cos(Math.PI / 180 * node.rotation()) +
            (node.width() / 2) * Math.sin(Math.PI / 180 * node.rotation())
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
function enableCopyDelBtn() {

    let divItemDetailsVisible = document.getElementById('itemDetailsVisible');
    let txtItemsDetailNote = document.getElementById('txtItemsDetailNote');
    let multiItemsVisible = document.getElementById('multiItemDetailsVisible');

    divItemDetailsVisible.style.display = 'none';
    txtItemsDetailNote.style.display = 'none';
    multiItemsVisible.style.display = 'none';

    if (tr.nodes().length > 0) {
        document.getElementById('btnDuplicate').disabled = false;
        document.getElementById('btnDelete').disabled = false;

    }
    else {
        document.getElementById('btnDuplicate').disabled = true;
        document.getElementById('btnDelete').disabled = true;
        multiUpdateMode = false;

    }

    if (tr.nodes().length === 1) {
        divItemDetailsVisible.style.display = '';
        txtItemsDetailNote.style.display = 'none';
        multiItemsVisible.style.display = 'none';

        multiUpdateMode = false
        updateFormatDetails(tr.nodes()[0].id());



    } else if (tr.nodes().length > 1) {

        multiUpdateMode = true;

        divItemDetailsVisible.style.display = 'none';
        txtItemsDetailNote.style.display = 'none';
        multiItemsVisible.style.display = '';

        document.getElementById('multiItemDetailsVisible').style.display = '';


        document.getElementById("tabItem").click();
        document.getElementById("subTabItemDetails").click();

        setDefaultBlankElements();


    }
    else {

        divItemDetailsVisible.style.display = 'none';
        txtItemsDetailNote.style.display = '';
        divItemDetailsVisible.style.display = 'none';

        multiUpdateMode = false;
    }


    updateTrNodesShadingTimer();
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
    let authorVersion = DOMPurify.sanitize(document.getElementById('authorVersion').value).trim();
    let drpSoftware = document.getElementById('drpSoftware').value;

    if (roomHeight != 0 || roomHeight != '') {
        roomObj.room.roomHeight = Number(roomHeight);
        defaultWallHeight = roomObj.room.roomHeight;
    }



    roomObj.authorVersion = authorVersion;


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

function populateMountFromUrl(newItem, place = -1) {
    let index = Number(place) + 1; /* by default index = 0 is the default, */

    videoDevices.forEach(indexToMount);
    chairs.forEach(indexToMount);
    displays.forEach(indexToMount);
    microphones.forEach(indexToMount);

    function indexToMount(device) {
        if (newItem.data_deviceid === device.id) {
            if ('mounts' in device && device.mounts) {
                let mount = device.mounts[index];
                newItem.data_mount = {};

                /* determine if the object is a string or an object.  */
                if (typeof (mount) === 'string') {
                    newItem.data_mount.value = mount;

                } else {
                    for (const [key, value] of Object.entries(mount)) {
                        newItem.data_mount.value = key;
                    }
                }
                newItem.data_mount.index = index;
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



/* Populate the drpMount drop menu if there are Mounts for the item.  Mounts are for the Workspace Designer */
function populateDrpMount(item) {

    document.getElementById('drpMount').options.length = 0; /* clear out all previous options */

    document.getElementById('mountDiv').style.display = 'none';

    videoDevices.forEach(populate);

    microphones.forEach(populate);

    chairs.forEach(populate);

    displays.forEach(populate);

    function populate(device) {
        if (item.data_deviceid === device.id) {
            if ('mounts' in device) {
                document.getElementById('mountDiv').style.display = '';

                device.mounts.forEach(mount => {
                    let drpOption = new Option();
                    /* determine if the object is a string or an object.  */
                    if (typeof (mount) === 'string') {
                        drpOption.text = mount;
                        drpOption.value = mount;
                    } else {
                        for (const [key, value] of Object.entries(mount)) {
                            drpOption.text = value;
                            drpOption.value = key;
                        }
                    }
                    document.getElementById('drpMount').add(drpOption, undefined);
                })
            }
        }
    }
}

/* used to updateFormatDetailsTab based on the id shown on the webpage */
function updateFormatDetailsUpdate() {
    if (!document.getElementById('itemId').innerText.startsWith('Unknown')) {
        updateFormatDetails(document.getElementById('itemId').innerText);
    }
}

/* Estimates the top elevation of a display and populates the itemTopElevation text box */
function fillInTopElevationDisplay(shape, updateTextBox = true) {
    let zHeightOfDisplay, topElevation, zPosition;
    let defaultDisplayHeight = displayHeight / 1000; /* convert to meters */

    if (shape.data_deviceid === 'display21_9') {
        defaultDisplayHeight = displayHeight21_9 / 1000;
    }

    if (roomObj.unit === 'feet') {
        defaultDisplayHeight = defaultDisplayHeight * 3.28084;
    }

    zPosition = shape.data_zPosition || 0;

    if (shape.data_deviceid === 'display21_9') {
        zHeightOfDisplay = defaultDisplayHeight * (shape.data_diagonalInches / diagonalInches21_9);
    } else {
        zHeightOfDisplay = defaultDisplayHeight * (shape.data_diagonalInches / diagonalInches);
    }

    topElevation = zPosition + zHeightOfDisplay;

    if (updateTextBox) document.getElementById("itemTopElevation").value = round(topElevation);

    return round(topElevation);
}

function disableRoomSettings(disable = true) {

    ['drpMetersFeet', 'roomWidth', 'roomHeight', 'roomLength', 'drpSoftware', 'authorVersion', 'removeDefaultWallsCheckBox', 'updateButtonId', 'roomName'].forEach(elementId => {
        let element = document.getElementById(elementId);
        if (element) {
            element.disabled = disable;
        }
    })
};


function updateFormatDetails(eventOrShapeId) {

    if (multiUpdateMode) return;

    let shape; /* shape is direct from canvas, 'item' is in roomObj JSON. */

    let itemTopElevationDiv = document.getElementById('itemTopElevationDiv');

    multiUpdateMode = false;

    itemTopElevationDiv.style.display = 'none'; /* make this div invisible, only show for video devices or TV displays */

    if (typeof eventOrShapeId === 'string') {
        shape = stage.find('#' + eventOrShapeId)[0];


    } else {
        shape = eventOrShapeId.target;

    }

    if (!shape) return /* escape out of function in case the specific shape or detail does not exist, usually this happens with a new template load */

    if (!('data_deviceid' in shape)) return; /* if the shape does not have a data_deviceid, it was selected incorrectly, escape out */

    if (shape.data_deviceid === 'backgroundImageFloor') return; /* background image is not editable in the format details pane */

    let id = shape.attrs.id;


    let parentGroup = shape.getParent().name();

    document.getElementById('itemXdiv').style.display = '';
    document.getElementById('itemYdiv').style.display = '';
    document.getElementById('itemNameDiv').style.display = '';
    document.getElementById('labelFieldDiv').style.display = '';
    document.getElementById('updateItemDiv').style.display = '';

    document.getElementById('itemVheight').disabled = false;

    if (['polyRoom', 'boxRoomPart'].includes(shape.data_deviceid)) {
        document.getElementById('itemLabeldiv').textContent = 'Room Name:'
    } else {
        document.getElementById('itemLabeldiv').textContent = 'Item Label:'
    }

    if (parentGroup === 'tables' || parentGroup === 'stageFloors' || parentGroup === 'boxes' || parentGroup === 'rooms') {
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

    if (shape.data_deviceid.startsWith('tblCurved')) {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = true;
    }

    if (shape.data_deviceid.startsWith('polyRoom')) {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = true;
    }

    if (shape.data_deviceid.startsWith('tblSchoolDesk')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
    }

    if (shape.data_deviceid.startsWith('tblPodium')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
    }

    if (shape.data_deviceid.startsWith('wallChairs') || shape.data_deviceid.startsWith('couch')) {
        document.getElementById('itemWidth').disabled = true;
        document.getElementById('itemLength').disabled = false;
        document.getElementById('itemVheight').disabled = true;
    }

    if (shape.data_deviceid.startsWith('sphere')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
        document.getElementById('itemVheight').disabled = true;
    }


    if (shape.data_deviceid.startsWith('cylinder')) {
        document.getElementById('itemWidth').disabled = false;
        document.getElementById('itemLength').disabled = true;
        document.getElementById('itemVheight').disabled = false;
    }


    /* if both itemWidth and itemLength are disabled, don't show the row */
    if (shape.data_deviceid === 'pathShape') {

        document.getElementById('labelPathId').style.display = '';
        document.getElementById('itemWidthDiv').style.display = 'none';
        document.getElementById('itemLengthDiv').style.display = 'none';
    } else {
        document.getElementById('itemWidthDiv').style.display = '';
        document.getElementById('itemLengthDiv').style.display = '';
        document.getElementById('labelPathId').style.display = 'none';
    }

    if (document.getElementById('itemWidth').disabled === true && document.getElementById('itemLength').disabled === true && !(shape.data_deviceid === 'polyRoom')) {
        document.getElementById('itemWidthLengthDiv').style.display = 'none';
    } else {
        document.getElementById('itemWidthLengthDiv').style.display = '';
    }

    roomObj.items[parentGroup].forEach((item, index) => {

        if (item.id === id) {

            if (!('data_deviceid' in item)) {
                console.info('No data_deviceid found in item: ', item);
                return;
            }
            let x, y;

            let isPrimaryDiv = document.getElementById('isPrimaryDiv');
            let isPrimaryCheckBox = document.getElementById('isPrimaryCheckBox');
            let singleShadingDiv = document.getElementById('singleShadingDiv');
            let itemWidthLength = document.getElementById('itemWidthLengthDiv');

            singleShadingDiv.style.visibility = 'hidden'; /* start as hidden, but make visible if item supports shading guidances */

            isPrimaryCheckBox.disabled = true;
            isPrimaryCheckBox.checked = false;
            isPrimaryDiv.style.display = 'none';

            if (parentGroup === 'tables' || parentGroup === 'stageFloors' || parentGroup === 'boxes' || parentGroup === 'rooms') {
                x = shape.x();
                y = shape.y();

            } else {
                let xy = getNodeCenter(shape);
                x = xy.x;
                y = xy.y;
            }

            if (testOffset) {
                document.getElementById('itemOffsetDiv').style.display = '';
            }

            if ('data_diagonalInches' in item && !item.data_deviceid?.match(/brdPro|boardPro|webexDesk/)) {
                document.getElementById('itemDiagonalTvDiv').style.display = '';
                document.getElementById('itemDiagonalTv').value = shape.data_diagonalInches;
                itemTopElevationDiv.style.display = '';
                if (parentGroup === 'displays') {
                    fillInTopElevationDisplay(shape);
                }

            } else {
                document.getElementById('itemDiagonalTvDiv').style.display = 'none';

            }

            if (!('data_diagonalInches' in item)) {
                document.getElementById('btnDisplayDistanceSingleItem').disabled = true;
            }


            if ('data_deviceid' in item && 'wideHorizontalFOV' in allDeviceTypes[item.data_deviceid]) {

                itemTopElevationDiv.style.display = '';

                let deviceVertHeight = allDeviceTypes[item.data_deviceid].height / 1000; /* device height in meters */

                if (roomObj.unit === 'feet') {
                    deviceVertHeight = deviceVertHeight * 3.28084;
                }

                document.getElementById('itemTopElevation').value = round((shape.data_zPosition || 0) + deviceVertHeight);

                // if (roomObj.layersVisible.grShadingCamera) {
                //     document.getElementById('btnCamShadeToggleSingleItem').disabled = false;
                // } else {
                //     document.getElementById('btnCamShadeToggleSingleItem').disabled = true;
                // }

                if (item.data_fovHidden) {
                    // document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam_off';
                } else {
                    // document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'videocam';
                }
            } else {
                document.getElementById('btnCamShadeToggleSingleItem').disabled = true;
                document.getElementById("btnCamShadeToggleSingleItem").children[0].textContent = 'do_not_disturb_on';
            }





            if ('micRadius' in allDeviceTypes[item.data_deviceid]) {
                //    singleShadingDiv.style.visibility = 'visible';

                // if (roomObj.layersVisible.grShadingMicrophone) {
                //     document.getElementById('btnMicShadeToggleSingleItem').disabled = false;
                // } else {
                //     document.getElementById('btnMicShadeToggleSingleItem').disabled = true;
                // }

                if (item.data_audioHidden) {
                    // document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic_off';
                } else {
                    // document.getElementById("btnMicShadeToggleSingleItem").children[0].textContent = 'mic';
                }

            } else {
                document.getElementById('btnMicShadeToggleSingleItem').disabled = true;
            }

            if (!('micRadius' in allDeviceTypes[item.data_deviceid])) {

                document.getElementById('btnSpeakerShadeToggleSingleItem').disabled = true;
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

            if (shape.data_deviceid.startsWith('wall') || shape.data_deviceid.startsWith('column') || parentGroup === 'tables' || parentGroup === 'stageFloors' || parentGroup === 'boxes' || parentGroup === 'rooms') {
                document.getElementById('itemVheightDiv').style.display = '';
            } else {
                document.getElementById('itemVheightDiv').style.display = 'none';
            }

            if ((shape.data_deviceid.startsWith('wall') || shape.data_deviceid.startsWith('column') || shape.data_deviceid === 'cylinder') && !shape.data_deviceid.startsWith('wallChairs')) {
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

            populateDrpMount(item);

            if ('data_role' in item && item.data_role) {
                document.getElementById('drpRole').value = item.data_role.value;
            }


            if ('data_color' in item && item.data_color) {
                document.getElementById('drpColor').value = item.data_color.value;
            }

            if ('data_model' in item && item.data_model) {
                document.getElementById('drpModel').value = item.data_model.value;
            }


            if ('data_mount' in item && item.data_mount) {
                document.getElementById('drpMount').value = item.data_mount.value;
            }

            if ('name' in item || allDeviceTypes[item.data_deviceid].name) {
                let itemNameSelect = document.getElementById('itemName');
                itemNameSelect.options.length = 0;

                if (allDeviceTypes[item.data_deviceid].name) {
                    item.name = allDeviceTypes[item.data_deviceid].name;
                }

                const newOption = new Option(item.name, item.data_deviceid);
                itemNameSelect.add(newOption);
                itemNameSelect.value = item.data_deviceid;

                updateDevicesDropDown(itemNameSelect, item);


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
            if ('data_zPosition' in shape) {
                document.getElementById('itemZposition').value = shape.data_zPosition;
            } else {
                document.getElementById('itemZposition').value = "";
            }

            if (document.getElementById('showTiltSlantCheckBox').checked === true && parentGroup != 'videoDevices') {
                document.getElementById('itemTiltSlantDiv').style.display = '';
                document.getElementById('itemTiltDiv').style.display = '';
                document.getElementById('itemSlantDiv').style.display = '';
            }
            else {
                document.getElementById('itemTiltDiv').style.display = 'none';
                document.getElementById('itemTiltDiv').style.display = 'none';
                document.getElementById('itemTiltSlantDiv').style.display = 'none';
            }

            if (item.data_tilt || item.data_slant) {
                document.getElementById('itemTiltDiv').style.display = '';
                document.getElementById('itemSlantDiv').style.display = '';
                document.getElementById('itemTiltSlantDiv').style.display = '';
            }

            if (item.data_tilt) {
                document.getElementById('itemTilt').value = Math.round(item.data_tilt * 10) / 10;
            } else {
                document.getElementById('itemTilt').value = "";
            }


            if (item.data_slant) {
                document.getElementById('itemSlant').value = Math.round(item.data_slant * 10) / 10;
            } else {
                document.getElementById('itemSlant').value = "";
            }


            if ('data_labelField' in item && item.data_labelField && item.data_labelField.trim() !== '{}') {

                if (shape.data_deviceid === 'pathShape') {

                    let pathLabel = parsePathShapeLabelFieldJson(item);

                    document.getElementById('labelField').value = pathLabel.label.trim();
                    document.getElementById('labelPath').value = pathLabel.path.trim();

                } else {
                    document.getElementById('labelField').value = item.data_labelField;
                }


            } else {
                document.getElementById('labelField').value = "";
            }

            if ('data_trapNarrowWidth' in item && (item.data_trapNarrowWidth === 0 || item.data_trapNarrowWidth)) {
                document.getElementById('trapNarrowWidth').value = item.data_trapNarrowWidth;
            } else {
                document.getElementById('trapNarrowWidth').value = (roomObj.unit === 'feet') ? 2.5 : 0.75;
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


function updateDevicesDropDown(selectElement, item) {

    let deviceGroups = [];

    selectElement.disabled = true;

    deviceGroups[0] = ['roomBar', 'roomBarPro', 'roomKitEqQuadCam', 'roomKitProQuadCam'];

    deviceGroups[1] = ['ptzVision2', 'ptz4kMount2', 'quadCam'];

    deviceGroups[2] = ['doorLeft2', 'doorRight2', 'doorLeft', 'doorRight'];

    deviceGroups[3] = ['box', 'stageFloor', 'columnRect'];

    deviceGroups[4] = ['wallGlass', 'wallWindow', 'wallStd'];

    deviceGroups[5] = ['tblRect', 'tblEllip', 'tblTrap', 'tblShapeU'];

    deviceGroups[6] = ['displaySngl', 'displayDbl', 'displayTrpl', 'display21_9', 'displayScreen'];

    deviceGroups[7] = ['doorDouble2', 'doorDouble'];

    deviceGroups[8] = ['tableMicPro', 'tableMic'];

    deviceGroups[9] = ['brdPro75G2', 'brdPro55G2'];

    deviceGroups[10] = ['brdPro75G2FS', 'brdPro75G2WS', 'brdPro75G2Wheel', 'brdPro55G2FS', 'brdPro55G2WS', 'brdPro55G2Wheel'];

    deviceGroups[11] = ['roomKitEqxFS', 'roomKitEqxWS'];

    deviceGroups[12] = ['personStanding', 'personStandingMan'];

    deviceGroups[13] = ['phone9841', 'phone9851', 'phone9861', 'phone9871'];

    deviceGroups[14] = ['webexDeskPro', 'webexDesk', 'webexDeskMini'];

    deviceGroups[15] = ['chair', 'chairSwivel', 'chairHigh'];

    deviceGroups[16] = ['headset980', 'headset950', 'headset730', 'headset720', 'headset560', 'headset530', 'headset320'];

    deviceGroups[17] = ['shareCableUsbc', 'shareCableHdmi', 'shareCableMulti', 'shareCableUsbcHdmi', 'shareCableUsbcMulti', 'shareCableHdmiMulti', 'shareCableUsbcHdmiMulti'];

    deviceGroups[18] = ['webcam4k', 'webcam1080p']


    deviceGroups.forEach((devices, index) => {

        devices.forEach((device_deviceid) => {

            if (item.data_deviceid === device_deviceid) {
                selectElement.options.length = 0;
                selectElement.disabled = false;

                deviceGroups[index].forEach(deviceid => {
                    const newOption = new Option(allDeviceTypes[deviceid].name, deviceid);
                    selectElement.add(newOption);
                    selectElement.value = item.data_deviceid;
                })

                selectElement.value = device_deviceid;

            }
        });
    });
}


/*
    On touch devices if the browser is zoomed and the user is inselect mode on the canvas, it is possible
    to get stuck on the canvas and now way to scroll, touchmove or zoom out.  Clicking 4-6 times quickly on an iOS device
    will allow it set the proper web zoom.  No idea how this works on an android device.

    Only registers if:  !(mobileDevice === 'false' || mobileDevice === 'RoomOS')
*/
function countConsectiveTouches() {
    let timeBetweenTouches = 1000; /* in ms */
    let totalTouches = 6;

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

let count = 0;

function addListeners(stage) {

    let x1, y1, x2, y2;

    stage.on('click tap', function stageOnDblclickDbltap(e) {

        if (!(mobileDevice === 'false' || mobileDevice === 'RoomOS' || mobileDevice === 'Tesla')) {
            countConsectiveTouches();
        }


        if (document.getElementById('resizeBackgroundImageCheckBox').checked) return; /* exit out if resizing the background image */


        if (e.target.findAncestor('.layerTransform')) {
            document.getElementById("tabItem").click();
            document.getElementById("subTabItemDetails").click();

            updateFormatDetails(e);
        }

    });

    stage.on('mousedown touchstart', function stageOnMousedownTouchstart(e) {

        if (panScrollableOn || isSelectingTwoPointsOn || movingBackgroundImage || selectingOuterWall || isWallBuilderOn || isWallWriterOn2 || isPolyBuilderOn) {
            return;
        }

        clearTimeout(rightClickTouchTimer);

        if (!(mobileDevice === 'false')) {
            rightClickTouchTimer = setTimeout(() => {
                createRightClickMenu();
            }, rightClickTouchTimerDelta);
        }

        if (e.target.findAncestor('.layerTransform')) {
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

        if (panScrollableOn || isSelectingTwoPointsOn || movingBackgroundImage || selectingOuterWall || isWallBuilderOn || isWallWriterOn2 || isPolyBuilderOn) {
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

        clearTimeout(rightClickTouchTimer);

        /* update right-click menu if already exisiting to capture updated TR node options */
        setTimeout(() => {
            if (document.getElementById(rightClickMenuDialogId)) {
                createRightClickMenu(true);
            }
        }, 500)



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

        shapes = shapes.concat(groupBoxes.getChildren());

        shapes = shapes.concat(groupRooms.getChildren());

        shapes = shapes.concat(groupSpeakers.getChildren());

        shapes = shapes.concat(groupTables.getChildren());

        shapes = shapes.concat(groupTouchPanel.getChildren());

        shapes = shapes.concat(groupChairs.getChildren());

        let box = findFourCornersOfNode(selectionRectangle);

        let selected = shapes.filter((node) => {
            if (node.listening()) {

                let nodeBox = findFourCornersOfNode(node);

                if (node.data_deviceid === 'polyRoom') {
                    if (doPolygonsIntersect(box, nodeBox)) {
                        /* TODO: may need another check if nodeBox fourcorners or X,Y is absolutely inside box */
                        let points = getAbsolutePointsOfLine(node, true);
                        return doPolygonsIntersect2(points.corners, box);

                    } else {
                        return false;
                    }

                } else {
                    return doPolygonsIntersect(box, nodeBox);
                }

            }
        });

        tr.nodes(selected);


        if (selected.length === 1 && (selected[0].getParent().name() === 'tables' || selected[0].getParent().name() === 'stageFloors' || selected[0].getParent().name() === 'boxes' || selected[0].getParent().name() === 'rooms')) {
            /* if there is a single table, make it resizable */
            resizeTableOrWall();
        }

        /* need to set focus on stage in case multi-select was done and focus was not already on stage for shortcut keys to work */
        stage.container().tabIndex = 1;
        stage.container().focus();
        enableCopyDelBtn();
    });



    /* clicks should select/deselect shapes */
    stage.on('click tap', function stageOnClickTap(e) {
        count = count + 1;
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
            if (e.target.getParent() === groupTables || e.target.getParent() === groupStageFloors || e.target.getParent() === groupBoxes || e.target.getParent() === groupRooms) {
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

    let trNodesLength;

    tr.on('transformstart', function onTrNodeTransformStart(e) {
        trNodesLength = tr.nodes().length;

    });

    tr.on('transform', function onTransform(e) {

        if (trNodesLength !== 1) return;

        let scaleX = e.target.scaleX();
        let scaleY = e.target.scaleY();

        if (trNodesLength === 1 && !(scaleX === 1 || scaleY === 1) && e.target.data_deviceid != 'pathShape') {

            let width = e.target.width();
            let height = e.target.height();
            width = width * scaleX;
            height = height * scaleY;

            e.target.scaleX(1);
            e.target.scaleY(1);
            e.target.width(width);
            e.target.height(height);
            e.target.draw();

            updateFormatDetails(e);

        }

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
        if (event.target.children.length > 0) {
            img.src = event.target.children[0].src;
        } else {
            img.src = event.target.src;
        }

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

    let unitX = (canvasPixelX - pxOffset) / scale + activeRoomX;
    let unitY = (canvasPixelY - pxOffset) / scale + activeRoomY;

    let deviceIdGroupName = event.target.id.split('-');

    if (canvasPixelX < 10 || canvasPixelY < 10) return; /* break out funciton and do not insert image if the X or Y coordinate is negative with slight buffer */


    let attrs = { x: unitX, y: unitY };

    insertItemFromMenu(deviceIdGroupName[1], attrs);


    dragClientX = 0;
    dragClientY = 0;

}


function pointerupInsertMenu(event) {
    const { roomWidth, roomLength } = roomObj.room;

    const attrs = {};

    let data_deviceid = event.target.id.split('-');

    attrs.x = (roomWidth / 2) * (1 + (Math.random() - 0.5)/5 );
    attrs.y = (roomLength / 2) *  (1 + (Math.random() - 0.5)/5 );

    insertItemFromMenu(data_deviceid[1], attrs);


    toggleQuickAdd(false);

    blockAndMessage('Item inserted in center.', 1300);
}


/* insertItemFromMenu() will: 1) set the defeaultVert height, 2) show the Roles dialog if applicable and 3) show multi-video device warning if applicable */
function insertItemFromMenu(data_deviceid, attrs) {

    polyBuilderOn(false);
    wallBuilderOn(false);
    wallBuilderOn2(false);

    if (data_deviceid === 'polyRoom') {
        polyBuilderOn(true, 'polyRoom')
        return;
    }

    if (data_deviceid === 'wallBuilder') {
        wallBuilderOn(true);
        return;
    }

    if ('defaultVert' in allDeviceTypes[data_deviceid]) {
        let defaultVert = allDeviceTypes[data_deviceid].defaultVert / 1000;
        if (roomObj.unit === 'feet') {
            defaultVert = round(defaultVert * 3.28084)
        }
        attrs.data_zPosition = defaultVert;
    }


    if (allDeviceTypes[data_deviceid].rolesDialog) {

        showRoleOptions(data_deviceid, attrs);

    } else {
        let uuid = createUuid();

        attrs.data_deviceid = data_deviceid;
        attrs.id = uuid;

        insertShapeItem(data_deviceid, allDeviceTypes[data_deviceid].parentGroup, attrs, uuid, true);

        roomObj.items[allDeviceTypes[data_deviceid].parentGroup].push(attrs);

        checkForMultipleCodecsOnDragEnd(data_deviceid);

        setTimeout(() => { canvasToJson() }, 100);

        /* add device to roomObj */

        canvasToJson();

    }

}

/* post things at the bottom of the screen, an alternative to console.log */
function showTestLog(...args) {
    let text = args.join(' ');
    let testLog = document.getElementById('testLog');
    testLog.style.display = '';
    testLog.innerHTML = testLog.innerHTML + "<br>" + text;
    console.info('showTestLog()', JSON.stringify(args));
}

/* Checks to see if the last item dropped is also a codec.
takes a string of the droppedItem id/data_deviceid */
function checkForMultipleCodecsOnDragEnd(droppedItem) {

    setTimeout(() => {

        /* verify the device is in the videoDevices group && not a camera  */
        if (allDeviceTypes[droppedItem].parentGroup && allDeviceTypes[droppedItem].parentGroup === 'videoDevices' && !allDeviceTypes[droppedItem].cameraOnly) {

            /* count up all the roomObj.items.videoDevices that are not cameras only. */
            let videoDeviceCount = 0;

            roomObj.items.videoDevices.forEach((item) => {

                if ('data_deviceid' in item) {
                    if (!(allDeviceTypes[item.data_deviceid].cameraOnly)) {
                        videoDeviceCount++;
                    }
                }

            })

            if (videoDeviceCount === 2) {
                /* update this later with a pretty modal and a "Don't show this message again" toggle */

                document.getElementById('dialogMultipleVideoDevices').showModal();
                // alert('\u26A0 Multiple Video Device Alert\u26A0\r\n\r\nThere are 2 video devices on the room canvas. This is allowed, but if you meant to add a camera instead, delete/undo the last action and insert a camera.')
            }

        }
    }, 1000);
}

/*
When dragging a new object onto the screen, the user must manual select the Role.  Requires item type have a .rolesDialog videoDevices.rolesDialog be set to true or have a value.
*/

function showRoleOptions(itemDataDeviceid, attrs) {

    let itemInsert = attrs;
    itemInsert.data_deviceid = itemDataDeviceid;

    let dialogHeader = document.getElementById('headerRoleSelection');
    let roleSelectionDialog = document.getElementById('roleSelectionDialog');

    let itemType = allDeviceTypes[itemDataDeviceid];

    if (!itemType.rolesDialog) return;

    if (typeof itemType.rolesDialog === 'string') {
        dialogHeader.innerText = itemType.rolesDialog;
    } else {
        dialogHeader.innerText = 'Select from the following';
    }

    let roles = itemType.roles;

    const innerDiv = document.getElementById("roleSelection");
    innerDiv.innerHTML = '';

    roles.forEach((role, index) => {
        let roleKey = Object.keys(role)[0];
        let roleValue = role[roleKey];
        const buttonDiv = document.createElement('div');
        const button = document.createElement('button');
        const buttonLabel = document.createElement('span');

        buttonLabel.innerText = roleValue;
        buttonLabel.classList.add('roleSelectButtonLabel')
        buttonLabel.style.margin = 'auto';


        button.classList.add('roleSelectButton');

        button.appendChild(buttonLabel);

        innerDiv.appendChild(buttonDiv);
        buttonDiv.appendChild(button);

        button.onclick = () => {
            itemInsert.data_role = {};
            itemInsert.data_role.value = roleKey;
            itemInsert.data_role.index = index;

            insertItem(itemInsert, '', true);

            roleSelectionDialog.close();
            setTimeout(() => { canvasToJson() }, 100);

        }
    });

    roleSelectionDialog.showModal();

}


/* Checks to see if the items about to pasted contain a video device.   */
function checkForMultipleCodecsOnPaste(pasteItems) {

    let videoDeviceCanvasCount = 0;
    let videoDevicePasteCount = 0;
    pasteItems.forEach(pasteItem => {
        let data_deviceid = pasteItem.deviceId;

        if (allDeviceTypes[data_deviceid].parentGroup && allDeviceTypes[data_deviceid].parentGroup === 'videoDevices' && !allDeviceTypes[data_deviceid].cameraOnly) {
            videoDevicePasteCount++;
        }
    });

    roomObj.items.videoDevices.forEach((item) => {
        if (!(allDeviceTypes[item.data_deviceid].cameraOnly)) {
            videoDeviceCanvasCount++;
        }
    })

    if (videoDeviceCanvasCount === 1 && videoDevicePasteCount > 0) {
        setTimeout(() => {
            document.getElementById('dialogMultipleVideoDevices').showModal();
        }, 1000);
    }

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

function removeElementsByClass(className) {
    const removeDivs = document.getElementsByClassName(className)

    Array.from(removeDivs).forEach(removeDiv => {
        removeDiv.remove();
    });
}



function createItemsOnMenu(divMenuContainerId, menuItems) {

    let divMenuContainer = document.getElementById(divMenuContainerId);

    menuItems.forEach((menuItem) => {

        let item = allDeviceTypes[menuItem];

        let frontImage = item.frontImage || 'wd.svg';

        let name = item.name || 'No Name';

        let parentGroup = item.parentGroup;

        let flexItemDiv = document.createElement("div");
        flexItemDiv.classList.add('flexItems');
        flexItemDiv.classList.add('equipmentItemOnMenu');
        flexItemDiv.id = `${parentGroup}-${menuItem}-div`;
        flexItemDiv.draggable = 'true';
        divMenuContainer.appendChild(flexItemDiv);

        let flexItemImage = document.createElement("img");
        flexItemImage.classList.add('flexSubItemImage');
        flexItemImage.id = `${parentGroup}-${menuItem}-img`;
        flexItemImage.draggable = 'true';
        flexItemImage.src = `./assets/images/${frontImage}`;
        flexItemDiv.appendChild(flexItemImage);

        let labelDiv = document.createElement("div");
        labelDiv.classList.add('flexSubItemLabel');
        labelDiv.innerText = name;
        labelDiv.id = `${parentGroup}-${menuItem}-label`;
        flexItemDiv.appendChild(labelDiv);

        if (menuItem === 'wallBuilder') {
            flexItemDiv.classList.add('flexItemsWallBuilder');
            flexItemDiv.addEventListener('pointerdown', () => {
                wallBuilderOn(true);

            });
        }

        flexItemDiv.addEventListener('dragstart', dragStart);
        flexItemDiv.addEventListener('drag', drag);
        flexItemDiv.addEventListener('dragend', dragEnd);

        flexItemDiv.addEventListener('touchstart', touchStart);
        flexItemDiv.addEventListener('touchmove', touchMove);
        flexItemDiv.addEventListener('touchend', touchEnd);

        flexItemDiv.addEventListener('pointerup', pointerupInsertMenu);



    });

}



function createEquipmentMenu() {

    /* remove previous menu, then add a menu */
    removeElementsByClass('equipmentItemOnMenu');

    let videoDevicesMenu = ['roomKitEqQuadCam', 'roomBarPro', 'roomBar', 'roomKitProQuadCam'];

    let roomKitEqxMenu = ['roomKitEqx', 'roomKitEqxFS'];

    let boardProG2Menu = ['brdPro75G2', 'brdPro75G2FS', 'brdPro55G2', 'brdPro55G2FS'];

    let personalVideoDevicesMenu = ['webexDeskPro', 'webexDesk', 'webexDeskMini', 'roomBarByod'];

    let cameraDevicesMenu = ['ptzVision2', 'ptz4kMount2', 'quadCam'];

    let legacyVideoDevicesMenu = [];

    if (document.getElementById('useNonWorkspaceItemsCheckBox').checked === true) {
        legacyVideoDevicesMenu = ['room55', 'rmKitMini', 'roomKit', 'cameraP60', 'boardPro55', 'boardPro75'];
        document.getElementById('legacyVideoDevicesMenuDivider').style.display = '';
    } else {
        document.getElementById('legacyVideoDevicesMenuDivider').style.display = 'none';
    }

    let microphonesMenu = ['ceilingMicPro', 'tableMicPro', 'tableMic', 'ceilingMic'];

    let displaysMenu = ['displaySngl', 'displayDbl', 'displayTrpl', 'display21_9', 'projector', 'displayScreen'];

    let navigatorsMenu = ['navigatorTable', 'navigatorWall'];

    let ciscoDesktopMenu = ['phone9871', 'headset980', 'webcam4k'];

    let desktopMenu = ['laptop', 'displayMonitor', 'keyboard', 'mouse'];

    let cableLidMenu = ['shareCableUsbc', 'shareCableHdmi', 'shareCableMulti'];

    if (document.getElementById('useNonWorkspaceItemsCheckBox').checked === true) {
        desktopMenu = desktopMenu.concat('unknownObj', 'tblUnknownObj');
    }

    let tablesMenu = ['tblRect', 'tblEllip', 'tblTrap', 'tblShapeU', 'tblSchoolDesk', 'tblPodium', 'tblCurved'];

    let wallsMenu = ['wallBuilder', 'wallStd', 'wallGlass', 'wallWindow', 'columnRect', 'cylinder', 'box', 'sphere', 'pathShape'];

    let chairsMenu = ['chair', 'wallChairs', 'pouf', 'personStanding', 'plant', 'doorRight2', 'doorLeft2', 'doorDouble2', 'couch'];

    let stageFloorMenu = ['stageFloor'];

    let accessibilityMenu = ['wheelchair', 'wheelchairTurnCycle', 'circulationSpace'];

    createItemsOnMenu('cameraMenuContainer', videoDevicesMenu);


    createItemsOnMenu('roomKitEqxMenuContainer', roomKitEqxMenu);

    createItemsOnMenu('boardProG2MenuContainer', boardProG2Menu);

    createItemsOnMenu('personalDevicesMenuContainer', personalVideoDevicesMenu);

    createItemsOnMenu('cameraDevicesMenuContainer', cameraDevicesMenu);

    createItemsOnMenu('cameraLegacyMenuContainer', legacyVideoDevicesMenu);

    createItemsOnMenu('microphoneMenuContainer', microphonesMenu);

    createItemsOnMenu('displaysMenuContainer', displaysMenu);

    createItemsOnMenu('navigatorsMenuContainer', navigatorsMenu);

    createItemsOnMenu('tablesMenuContainer', tablesMenu);

    createItemsOnMenu('wallsMenuContainer', wallsMenu);

    createItemsOnMenu('chairsMenuContainer', chairsMenu);

    createItemsOnMenu('accessibilityMenuContainer', accessibilityMenu);

    createItemsOnMenu('stageFloorMenuContainer', stageFloorMenu);

    createItemsOnMenu('cableLidMenuContainer', cableLidMenu);

    createItemsOnMenu('ciscoDesktopMenuContainer', ciscoDesktopMenu);

    createItemsOnMenu('desktopMenuContainer', desktopMenu);
}



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
    zoomValue = document.getElementById('zoomValue').textContent;
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

    if (zoomValue < 100) {
        zoomValue = 100;
    }

    document.getElementById('btnZoomIn').disabled = false;

    if (zoomValue > 400) {
        zoomValue = 400;
        document.getElementById('btnZoomIn').disabled = true;
    }

    if (zoomValue > 250 && mobileDevice != 'false') {
        zoomValue = 250;
        document.getElementById('btnZoomIn').disabled = true;
    }

    if (zoomValue > 150 && mobileDevice === 'RoomOS') {
        zoomValue = 150;
        document.getElementById('btnZoomIn').disabled = true;
    }

    if (zoomValue > 100) {
        document.getElementById('btnSelectPan').disabled = false;
        document.getElementById('btnZoomOut').disabled = false;
        document.getElementById('btnZoomReset').disabled = false;
    } else {
        document.getElementById('btnSelectPan').disabled = true;
        document.getElementById('btnZoomOut').disabled = true;
        document.getElementById('btnZoomReset').disabled = true;
        document.getElementById('btnSelectPan').classList.remove('active');
        document.getElementById("canvasDiv").style.cursor = "auto";

        panScrollableOn = false;
        panRectangle.hide();

        listItemsOffStage();

    }

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

    tr.borderStrokeWidth(1);
    updateTrNodesShadingTimer();
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

let scrollDivCounter = 0;
// addScrollButtonsToClass();


function addScrollButtonsToClass() {
    let scrollDivs = document.querySelectorAll('.subtabcontent');

    scrollDivs.forEach(scrollDiv => {
        addScrollButton(scrollDiv, scrollDivCounter++);
    });

    checkIfScrollable();
}

addScrollButton();

function addScrollButton() {
    let tabContent = document.getElementById('Insert');
    let scrollButtonContainer = document.createElement('div');
    scrollButtonContainer = document.createElement('div');
    scrollButtonContainer.id = 'scrollButtonContainer';
    scrollButtonContainer.className = 'tip scrollButtonContainer';
    tabContent.appendChild(scrollButtonContainer);

    let scrollButtonDiv = document.createElement('div');
    scrollButtonDiv.id = 'scrollButtonDiv';
    scrollButtonDiv.className = 'scrollButton';
    scrollButtonDiv.textContent = 'scroll down';
    scrollButtonContainer.appendChild(scrollButtonDiv);
}


document.getElementById('Cameras').addEventListener("scroll", (event) => {
    // console.log('.offsetTop', event.target.id.offsetTop);
    // console.log('.scrollTop', event.target.scrollTop);
    // console.log('scrollHeight', event.target.scrollHeight);
    // console.log('clientHeight', event.target.clientHeight);
});


function checkIfScrollable() {

    let scrollDivs = ['Tables', 'Microphones', 'Panels', 'Cameras'];
    const scrollButton = document.querySelector('#scrollButtonContainer');

    let width = document.getElementById('Insert').offsetWidth;

    if (scrollButton) {
        scrollButton.style.visibility = "hidden";
    }

    for (let i = 0; i < scrollDivs.length; i++) {
        let scrollDiv = document.getElementById(scrollDivs[i]);

        if (scrollButton) {

            let rect = scrollDiv.getBoundingClientRect();

            if (scrollDiv.offsetWidth > width) {
                width = scrollDiv.offsetWidth;
            }

            const overflowYStyle = window.getComputedStyle(scrollDiv).overflowY;

            const isOverflowHidden = overflowYStyle.indexOf('hidden') !== -1;
            const insertDiv = document.querySelector('#Insert');

            scrollButton.style.display = '';
            if ((scrollDiv.scrollHeight > scrollDiv.offsetHeight)) {
                scrollButton.style.visibility = "visible";
            }

            scrollButton.style.left = ((width / 2) + 10) + 'px';
        }




    };

}




window.addEventListener('resize', checkIfScrollable);

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

function toggleHighlightItem() {
    tr.nodes(tr.nodes());
    smallItemsHighlight = !smallItemsHighlight;
    updateCreateHighlightImage()


}


function getListOfSmallDeviceTypes(minimumSize = 500) {
    let smallDeviceTypeIdArray = [];

    for (const deviceTypeId in allDeviceTypes) {
        let type = allDeviceTypes[deviceTypeId];
        if (type.width < minimumSize && type.depth < minimumSize) {
            smallDeviceTypeIdArray.push(type.id);
        }
    }

    return smallDeviceTypeIdArray;
}

function getListOfNodes(smallDeviceTypeIdArray) {
    let arraySmallItems = [];
    for (const category in roomObj.items) {
        for (const i in roomObj.items[category]) {
            let item = roomObj.items[category][i];
            if (smallDeviceTypeIdArray.includes(item.data_deviceid)) {
                arraySmallItems.push(item);

            }
        }
    }

    return arraySmallItems;
}

function updateCreateHighlightImage(minimumSize = 500) {
    /* get all images */

    let smallDeviceTypeIdArray = getListOfSmallDeviceTypes(minimumSize = 500)
    let arraySmallItems = getListOfNodes(smallDeviceTypeIdArray);

    arraySmallItems.forEach(item => {
        let node = stage.findOne('#' + item.id);
        if (smallItemsHighlight) {
            let width = sizeToAddOultine / 1000 * scale;
            let height = sizeToAddOultine / 1000 * scale;

            if (roomObj.unit === 'feet') {
                width = width * 3.28084;
                height = height * 3.28084;
            }
            let centerX = (item.x * scale) + pxOffset;
            let centerY = (item.y * scale) + pxOffset;

            let cornerXY = findUpperLeftXY({ x: centerX, y: centerY, rotation: item.rotation, width: width, height: height });

            let newItemAttr = { x: cornerXY.x, y: cornerXY.y, width: width, height: height }

            updateSingleHighlightImage(node, item, newItemAttr);


        } else {
            let newImageObj = new Image();

            let width = allDeviceTypes[item.data_deviceid].width / 1000 * scale;
            let height = allDeviceTypes[item.data_deviceid].depth / 1000 * scale;

            if (roomObj.unit === 'feet') {
                width = width * 3.28084;
                height = height * 3.28084;
            }

            let centerX = (item.x * scale) + pxOffset;
            let centerY = (item.y * scale) + pxOffset;

            let cornerXY = findUpperLeftXY({ x: centerX, y: centerY, rotation: item.rotation, width: width, height: height });

            newImageObj.src = './assets/images/' + allDeviceTypes[item.data_deviceid].topImage;
            newImageObj.onload = function () {
                node.image(newImageObj);
                node.x(cornerXY.x + activeRoomX * scale);
                node.y(cornerXY.y + activeRoomY * scale);
                node.width(width);
                node.height(height);

                let textLabel = stage.findOne('#label~' + node.id());

                if (textLabel) {
                    moveLabel(node, textLabel);
                }

            }
        }
    });
}

let hightlightImageItems = {};

function updateSingleHighlightImage(node, item, newItemAttr) {
    let imageSize = 200; /* pixels */
    let picScale = imageSize / sizeToAddOultine;

    let itemType = allDeviceTypes[item.data_deviceid];

    /* create a temporary div for the stage, remove if it already exits */
    let divContainerId = 'containerImageCreate';
    let checkDiv = document.getElementById(divContainerId);
    if (checkDiv) {
        checkDiv.remove();
    }

    let divContainer = document.createElement('div');
    divContainer.id = divContainerId;
    divContainer.style.display = 'none';
    document.body.appendChild(divContainer);


    const stageForImageCreation = new Konva.Stage({
        container: divContainerId,
        width: imageSize,
        height: imageSize,
    });

    const layer = new Konva.Layer();
    stageForImageCreation.add(layer);

    let imageObj = new Image();


    imageObj.onload = function imageObjOnLoad() {
        let imageItem = new Konva.Image({
            x: (imageSize - (picScale * itemType.width)) / 2,
            y: (imageSize - (picScale * itemType.depth)) / 2,
            image: imageObj,
            width: picScale * itemType.width,
            height: picScale * itemType.depth,

        });
        layer.add(imageItem);

        let cardImage = new Image();
        cardImage.src = stageForImageCreation.toDataURL();


        if (!(item.data_deviceid in hightlightImageItems)) {
            hightlightImageItems[item.data_deviceid] = {};
            hightlightImageItems[item.data_deviceid].image = cardImage;
        }

        cardImage.onload = function () {
            node.image(cardImage);

            node.width(newItemAttr.width);
            node.height(newItemAttr.height);
            node.x(newItemAttr.x);
            node.y(newItemAttr.y);

            let textLabel = stage.findOne('#label~' + node.id());

            if (textLabel) {
                moveLabel(node, textLabel);
            }
        };

    }

    imageObj.src = './assets/images/' + itemType.topImage;



    layer.add(createHighlightRect());
}


function createHighlightRect() {
    const rect = new Konva.Rect({
        x: 8,
        y: 8,
        width: 184,
        height: 184,
        stroke: '#FFA500',
        strokeWidth: 16,
        cornerRadius: 100,
        fill: '#0001',
    });
    return rect;
}

function createHighlightImage(deviceId, imageObj2, minimumSize = 500) {

    let imageSize = 200; /* pixels */
    let picScale = imageSize / minimumSize;

    let itemType = allDeviceTypes[deviceId];


    if (itemType.width < minimumSize && itemType.depth < minimumSize) {

        //   let divContainerId = 'containerImageCreate-' + createUuid();

        let divContainerId = 'containerImageCreate';
        let checkDiv = document.getElementById(divContainerId);
        if (checkDiv) {
            checkDiv.remove();
        }

        let divContainer = document.createElement('div');
        divContainer.id = divContainerId;
        divContainer.style.display = 'none';
        document.body.appendChild(divContainer);


        const stageForImageCreation = new Konva.Stage({
            container: divContainerId,
            width: imageSize,
            height: imageSize,
        });

        const layer = new Konva.Layer();
        stageForImageCreation.add(layer);

        let imageObj = new Image();

        imageObj.onload = function imageObjOnLoad() {
            let imageItem = new Konva.Image({
                x: (imageSize - (picScale * itemType.width)) / 2,
                y: (imageSize - (picScale * itemType.depth)) / 2,
                image: imageObj,
                width: picScale * itemType.width,
                height: picScale * itemType.depth,


            });
            layer.add(imageItem);
            stageForImageCreation.toDataURL();

            imageObj2.src = stageForImageCreation.toDataURL();

        }

        imageObj.src = './assets/images/' + itemType.topImage;


        layer.add(createHighlightRect());

    }
}


/*
    Cache Images so if internet is lost, insert images to canvas still works.
    Keep track of number of images cached. Once all cached, create highlight images.
*/

function preLoadTopImages() {
    let preLoadTypes = [videoDevices, microphones, displays, chairs];
    let totalDevices = 0;
    let counter = 0;

    /* count up total devices */
    preLoadTypes.forEach(typeGroup => {
        totalDevices = totalDevices + typeGroup.length;
    });


    preLoadTypes.forEach(list => {

        list.forEach((item) => {
            if ('topImage' in item) {
                let imageLocation = './assets/images/' + item.topImage;

                groupBackground.add();

                let imageObj = new Image();

                imageObj.src = imageLocation;

                imageObj.onload = function imageObjOnloadPreLoad() {
                    var img = new Konva.Image({
                        x: 1,
                        y: 1,
                        image: imageObj,
                        width: 1,
                        height: 1,
                        visible: false,

                    });

                    counter++;

                    /* last image is cached if totalDevices === counter **/
                    if (totalDevices === counter) {
                        // console.info('** last item loaded **', item.id);
                    }

                };

            }
        });
    });
}

if (isCacheImages) {
    preLoadTopImages();
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

    const scripts = [script];
    for (let i = 0; i < scripts.length; i++) {
        canvasToJson();

        await setExternalScripts(scripts[i]);

        createQrCode();

        createShareableLink();
    }
}


async function loadDrpDownOverrideScript() {

    const script = './js/drpDownOverride.js';

    await setExternalScripts(script);

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

    roomObj.roomId = createRoomId();

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

    closeNewRoomDialog();
}



const fileInputImage = document.getElementById('fileInputImage');

/* change the anchors / handles depending on the selected node. Tables are resizable. Walls are resizable in 2 directions */
function resizeTableOrWall() {

    let nodes = tr.nodes();
    if (nodes.length === 1) {

        changeWallAnchors();

        if (nodes[0].data_deviceid.startsWith('wallChairs') || nodes[0].data_deviceid.startsWith('couch')) {
            tr.enabledAnchors(['bottom-center']);
            changeWallAnchors('wallChairs');
            tr.resizeEnabled(true);
        }
        else if (nodes[0].data_deviceid.startsWith('sphere') || nodes[0].data_deviceid.startsWith('cylinder')) {
            tr.enabledAnchors(['bottom-right']);
            changeWallAnchors('wallChairs');
            tr.resizeEnabled(true);
        }
        else if (nodes[0].data_deviceid.startsWith('wall') || nodes[0].data_deviceid.startsWith('backgroundImageFloor')) {
            tr.enabledAnchors(['top-center', 'bottom-center']);
            changeWallAnchors(true);
            tr.resizeEnabled(true);
        } else if (nodes[0].data_deviceid.startsWith('tblSchoolDesk') || nodes[0].data_deviceid.startsWith('tblPodium')) {
            tr.enabledAnchors(['middle-right', 'middle-left']);
            tr.resizeEnabled(true);
        } else if (nodes[0].data_deviceid.startsWith('tblCurved')) {
            tr.resizeEnabled(false);
        }
        else if (nodes[0].data_deviceid.startsWith('tbl') || nodes[0].data_deviceid.startsWith('box') || nodes[0].data_deviceid.startsWith('stageFloor') || nodes[0].data_deviceid.startsWith('carpet')) {
            tr.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
            tr.resizeEnabled(true);
        } else {
            tr.resizeEnabled(false);
        }

        lastSelectedNodePosition = nodes[0].clone();

    }

}

function changeWallAnchors(isWall = false) {
    tr.anchorStyleFunc((anchor) => {

        if (anchor.attrs.name.startsWith('top-center') || anchor.attrs.name.startsWith('bottom-center')) {



            let defaultScale = 12; /* the larger this number, the smaller ratio */
            let minimumSize = 0.6;


            let ratioFactor = (scale / defaultScale * zoomValue / 100 / 6);

            if (roomObj.unit === 'meters') ratioFactor = ratioFactor / 3.28084;

            // ratioFactor = ratioFactor + 0.1;

            ratioFactor = ratioFactor + minimumSize;
            ;

            if (isWall === 'wallChairs' || isWall === 'couch') {
                anchor.height(5 * ratioFactor);
                anchor.width(20 * ratioFactor);

                if (anchor.attrs.name.startsWith('bottom-center')) {
                    anchor.offsetY(0 * ratioFactor);
                    anchor.offsetX(10 * ratioFactor);
                    anchor.fill('#FDDA0D');
                    anchor.stroke('#44444488');
                }

            }
            else if (isWall) {


                anchor.height(5 * ratioFactor);
                anchor.width(20 * ratioFactor);

                if (anchor.attrs.name.startsWith('bottom-center')) {
                    //option 1

                    anchor.offsetY(0 * ratioFactor);
                    anchor.offsetX(10 * ratioFactor);

                    anchor.fill('#FFFFFF88');



                }
                else if (anchor.attrs.name.startsWith('top-center')) {

                    anchor.fill('#FFFFFF88');
                    anchor.offsetY(5 * ratioFactor);
                    anchor.offsetX(10 * ratioFactor);
                }

            } else {

                if (anchor.attrs.name.startsWith('bottom-center')) {
                    anchor.height(10);
                    anchor.offsetY(5);
                    anchor.width(10);
                    anchor.offsetX(5);
                }
                else if (anchor.attrs.name.startsWith('top-center')) {
                    anchor.height(10);
                    anchor.offsetY(5);
                    anchor.width(10);
                    anchor.offsetX(5);
                }


                // anchor.stroke('lightBlue');
                anchor.fill('white');
                anchor.stroke("rgb(0, 161, 255)");
            }


        }

        updateRotaterAnchor(anchor);
    })
}


function testiFrameToggle(allowClose = false) {

    if (!testiFrame) return;

    if (document.getElementById('floatingWorkspace').style.display === 'none') {

        document.getElementById('floatingWorkspace').style.display = '';

        if (testiFrameInitialized === false) {
            testiFrameInitialized = true;
            openWorkspaceWindow(false);
            floatingWorkspaceResize('slideOver');
            // setTimeout(() => {
            //     if (mobileDevice === 'RoomOS') {
            //         floatingWorkspaceResize('fullScreen');
            //     }
            // }, 1000);
        }


    } else if (allowClose) {
        document.getElementById('floatingWorkspace').style.display = 'none';
    }
}


setupDragAndDropImport()
// import a file by dragging and dropping it into the tab
function setupDragAndDropImport() {
    const onFileDrop = (e) => {
        e.preventDefault();
        const item = e.dataTransfer?.items?.[0];
        if (item && item.kind === 'file') {
            const file = item.getAsFile();
            const fileName = file.name;
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = function (evt) {
                const text = evt.target.result;
                try {
                    const json = JSON.parse(text);
                    importJson(json)

                } catch (error) {
                    console.error(error);
                    alert(`Error loading file '${fileName}':\n\n${error.message}`);
                }
            }
        }
    }

    document.body.addEventListener('dragover', e => e.preventDefault())
    document.body.addEventListener('drop', onFileDrop)
}


function floatingWorkspaceResize(size) {

    document.getElementById('floatingWorkspaceBtnFullScreen').style.borderStyle = 'hidden';
    document.getElementById('floatingWorkspaceBtnPip').style.borderStyle = 'hidden';
    document.getElementById('floatingWorkspaceBtnSlideOver').style.borderStyle = 'hidden';

    if (size === 'fullScreen') {
        document.getElementById('floatingWorkspace').style.left = 0 + 'px';
        document.getElementById('floatingWorkspaceBtnFullScreen').style.borderStyle = '';
        document.getElementById('floatingWorkspace').style.top = 0 + 'px';
        document.getElementById('floatingWorkspace').style.width = '100%';
        document.getElementById('floatingWorkspace').style.height = '100%';
    }
    else if (size === 'slideOver') {
        document.getElementById('floatingWorkspaceBtnSlideOver').style.borderStyle = '';
        document.getElementById('floatingWorkspace').style.left = (window.innerWidth) * 0.595 + 'px';
        document.getElementById('floatingWorkspace').style.top = '1%';
        document.getElementById('floatingWorkspace').style.width = (window.innerWidth) * 0.4 + 'px';
        document.getElementById('floatingWorkspace').style.height = '98%';
    }
    else if (size === 'pip') {
        document.getElementById('floatingWorkspaceBtnPip').style.borderStyle = '';
        document.getElementById('floatingWorkspace').style.left = (window.innerWidth * 3 / 4 - 10) + 'px';
        document.getElementById('floatingWorkspace').style.top = (window.innerHeight * 1 / 2 + 70) + 'px';
        document.getElementById('floatingWorkspace').style.width = (window.innerWidth * .25) + 'px';
        document.getElementById('floatingWorkspace').style.height = (window.innerHeight * .25) + 'px';
    }

}

/* key commands */
function onKeyDown(e) {
    const { key, target } = e;
    const { tagName } = target;
    const DELTA = 1; /* change in key movement in Canvas pixel */
    let isShortCutKeyUsed = false;

    if ((key === ',' || key === '.') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
    }

    if (blockKeyActions) return;

    if ((key === 'r') && e.shiftKey && (e.ctrlKey || e.metaKey)) return; /* allow for a hard refresh. */

    /* export to the Workspace Designer */
    if (key === 'e' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        downloadFileWorkspace();
    }

    if ((key === ',' || key === '.') && (e.ctrlKey || e.metaKey)) {
        if (key === ',') {

            rotateRoom(-90);
        } else if (key === '.') {

            rotateRoom(90);
        }
    }

    /* save / download VRC JSON file */
    if (key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        downloadRoomObj();
    }

    if (key === 'm' && (e.ctrlKey)) {
        measuringToolOn(true);
    }


    if (((key === 'o') || (key === 'i')) && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('fileUpload').click();
    }

    if (testiFrame && ((key === 'w' || key === '3') && (e.ctrlKey || e.metaKey))) {

        e.preventDefault();
        testiFrameToggle(true);
    }

    const inputElements = ['input', 'textarea']

    {
        if (key === ' ' && !inputElements.includes(target.tagName?.toLowerCase())) {
            quickAddMouse.x = mouseUnit.x;
            quickAddMouse.y = mouseUnit.y;
            toggleQuickAdd(true);
        }


        if (!inputElements.includes(target.tagName?.toLowerCase()) && (!(e.ctrlKey || e.metaKey))) {

            if (isWallBuilderOn) {
                if (key === 's') {
                    changeWallBuilderWall(key);
                } else if (key === 'g') {
                    changeWallBuilderWall(key);
                } else if (key === 'w') {
                    changeWallBuilderWall(key);
                } else if (key === 'c') {
                    changeWallBuilderWall(key);
                }
            }
            else if ((key === 'c')) { /* camera coverage toggle */
                shadingCameraVisible();
                displayDistanceVisible(false);
                shadingMicrophoneVisible(false);
            }
            else if ((key === 'd')) { /* display coverage toggle */
                shadingCameraVisible(false);
                displayDistanceVisible();
                shadingMicrophoneVisible(false);
            }
            else if ((key === 'm')) { /* display mic coverage toggle */
                shadingCameraVisible(false);
                displayDistanceVisible(false);
                shadingMicrophoneVisible();
            }
        }
    }



    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(tagName)) return;

    if (key === 'Shift') {
        isShiftKeyDown = true;
    }



    /* duplicate item takes time, so prevent default anytime the D key is pressed */
    if (key === 'd') {
        e.preventDefault();
    }

    if (key === 'Backspace' || key === 'Delete') {
        deleteTrNodes();
        isShortCutKeyUsed = true;
    }
    else if ((key === 'Escape' || key === 'Esc')) {
        if (isMeasuringToolOn) {
            hideMeasuringTool()

        }

        closeAllDialogModals();

        if (isWallBuilderOn && wallBuilderWritingState !== 'none') {

            wallBuilderRestart();
        } else if (isWallBuilderOn) {
            wallBuilderOn(false);
        }

        if (isWallWriterOn2 && wallWriterConnectorLine2.isVisible()) {
            wallBuilderRestart2();
        } else if (isWallWriterOn2) {
            wallBuilderOn2(false);
        }


        if (!(simplePathEditorId === '' || simplePathEditorId === 'none')) {
            polyBuilderOn(false);
            updateItem();
        } else if (isPolyBuilderOn) {
            polyBuilderOn(false);
        }


        e.preventDefault();
        toggleQuickAdd(false);
        tr.nodes([]);
        enableCopyDelBtn();
    }
    else if ((key === 'z') && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        btnRedoClicked();
        isShortCutKeyUsed = true;
    }
    else if (e.ctrlKey || e.metaKey) {

        if (key === 'y' || key === 'z' || key === 'r') {
            e.preventDefault();
        }

        if (key === 'y' & redoArray.length > 0) {
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
        } else if (key === 'r') {
            e.preventDefault();
            rotateTrNodeItems();
            isShortCutKeyUsed = true;
        }
        // else if (key === 'f'){
        //     e.preventDefault();
        //     flipItems();
        //     isShortCutKeyUsed = true;
        // }
    }




    tr.nodes().forEach(shape => {

        if (e.ctrlKey || e.metaKey) {

            if (e.keyCode === 37) {
                // rotateNodeAroundCenter(shape, DELTA);
            } else if (e.keyCode === 38) {
                if (!shape.data_zPosition) {
                    shape.data_zPosition = 0;
                }
                shape.data_zPosition = round(shape.data_zPosition + DELTA * 0.01);

                isShortCutKeyUsed = true;
            } else if (e.keyCode === 39) {
                //
            } else if (e.keyCode === 40) {

                if (!shape.data_zPosition) {
                    shape.data_zPosition = 0;
                }
                shape.data_zPosition = round(shape.data_zPosition - DELTA * 0.01);

                isShortCutKeyUsed = true;
            }
        } else {

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

        }


        if (isShortCutKeyUsed) {
            e.preventDefault();
            updateShading(shape);

            lastKeyDownMovement = true;
        }

        if (tr.nodes().length === 1) {
            updateFormatDetails(shape.id());
        }
    })
}

function quickAddFromButton(){

    quickAddMouse.x = -1000;
    quickAddMouse.y = -1000;
    toggleQuickAdd(true);

}



function toggleQuickAdd(show) {
    const dialog = document.querySelector('.quick-dialog');

    tr.nodes([]);

    // already open
    if (show && dialog.style.display === 'flex') return

    dialog.style.display = show ? 'flex' : 'none';
    const input = dialog.querySelector('input');

    if (show) {
        if (input) {
            setTimeout(() => {
                input.focus();
                input.select();
            }, 20)
        }
    }
    else if (input) {
        input.blur();
    }
}


function searchQuickItem(items, word = '') {
    if (word.length < 2) return []


    let regex = /(^_.*)|(.*\*$)/;

    if (document.getElementById('useNonWorkspaceItemsCheckBox').checked) {
        regex = /(^_.*)|(.*\*\*$)/;
    }

    /* by typing ** in the Quick Search box, find hidden objects */
    if (/^\*\*.*/.test(word)) {
        regex = /(^_.*)/;
        word = word.replace(/\*\*/, '');
    }


    const match = (search = '', fullWord = '') =>
        fullWord.toLowerCase().replaceAll(' ', '')
            .includes(search.toLowerCase().replaceAll(' ', ''))

    const all = items.filter(i => match(word, i.name))

    // return all.filter(i => !i.name.includes('Unknown'))

    return all.filter(i => !regex.test(i.name));
}

function onQuickAddChange(e) {
    const allItems = [].concat(tables, videoDevices, microphones, chairs, displays, boxes, stageFloors, rooms);

    const word = e.target.value;
    const matches = searchQuickItem(allItems, word);

    const gallery = document.querySelector('.quick-dialog .gallery');

    gallery.innerHTML = '';
    matches.forEach((m, n) => {
        const item = document.createElement('button');

        const parentGroup = allDeviceTypes[m.id]?.parentGroup;

        const img = m.frontImage || m.topImage;
        if (img) {
            const i = document.createElement('img');
            i.src = `./assets/images/${img}`;
            i.draggable = false;
            item.appendChild(i);
            i.id = `${parentGroup}-${m.id}-img`;
        }
        const label = document.createElement('label');
        label.innerText = m.name?.slice(0, 30);
        item.title = `${m.name} - Tap to add to room`;
        item.appendChild(label);



        item.classList.add('flexItems');
        item.classList.add('equipmentItemOnMenu');
        item.id = `${parentGroup}-${m.data_deviceid}-div`;
        item.draggable = false;

        item.onclick = () => {
            const { roomWidth, roomLength } = roomObj.room;

            const attrs = {};
            let b; /* boundary */
            b = roomObj.unit === 'feet' ? 0.6 : 0.2;

            if (quickAddMouse.x > -b && quickAddMouse.x < (roomWidth + b) && quickAddMouse.y > -b && quickAddMouse.y < (roomLength + b)) {
                attrs.x = quickAddMouse.x;
                attrs.y = quickAddMouse.y;
            } else {
                attrs.x = roomWidth / 2;
                attrs.y = roomLength / 2;
            }

            insertItemFromMenu(m.id, attrs);

            toggleQuickAdd(false);

        }

        // item.addEventListener('dragstart', dragStart);
        // item.addEventListener('drag', drag);
        // item.addEventListener('dragend', dragEnd);
        // item.addEventListener('touchstart', touchStart);
        // item.addEventListener('touchmove', touchMove);
        // item.addEventListener('touchend', touchEnd);

        gallery.appendChild(item);
    })

    if (!matches.length) {
        const msg = word.length > 1 ? 'No matching object found.' : 'Type at least 2 characters.'
        gallery.innerHTML = `<i>${msg}</i>`;
    }
}

function onQuickInputKey(event) {
    if (event.key === 'Enter') {
        const first = document.querySelector('.quick-dialog button');
        if (first) {
            first.click();
        }
    }
    else if (event.key === 'Escape') {
        toggleQuickAdd(false);
    }
}

/* Take a wallChairs object and return an array of chairs */
function expandChairs(item, unit = roomObj.unit) {
    let singleChairWidth = 2.35;
    let chairArray = [];
    if (unit === 'meters') {
        singleChairWidth = singleChairWidth / 3.28084;
    }

    let numberOfChairs = Math.round(item.height / singleChairWidth)

    let rotation = normalizeDegree(item.rotation - 90);


    let tempChair =
    {
        "x": item.x,
        "y": item.y,
        "rotation": item.rotation,
        "height": 0.64,
        "width": 0.64,
        "name": "Chair",
        "data_deviceid": "chair",
        "id": item.id
    }



    let centerXY = getItemCenter(tempChair);

    let primaryChair = structuredClone(tempChair);

    primaryChair.x = centerXY.x;
    primaryChair.y = centerXY.y;
    primaryChair.id = 'primaryChair-1-of-' + numberOfChairs + '-' + item.id;
    primaryChair.rotation = rotation;

    if ('data_zPosition' in item) {
        primaryChair.data_zPosition = item.data_zPosition;
    }

    if ('data_tilt' in item) {
        primaryChair.data_tilt = item.data_tilt;
    }

    if ('data_slant' in item) {
        primaryChair.data_slant = item.data_slant;
    }

    chairArray.push(primaryChair);

    for (let i = 1; i < numberOfChairs; i++) {
        let newXY = findNewTransformationCoordinate(primaryChair, singleChairWidth * i, 0);
        let rowChair = structuredClone(primaryChair);
        rowChair.x = newXY.x;
        rowChair.y = newXY.y;
        rowChair.id = 'rowChair-' + (i + 1) + '-of-' + numberOfChairs + '-' + item.id;
        chairArray.push(rowChair);
    }


    return chairArray;


}

/* Don't let degrees be greater than 360 or less than -360 */
function normalizeDegree(degree) {
    degree = Number(degree);
    while (degree > 359) {
        degree = degree - 360;
    }

    while (degree < -359) {
        degree = degree + 360;
    }
    return degree;
}

/* Rotate a point x, y around origin x,y a certain amount of degrees */
function rotatePointAroundOrigin(pointX, pointY, originX, originY, angleInDegrees) {

    const angleInRadians = angleInDegrees * Math.PI / 180;
    const cosTheta = Math.cos(angleInRadians);
    const sinTheta = Math.sin(angleInRadians);

    const translatedX = pointX - originX;
    const translatedY = pointY - originY;

    const rotatedX = translatedX * cosTheta - translatedY * sinTheta;
    const rotatedY = translatedX * sinTheta + translatedY * cosTheta;

    const finalX = rotatedX + originX;
    const finalY = rotatedY + originY;

    return { x: finalX, y: finalY };
}

/*
comeback to flipItems
*/
function flipItems() {
    let rotationAmount = 90;

    let trCenter = getNodeCenter(tr); /* get the center of the tr Transformer node to perform the transform */

    tr.nodes().forEach(node => {

        let nodeCenter = getNodeCenter(node);

        let rotation = normalizeDegree(node.rotation())
        let rotationAmount;
        if (rotation > 0) {
            rotationAmount = -(rotation * 2);
        } else {
            rotationAmount = rotation * 2;
        }


        let newNodeXY = rotatePointAroundOrigin(nodeCenter.x, nodeCenter.y, node.x(), node.y(), rotationAmount);


        // let totalRotation = normalizeDegree(rotationAmount);

        let nodeCornerXY = findUpperLeftXY({ x: newNodeXY.x, y: newNodeXY.y, rotation: rotationAmount, width: node.width(), height: node.height() })
        node.x(newNodeXY.x);
        node.y(newNodeXY.y);



        node.offsetX(node.width() / 2);
        node.offsetY(node.height() / 2);

        // node.offsetX(nodeCenterXY.x - node.x());
        // node.offsetY(nodeCenterXY.y - node.y());

        // node.x(nodeCornerXY.x);
        // node.y(nodeCornerXY.y);

        node.rotation(-node.rotation());

        node.offsetX(0); /* reset the offsetX and offsetY back to zero */
        node.offsetY(0);

    })
}


function selectAllTrNodes() {
    let shapes = groupVideoDevices.getChildren();

    shapes = shapes.concat(groupStageFloors.getChildren());

    shapes = shapes.concat(groupDisplays.getChildren());

    shapes = shapes.concat(groupMicrophones.getChildren());

    shapes = shapes.concat(groupBoxes.getChildren());

    shapes = shapes.concat(groupRooms.getChildren());

    shapes = shapes.concat(groupSpeakers.getChildren());

    shapes = shapes.concat(groupTables.getChildren());

    shapes = shapes.concat(groupTouchPanel.getChildren());

    shapes = shapes.concat(groupChairs.getChildren());

    tr.nodes(shapes);
};

function rotateBackgroundImage(rotationAmount, rotationCenter) {
    let node = stage.findOne('#konvaBackgroundImageFloor');

    if (node) {
        let nodeCenter = getNodeCenter(node);
        let newNodeXY = rotatePointAroundOrigin(nodeCenter.x, nodeCenter.y, rotationCenter.x, rotationCenter.y, rotationAmount);

        let totalRotation = normalizeDegree(node.rotation() + rotationAmount);

        let nodeCornerXY = findUpperLeftXY({ x: newNodeXY.x, y: newNodeXY.y, rotation: totalRotation, width: node.width(), height: node.height() })
        node.x(nodeCornerXY.x);
        node.y(nodeCornerXY.y);

        node.offsetX(nodeCenter.x - node.x());
        node.offsetY(nodeCenter.y - node.y());

        node.rotation(totalRotation);

        node.offsetX(0); /* reset the offsetX and offsetY back to zero */
        node.offsetY(0);

    }
}


function blockAndMessage(message = 'Please Wait', time = 2000){
    let dialog = document.getElementById('waitMessageDialog');

    dialog.textContent = message;

    dialog.showModal();
    blockKeyActions = true;

    setTimeout(()=>{
        dialog.close();
        blockKeyActions = false;
    }, time)

}

function rotateRoom(rotationAmount) {

    if (isActiveRoomPart) {
        alertDialog('Room Rotate Not Available.', 'First go back to the floorplan overview, then rotate entire floorplan.')
        return;
    }

    if (!addressBarUpdate) {
        alertDialog('Room initializing. Please wait', 'Trying rotating the room again in 3 seconds.');
        return;
    }

    if (blockKeyActions) return;

    if (isRotatingRoom) return;

    document.getElementById('dialogLoadingTemplate').showModal();

    isRotatingRoom = true;
    blockKeyActions = true;

    /* use setTimeOut so that the .showModal() abobe renders before the page is shown */
    setTimeout(function startRotateRoom() {

        if (zoomValue !== 100) {
            zoomInOut('reset');
        }



        selectAllTrNodes();

        let trNodesLength = tr.nodes().length;
        let timeForEachStage = (300 + trNodesLength / 10);


        setTimeout(() => {
            isRotatingRoom = false;
            canvasToJson();
        }, 1 * timeForEachStage + 200);

        setTimeout(() => {
            document.getElementById('dialogLoadingTemplate').close();
            blockKeyActions = false;
        }, 1 * timeForEachStage + 200);


        let roomWidth = roomObj.room.roomWidth;
        let roomLength = roomObj.room.roomLength;
        let roomSurfaces = { ...roomObj.roomSurfaces };

        /* make the room the larger of roomWidth or roomLenght on both sides */

        let stageWidth = stage.width();
        let stageHeight = stage.height();



        let roomWidthLength;
        if (roomWidth > roomLength) {
            roomWidthLength = roomWidth;
            stage.height(stageWidth);
        } else {
            roomWidthLength = roomLength
            stage.width(stageHeight);
        }


        roomObj.room.roomLength = roomWidthLength;
        roomObj.room.roomWidth = roomWidthLength;


        let rotationCenter = {};

        rotationCenter.x = ((roomWidth) / 2) * scale + pxOffset;
        rotationCenter.y = ((roomLength)) * scale / 2 + pyOffset;

        // flip for counter clockwise
        if (rotationAmount === 90) {
            rotationCenter.x = rotationCenter.y;
        }
        else {
            rotationCenter.y = rotationCenter.x;
        }


        selectAllTrNodes();
        rotateTrNodeItems(rotationAmount, rotationCenter);
        rotateBackgroundImage(rotationAmount, rotationCenter);

        roomObj.room.roomLength = roomWidth;
        roomObj.room.roomWidth = roomLength;

        if (rotationAmount === 90) {

            roomObj.roomSurfaces.leftwall = roomSurfaces.backwall;
            roomObj.roomSurfaces.backwall = roomSurfaces.rightwall;
            roomObj.roomSurfaces.rightwall = roomSurfaces.videowall;
            roomObj.roomSurfaces.videowall = roomSurfaces.leftwall;

        }
        else {
            roomObj.roomSurfaces.leftwall = roomSurfaces.videowall;
            roomObj.roomSurfaces.backwall = roomSurfaces.leftwall;
            roomObj.roomSurfaces.rightwall = roomSurfaces.backwall;
            roomObj.roomSurfaces.videowall = roomSurfaces.rightwall;
        }

        canvasToJson();

    }, 1);

    //drawRoom(true, true, false);



    /*
    setTimeout(() => {
        isRotatingRoom = false;
        canvasToJson();
    }, 3 * timeForEachStage);

    setTimeout(() => {
        document.getElementById('dialogLoadingTemplate').close();
        isFreezeKeys = false;
    }, 4 * timeForEachStage + 500);


    let roomWidth = roomObj.room.roomWidth;
    let roomLength = roomObj.room.roomLength;
    let roomSurfaces = { ...roomObj.roomSurfaces };

    // make the room the larger of roomWidth or roomLenght on both sides
    let roomWidthLength;
    if (roomWidth > roomLength) {
        roomWidthLength = roomWidth;
    } else {
        roomWidthLength = roomLength
    }


    roomObj.room.roomLength = roomWidthLength;
    roomObj.room.roomWidth = roomWidthLength;

    drawRoom(true, true, false);

    setTimeout(function nowRotateTrNodeItems() {

        let rotationCenter = {};

        rotationCenter.x = ((roomWidth) / 2) * scale + pxOffset;
        rotationCenter.y = ((roomLength)) * scale / 2 + pyOffset;

        // flip for counter clockwise
        if (rotationAmount === 90) {
            rotationCenter.x = rotationCenter.y;
        }
        else {
            rotationCenter.y = rotationCenter.x;
        }




        selectAllTrNodes();
        rotateTrNodeItems(rotationAmount, rotationCenter);
        rotateBackgroundImage(rotationAmount, rotationCenter);
        canvasToJson();
    }, timeForEachStage);


    // reset room dimensions
    setTimeout(function nowResizeRoom() {
        tr.nodes([]);
        roomObj.trNodes = [];
        roomObj.room.roomLength = roomWidth;
        roomObj.room.roomWidth = roomLength;

        if (rotationAmount === 90) {

            roomObj.roomSurfaces.leftwall = roomSurfaces.backwall;
            roomObj.roomSurfaces.backwall = roomSurfaces.rightwall;
            roomObj.roomSurfaces.rightwall = roomSurfaces.videowall;
            roomObj.roomSurfaces.videowall = roomSurfaces.leftwall;

        }
        else {
            roomObj.roomSurfaces.leftwall = roomSurfaces.videowall;
            roomObj.roomSurfaces.backwall = roomSurfaces.leftwall;
            roomObj.roomSurfaces.rightwall = roomSurfaces.backwall;
            roomObj.roomSurfaces.videowall = roomSurfaces.rightwall;
        }
        drawRoom(true, true, false);
    }, timeForEachStage * 2);
    */

}

function rotateTrNodeItems(rotationAmount = 90, rotationCenter) {

    if (!rotationCenter) {
        rotationCenter = getNodeCenter(tr); /* get the center of the tr Transformer node to perform the transform */
    }

    tr.nodes().forEach(node => {

        let nodeCenter = getNodeCenter(node);
        let newNodeXY = rotatePointAroundOrigin(nodeCenter.x, nodeCenter.y, rotationCenter.x, rotationCenter.y, rotationAmount);

        let totalRotation = normalizeDegree(node.rotation() + rotationAmount);

        let nodeCornerXY = findUpperLeftXY({ x: newNodeXY.x, y: newNodeXY.y, rotation: totalRotation, width: node.width(), height: node.height() })
        node.x(nodeCornerXY.x);
        node.y(nodeCornerXY.y);

        node.offsetX(nodeCenter.x - node.x());
        node.offsetY(nodeCenter.y - node.y());

        node.rotation(totalRotation);

        node.offsetX(0); /* reset the offsetX and offsetY back to zero */
        node.offsetY(0);

        updateShading(node);

    })

}



const rotatePoint = ({ x, y }, rad) => {
    const rcos = Math.cos(rad);
    const rsin = Math.sin(rad);
    return { x: x * rcos - y * rsin, y: y * rcos + x * rsin };
};

function rotateAroundCenter2(node, rotation) {
    const topLeft = { x: -node.width() / 2, y: -node.height() / 2 };
    const current = rotatePoint(topLeft, Konva.getAngle(node.rotation()));
    const rotated = rotatePoint(topLeft, Konva.getAngle(rotation));
    const dx = rotated.x - current.x;
    const dy = rotated.y - current.y;
    node.rotation(rotation);
    node.x(node.x() + dx);
    node.y(node.y() + dy);
}

function rotateAroundCenter(node, deg) {

    const w = node.width();
    const h = node.height();

    node.offset({ x: w / 2, y: h / 2 });
    node.rotate(deg);

    // node.offset({x: 0, y: 0});

}

function rotateNodeAroundCenter(node, rotationAmount) {
    let nodeCenter = getNodeCenter(node);

    // let newNodeXY = rotatePointAroundOrigin(nodeCenter.x, nodeCenter.y, nodeCenter.x,nodeCenter.y, rotationAmount);

    let nodeCornerXY = findUpperLeftXY({ x: nodeCenter.x, y: nodeCenter.y, rotation: rotation, width: node.width(), height: node.height() })
    node.x(nodeCornerXY.x);
    node.y(nodeCornerXY.y);

    node.offsetX(nodeCenter.x - node.x());
    node.offsetY(nodeCenter.y - node.y());

    node.rotation(rotationAmount);

    node.offsetX(0); /* reset the offsetX and offsetY back to zero */
    node.offsetY(0);

}

function onKeyUp(e) {
    if (lastKeyDownMovement) canvasToJson();
    lastKeyDownMovement = false;

    if (e.key === 'Shift') {
        isShiftKeyDown = false;
    }
}

let lastKeyDownMovement = false;  /* keeps track if the last key command was a keyDown on the canvas to capture keyUp */

document.addEventListener('keydown', onKeyDown);

document.addEventListener('keyup', onKeyUp);

function turnOnBackgroundImageButtons() {
    document.getElementById('resizeBackgroundImageCheckBox').disabled = false;
    document.getElementById('transparencySlider').disabled = false;
    document.getElementById('btnSelect2Points').disabled = false;
    document.getElementById('btnDeleteBackgroundImage').disabled = false;

}

function turnOffBackgroundImageButtons() {
    document.getElementById('resizeBackgroundImageCheckBox').disabled = true;
    document.getElementById('transparencySlider').disabled = true;
    document.getElementById('btnSelect2Points').disabled = true;
    document.getElementById('btnUpdateImageScale').disabled = true;
    document.getElementById('btnDeleteBackgroundImage').disabled = true;

}

fileInputImage.addEventListener('change', function (e) {


    if (e.target.files && e.target.files[0]) {

        const reader = new FileReader();

        turnOnBackgroundImageButtons();

        reader.onload = function (e) {

            backgroundImageFloor.onload = function () {

                if (isBackgroundImageFloorFileLoad) {

                    return;
                }

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

                document.getElementById('transparencySlider').value = 50;
                changeTransparency(50);

                setTimeout(() => {
                    canvasToJson();
                }, 2000);


            };
            backgroundImageFloor.src = e.target.result;

            roomObj.backgroundImageFile = backgroundImageFloor.src;

        };
        reader.readAsDataURL(e.target.files[0]);

        drawScaledLineMode = true;
    }
});


function importJson(jsonFile) {
    let jsonFileType = false;

    roomObj.roomId = createRoomId();

    if ('room' in jsonFile) {
        if ((jsonFile.room.roomWidth && jsonFile.room.roomLength && 'roomHeight' in jsonFile.room)) {
            jsonFileType = 'vrc';
        } else {
            console.info('Import Workspace Designer: JSON file missing roomWidth, roomLength or roomHeight')
        }
    }
    else if ('customObjects' in jsonFile) {
        jsonFileType = 'workspaceDesigner';
    }
    else {
        jsonFileType = false;
        console.info('Import Workspace Designer: Room paramter missing from JSON file')
    }

    zoomInOut('reset');

    document.getElementById('dialogLoadingTemplate').showModal();

    document.getElementById("defaultOpenTab").click();

    setTimeout(() => {
        closeAllDialogModals();
    }, 3000);

    if (jsonFileType === 'vrc') {

        resetRoomObj();

        convertMetersFeet(true, jsonFile.unit);

        isBackgroundImageFloorFileLoad = true;


        setTimeout(() => {
            roomObj = structuredClone(jsonFile);
            roomObj.trNodes = [];

            if ('backgroundImageFile' in jsonFile) {
                backgroundImageFloor.src = jsonFile.backgroundImageFile;
                insertKonvaBackgroundImageFloor();
                turnOnBackgroundImageButtons();
                setTimeout(() => { isBackgroundImageFloorFileLoad = false; }, 1000);
            }

            if (!('roomSurfaces' in roomObj)) {
                roomObj.roomSurfaces = structuredClone(defaultRoomSurfaces);
            }

            /* update roomObj items so they can be moved between parentGroups */
            let items = {};
            items.videoDevices = [];
            items.chairs = [];
            items.tables = [];
            items.stageFloors = [];
            items.boxes = [];
            items.rooms = [];
            items.displays = [];
            items.speakers = [];
            items.microphones = [];
            items.touchPanels = [];


            for (const parentGroup in roomObj.items) {
                roomObj.items[parentGroup].forEach(item => {
                    if (!(allDeviceTypes[item.data_deviceid].parentGroup in items)) {
                        items[allDeviceTypes[item.data_deviceid].parentGroup] = [];
                    }

                    items[allDeviceTypes[item.data_deviceid].parentGroup].push(item);
                });
            }

            roomObj.items = items;



            document.getElementById('removeDefaultWallsCheckBox').checked = roomObj.workspace.removeDefaultWalls || false;
            document.getElementById('removeDefaultWallsCheckBox2').checked = roomObj.workspace.removeDefaultWalls || false;


            document.getElementById('addCeilingCheckBox').checked = roomObj.workspace.addCeiling || false;
            drawRoom(true, false, false);
        }, 1500);

    }
    else if (jsonFileType === 'workspaceDesigner') {
        importWorkspaceDesignerFile(jsonFile);
    }
    else {
        console.info('Import: JSON file upload, improper format');
        alert('Unable to import. Improper JSON format.');
    }

    document.getElementById('fileUpload').value = null;
};


const fileJsonUpload = document.getElementById('fileUpload');

fileJsonUpload.addEventListener('change', function (e) {

    closeAllDialogModals();

    if (e.target.files && e.target.files[0]) {
        let reader = new FileReader();
        reader.readAsText(e.target.files[0]);
        reader.onload = function (e) {
            let jsonFile = JSON.parse(reader.result);
            importJson(jsonFile);

        };
    }
});

function alertDialog(headerHtml, mainHtml) {
    let dialogAlertModal = document.getElementById('dialogAlertModal');
    let dialogAlertHeader = document.getElementById('dialogAlertHeader');
    let dialogAlertMain = document.getElementById('dialogAlertMain');


    dialogAlertHeader.innerHTML = headerHtml;
    dialogAlertMain.innerHTML = mainHtml;

    dialogAlertModal.showModal();

}

function importWorkspaceDesignerFile(workspaceObj) {
    resetRoomObj();

    let unknownObjects = [];

    convertMetersFeet(true, 'meters'); /* always import in meters. Get the room canvas ready */
    let roomObj2 = structuredClone(roomObj);
    roomObj2.room = {};
    roomObj2.unit = 'meters';

    roomObj2.name = workspaceObj.title || '';
    roomObj2.workspace.addCeiling = false;
    roomObj2.workspace.removeDefaultWalls = true;
    roomObj2.room.roomHeight = 2;

    roomObj2.roomId = workspaceObj.roomId || roomObj.roomId;




    /* create a structured clone of the array of customObjects. Once an item is parsed, delete it from the array */
    let wdItems = structuredClone(workspaceObj.customObjects);

    /* determine if this is the NEW default walls */
    let defaultWallCount = 0;
    let roomSurfaces = {};

    for (let i = wdItems.length - 1; i >= 0; i--) {

        let wdItem = wdItems[i];

        if (wdItem.id === 'leftwall' || wdItem.id === 'rightwall' || wdItem.id === 'videowall' || wdItem.id === 'backwall') {
            defaultWallCount++;
            roomSurfaces[wdItem.id] = {};

            if ('model' in wdItem) {
                roomSurfaces[wdItem.id].type = wdItem.model;
            } else {
                roomSurfaces[wdItem.id].type = 'regular';
            }

            if ('acousticTreatment' in wdItem) {
                roomSurfaces[wdItem.id].acousticTreatment = wdItem.acousticTreatment;
            }

            if ('door' in wdItem) {
                roomSurfaces[wdItem.id].door = wdItem.door;
            }

        }

    }


    if (defaultWallCount === 4) {

        roomObj2.roomSurfaces = roomSurfaces;
    }

    if ('roomShape' in workspaceObj && 'roomSurfaces' in workspaceObj.roomShape) {

        workspaceObj.roomShape.roomSurfaces.forEach(wallObj => {
            roomObj2.roomSurfaces[wallObj.objectId] = {};

            if ('type' in wallObj) {
                roomObj2.roomSurfaces[wallObj.objectId].type = wallObj.type;
            }

            if ('acousticTreatment' in wallObj) {
                roomObj2.roomSurfaces[wallObj.objectId].acousticTreatment = wallObj.acousticTreatment;
            }

            if ('door' in wallObj) {
                roomObj2.roomSurfaces[wallObj.objectId].door = wallObj.door;
            }

        });
    }

    /* find the floor */
    let isFloor = false;
    if (workspaceObj.roomShape) {
        roomObj2.room.roomWidth = workspaceObj.roomShape.width;
        roomObj2.room.roomLength = workspaceObj.roomShape.length;
        roomObj2.room.roomHeight = workspaceObj.roomShape.height || roomObj2.room.roomHeight;
        if (workspaceObj.roomShape.manual) {
            roomObj2.workspace.removeDefaultWalls = false;
        }
        isFloor = true;
    }
    else {

        for (let i = 0; i < wdItems.length; i++) {
            let wdItem = wdItems[i];
            if ((wdItem.objectType === 'floor' || wdItem.id === 'primaryFloor')) {
                isFloor = true;
                if ('length' in wdItem) {
                    roomObj2.room.roomWidth = wdItem.width;
                    roomObj2.room.roomLength = wdItem.length;
                } else {
                    roomObj2.room.roomWidth = wdItem.scale[0];
                    roomObj2.room.roomLength = wdItem.scale[2]
                }
                wdItem.objectType = 'floor';


            }


        }
    }

    /* with the new default walls (defaultWallCount === 4), they sit on the floor, so subtract 0.2 */
    if (defaultWallCount === 4) {
        roomObj2.room.roomWidth = roomObj2.room.roomWidth - 0.2;
    }

    if (!isFloor) {
        let message = 'Import Workspace Designer: Size of room undetermined. Room Width or floor object not found on import of Workspace Designer!';
        console.info(message);
        alert(message);
    }



    if (document.getElementById('convertDefaultWallsOffCheckBox').checked === true) {
        roomObj2.workspace.removeDefaultWalls = true;
    };

    if (roomObj2.workspace.removeDefaultWalls) {
        document.getElementById("removeDefaultWallsCheckBox").checked = true;
        document.getElementById("removeDefaultWallsCheckBox2").checked = true;
    } else {
        document.getElementById("removeDefaultWallsCheckBox").checked = false;
        document.getElementById("removeDefaultWallsCheckBox2").checked = false;
    }

    /* determine if there is a ceiling.  */
    document.getElementById("addCeilingCheckBox").checked = false;
    for (let i = 0; i < wdItems.length; i++) {
        let wdItem = wdItems[i];
        /* ceiling */
        if (wdItem && wdItem.objectType && wdItem.objectType === 'ceiling') {
            console.info('Import Workspace Designer: adding ceiling');
            roomObj2.workspace.addCeiling = true;
            document.getElementById("addCeilingCheckBox").checked = true;
            if ('position' in wdItem) {
                roomObj2.room.roomHeight = wdItem.position[1];
                if ('scale' in wdItem) {
                    roomObj2.room.roomHeight = roomObj2.room.roomHeight - wdItem.scale[1] / 2;
                }
            }

        }

    }


    for (let i = 0; i < wdItems.length; i++) {
        let wdItem = wdItems[i];
        let candidateKey = {};
        let highHitCount = 0;

        let candidateKeyName = 'none';
        let candidateWdItem = {};

        if (wdItem) {

            /* A person presenter imported as a custom URL gets replaced with the proper API */
            if (wdItem.id === 'presenter' && wdItem.objectType === 'custom' && wdItem.role === 'presenter' && wdItem.customUrl) {
                wdItem.id = 'presenterCustomModified';
                wdItem.objectType = 'person';
                wdItem.model = 'woman-standing';
                delete wdItem.role;
                delete wdItem.customUrl;

            }

            if (wdItem.objectType === 'tree' && document.getElementById('convertDefaultWallsOffCheckBox').checked === false) {
                wdItem.objectType = 'plant';
                roomObj2.workspace.theme = 'christmas';
            }

            /* export and import of the simulated display is not fully supported, therefore convert it from a wall into a column to keep the object */
            if (wdItem.id.startsWith('display21_9') && wdItem.objectType === 'wall') {
                wdItem.color = '#808080'; /* color for column */
                wdItem.width = 0.08;
                if ('comment' in wdItem) {
                    if (!wdItem.comment.startsWith('Display21_9')) {
                        wdItem.comment = 'Display21_9:' + wdItem.comment;
                    }
                } else {
                    wdItem.comment = 'Display21_9';
                }

                if ('role' in wdItem) {
                    delete wdItem.role;
                }
            }

            /* iterate throught the workspaceKey and find the best match on import. objecType > idRegex > model > mount > scale[x,x,x]> size > scale[1,1,1] */
            for (let key in workspaceKey) {
                let hits = 0;
                let keyItem = workspaceKey[key];
                let modifiedWdItem = structuredClone(wdItem);

                if ((keyItem.objectType === wdItem.objectType)) {
                    hits = hits + 200;

                    if ('idRegex' in keyItem && 'id' in wdItem) {
                        let regex = new RegExp(keyItem.idRegex);
                        if (regex.test(wdItem.id)) {
                            hits = hits + 100;
                        }
                    }

                    if ('model' in keyItem && 'model' in wdItem) {
                        if (keyItem.model === wdItem.model) {
                            hits = hits + 40;
                            delete modifiedWdItem.model;
                        }
                    }

                    if ('aspect' in keyItem && 'aspect' in wdItem) {
                        if (keyItem.aspect === wdItem.aspect) {
                            hits = hits + 30;
                            delete modifiedWdItem.aspect;
                        }
                    }

                    if ('mount' in keyItem && 'mount' in wdItem) {
                        if (keyItem.mount === wdItem.mount) {
                            hits = hits + 20;
                            delete modifiedWdItem.mount;
                        }
                    }

                    if ('shareSettings' in keyItem && 'shareSettings' in wdItem) {
                        if (areObjectsEqual(keyItem.shareSettings, wdItem.shareSettings)) {
                            hits = hits + 10;
                            delete modifiedWdItem.shareSettings;
                        }
                    }

                    if ('size' in keyItem && 'size' in wdItem) {
                        if (keyItem.size === wdItem.size) {
                            hits = hits + 6;
                            delete modifiedWdItem.size;
                        }
                    }

                    if ('scale' in keyItem && 'scale' in wdItem) {

                        if (keyItem.scale[0] === wdItem.scale[0] && keyItem.scale[0] === wdItem.scale[0] && keyItem.scale[0] === wdItem.scale[0]) {

                            if (keyItem.scale[0] === 1 && keyItem.scale[0] === 1 && keyItem.scale[0] === 1) {
                                hits = hits + 2;
                            }
                            else {
                                hits = hits + 10;
                            }
                            delete modifiedWdItem.scale;
                        }
                    }

                    if ('color' in keyItem && 'color' in wdItem) {
                        if (keyItem.color === wdItem.color) {
                            hits = hits + 4;
                            delete modifiedWdItem.color;
                        }
                    }

                    if ('role' in keyItem && 'role' in wdItem) {
                        if (keyItem.role === wdItem.role) {
                            hits = hits + 1;
                            delete modifiedWdItem.role;
                        }
                    }

                }

                if (hits > highHitCount) {
                    highHitCount = hits;
                    candidateKey = structuredClone(wdItem);
                    candidateKeyName = key;
                    candidateWdItem = modifiedWdItem;
                }



            }

            if (Object.keys(candidateKey).length === 0) {
                console.info('Import Workspace Designer: Match not found for:', JSON.stringify(wdItem));
                /*

                Do something with unknow objects....

                 */
                unknownObjects.push(wdItem);

            } else {
                console.info('Import Workspace Designer - Insert into RoomObj', JSON.stringify(wdItem));
                console.info('Import Workspace Designer use key: ', candidateKeyName, candidateKey);

                // wdItem = simplifyWdItem(wdItem);

                wdItemToRoomObjItem(candidateWdItem, candidateKeyName, roomObj2, workspaceObj);

                delete wdItems[i];
            }
        }
    }

    deletePossibleRoomKitEqxDisplays(roomObj2);


    if (unknownObjects.length > 0) {
        console.info('Import Workspace Designer: Unknown object total: ', unknownObjects.length);
        console.info('Import Workspace Designer: Unknown objects ', unknownObjects);

        unknownObjects.forEach(wdItem => {
            if (wdItem.id) {
                if ('length' in wdItem && 'width' in wdItem) {
                    wdItemToRoomObjItem(wdItem, 'tblUnknownObj', roomObj2, workspaceObj)
                } else {
                    wdItemToRoomObjItem(wdItem, 'unknownObj', roomObj2, workspaceObj)
                }

            }
        });

    }

    if (workspaceObj.data && workspaceObj.data.vrc && workspaceObj.data.vrc.workspace && workspaceObj.data.vrc.workspace.theme) {
        roomObj2.workspace.theme = workspaceObj.data.vrc.workspace.theme;
        console.info('roomObj.workspace.theme: ', roomObj2.workspace.theme);
    }

    if ('data' in workspaceObj && 'vrc' in workspaceObj.data && 'backgroundImageFile' in workspaceObj.data.vrc && 'backgroundImageFile' in workspaceObj.data.vrc) {
        roomObj2.backgroundImageFile = workspaceObj.data.vrc.backgroundImageFile;
        roomObj2.backgroundImage = workspaceObj.data.vrc.backgroundImage;
    }

    setTimeout(() => {
        roomObj = structuredClone(roomObj2);

        roomObj.trNodes = [];

        isBackgroundImageFloorFileLoad = true;

        if ('backgroundImageFile' in roomObj) {
            console.info('importing workspaceObj.data.vrc.backgroundImage');
            backgroundImageFloor.src = roomObj.backgroundImageFile;
            insertKonvaBackgroundImageFloor();
            turnOnBackgroundImageButtons();
            setTimeout(() => { isBackgroundImageFloorFileLoad = false; }, 1000);
        }

        drawRoom(true, false, false);

        setTimeout(() => {
            zoomInOut('reset');
            drawRoom();
            canvasToJson();
            setTimeout(() => {
                createShareableLink();
                zoomInOut('reset');
            }, 500);


        }, 500);
    }, 1500);



}



/* convert a single Workspace Designer Item into the identified VRC data_devcied. Update roomObj2. Use original workspaceObj to do any checks */
function wdItemToRoomObjItem(wdItemIn, data_deviceid, roomObj2, workspaceObj) {
    let regexSecondary = /^secondary(_|-).*/i;

    if (wdItemIn.objectType === 'line') {
        wdItemIn.position = wdItemIn.points[0];
    }
    if (regexSecondary.test(wdItemIn.id)) {
        console.info('Workspace Designer import, ignore secondary item:', data_deviceid, wdItemIn.id)
        return;
    }

    if (data_deviceid === 'ceilingMount' || data_deviceid === 'ceiling') {
        console.info('Workspace Designer import ignore ignore:', data_deviceid);
        return;
    }

    if (!(allDeviceTypes[data_deviceid])) {
        console.info('Workspace Designer import issues with:', data_deviceid);
        return;
    }

    let wdItem = structuredClone(wdItemIn); /* make a structured clone of the wdItem, delete each object key as processed */
    let position = wdItem.position;
    let wdKey = workspaceKey[data_deviceid];
    let deviceType = allDeviceTypes[data_deviceid];
    let family = deviceType.family || 'default'; /* default, resizeItem (tables), wallBox */
    let item = {};
    item.id = wdItem.id.replace(/ /g, "_").replace(/#/g, "__"); /* Konva.js and VRC don't like spaces in the ID, replace with _ */
    item.name = allDeviceTypes[data_deviceid].name;
    item.data_deviceid = data_deviceid;

    /* a line has no position, only points. On import allow line to have a position */

    /* convert walls with no measurements but only scale to a columnRect. Why? Walls have set length of 0.10, Boxes do not.  */
    if (!('width' in wdItem) && data_deviceid.startsWith('wall')) {
        console.info('Workspace Designer import ERROR, wall with no width, be changed to a column', wdItem)
        data_deviceid = 'columnRect';
        deviceType = allDeviceTypes[data_deviceid];
        item.name = allDeviceTypes[data_deviceid].name;
        item.data_deviceid = data_deviceid;
    }

    /* if it is a shareCable item, remove the share settings */
    if (data_deviceid.startsWith('shareCable')) {
        delete wdItem.shareSettings;
    }

    /* add scale to items that need scale */
    if (data_deviceid === 'couch') {
        if (!wdItem.scale) {
            wdItem.scale = [1, 1, 1];
        }
    }

    /* desk */
    if (data_deviceid === 'tblSchoolDesk' && !wdItem.length) {
        wdItem.length = 0.59;
    }


    /* items will need a position, add one if not found */
    if (!('position' in wdItem)) {
        wdItem.position = [0, 0, 0];
    }

    if (!('rotation' in wdItem)) {
        wdItem.rotation = [0, 0, 0];
    }

    if (data_deviceid === 'wallGlass' && !('opacity' in wdItem)) {
        wdItem.opacity = null;
    }

    /* if it is pseudo mount, then use the below */
    if (data_deviceid.startsWith('ptz')) {

        if ('scale' in wdItem) {
            let scale = wdItem.scale;
            if (scale[0] === 1 && scale[1] === 1 && scale[2] === 1) {
                item.data_mount = {};
                item.data_mount.index = 0;
                item.data_mount.value = 'stdMount';
                delete wdItem.mount;

            }
            else if (scale[0] === 1 && scale[1] === -1 && scale[2] === 1) {
                item.data_mount = {};
                item.data_mount.index = 1;
                item.data_mount.value = 'flipped';
                wdItem.position[1] = wdItem.position[1] - allDeviceTypes[item.data_deviceid].height / 1000;
                workspaceObj.customObjects.forEach(wkspaceItem => {
                    let secondaryPoleId = "secondary-flippedPoleMount-" + item.id;
                    if (wkspaceItem.id.startsWith("secondary-flippedPoleMount-") && wkspaceItem.id.includes(item.id)) {
                        item.data_mount.index = 2;
                        item.data_mount.value = 'flippedPole';
                    }
                });

                delete wdItem.mount;
            }
        }
    }

    /* process rotation key/value pair */
    if ('rotation' in wdItem) {
        let data_slant = 0;
        let data_tilt = 0;

        if (family === 'wallBox') {
            data_slant = (wdItem.rotation[0] * -(180 / Math.PI));
            item.rotation = (wdItem.rotation[1] * -(180 / Math.PI)) + 90;
            data_tilt = (wdItem.rotation[2] * (180 / Math.PI));

        }
        else {
            data_tilt = (wdItem.rotation[0] * (180 / Math.PI));
            item.rotation = (wdItem.rotation[1] * -(180 / Math.PI));
            data_slant = (wdItem.rotation[2] * (180 / Math.PI));

        }

        if (data_slant != 0) {
            item.data_slant = data_slant;
        }

        if (data_tilt != 0) {
            item.data_tilt = data_tilt;
        }

        if (data_deviceid === 'tblSchoolDesk') {
            item.rotation = normalizeDegree(item.rotation + 180);
        }

        if (data_deviceid === 'couch') {
            item.rotation = normalizeDegree(item.rotation + 90);
        }

        delete wdItem.rotation;
    }
    else {
        console.info('***Warning: No rotation key/value found Workspace Designer on import. wdItem: ', JSON.stringify('wdItem'))
    }

    /* get VRC width & height */
    if ('length' in wdItem || 'width' in wdItem) {


        if (data_deviceid === 'unknownObj') {

            /* do nothing with length if unknownObj */
        }
        else if (item.data_deviceid === 'sphere' || item.data_deviceid === 'cylinder') {
            item.height = wdItem.radius * 2;
            item.width = wdItem.radius * 2;

        }
        else if (family === 'wallBox') {

            item.height = wdItem.width || 0.10;
            item.width = wdItem.length || 0.10;

            if (data_deviceid === 'wallGlass') {
                item.width = 0.10;
            }

        }
        else {
            item.height = wdItem.length || 0.10;
            item.width = wdItem.width || 0.10;
        }


        /* set data_vHeight */
        if (item.data_deviceid === 'sphere') {
            item.data_vHeight = round(wdItem.radius * 2);
        }
        else if (item.data_deviceid === 'cylinder') {
            item.data_vHeight = wdItem.length;
        }
        else if (family === 'wallBox') {
            item.data_vHeight = wdItem.height || roomObj.room.roomHeight;
        }
        else {
            if (wdItem.height) {
                item.data_vHeight = wdItem.height;
            }
        }

        if (data_deviceid === 'tblTrap' && 'taper' in wdItem) {
            item.width = wdItem.taper + wdItem.width;
            item.data_trapNarrowWidth = wdItem.width;
            delete wdItem.taper;
        }


        delete wdItem.height;

        if (!(data_deviceid === 'unknownObj' || data_deviceid === 'cylinder')) {
            delete wdItem.length;
        }

        delete wdItem.width;
    }
    else if ('scale' in wdItem && !(data_deviceid.startsWith('unknownObj') || data_deviceid === 'pathShape')) {
        item.height = wdItem.scale[0];
        item.width = wdItem.scale[2];
        item.data_vHeight = wdItem.scale[1];
        delete wdItem.scale;
    }

    if (item.data_deviceid === 'pathShape' && 'thickness' in wdItem) {
        item.data_vHeight = wdItem.thickness;
        delete wdItem.thickness;
    }

    /* process position key/value pair */
    if ('position' in wdItem) {
        let x, y, z;

        if (family === 'default') { /* default is not tables or walls */
            x = position[0] + (roomObj2.room.roomWidth) / 2;
            y = position[2] + (roomObj2.room.roomLength) / 2;
        } else {
            let centerX = position[0] + (roomObj2.room.roomWidth) / 2;
            let centerY = position[2] + (roomObj2.room.roomLength) / 2;
            let shape = { x: centerX, y: centerY, rotation: item.rotation, height: item.height, width: item.width }
            let upperLeftXY = findUpperLeftXY(shape);
            x = upperLeftXY.x;
            y = upperLeftXY.y;
        }

        if (data_deviceid === 'sphere') {
            z = position[1] - wdItem.radius;
        }
        else if (data_deviceid === 'cylinder') {
            z = position[1] - wdItem.length / 2;
            delete wdItem.length;
        }
        else if (family === 'wallBox') {
            z = position[1] - (item.data_vHeight / 2);

            /* make a best guess at the ceiling height based on walls that have z <= 0 elevation height */
            if (roomObj2.workspace.addCeiling === false) {
                let candidateHeight = item.data_vHeight + ((z < 0) ? z : 0);
                if (candidateHeight > roomObj2.room.roomHeight) {
                    roomObj2.room.roomHeight = candidateHeight;
                }
            }

        } else {
            z = position[1];
        }

        if ('yOffset' in wdKey || 'xOffset' in wdKey) {
            let yOffset = 0;
            let xOffset = 0;


            if ('yOffset' in wdKey) yOffset = wdKey.yOffset;
            if ('xOffset' in wdKey) xOffset = wdKey.xOffset;


            let newXY = findNewTransformationCoordinate({ x: x, y: y, rotation: item.rotation || 0 }, -xOffset, -yOffset);

            x = newXY.x;
            y = newXY.y;

        }


        if ('vertOffset' in wdKey) {
            z = z - wdKey.vertOffset;
        }


        /* calculate Z elevation of displays. Display 29. height of display */

        if (item.data_deviceid === 'display21_9') {
            let display219Height = displayHeight21_9 / 1000;
            let displayScale = (wdItem.size || 105) / 105;
            z = z - (display219Height * displayScale) / 2;
        }
        else if (wdItem.objectType === 'screen') {
            let stdDisplayHeight = displayHeight / 1000;
            let displayScale = (wdItem.size || 55) / diagonalInches;
            z = z - (stdDisplayHeight * displayScale) / 2;
        }


        item.x = Math.round(x * 100) / 100;
        item.y = Math.round(y * 100) / 100;

        if (z != 0) {
            item.data_zPosition = Math.round(z * 100) / 100;
        }

        delete wdItem.position;

    } else {
        console.info('***Warning: No position key/value found Workspace Designer on import. wdItem: ', JSON.stringify('wdItem'))
    }

    /* size is display */
    if ('size' in wdItem && !(data_deviceid === 'unknownObj' || data_deviceid === 'tblUnknownObj')) {
        item.data_diagonalInches = wdItem.size;
        delete wdItem.size;
    }

    /* if scale: [1,1,1], remove from label */
    if ('scale' in wdItem) {
        if (wdItem.scale[0] === 1 && wdItem.scale[1] === 1 && wdItem.scale[2] === 1) {
            delete wdItem.scale;
        }
    }

    /* tblRect radius & radiusRight*/
    if ('radius' in wdItem && data_deviceid === 'tblRect') {
        item.tblRectRadius = wdItem.radius;
        delete wdItem.radius;
    }

    if ('radiusRight' in wdItem && data_deviceid === 'tblRect') {
        item.tblRectRadiusRight = wdItem.radiusRight;
        delete wdItem.radiusRight;
    }

    /* A chair may have color:#fff, which is the default therefore remove */
    if ('color' in wdItem && wdItem.color === '#fff' && (data_deviceid === 'chair' || data_deviceid.startsWith('tbl'))) {
        delete wdItem.color;
    }

    /* default role of the laptop is role:laptop, therefore remove */
    if (data_deviceid === 'laptop' && wdItem.role && wdItem.role === 'laptop') {
        delete wdItem.role;
    }

    if ('color' in wdItem) {

        if (deviceType.colors) {
            deviceType.colors.forEach((colorKey, index) => {
                let colorObj = Object.keys(colorKey);
                if (colorObj.length > 0) {
                    if (wdItem.color && wdItem.color === colorObj[0]) {
                        item.data_color = {};
                        item.data_color.index = index;
                        item.data_color.value = colorObj[0];
                        delete wdItem.color;
                    }
                }
            });

        }
    }



    if ('role' in wdItem) {

        if (wdItem.role === 'crossview+presentertrack') {
            wdItem.role = 'crossviewPresenterTrack';
        }


        if (deviceType.roles) {
            deviceType.roles.forEach((roleKey, index) => {
                let roleObj = Object.keys(roleKey);
                if (roleObj.length > 0) {
                    if (wdItem.role && wdItem.role === roleObj[0]) {
                        item.data_role = {};
                        item.data_role.index = index;
                        item.data_role.value = roleObj[0];
                        delete wdItem.role;
                    }
                }
            });
        }
    }

    if ('mount' in wdItem) {
        if (deviceType.mounts) {
            deviceType.mounts.forEach((mountKey, index) => {
                let mountObj = Object.keys(mountKey);
                if (mountObj.length > 0) {
                    if (wdItem.mount && wdItem.mount === mountObj[0]) {
                        item.data_mount = {};
                        item.data_mount.index = index;
                        item.data_mount.value = mountObj[0];
                        delete wdItem.mount;
                    }
                }
            });
        }
    }

    let comment = '';
    if (wdItem.comment) {
        comment = wdItem.comment.trim();
        delete wdItem.comment;
    };

    if (data_deviceid.startsWith('roomKitEqx')) {
        delete wdItem.color;
        delete wdItem.mount;
    }

    if (data_deviceid.startsWith('ceilingMic')) {
        delete wdItem.sphere;
    }

    if (!(item.id === 'glasswall' || item.id === 'videowall' || item.id === 'leftwall' || item.id === 'rightwall' || item.id === 'backwall')) {
        delete wdItem.id;
    }



    if (!(data_deviceid === 'unknownObj' || data_deviceid === 'tblUnknownObj')) {
        delete wdItem.objectType;
        delete wdItem.range;
        delete wdItem.distanceBtwChairs;
        delete wdItem.distanceToWall;
        // delete wdItem.model;
    }

    if (wdItem.model === '') {
        delete wdItem.model;
    }

    if (data_deviceid === 'cylinder' || data_deviceid === 'sphere') {
        delete wdItem.radius;
    }


    /* merge comments and unused JSON attributes */
    if (Object.keys(wdItem).length > 0) {
        if (comment.length > 0) {
            item.data_labelField = comment + ' ' + JSON.stringify(wdItem);
        } else {
            item.data_labelField = JSON.stringify(wdItem);
        }
    }
    else if (comment != '') {
        item.data_labelField = comment;
    }


    /*
      Because the id videoWall, glassWall or leftWall can be used to guess the ceiling height, only ignore them after height has been processed
    */


    if ((item.id === 'glasswall' || item.id === 'videowall' || item.id === 'leftwall' || item.id === 'rightwall' || item.id === 'backwall') && (document.getElementById('convertDefaultWallsOffCheckBox').checked === false)) {
        roomObj2.workspace.removeDefaultWalls = false;
        document.getElementById('removeDefaultWallsCheckBox').checked = false;
        document.getElementById("removeDefaultWallsCheckBox2").checked = false;
    } else {
        roomObj2.items[deviceType.parentGroup].push(item);
    }

}

/* find any roomKitEqx in the roomObj, then look for duplicate displays and delete them */
function deletePossibleRoomKitEqxDisplays(roomObj) {

    let displays = roomObj.items.displays;
    let videoDevices = roomObj.items.videoDevices;
    videoDevices.forEach(videoDevice => {
        if (videoDevice.data_deviceid.startsWith('roomKitEqx')) {

            let smallDisplays, largeDisplays;
            let smallEqx = structuredClone(videoDevice);
            let largeEqx = structuredClone(videoDevice);


            smallEqx.data_diagonalInches = 60;
            largeEqx.data_diagonalInches = 90;

            smallDisplays = getLocationOfRoomKitEqxDisplay(smallEqx);
            largeDisplays = getLocationOfRoomKitEqxDisplay(largeEqx);

            for (let i = displays.length - 1; i >= 0; i--) {
                let display = displays[i];
                let inLeftArea = isDisplayInArea(display, smallDisplays.left, largeDisplays.left);
                let inRightArea = isDisplayInArea(display, smallDisplays.right, largeDisplays.right);
                if (inLeftArea || inRightArea) {
                    if (65 <= display.data_diagonalInches && display.data_diagonalInches <= 85) {
                        videoDevice.data_diagonalInches = display.data_diagonalInches;
                        displays.splice(i, 1);
                    }
                }

            }
        }
    });
}

function isDisplayInArea(display, smallDisp, largeDisp) {
    let inBounds;
    let smallDispZ = smallDisp.data_zPosition || 0;
    let largeDispZ = largeDisp.data_zPosition || 0;
    let displayZ = display.data_zPosition || 0;
    let minX = Math.min(smallDisp.x, largeDisp.x);
    let maxX = Math.max(smallDisp.x, largeDisp.x);
    let minY = Math.min(smallDisp.y, largeDisp.y);
    let maxY = Math.max(smallDisp.y, largeDisp.y);
    let minZ = Math.min(smallDispZ, largeDispZ);
    let maxZ = Math.max(smallDispZ, largeDispZ);
    minZ = minZ - 0.20;
    maxZ = maxZ + 0.2;

    if ((minX < display.x && display.x < maxX) && (minY < display.y && display.y < maxY) && (minZ < displayZ && displayZ < maxZ)) {
        inBounds = true;
    } else {
        inBounds = false;
    }

    return inBounds;
}

function getLocationOfRoomKitEqxDisplay(item) {
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
            newData_zPosition = 1.76 + Number(item.data_zPosition) - newDisplayHeight;
            deltaY = -0.07;
        }
        else if (item.data_deviceid === 'roomKitEqxWS') {
            newData_zPosition = 1.76 + Number(item.data_zPosition) - newDisplayHeight;
            deltaY = -0.12;
        }
        else {
            newData_zPosition = 1.081 + Number(item.data_zPosition) - newDisplayHeight;
            deltaY = -0.12;
        }

        /* adjust delta Y for display changes.  One display will be closer, the other farther */
        deltaY = deltaY * (item.data_diagonalInches / 75);

        let leftDisplayXY = findNewTransformationCoordinate(item, -deltaX, deltaY);
        let rightDisplayXY = findNewTransformationCoordinate(item, deltaX, deltaY);

        leftDisplay.data_deviceid = 'displaySngl';
        leftDisplay.id = 'display-KitEQX-L~' + item.data_deviceid + '-' + leftDisplay.id;
        leftDisplay.x = leftDisplayXY.x;
        leftDisplay.y = leftDisplayXY.y;
        leftDisplay.data_zPosition = newData_zPosition;
        leftDisplay.role = 'secondScreen';


        rightDisplay.data_deviceid = 'displaySngl';
        rightDisplay.id = 'display-KitEQX-R~' + item.data_deviceid + '-' + rightDisplay.id;

        rightDisplay.x = rightDisplayXY.x;
        rightDisplay.y = rightDisplayXY.y;
        rightDisplay.data_zPosition = newData_zPosition;
        rightDisplay.role = 'firstScreen';

        return { left: leftDisplay, right: rightDisplay };
    }


}

/** move here */




/* The  downloadFileWorkspace() determines if the Unit is meters or feet and converts roomObj temporarily to meters along with the Canvas drawing */

// function downloadJsonFile() {
//     let downloadRoomName;
//     let roomObj2 = structuredClone(roomObj);
//     if (konvaBackgroundImageFloor.name() != '') {
//         roomObj2.backgroundImageSrc = backgroundImageFloor.src;
//     }
//     const link = document.createElement("a");
//     const content = JSON.stringify(roomObj2, null, 5);
//     const file = new Blob([content], { type: 'text/plain' });

//     downloadRoomName = roomObj.name;

//     if (downloadRoomName == '') {
//         downloadRoomName = 'Video Room Calc';
//     }
//     link.href = URL.createObjectURL(file);
//     downloadRoomName = downloadRoomName.replace(/[/\\?%*:|"<>]/g, '-');
//     downloadRoomName = downloadRoomName.trim() + '.json';
//     link.download = downloadRoomName;
//     link.click();
//     URL.revokeObjectURL(link.href);
// }

function downloadFileWorkspace() {

    let workspaceObj = exportRoomObjToWorkspace(roomObj);

    downloadJsonWorkpaceFile(workspaceObj);
}




function workspaceView(isNewTab = 'false') {
    let urlWorkspaceView = './assets/workspacedesignerview.html';
    let workspaceObj = exportRoomObjToWorkspace(roomObj);
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


function openWorkspaceWindow2() {
    if (mobileDevice === 'RoomOS' && testiFrame === true) {
        testiFrameToggle();
        floatingWorkspaceResize('slideOver');
    }
    else {
        openWorkspaceWindow();
    }

}

/* Opens the Workspace Designer  */


function openWorkspaceWindow(fromButton = true) {

    let currentSite = location.origin + location.pathname;
    console.info('Current WD site:', currentSite);

    /* any site that is not https://collabexperience.com/ will redirect to designer.cisco.com */
    if (currentSite != 'https://collabexperience.com/') {
        newWorkspaceTab = defaultWorkspaceTestSite;
        console.info('WD site: ', newWorkspaceTab);
    }

    lastAction = "btnClick Workspace Designer";

    postHeartbeat();

    if (workspaceDesignerTestUrl) {
        newWorkspaceTab = workspaceDesignerTestUrl;
    }

    if (fromButton) {
        workspaceWindow = window.open(newWorkspaceTab, sessionId);
    }


    if (testiFrame) {

        iFrameWorkspaceWindow = document.getElementById('iFrameFloatingWorkspace');
        // iFrameWorkspaceWindow.src = newWorkspaceTab + '?preview=1&embed=1';

        iFrameWorkspaceWindow.src = newWorkspaceTab;
    }


    /* send initial post message 3 times in case page is opening slow */
    setTimeout(() => {
        postMessageToWorkspace();
    }, 1000);

    setTimeout(() => {
        postMessageToWorkspace();
    }, 3000);

    setTimeout(() => {
        postMessageToWorkspace();
    }, 5000);

}



function openModalWorkspace() {
    document.getElementById('modalWorkspace').showModal();
    updateRemoveDefaultWallsCheckBox();
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

    let unit = 'meter';
    let message = {};

    if (roomObj.unit === 'feet') {
        unit = 'foot'
    }

    message = { roomdesigner: { plan: exportRoomObjToWorkspace(), settings: { unit: unit } } }


    message.roomdesigner.plan.theme = roomObj.workspace.theme || 'standard';

    // message.roomdesigner.settings.roomView = 'farEnd'; // overview | farEnd | tableEnd | above | cameraCoverage | micCoverage | displayCoverage | accessibility | cables
    // message.roomdesigner.settings.occupancy = 'medium';  // empty | medium | full

    if (workspaceWindow) {
        workspaceWindow.postMessage(message, '*');
    }

    if (testiFrame && testiFrameInitialized) {
        iFrameWorkspaceWindow.contentWindow.postMessage(message, '*');
    }


}

window.addEventListener(
    "message",
    (event) => {
        if (event.origin.match(/https:\/\/.*(\.cisco|\.webex|)\.com$/) || event.origin.startsWith('https://collabexperience.com') || event.origin.startsWith('http://127.0.0.1')) {
            console.info('message received postMessage() back: ', event.data);
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

                    if ('mount' in item && item.mounts) {
                        workspaceKey[key].mount = returnStringOfDefaultRoleColor(item.mounts);
                    }
                }
            })
        })
    }

}



function exportRoomObjToWorkspace() {

    let swapXY = true;

    let roomObj2 = structuredClone(roomObj);  /* clone roomObj to make changes to units */

    roomObj2 = convertToMeters(roomObj2); /* convertToMeters() changes feet to meters and marks anything not on the canvas as data_hiddenInDesigner = true;  */

    let activeRoomLength = roomObj2.activeRoomLength;
    let activeRoomWidth = roomObj2.activeRoomWidth;
    let activeRoomX = roomObj2.activeRoomX;
    let activeRoomY = roomObj2.activeRoomY;


    let workspaceObj = {};
    workspaceObj.title = '';
    workspaceObj.roomShape = {};
    workspaceObj.roomShape.manual = true;

    workspaceObj.roomShape.plant = false;

    if (swapXY) {
        workspaceObj.roomShape.width = roomObj2.room.roomWidth;
        workspaceObj.roomShape.length = roomObj2.room.roomLength;
    } else {
        workspaceObj.roomShape.width = roomObj2.room.roomLength;
        workspaceObj.roomShape.length = roomObj2.room.roomWidth;
    }

    ['leftwall', 'videowall', 'rightwall', 'backwall'].forEach(roomSurfaceId => {
        if (roomObj.roomSurfaces[roomSurfaceId].door === 'none') {
            delete roomObj.roomSurfaces[roomSurfaceId].door;
        }
    })

    workspaceObj.roomShape.roomSurfaces = [
        { ...{ objectId: 'leftwall' }, ...roomObj.roomSurfaces.leftwall },
        { ...{ objectId: 'videowall' }, ...roomObj.roomSurfaces.videowall },
        { ...{ objectId: 'rightwall' }, ...roomObj.roomSurfaces.rightwall },
        { ...{ objectId: 'backwall' }, ...roomObj.roomSurfaces.backwall },

    ]

    /* the default walls roomShape format above is inserting a tree. Adding walls one at time but onnly for designer.cisco.com */
    let altDefaultWall = true;

    if (altDefaultWall === true && !roomObj.workspace.removeDefaultWalls) {
        let backwall = {};
        let leftwall = {};
        let rightwall = {};
        let videowall = {};

        backwall.id = 'backwall';
        backwall.x = -0.1 - activeRoomX;;
        backwall.y = roomObj2.room.roomLength + 0.1 - activeRoomY;
        backwall.data_zPosition = -0.10;
        backwall.data_vHeight = roomObj2.room.roomHeight + 0.10;
        backwall.rotation = -90;
        backwall.width = 0.10;
        backwall.height = roomObj2.room.roomWidth + 2 * 0.10;

        videowall.id = 'videowall';
        videowall.x = roomObj2.room.roomWidth + 0.10 - activeRoomX;
        videowall.y = -0.1 - activeRoomY;
        videowall.data_zPosition = -0.10;
        videowall.data_vHeight = roomObj2.room.roomHeight + 0.10;
        videowall.rotation = 90;
        videowall.width = 0.10;
        videowall.height = roomObj2.room.roomWidth + 2 * 0.10;

        leftwall.id = 'leftwall';
        leftwall.x = -0.1 - activeRoomX;
        leftwall.y = 0 - activeRoomY;
        leftwall.data_zPosition = 0;
        leftwall.data_vHeight = roomObj2.room.roomHeight;
        leftwall.rotation = 0;
        leftwall.width = 0.10;
        leftwall.height = roomObj2.room.roomLength;

        rightwall.id = 'rightwall';
        rightwall.x = roomObj2.room.roomWidth + 0.1 - activeRoomX;
        rightwall.y = roomObj2.room.roomLength - activeRoomY;
        rightwall.data_zPosition = 0;
        rightwall.data_vHeight = roomObj2.room.roomHeight;
        rightwall.rotation = 180;
        rightwall.width = 0.1;
        rightwall.height = roomObj2.room.roomLength;

        [backwall, leftwall, rightwall, videowall].forEach(wall => {
            let jsonLabel = {}

            if (roomObj.roomSurfaces[wall.id].type === 'regular') {
                wall.data_deviceid = 'wallStd';
            }
            else if (roomObj.roomSurfaces[wall.id].type === 'glass') {
                wall.data_deviceid = 'wallGlass';
            }
            else if (roomObj.roomSurfaces[wall.id].type === 'window') {
                wall.data_deviceid = 'wallWindow';
            }

            if ('acousticTreatment' in roomObj.roomSurfaces[wall.id]) {
                jsonLabel.acousticTreatment = roomObj.roomSurfaces[wall.id].acousticTreatment;
            }

            if ('door' in roomObj.roomSurfaces[wall.id]) {
                jsonLabel.door = roomObj.roomSurfaces[wall.id].door;
            }

            wall.data_labelField = JSON.stringify(jsonLabel);

            roomObj2.items.tables.push(wall);

        });


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

    workspaceObj.roomId = roomObj.roomId;

    workspaceObj.customObjects = [];

    workspaceObj.source = {};
    workspaceObj.source.name = 'vrc';
    workspaceObj.source.url = fullShareLinkCollabExpBase;
    workspaceObj.source.version = version;

    workspaceObj.data = {};
    workspaceObj.data.vrc = {};
    workspaceObj.data.vrc.workspace = {};
    workspaceObj.data.vrc.workspace.theme = roomObj.workspace.theme || 'regular';

    if ('backgroundImageFile' in roomObj && 'backgroundImage' in roomObj2) {
        workspaceObj.data.vrc.backgroundImageFile = roomObj.backgroundImageFile;
        workspaceObj.data.vrc.backgroundImage = roomObj2.backgroundImage;
    }


    if (altDefaultWall && document.getElementById('removeDefaultWallsCheckBox').checked === false) {
        delete workspaceObj.roomShape;
        let floor = {
            x: roomObj2.room.roomWidth + 0.1 - activeRoomX,
            y: 0 - activeRoomY,
            rotation: 90,
            data_deviceid: "floor",
            id: "primaryFloor",
            data_zPosition: -0.1,
            data_vHeight: 0.1,
            width: roomObj2.room.roomLength,
            height: roomObj2.room.roomWidth + 0.2,
        };


        workspaceObjWallPush(floor);
    }

    if (document.getElementById('removeDefaultWallsCheckBox').checked === true) {
        delete workspaceObj.roomShape;

        let wallWidth = 0.10; /* Add in the floor width to include the outer wall */

        let floor = {
            x: roomObj2.room.roomWidth - activeRoomX,
            y: 0 - activeRoomY,
            rotation: 90,
            data_deviceid: "floor",
            id: "primaryFloor",
            data_zPosition: -0.1,
            data_vHeight: 0.1,
            width: roomObj2.room.roomLength,
            height: roomObj2.room.roomWidth
        };


        workspaceObjWallPush(floor);


        let outerFloor = {
            x: roomObj2.room.roomWidth + wallWidth - activeRoomX,
            y: 0 - wallWidth - activeRoomY,
            rotation: 90,
            data_deviceid: "wall",
            id: "secondary-outerFloor",
            data_zPosition: -0.105,
            data_vHeight: 0.1,
            data_labelField: `{"color":"#CCC", "opacity": 0.97}`,
            width: roomObj2.room.roomLength + wallWidth * 2,
            height: roomObj2.room.roomWidth + wallWidth * 2
        };

        workspaceObjWallPush(outerFloor);

    }

    if ((roomObj.workspace.addCeiling === true && roomObj.workspace.removeDefaultWalls)) {
        let wallWidth = 0;
        let ceiling = {
            "x": 0 - wallWidth - activeRoomX,
            "y": 0 - wallWidth - activeRoomY,
            "rotation": 0,
            "data_deviceid": "ceiling",
            "id": "ceiling",
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
            let fakeTable = { data_deviceid: 'tblEllip', id: 'secondary-wheelChairRound-' + item.id, rotation: item.rotation, data_zPosition: -0.07, data_vHeight: 0.1, width: 1.5, height: 1.5, x: xy.x, y: xy.y };

            workspaceObjTablePush(fakeTable);

        }


        if (item.data_deviceid.startsWith('doorDouble')) {
            let leftDoor = structuredClone(item);
            let rightDoor = structuredClone(item);
            let deltaX = 0.51;

            //  let deltaY = -1 * ((allDeviceTypes[item.data_deviceid].depth / 2 / 1000) - 0.05);
            let deltaY = -1 * ((allDeviceTypes[item.data_deviceid].depth / 2 / 1000) - 0.05);

            leftDoor.id = 'primary1-doorDouble-L-' + item.id;
            leftDoor.data_deviceid = rightDoor.data_deviceid + 'Left';

            rightDoor.id = 'primary2-dooorDouble-R-' + item.id;
            rightDoor.data_deviceid = rightDoor.data_deviceid + 'Right';

            let leftDoorXY = findNewTransformationCoordinate(item, deltaX, deltaY);
            let rightDoorXY = findNewTransformationCoordinate(item, -deltaX, deltaY);

            leftDoor.x = leftDoorXY.x;
            leftDoor.y = leftDoorXY.y;

            rightDoor.x = rightDoorXY.x;
            rightDoor.y = rightDoorXY.y;

            workspaceObjItemPush(rightDoor);
            item = structuredClone(leftDoor); /* let Left door become the main item */
        }

        workspaceObjItemPush(item);


    });

    roomObj2.items.microphones.forEach((item) => {

        if ((item.data_mount && item.data_mount.value.startsWith('ceilingMount')) || ((item.data_deviceid === 'ceilingMicPro') && !item.data_mount)) {
            let ceilingMount = structuredClone(item);
            let poleHeight = (roomObj2.room.roomHeight || defaultWallHeight) - (item.data_zPosition || 0);
            ceilingMount.data_vHeight = poleHeight;
            ceilingMount.data_deviceid = "ceilingMount";
            ceilingMount.data_zPosition = item.data_zPosition + (poleHeight / 35); /* the ceilingMount is a little off in zPosition, so adjust slightly */
            ceilingMount.id = "secondary-ceilingMount-" + item.id;
            delete ceilingMount.data_mount;

            workspaceObjItemPush(ceilingMount);

            delete item.data_mount;

        }


        if (item.data_deviceid === 'ceilingMic') {
            item.data_ceilingHeight = roomObj2.room.roomHeight;
        }

        workspaceObjItemPush(item);
    });

    roomObj2.items.tables.forEach((item) => {

        if (item.data_deviceid) {
            if (item.data_deviceid.startsWith('tbl') || item.data_deviceid.startsWith('couch')) {
                workspaceObjTablePush(item);
            }
            else if (item.data_deviceid.startsWith('wallChairs')) {

                let chairs = expandChairs(item, 'meters');
                chairs.forEach(chair => {
                    workspaceObjItemPush(chair);
                });
            }
            else if (item.data_deviceid === 'sphere' || item.data_deviceid === 'cylinder') {

                workspaceObjWallPush(item);
            }
            else if (item.data_deviceid === 'pathShape') {
                workspaceObjItemPush(item);
            }
            else if (item.data_deviceid.startsWith('wall') || item.data_deviceid.startsWith('column') || item.data_deviceid.startsWith('floor') || item.data_deviceid.startsWith('box')) {
                workspaceObjWallPush(item);
            }
        }
    });

    roomObj2.items.stageFloors.forEach((item) => {
        if (item.data_deviceid) {

            if (item.data_deviceid.startsWith('stageFloor')) {
                if (item.id.startsWith('stage') || item.id.startsWith('step')) {
                    // do nothing for stage or step objects
                } else {
                    item.id = 'stageFloor~' + item.id;
                }

                workspaceObjWallPush(item);
            }
            else if (item.data_deviceid.startsWith('carpet')) {
                workspaceObjWallPush(item);
            }
        }
    });

    roomObj2.items.boxes.forEach((item) => {
        workspaceObjWallPush(item);
    });


    roomObj2.items.rooms.forEach((item) => {
        workspaceObjWallPush(item);
    });

    roomObj2.items.videoDevices.forEach((item) => {
        /* Adjust the height and create a pole for a flipped camera */
        if (item.data_mount && item.data_mount.value.startsWith('flippedPole')) {

            /* only adjust height on ptz4KMount2 and ptzVision2. The original ptz4kMount and ptzVision stay the same. */
            if (item.data_deviceid === 'ptz4kMount2' || item.data_deviceid === 'ptzVision2') {
                item.data_zPosition = item.data_zPosition + allDeviceTypes[item.data_deviceid].height / 1000;
            }

            let pole = {};
            let poleHeight = (roomObj2.room.roomHeight || defaultWallHeight) - (item.data_zPosition || 0);
            pole.width = 0.04;
            pole.height = 0.04;
            let poleXY = findNewTransformationCoordinate(item, pole.width / 2, pole.width / 2);
            pole.x = poleXY.x;
            pole.y = poleXY.y;
            pole.data_zPosition = (item.data_zPosition || 0);
            pole.data_vHeight = poleHeight;
            pole.width = 0.04;
            pole.height = 0.04;
            pole.rotation = item.rotation;
            pole.data_deviceid = "box";
            pole.data_labelField = '{"color":"#999999"}';
            pole.id = "secondary-flippedPoleMount-" + item.id;
            workspaceObjWallPush(pole);
        }

        if (item.data_mount && item.data_mount.value === 'flipped') {
            if (item.data_deviceid === 'ptz4kMount2' || item.data_deviceid === 'ptzVision2') {
                item.data_zPosition = item.data_zPosition + allDeviceTypes[item.data_deviceid].height / 1000;
            }
        }


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
            leftDisplay.id = 'screen-L~' + leftDisplay.id;
            leftDisplay.x = leftDisplayXY.x;
            leftDisplay.y = leftDisplayXY.y;
            leftDisplay.role = 'secondScreen';
            workspaceObjDisplayPush(leftDisplay);

            rightDisplay.data_deviceid = 'displaySngl';
            rightDisplay.id = 'screen-R~' + rightDisplay.id;

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

        /* plants will be converted to christmas trees. Note: scale is different */
        if (item.data_deviceid === 'plant' && roomObj.workspace.theme === 'christmas') {
            item.data_deviceid = 'tree';
        }

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
            else if (item.data_deviceid === 'roomKitEqxWS') {
                newData_zPosition = 1.76 + Number(item.data_zPosition) - newDisplayHeight;
                deltaY = -0.12;
            }
            else {
                newData_zPosition = 1.081 + Number(item.data_zPosition) - newDisplayHeight;
                deltaY = -0.12;
            }

            let leftDisplayXY = findNewTransformationCoordinate(item, -deltaX, deltaY);
            let rightDisplayXY = findNewTransformationCoordinate(item, deltaX, deltaY);

            leftDisplay.data_deviceid = 'displaySngl';
            leftDisplay.id = 'display-KitEQX-L~' + item.data_deviceid + '-' + leftDisplay.id;
            leftDisplay.x = leftDisplayXY.x;
            leftDisplay.y = leftDisplayXY.y;
            leftDisplay.data_zPosition = newData_zPosition;
            leftDisplay.role = 'secondScreen';
            workspaceObjDisplayPush(leftDisplay);

            rightDisplay.data_deviceid = 'displaySngl';
            rightDisplay.id = 'display-KitEQX-R~' + item.data_deviceid + '-' + rightDisplay.id;

            rightDisplay.x = rightDisplayXY.x;
            rightDisplay.y = rightDisplayXY.y;
            rightDisplay.data_zPosition = newData_zPosition;
            rightDisplay.role = 'firstScreen';

            workspaceObjDisplayPush(rightDisplay);

        }


        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") z = item.data_zPosition;
        }


        if ('yOffset' in attr || 'xOffset' in attr || 'data_labelField' in item) {
            let yOffset = 0;
            let xOffset = 0;


            if ('yOffset' in attr) yOffset = attr.yOffset;
            if ('xOffset' in attr) xOffset = attr.xOffset;

            if ('data_labelField' in item) {
                let labelParsed = parseDataLabelFieldJson(item);
                if (labelParsed) {
                    xOffset = labelParsed.xOffset || xOffset;
                    yOffset = labelParsed.yOffset || yOffset;
                }
            }

            let newXY = findNewTransformationCoordinate(item, xOffset, yOffset);

            item.y = newXY.y;
            item.x = newXY.x;
        }

        x = (item.x - (roomObj2.room.roomWidth) / 2);
        y = (item.y - (roomObj2.room.roomLength) / 2);

        if ('vertOffset' in attr) {
            z = z + attr.vertOffset;
        }

        if (item.data_deviceid === 'cylinder' || item.data_deviceid === 'sphere') {
            x = x + item.width / 2;
            y = y + item.width / 2;
        }

        let workspaceItem = {
            id: item.id,
            "position": [
                (swapXY ? x : y),
                z,
                (swapXY ? y : x)
            ],
            "rotation": [
                ((item.data_tilt) * (Math.PI / 180)) || 0,
                ((item.rotation) * -(Math.PI / 180)),
                ((item.data_slant) * (Math.PI / 180)) || 0,
            ]
        }

        workspaceItem = { ...workspaceItem, ...attr };

        delete workspaceItem.idRegex;

        if (item.data_deviceid === 'sphere') {
            workspaceItem.radius = item.width / 2;
        }

        if (item.data_deviceid === 'cylinder') {
            let zPosition = item.data_zPosition || 0;
            z = zPosition - (item.width / 2);
        }

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
            if (workspaceItem.role === 'presentertrack2') {
                workspaceItem.role = 'presentertrack';
            } else if (workspaceItem.role = 'crossviewPresenterTrack') {
                workspaceItem.role = 'crossview+presentertrack'
            }
        }

        if ('data_ceilingHeight' in item && item.data_ceilingHeight) {
            workspaceItem.ceilingHeight = item.data_ceilingHeight;
        }

        if ('data_isItemOnStage' in item) {
            workspaceItem.ignore = !item.data_isItemOnStage;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if ('data_mount' in item && item.data_mount) {
            /* items like the PTZ 4K camera may be flipped */
            if (item.data_mount.value.startsWith('flipped')) {
                workspaceItem.scale = [1, -1, 1];
            }
            else if (item.data_mount.value.startsWith('stdMount')) {
                workspaceItem.scale = [1, 1, 1];
            }
            else {
                workspaceItem.mount = item.data_mount.value;
            }
        }

        if (item.data_deviceid.startsWith('ceilingMount')) {
            workspaceItem.scale = [1, item.data_vHeight, 1];
        };

        /* coverage of analog Ceiling Mic shows 180 from above */
        if (item.data_deviceid === 'ceilingMic') {
            workspaceItem.sphere = 'quarter';
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }

        if ('data_vHeight' in item && item.data_vHeight && item.data_deviceid === 'pathShape') {
            workspaceItem.thickness = item.data_vHeight;
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
        let displayScale = item.data_diagonalInches / diagonalInches;
        let attr = workspaceKey[item.data_deviceid];


        if (item.data_deviceid === 'display21_9') {
            z = displayHeight21_9 / 1000;
            displayScale = item.data_diagonalInches / diagonalInches21_9;
            item.role = 'ultrawide';

        }

        z = z * displayScale / 2; /* center of display */

        if ('data_zPosition' in item) {
            if (item.data_zPosition != "") {
                z = item.data_zPosition + z;
            };
        }

        if ('yOffset' in attr || 'xOffset' in attr || 'data_labelField' in item) {
            let yOffset = 0;
            let xOffset = 0;


            if ('yOffset' in attr) yOffset = attr.yOffset;
            if ('xOffset' in attr) xOffset = attr.xOffset;

            if ('data_labelField' in item) {
                let labelParsed = parseDataLabelFieldJson(item);
                if (labelParsed) {
                    xOffset = labelParsed.xOffset || xOffset;
                    yOffset = labelParsed.yOffset || yOffset;
                }
            }

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
                ((item.data_tilt) * (Math.PI / 180)) || 0,
                ((item.rotation) * -(Math.PI / 180)),
                ((item.data_slant) * (Math.PI / 180)) || 0,
            ],
            size: item.data_diagonalInches,
            "role": item.role
        }

        workspaceItem = { ...attr, ...workspaceItem };
        delete workspaceItem.idRegex;

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if ('data_mount' in item && item.data_mount) {
            workspaceItem.mount = item.data_mount.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }


        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }

        if ('data_isItemOnStage' in item) {
            workspaceItem.ignore = !item.data_isItemOnStage;
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

        if ('yOffset' in attr || 'xOffset' in attr || 'data_labelField' in item) {
            let yOffset = 0;
            let xOffset = 0;

            if ('yOffset' in attr) yOffset = attr.yOffset;
            if ('xOffset' in attr) xOffset = attr.xOffset;

            if ('data_labelField' in item) {
                let labelParsed = parseDataLabelFieldJson(item);
                if (labelParsed) {
                    xOffset = labelParsed.xOffset || xOffset;
                    yOffset = labelParsed.yOffset || yOffset;
                }
            }

            let newXY = findNewTransformationCoordinate({ x: x, y: y, rotation: item.rotation }, xOffset, yOffset);

            y = newXY.y;
            x = newXY.x;
        }

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
                ((item.data_tilt) * (Math.PI / 180)) || 0,
                ((item.rotation) * -(Math.PI / 180)),
                ((item.data_slant) * (Math.PI / 180)) || 0,
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
            workspaceItem.rotation[1] = ((item.rotation - 180) * -(Math.PI / 180));
        }

        /* turn the couch 90 deg when converting from VRC to Designer */
        if (item.data_deviceid === 'couch') {
            workspaceItem.scale = [item.height, 1, 1]
            workspaceItem.rotation[1] = (item.rotation - 90) * -(Math.PI / 180);
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
        delete workspaceItem.idRegex;

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if ('data_mount' in item && item.data_mount) {
            workspaceItem.mount = item.data_mount.value;
        }

        if (item.data_hiddenInDesigner) {
            workspaceItem.hidden = true;
        }

        if ('yOffset' in workspaceItem) {
            delete workspaceItem.yOffset;
        }

        if ('xOffset' in workspaceItem) {
            delete workspaceItem.xOffset;
        }

        if ('data_labelField' in item) {
            workspaceItem = parseDataLabelFieldJson(item, workspaceItem);
        }

        workspaceObj.customObjects.push(workspaceItem);
    }

    function workspaceObjWallPush(item) {

        let swapXY = true;

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

        if (item.data_deviceid === 'sphere') {
            z = item.data_zPosition + (item.width / 2);
        }




        /* Fix hundreths place rounding error messing with placement of carpet to keep it from overlapping with table base */
        if (item.data_deviceid === 'carpet') {
            z = Math.round((z - 0.005) * 100) / 100;
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
                ((item.data_slant) * -(Math.PI / 180)) || 0,
                ((item.rotation - 90) * -(Math.PI / 180)),
                ((item.data_tilt) * (Math.PI / 180)) || 0,
            ],
            "height": verticalHeight,
            "length": item.width,
            "width": item.height,
        }

        if (item.data_deviceid === 'boxRoomPart' || item.data_deviceid === 'polyRoom') {
            workspaceItem.hidden = true;
            workspaceItem.opacity = 0.01;
        }

        if (item.data_deviceid === 'sphere') {
            workspaceItem.radius = item.width / 2;
            delete workspaceItem.width;
            delete workspaceItem.height;
            delete workspaceItem.rotation;
        }

        if (item.data_deviceid === 'cylinder') {
            workspaceItem.radius = item.width / 2;
            // workspaceItem.length = item.data_vHeight;
            if ('data_vHeight' in item && item.data_vHeight) {
                workspaceItem.length = item.data_vHeight;
            } else {
                workspaceItem.length = roomObj2.room.roomHeight || defaultWallHeight;
            }

            workspaceItem.rotation[0] = ((item.data_tilt) * (Math.PI / 180)) || 0;
            workspaceItem.rotation[1] = ((item.rotation) * -(Math.PI / 180)) || 0;
            workspaceItem.rotation[2] = ((item.data_slant) * (Math.PI / 180)) || 0;

            delete workspaceItem.width;
            delete workspaceItem.height;
        }



        if (item.id === 'primaryCeiling') {
            workspaceItem.scale = [item.height, verticalHeight, item.width];
            workspaceItem.objectType = 'ceiling';
            delete workspaceItem.height;
            delete workspaceItem.length;
            delete workspaceItem.width;
        }


        workspaceItem = { ...workspaceItem, ...attr };
        delete workspaceItem.idRegex;

        if ('data_role' in item && item.data_role) {
            workspaceItem.role = item.data_role.value;
        }

        if ('data_color' in item && item.data_color) {
            workspaceItem.color = item.data_color.value;
        }

        if ('data_mount' in item && item.data_mount) {
            workspaceItem.mount = item.data_mount.value;
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

    let commentPart;
    //  let jsonPart = /{.*?}/.exec(item.data_labelField);
    let jsonPart = /{.*}/.exec(item.data_labelField);

    if ('data_labelField' in item && item.data_labelField) {
        commentPart = item.data_labelField.replace(/{.*?}/g, '');
    }

    if (jsonPart) {
        try {
            let newKeyValues = JSON.parse(jsonPart[0]);
            workspaceItem = { ...workspaceItem, ...newKeyValues }
        } catch {
            console.info('Error parsing JSON ', jsonPart);
        }
    }

    if (commentPart && workspaceItem) {
        workspaceItem.comment = commentPart.trim();
    }

    return workspaceItem;
}

/* parse out {"path:": "values"} from the data_labelField.  */
function parsePathShapeLabelFieldJson(item) {

    let newLabel = '';
    let lblObj = {};
    lblObj.label = "";
    lblObj.path = "";

    let jsonPart = /{.*}/.exec(item.data_labelField);

    if ('data_labelField' in item && item.data_labelField) {
        newLabel = item.data_labelField.replace(/{.*?}/g, ''); /* remove regex portion between {} */
    }

    if (jsonPart) {
        try {
            let jsonValue = JSON.parse(jsonPart[0]);
            if ('path' in jsonValue) {
                lblObj.path = jsonValue.path;
                delete jsonValue.path;
            }

            if (!isObjectEmpty(jsonValue)) {
                newLabel = (newLabel + " " + JSON.stringify(jsonValue)).trim();
            }


        } catch {
            newLabel = item.data_labelField;
            document.getElementById("labelPath").placeholder = "Error parsing JSON. Edit here or *Item Label*."
            console.info('Error parsing JSON on parsePathShapeLabelFieldJson()', jsonPart);
        }

    }

    if (newLabel) {
        lblObj.label = newLabel;
    }

    return lblObj;

}

function combinePathShapeLabel(label, path) {
    let newLabel = '';

    let commentPart = label.replace(/{.*?}/g, '').trim();

    let jsonPart = /{.*}/.exec(label);

    label = label.trim();

    path = path.trim();

    if (jsonPart) {
        try {
            let jsonValue = JSON.parse(jsonPart[0]);

            if (path) {
                jsonValue.path = path;
            }

            if (label && !isObjectEmpty(jsonValue)) {
                newLabel = commentPart + JSON.stringify(jsonValue);
            }
            else if (label) {
                newLabel = label;

            }
            else if (!isObjectEmpty(jsonValue)) {
                newLabel = JSON.stringify(jsonValue);
            }

        } catch {
            if (path && path.trim() != '') {
                newLabel = (label + '{"path":"' + path + '"}').trim();
            } else {
                newLabel = label;
            }


            console.info('Error parsing JSON on combine:', jsonPart);
        }
    } else {
        if (path && path != '') {
            newLabel = (label + '{"path":"' + path + '"}').trim();
        } else {
            newLabel = label;
        }
    }

    return newLabel;

}



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

/* download native VRC file format */
function downloadRoomObj() {
    /* create a time stamp */
    let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
    localISOTime = localISOTime.replaceAll(/:/g, '');
    let downloadRoomName = 'VideoRoomCalc_' + localISOTime;

    const link = document.createElement("a");

    /* use the roomObj clone, but remove unneeded objects and arrange the order so the name is at the top of the file */
    let roomObj2 = structuredClone(roomObj);
    delete roomObj2.room;
    delete roomObj2.trNodes;
    let roomItems = {};
    roomItems.room = {};
    roomItems.name = roomObj.name;
    roomItems.date = new Date();
    roomItems.room.roomWidth = roomObj.room.roomWidth;
    roomItems.room.roomLength = roomObj.room.roomLength;
    roomItems.room.roomHeight = roomObj.room.roomHeight;

    /* because undo might mess up roomObj.backgroundImageFile, just add the current background image to roomObj2 or get rid of all references to the backgroundImage */
    let konvaBackgroundImageFloor = getKonvaBackgroundImageFloor();
    if (konvaBackgroundImageFloor && 'backgroundImage' in roomObj2) {
        roomObj2.backgroundImageFile = backgroundImageFloor.src;
    } else {
        delete roomObj2.backgroundImageFile;
        delete roomObj2.backgroundImage;
    }


    let newRoomObj = { ...roomItems, ...roomObj2 };

    const content = JSON.stringify(newRoomObj, null, 5);
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    if (roomObj2.name.length > 1) {
        downloadRoomName = roomObj2.name.replace(/[/\\?%*:|"<>]/g, '-');
    }
    downloadRoomName = downloadRoomName.trim() + '.vrc.json';
    link.download = downloadRoomName;
    link.click();
    URL.revokeObjectURL(link.href);
}


tooltipTitleHover();

function tooltipTitleHover() {

    if (mobileDevice != 'false') return; /* do not use on mobile devices */

    const tooltipTitles = document.querySelectorAll('.tooltipTitle');

    tooltipTitles.forEach(tooltipTitle => {
        tooltipTitle.addEventListener('mouseenter', function mouseover() {
            const boundingRect = tooltipTitle.getBoundingClientRect();

            const x = boundingRect.left;
            const y = boundingRect.top;

            let tip = tooltipTitle.querySelector('.tooltiptextTitle');
            let tipLeft = x - 40;
            let tipTop = y - 40;

            if (tipLeft < 0) tipLeft = 0;
            if (tipTop < 0) tipTop = 0;

            tip.style.left = tipLeft + 'px';
            tip.style.top = tipTop + 'px';

            toolTipTextTimeout = setTimeout(() => {
                tip.style.position = 'fixed';
                tip.style.display = 'inline';
            }
                , 1000);
        });
    });

    tooltipTitles.forEach(tooltipTitle => {
        tooltipTitle.addEventListener('mouseleave', function mouseover() {
            closeTooltipTitleText();
        });
    });
}

function closeTooltipTitleText() {
    const tooltipTextTitles = document.querySelectorAll('.tooltiptextTitle');
    clearTimeout(toolTipTextTimeout);

    tooltipTextTitles.forEach(tip => {
        tip.style.display = 'none';
    })
}

tooltip2Hover();

function tooltip2Hover() {

    //    if (mobileDevice != 'false') return; /* do not use on mobile devices */

    const tooltipTitles = document.querySelectorAll('.tooltip, .tooltipIcon, .tooltipBottom');

    tooltipTitles.forEach(tooltipTitle => {
        tooltipTitle.addEventListener('pointerenter', function mouseover() {

            let tips = tooltipTitle.querySelectorAll('.tooltiptext, .tooltiptextIcon, .tooltiptextBottom');
            toolTipTextTimeout2 = setTimeout(() => {
                tips.forEach(tip => {
                    tip.style.visibility = 'visible';
                    tip.style.opacity = 1;
                });
            }
                , 1000);


        });

        let tips2 = tooltipTitle.querySelectorAll('.tooltiptext, .tooltiptextIcon, .tooltiptextBottom');

        tips2.forEach(tip => {
            tip.addEventListener('pointerenter', function pointenter() {
                closeTooltipTitleText2();
            });
        });
    });

    tooltipTitles.forEach(tooltipTitle => {
        tooltipTitle.addEventListener('pointerleave', function mouseover() {
            closeTooltipTitleText2();
        });
    });
}


function closeTooltipTitleText2() {
    const tooltipTextTitles2 = document.querySelectorAll('.tooltiptext, .tooltiptextIcon, .tooltiptextBottom');
    clearTimeout(toolTipTextTimeout2);
    tooltipTextTitles2.forEach(tip => {
        tip.style.visibility = 'hidden';
        tip.style.opacity = 0;
    })
}


let rightClickMenuDialogId = 'rightClickMenuId';
let mouseOverRightClickMenu = false; /* is the mouse over the rightclick menu */


function closeRightClickMenu() {
    let element = document.getElementById(rightClickMenuDialogId);
    if (element) {
        element.remove();
    } /* if the menu already exists, remove and recreate */
}

/* createas a right click menu */
function createRightClickMenu(usePreviousPosition = false) {

    if (isMeasuringToolOn) return;

    let previousXY = {};
    quickAddMouse.x = mouseUnit.x;
    quickAddMouse.y = mouseUnit.y;



    let element = document.getElementById(rightClickMenuDialogId);

    if (element && element.open) {

        element.close();
        return;
    }

    if (element) {

        element.remove();
    } /* if the menu already exists, remove and recreate */


    mouseOverRightClickMenu = false;

    let bottomBuffer = 177;
    let rightBuffer = 277;

    if (mobileDevice === 'RoomOS') {
        bottomBuffer = 380;
    }

    selecting = false; /* selecting rectangle should not be used */

    let rightClickMenuDialog = document.createElement('div');
    rightClickMenuDialog.id = rightClickMenuDialogId;
    rightClickMenuDialog.className = 'rightClickMenu';


    let rightClickMenuDiv = document.createElement('div');
    rightClickMenuDiv.id = 'rightClickMenuDiv';
    rightClickMenuDiv.className = 'rightClickMenuDiv';


    document.body.appendChild(rightClickMenuDialog); /* Adds to the end of the body, but shows up as a dialog modal where the arrow is located */

    rightClickMenuDialog.appendChild(rightClickMenuDiv);
    /* if dialog and showModal() use the following */

    let mouseX = mouse.x;
    let mouseY = mouse.y;

    if (window.innerHeight - bottomBuffer < mouseY) {
        mouseY = window.innerHeight - bottomBuffer;
    }

    if (window.innerWidth - rightBuffer < mouseX) {
        mouseX = window.innerWidth - rightBuffer;
    }

    let newX = mouseX;
    let newY = mouseY;

    if (usePreviousPosition) {
        newX = rightClickMenuDialogLastPosition.x;
        newY = rightClickMenuDialogLastPosition.y;
    }

    const pos = stage.getPointerPosition();
    const shape = layerTransform.getIntersection(pos);

    let hr = document.createElement('hr');
    hr.className = 'rightClickHorizontalLine';


    rightClickMenuDiv.textContent = '';

    if (!isMeasuringToolOn) {
        createMenuItem('copyMenuDiv', 'Copy', 'ctrl+c', tr.nodes().length < 1);
        createMenuItem('pasteMenuDiv', 'Paste', 'ctrl+p', !Object.keys(canvasClipBoard).length || false);
        createMenuItem('deleteMenuDiv', 'Delete', 'delete', tr.nodes().length < 1);
        createMenuItem('duplicateMenuDiv', 'Duplicate', 'ctrl+d', tr.nodes().length < 1);
        rightClickMenuDiv.appendChild(hr.cloneNode(true));
        createMenuItem('quickAddMenu', 'Quick Add', 'space', false);
        rightClickMenuDiv.appendChild(hr.cloneNode(true));
        createMenuItem('zoomResetDiv', 'Zoom 100%', '', (zoomValue === 100));
        rightClickMenuDiv.appendChild(hr.cloneNode(true));
        createMenuItem('rotateDiv', 'Rotate 90°', 'ctrl+r', tr.nodes().length < 1)
        rightClickMenuDiv.appendChild(hr.cloneNode(true));
        createMenuItem('undoDiv', 'Undo', 'ctrl+z', !(undoArray.length > 1));
        createMenuItem('redoDiv', 'Redo', 'ctrl+y', !(redoArray.length > 0));
    }




    rightClickMenuDialog.style.top = newY + 'px'; /* Distance from the top of the viewport, moved to center */
    rightClickMenuDialog.style.left = newX + 'px';

    rightClickMenuDialogLastPosition.x = newX;
    rightClickMenuDialogLastPosition.y = newY;

    rightClickMenuDialog.style.position = 'fixed';


    rightClickMenuDiv.addEventListener('mouseenter', function (event) {
        mouseOverRightClickMenu = true;

    });

    rightClickMenuDiv.addEventListener('mouseleave', function (event) {
        mouseOverRightClickMenu = false;

    });

    /* recreate menu on second right click */
    rightClickMenuDialog.addEventListener('contextmenu', function (event) {
        event.preventDefault();

        if (mouseUnit.x < 0 || mouseUnit.y < 0) {
            rightClickMenuDialog.close();
            return;
        }

        createRightClickMenu();

    });


    function createMenuItem(menuId, menuText, shortCut, disableDiv = false) {
        let mainDivClass = 'rightClickMenuItem';

        if (disableDiv) {
            mainDivClass = 'rightClickMenuItemDisable';
            menuId = menuId + 'Disable';
        }

        let menuItem = document.createElement('div');
        menuItem.id = menuId;
        menuItem.className = mainDivClass;
        menuItem.textContent = menuText;
        rightClickMenuDiv.appendChild(menuItem);

        let shortCutSpan = document.createElement('span');
        shortCutSpan.id = menuId + 'shortCut';
        shortCutSpan.className = 'rightClickMenuShortCutText';
        shortCutSpan.textContent = shortCut;
        menuItem.appendChild(shortCutSpan);

        menuItem.addEventListener('click', function menuItemClick(e) {

            closeRightClickMenu();
            if (e.target.id === 'copyMenuDiv') {
                copyItems();
            }
            else if (e.target.id === 'deleteMenuDiv') {
                deleteTrNodes();
            }
            else if (e.target.id === 'pasteMenuDiv') {
                pasteItems(false);
            }
            else if (e.target.id === 'duplicateMenuDiv') {
                duplicateItems();
            }
            else if (e.target.id === 'zoomResetDiv') {
                zoomInOut('reset');
            }
            else if (e.target.id === 'undoDiv') {
                btnUndoClicked();
            }
            else if (e.target.id === 'redoDiv') {
                btnRedoClicked();
            }
            else if (e.target.id === 'quickAddMenu') {
                toggleQuickAdd(true);
            }
            else if (e.target.id === 'rotateDiv') {
                rotateTrNodeItems();

                tr.nodes().forEach(node => {
                    updateShading(node);
                });

                if (tr.nodes().length === 1) {
                    updateFormatDetails(shape.id());
                }
            }
        });


    }

}

window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0]; // Get the first touch point
    logMouseMovements(touch);
});

window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0]; // Get the first touch point
    logMouseMovements(touch);
});

window.addEventListener('touchmove', (e) => {
    clearTimeout(rightClickTouchTimer);
});

function closeAllDialogModals() {

    const dialogs = document.querySelectorAll('dialog');

    dialogs.forEach(dialog => {
        dialog.close();
    });
}


function toggleMoreMenu(action = '') {

    const rect = document.getElementById('btnMoreMenu').getBoundingClientRect();
    let menuMoreDiv = document.getElementById('menuMoreDiv')

    let iconBtnMoreMenu = document.getElementById('iconBtnMoreMenu');

    if (iconBtnMoreMenu.classList.contains('icon-more-adr-bold') || action === 'close') {

        iconBtnMoreMenu.classList.remove('icon-more-adr-bold');
        iconBtnMoreMenu.classList.add('icon-more-bold');
        menuMoreDiv.style = 'display: none';

    } else {

        iconBtnMoreMenu.classList.remove('icon-more-bold');
        iconBtnMoreMenu.classList.add('icon-more-adr-bold');
        menuMoreDiv.style = `
        top: ${rect.bottom + window.scrollY + 7}px;
        left: ${rect.left + window.scrollX - 245}px;
        width: 281px;
        display: absolute;
        `;

        document.addEventListener('pointerdown', event => {

            if (menuMoreDiv && !menuMoreDiv.contains(event.target) && !document.getElementById('btnMoreMenu').contains(event.target)) {
                toggleMoreMenu('close');
            }

        });

    }

}

document.addEventListener('pointerdown', event => {

    const rightClickMenu = document.getElementById(rightClickMenuDialogId);
    if (rightClickMenu && !rightClickMenu.contains(event.target) && event.target) {
        closeRightClickMenu();
    }

});

/*
    Tesla browser has issues with select dropDown drop down menus. If on a Telsa, make similar to RoomOS.

    This only determines if it MIGHT be a Tesla browsers and could get false positive or negatives.
*/
function isTeslaBrowser() {
    const userAgent = navigator.userAgent || '';
    let hasTeslaKeyword = false;
    let batteryAPI; //
    const isTouchDevice = 'ontouchstart' in window;

    /* matches userAgent for Tesla Model Y 2023 */
    if (userAgent.match(/Mozilla\/[0-9\.]*\s+\(X11;\s+Linux\s+x86_64\)\s+AppleWebKit\/[0-9\.]*\s+\(KHTML,\s+like\s+Gecko\)\s+Chrome\/[0-9\.]*\s+Safari\/[0-9\.]*/i)) {
        hasTeslaKeyword = true;
    }

    if (userAgent.match(/.*tesla.*/i)) {
        hasTeslaKeyword = true;
    }

    if ('getBattery' in navigator) {
        batteryAPI = true;
    } else {
        batteryAPI = false;
    }
    // showTestLog(ua);
    // showTestLog('isTouchDevice:', isTouchDevice)
    // showTestLog('hasTeslaKeyword', hasTeslaKeyword);
    // showTestLog('batteryAPI: ', batteryAPI);

    // showTestLog('isTesla?:', hasTeslaKeyword && isTouchDevice && batteryAPI)

    // showTestLog('screen Width x Height:', screen.width, 'x', screen.height);
    // showTestLog('available Screen Width x Height:', screen.availWidth, 'x', screen.availHeight);

    return hasTeslaKeyword && isTouchDevice && batteryAPI;
}


// Mark's Changes in roomcalc.js
// Added at the very bottom of the file

document.addEventListener("DOMContentLoaded", () => {

    const jsonArrowBtn = document.getElementById("drpDownBtnArrowJSON");
    const jsonMenu = document.getElementById("drpDownJSONContent");
    const jsonItems = jsonMenu.querySelectorAll(".dropDownMenuItem");


    //
    // PNG split-button
    //
    const pngArrowBtn = document.getElementById("drpDownBtnArrowPNG");
    const pngMenu = document.getElementById("drpDownPNGContent");
    const pngItems = pngMenu.querySelectorAll(".dropDownMenuItem");

    const pngDownloadPNGMenuItem = document.getElementById("downloadPNGMenuItem");

    jsonArrowBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // don’t let this click close it immediately
        pngMenu.classList.remove("showPNGDropDown");
        jsonMenu.classList.toggle("showJSONDropDown");
    });

    //  Clicking anywhere else closes the JSON menu
    document.addEventListener("click", (e) => {
        if (!jsonArrowBtn.contains(e.target) && !jsonMenu.contains(e.target)) {
            jsonMenu.classList.remove("showJSONDropDown");
        }
    });

    //  Clicking a JSON menu-item also closes the menu
    jsonItems.forEach((item) => {
        item.addEventListener("click", () => {
            jsonMenu.classList.remove("showJSONDropDown");
            // …your “download JSON” logic here…
        });
    });


    //  Download the PNG if the Download Menu Items is clicked
    pngDownloadPNGMenuItem.addEventListener("click", () => {
        downloadCanvasPNG();
    });


    /*  Toggle PNG menu on arrow click */
    pngArrowBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        jsonMenu.classList.remove("showJSONDropDown");
        pngMenu.classList.toggle("showPNGDropDown");
    });

    //  Clicking anywhere else closes the PNG menu
    document.addEventListener("click", (e) => {
        if (!pngArrowBtn.contains(e.target) && !pngMenu.contains(e.target)) {
            pngMenu.classList.remove("showPNGDropDown");
        }
    });

    //  Clicking a PNG menu-item also closes the menu
    pngItems.forEach((item) => {
        item.addEventListener("click", () => {
            pngMenu.classList.remove("showPNGDropDown");
            // …your “download PNG” logic here…
        });
    });
});


/* Custom deep comparison of objects */
function areObjectsEqual(obj1, obj2) {
    // Check if both are objects and not null
    if (typeof obj1 !== 'object' || obj1 === null ||
        typeof obj2 !== 'object' || obj2 === null) {
        return obj1 === obj2; // Compare primitives directly
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (!keys2.includes(key) || !areObjectsEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

function isObjectEmpty(obj) {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    return Object.keys(obj).length === 0;
}

/*
    Attribution:

    Konva.js: https://konvajs.org/ - MIT license can be found at https://github.com/konvajs/konva/blob/master/LICENSE

    DOMPurify: https://github.com/cure53/DOMPurify license can be found at https://github.com/cure53/DOMPurify/blob/main/LICENSE

*/

