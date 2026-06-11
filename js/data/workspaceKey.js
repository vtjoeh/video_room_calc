/* Workspace Designer keys: workspaceKey (pure data, no DOM/Konva/functions).
 *
 * Maps each VRC item type to its Workspace Designer object for import/export.
 * Attached to window.VRC.workspaceKey; roomCalc.js reads it as a top-level
 * const. Loaded BEFORE roomCalc.js (see <script> order in RoomCalculator.html).
 * Coordinate systems differ: VRC x = WD x, VRC y = WD z, VRC data_zPosition =
 * WD y, VRC rotation degrees = WD -1*(radians). Per-entry: vertOffset/yOffset
 * (meters, applied on export), role (default, per-item overridable).
 * See notes/COMMENT_NOTES.md "Workspace Designer keys".
 */

window.VRC = window.VRC || {};
window.VRC.workspaceKey = {};

/* IIFE scopes the local `workspaceKey` alias so it can't collide with roomCalc.js's top-level const. */
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



/* Board Pro (G1) */
workspaceKey.boardPro55 = { objectType: 'videoDevice', model: 'Legacy', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046, scale: [1.4, 7, 0.5] };
workspaceKey.boardPro75 = { objectType: 'videoDevice', model: 'Legacy', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475, scale: [1.8, 9.1, 0.5] };

/* Board Pro (G2) */
workspaceKey.brdPro55G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro55G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 55, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G2 = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475 };
workspaceKey.brdPro75G2FS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'floor', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G2Wheel = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wheelstand', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro55G2Wheel = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wheelstand', size: 55, role: 'firstScreen', yOffset: 0.475 };

workspaceKey.brdPro55G2WS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wallstand', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro75G2WS = { objectType: 'videoDevice', model: 'Board Pro', mount: 'wallstand', size: 75, role: 'firstScreen', yOffset: 0.0475 };

/* Board Pro (G3) */

workspaceKey.brdPro55G3 = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wall', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro55G3FS = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'floor', size: 55, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G3 = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wall', size: 75, role: 'firstScreen', yOffset: 0.0475 };
workspaceKey.brdPro75G3FS = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'floor', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro75G3Wheel = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wheelstand', size: 75, role: 'firstScreen', yOffset: 0.475 };
workspaceKey.brdPro55G3Wheel = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wheelstand', size: 55, role: 'firstScreen', yOffset: 0.475 };

workspaceKey.brdPro55G3WS = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wallstand', size: 55, role: 'firstScreen', yOffset: 0.046 };
workspaceKey.brdPro75G3WS = { objectType: 'videoDevice', model: 'Board Pro G3', mount: 'wallstand', size: 75, role: 'firstScreen', yOffset: 0.0475 };



workspaceKey.webexDesk = { objectType: 'videoDevice', model: 'Desk', role: 'singleScreen', yOffset: -0.08 };
workspaceKey.webexDeskProG2 = { objectType: 'videoDevice', model: 'Desk Pro G2', role: 'singleScreen' };
workspaceKey.webexDeskPro = { objectType: 'videoDevice', model: 'Desk Pro', role: 'singleScreen' };
workspaceKey.webexDeskMini = { objectType: 'videoDevice', model: 'Desk Mini', role: 'singleScreen' };

// workspaceKey.room55 = { objectType: 'videoDevice', model: 'Legacy', scale: [1.5, 12, 0.5] };
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
workspaceKey.tblBar = { objectType: 'bar'};

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

/* certifiedDisplay: model/aspect/size derived from the picked certifiedDisplays[] entry at export time (see workspaceObjDisplayPush). */
workspaceKey.certifiedDisplay = { objectType: 'screen', yOffset: -0.01 };

workspaceKey.displayMonitor = { objectType: "monitor" }


workspaceKey.wallStd = { objectType: 'wall' };
workspaceKey.wallWindow = { objectType: 'wall', model: 'window' };
workspaceKey.ceiling = { objectType: 'ceiling' };
workspaceKey.columnRect = { objectType: 'wall', color: '#808080' };


workspaceKey.box = { objectType: 'box' }

workspaceKey.wdText = { objectType: 'text' };

workspaceKey.doorRight = { objectType: 'door', yOffset: -0.47, scale: [1, 1, 1] }
workspaceKey.doorLeft = { objectType: 'door', yOffset: -0.47, scale: [-1, 1, 1] }

workspaceKey.doorDoubleRight = { objectType: 'door', scale: [1, 1, 1] }
workspaceKey.doorDoubleLeft = { objectType: 'door', scale: [-1, 1, 1] }

workspaceKey.doorRight2 = { objectType: 'door', yOffset: -0.47, scale: [1, 1, 2] }
workspaceKey.doorLeft2 = { objectType: 'door', yOffset: -0.47, scale: [-1, 1, 2] }


workspaceKey.doorDouble2Right = { objectType: 'door', scale: [1, 1, 2] }
workspaceKey.doorDouble2Left = { objectType: 'door', scale: [-1, 1, 2] }

workspaceKey.floor = { objectType: 'floor' };

workspaceKey.stageFloor = { objectType: 'box', idRegex: '(^stage$)|(^step-)|(^stageFloor~)' };

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
workspaceKey.cone = { objectType: 'cylinder' };



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


