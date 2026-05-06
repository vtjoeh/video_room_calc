/* Workspace Designer keys: workspaceKey
 *
 * Pure data — maps each VRC item type to the Workspace Designer object
 * that represents it on import / export. No DOM access, no Konva calls,
 * no functions. The object is attached to `window.VRC.workspaceKey`
 * (per the namespace convention in notes/TECH_NOTES.md) and `roomcalc.js`
 * pulls it back in as a top-level `workspaceKey` const so the read
 * sites scattered through that file stay unchanged.
 *
 * Loaded BEFORE roomcalc.js. See `<script>` tag order in
 * RoomCalculator.html.
 *
 * The Workspace Designer and Video Room Calc have different coordinate
 * systems:
 *   VRC x              = Designer x
 *   VRC y              = Designer z
 *   VRC data_zPosition = Designer y
 *   Rotation: VRC degrees = Designer -1 * (radians)
 *
 * Per-entry attributes:
 *   vertOffset: meters; VRC data_zPosition value added when exporting
 *               to the Workspace Designer.
 *   yOffset:    meters; difference between the VRC and Designer Y for
 *               this object before export.
 *   role:       default role for the device; can be overridden per item.
 */

window.VRC = window.VRC || {};
window.VRC.workspaceKey = {};

/* Wrap the assignments in an IIFE so the local `workspaceKey` alias is
 * scoped to this file. roomcalc.js declares its own top-level
 * `const workspaceKey = window.VRC.workspaceKey;`, and two top-level
 * `const` declarations of the same name in classic <script> tags
 * collide on the shared script-level lexical environment. */
(function () {
const workspaceKey = window.VRC.workspaceKey;

workspaceKey.unknownObj = {}; /* Workspace Designer Unkown Objects on import */
workspaceKey.tblUnknownObj = {}; /* Workspace Designer Unkown Objects on import with width and length */

workspaceKey.switch = { objectType: 'switch' };

workspaceKey.switchC9200CX = { objectType: 'switch', model: "Catalyst 9200CX Series" };

workspaceKey.switchC1200 = { objectType: 'switch', model: 'Catalyst 1200 Series' }


workspaceKey.codec = { objectType: 'codec' };

workspaceKey.codecEQX = { objectType: 'codec', model: 'EQX' };
workspaceKey.codecEQ = { objectType: 'codec', model: 'Room Kit EQ' };
workspaceKey.codecPro = { objectType: 'codec', model: 'Room Kit Pro' };
workspaceKey.codecProG2QuadCam = { objectType: 'codec', model: 'Room Kit Pro G2' };
workspaceKey.codecProG2RoomVision = { objectType: 'codec', model: 'Vision Kit Pro G2' };


workspaceKey.phoneUnknown = { objectType: 'phone', role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9841 = { objectType: 'phone', model: "9841", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9851 = { objectType: 'phone', model: "9851", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9861 = { objectType: 'phone', model: "9861", role: "phone", yOffset: -0.1, xOffset: -0.04 };

workspaceKey.phone9871 = { objectType: 'phone', model: "9871", role: "phone", yOffset: -0.1, xOffset: -0.04 };


workspaceKey.unknownVideoDevice = { objectType: 'videoDevice' }

workspaceKey.roomBar = { objectType: 'videoDevice', model: 'Room Bar', color: 'light', mount: "wall", yOffset: 0.032 };
workspaceKey.roomBarPro = { objectType: 'videoDevice', model: 'Room Bar Pro', color: 'light', mount: "wall", yOffset: 0.045 };
workspaceKey.roomKitEqx = { objectType: 'videoDevice', model: 'EQX', mount: 'wall', color: 'dark', mount: "wall", yOffset: 0.076 };
workspaceKey.roomBarByod = { objectType: 'videoDevice', model: 'Room Bar BYOD', color: 'light', mount: "wall", yOffset: 0.032 };

workspaceKey.roomKitEqQuadCam = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', mount: "wall", yOffset: 0.051 };
workspaceKey.roomKitEqQuadCamExt = { objectType: 'videoDevice', model: 'Room Kit EQ', color: 'light', mount: "wall", yOffset: 0.051 };

workspaceKey.roomKitProG2QuadCam = { objectType: 'videoDevice', model: 'Room Kit Pro G2', mount: "wall", color: 'dark', yOffset: 0.051 };

workspaceKey.roomKitProQuadCam = { objectType: 'videoDevice', model: 'Room Kit Pro', mount: "wall", color: 'light', yOffset: 0.051 };




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
workspaceKey.webexDeskProG2 = { objectType: 'videoDevice', model: 'Desk Pro G2', role: 'singleScreen' };
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

workspaceKey.tblBullet = { objectType: 'table', model: 'bullet' }

workspaceKey.carpet = { objectType: 'carpet', color: "#aaa" };

workspaceKey.ceilingMicPro = { objectType: 'microphone', model: 'Ceiling Mic Pro' };
workspaceKey.ceilingMount = { objectType: "ceilingMount" };
workspaceKey.tableMicPro = { objectType: 'microphone', model: 'Table Mic Pro' };
workspaceKey.tableMic = { objectType: 'microphone', model: 'Table Mic' };
workspaceKey.ceilingMic = { objectType: 'microphone', model: 'Ceiling Mic', yOffset: 0.275 };

workspaceKey.loudspeaker = { objectType: 'loudspeaker' };

workspaceKey.projector = { objectType: 'projector' };

workspaceKey.shareCableUsbc = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 1, multihead: 0 } };
workspaceKey.shareCableHdmi = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 0, multihead: 0 } };
workspaceKey.shareCableMulti = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 0, multihead: 1 } };
workspaceKey.shareCableUsbcHdmi = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 1, multihead: 0 } };
workspaceKey.shareCableUsbcMulti = { objectType: 'sharelid', shareSettings: { hdmi: 0, usbc: 1, multihead: 1 } };
workspaceKey.shareCableHdmiMulti = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 0, multihead: 1 } };
workspaceKey.shareCableUsbcHdmiMulti = { objectType: 'sharelid', shareSettings: { hdmi: 1, usbc: 1, multihead: 1 } };

workspaceKey.mouse = { objectType: 'mouse' };

workspaceKey.displaySngl_2 = { objectType: 'screen', yOffset: -0.01 };

workspaceKey.displayScreen_2 = { objectType: 'screen', model: 'canvas', yOffset: -0.02 };



workspaceKey.displayMonitor = { objectType: "monitor" }


workspaceKey.displaySngl = { objectType: 'screen', yOffset: -0.01 };

workspaceKey.displayScreen = { objectType: 'screen', model: 'canvas', yOffset: -0.01 };

workspaceKey.display21_9 = { objectType: 'screen', aspect: '21:9', yOffset: -0.01 };

workspaceKey.display21_9_2 = { objectType: 'screen', aspect: '21:9', yOffset: -0.01 }; /* display21_9 is now the primary option */

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

workspaceKey.credenza = { objectType: 'credenza' }


workspaceKey.sphere = { objectType: 'sphere' };
workspaceKey.cylinder = { objectType: 'cylinder' };

workspaceKey.customVRC = { objectType: 'Customer Video Room Calc', kind: '' };


workspaceKey.unknownCamera = { objectType: 'camera' }

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
})();
