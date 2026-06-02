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