/* Parent Items: `parentItem: true` emits one WD primitive per childItemParts entry plus a data.vrc.parentItems[] record. See notes/COMMENT_NOTES.md "Parent Items" and CLAUDE.md. */

// workspaceKey.genericSecurityCamera = {
//     parentItem: true,
//     childItemParts: [
//         {
//             data_deviceid: 'cylinder',
//             x: 0.0025, y: 0.0025,
//             width: 0.12, height: 0.12,
//             rotation: 0,
//             data_tilt: 0, data_slant: 0,
//             data_zPosition: 0.05,
//             data_vHeight: 0.05,
//         },
//         {
//             data_deviceid: 'sphere',
//             x: 0.0125, y: 0.0125,
//             width: 0.1, height: 0.1,
//             rotation: 0,
//             data_zPosition: 0,
//             data_vHeight: 0.1,
//             data_fill: '#595959',
//         },
//     ],
// };


workspaceKey.ceilingFan = {
    parentItem: true,
    childItemParts: [
        {
            "data_deviceid": "box",
            "x": 0.9834,
            "y": 0.0976,
            "width": 1.2527279599127055,
            "height": 0.13106399580595213,
            "rotation": 135,
            "data_zPosition": 0.0213,
            "data_vHeight": 0.006095999804928007,
            "data_tilt": 0,
            "data_slant": 0
        },
        {
            "data_deviceid": "box",
            "x": 0.9498,
            "y": 0.9906,
            "width": 1.2618719596200971,
            "height": 0.13106399580595213,
            "rotation": -135,
            "data_zPosition": 0.0213,
            "data_vHeight": 0.006095999804928007,
            "data_tilt": 0,
            "data_slant": 0
        },
        {
            "data_deviceid": "cylinder",
            "x": 0.3768,
            "y": 0.3201,
            "width": 0.2804159910266883,
            "height": 0.2804159910266883,
            "rotation": 0,
            "data_zPosition": 0,
            "data_vHeight": 0.06095999804928007,
            "data_tilt": 0,
            "data_slant": 0
        },
        {
            "data_deviceid": "cylinder",
            "x": 0.5018,
            "y": 0.4572,
            "width": 0.030479999024640034,
            "height": 0.030479999024640034,
            "rotation": 0,
            "data_zPosition": 0,
            "data_vHeight": 0.4571999853696005,
            "data_tilt": 0,
            "data_slant": 0
        }
    ],
};



/* Generated from Custom Item "Security Camera (generic)" — paste into js/data/workspaceKey.js. */
workspaceKey.genericSecurityCamera = {
    parentItem: true,
    childItemParts: [
        {
            "data_deviceid": "cylinder",
            "x": 0,
            "y": 0,
            "width": 0.12,
            "height": 0.12,
            "rotation": 0,
            "data_zPosition": 0.05,
            "data_vHeight": 0.05,
            "data_tilt": 0,
            "data_slant": 0
        },
        {
            "data_deviceid": "sphere",
            "x": 0.01,
            "y": 0.01,
            "width": 0.1,
            "height": 0.1,
            "rotation": 0,
            "data_zPosition": 0,
            "data_vHeight": 0.1,
            "data_tilt": 0,
            "data_slant": 0,
            "data_fill": "#595959"
        }
    ],
};


workspaceKey.room55 = {
    parentItem: true,
    childItemParts: [
        {
            "data_deviceid": "displaySngl_2",
            "x": 0.6295,
            "y": 0.4702,
            "width": 1.2039599614732812,
            "height": 0.09143999707392009,
            "rotation": 0,
            "data_zPosition": 0.8534
        },
        {
            "data_deviceid": "box",
            "x": 0.279,
            "y": 0.0161,
            "width": 0.999743968008193,
            "height": 0.04876799843942405,
            "rotation": 45,
            "data_vHeight": 0.030479999024640034
        },
        {
            "data_deviceid": "box",
            "x": 0.9983,
            "y": 0.0404,
            "width": 0.999743968008193,
            "height": 0.04876799843942405,
            "rotation": 135,
            "data_vHeight": 0.015239999512320017
        },
        {
            "data_deviceid": "box",
            "x": 0.5168,
            "y": 0.333,
            "width": 0.2164079930749442,
            "height": 0.10972799648870411,
            "rotation": 0,
            "data_vHeight": 1.5941039489886737
        },
        {
            "data_deviceid": "box",
            "x": 0.0047,
            "y": 0.391,
            "width": 1.2557759598151692,
            "height": 0.07619999756160008,
            "rotation": 0,
            "data_zPosition": 0.8534,
            "data_vHeight": 0.7619999756160007,
            "data_tilt": 0,
            "data_slant": 0,
            "data_fill": "#F5F5F5"
        },
        {
            "data_deviceid": "cylinder",
            "x": 0.5838,
            "y": 0.4245,
            "width": 0.06095999804928007,
            "height": 0.06095999804928007,
            "rotation": 0,
            "data_zPosition": 1.5392,
            "data_vHeight": 0.06095999804928007,
            "data_tilt": 90,
            "data_slant": 0,
            "data_fill": "#000000"
        }
    ],
};



})();
