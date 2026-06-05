/*
*  List of messages to show for specialized devices like switches.
*
*  Lower indexed items have a higher priority.
*
*/

window.VRC = window.VRC || {};

window.VRC.insertMessages = [
    {
        idRegex: /^switchC\d+/,
        header: 'Inserted %device_name% ',
        body: 'The inserted switch will be used to create the cable map in the Workspace Designer. The Workspaace Designer expects for the switch to be in a specific location and have a <b>role</b> of <i>ceiling</i> or <i>floor</i>. Check the Detail-&gt;Item <b>role</b> and <b>z</b> values. The Workspace Designer cable map is for general guidance of cable lengths and not for architectual drawings.'

    },
    {
        idRegex: /^codecProG2RoomVision/,
        header: 'Inserted %device_name% ',
        body: 'Use this codec if you only have dual Room Vision cameras. Dual Room Vision PTZ cameras are not fully supported in the Workspace Designer custom rooms API. Use Room Vision cameras with role <b>Cross-view</b> to emulate the experience in the Workspace Designer.'

    },
    {
        idRegex: /^codec/,
        header: 'Inserted %device_name% ',
        body: 'The inserted %device_name% will be used to create the cable map in the Workspace Designer. The Workspace Designer expects the codec to be in a specific location, typically z=1.4 m behind the main camera. The Workspace Designer cable map is for general guidance of cable lengths and not for architectural drawings.'
    },
    {
        idRegex: /^ceilingGrid/,
        header: 'Inserted %device_name%',
        body: 'The ceiling grid is best used by placing it on its own layer and locking that layer.'
    }

];


window.VRC.dummyMenuKey = {

    dummyMenuBoardPro55G3: ['brdPro55G3',  'brdPro55G3FS','brdPro55G3Wheel', 'brdPro55G3WS' ],

    dummyMenuBoardPro75G3: ['brdPro75G3', 'brdPro75G3FS', 'brdPro75G3Wheel', 'brdPro75G3WS' ],

    dummyMenuBoardPro55G2: ['brdPro55G2', 'brdPro55G2FS', 'brdPro55G2Wheel', 'brdPro55G2WS' ],

    dummyMenuBoardPro75G2: ['brdPro75G2','brdPro75G2FS', 'brdPro75G2Wheel', 'brdPro75G2WS' ],

    dummyMenuRoomKitEQX: ['roomKitEqx', 'roomKitEqxFS', 'roomKitEqxWS'],

}
