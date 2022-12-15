let cec_monitor = require('@senzil/cec-monitor');

//All config options are optionals
//the values are the deafults
let monitor = new cec_monitor.CECMonitor('test-device', {
  com_port: '',            //set com port to use (see cec-client -l)
  debug: false,           // enable/disabled debug events from cec-client
  hdmiport: 1,            // set inital hdmi port
  processManaged: false,  // set/unset handlers to avoid unclear process exit.
  recorder: true,         //enable cec-client as recorder device
  player: false,          //enable cec-client as player device
  tuner: false,           //enable cec-client as tuner device
  audio: false,           //enable cec-client as audio system device
  autorestart: true,      //enable autrestart cec-client to avoid some wierd conditions
  no_serial: {            //controls if the monitor restart cec-client when that stop after the usb was unplugged
    reconnect: false,       //enable reconnection attempts when usb is unplugged
    wait_time: 30,          //in seconds - time to do the attempt
    trigger_stop: false     //false to avoid trigger stop event
  },
  cache: {
    enable: false,  //treats the state like a cache, and enable _EXPIREDCACHE event.
    autorefresh: false, //enable the cache refresh (currently only power status), and enable _UPDATEDCACHE event.
    timeout: 30  //value greater than 0 (in seconds) enable cache invalidation timeout and request new values if autorefresh is enabled
  },
  command_timeout: 3,       //An value greater than 0 (in secconds) meaning the timeout time for SendCommand function
  user_control_hold_interval: 1000 //An value greater than 0 (in miliseconds) meaning the interval for emit the special _USERCONTROLHOLD event
});

console.log('starting');


function power_off_callback(packet) {
    console.log('POWER STATUS CODE:',packet.data.val);
    console.log('POWER STATUS:',packet.data.str);
    if (packet.data.str === "STANDBY") {
        console.log('power off detected successfully');
        console.log('please trun TV back on');
        monitor.off(cec_monitor.CECMonitor.EVENTS.REPORT_POWER_STATUS, power_off_callback);
        monitor.once(cec_monitor.CECMonitor.EVENTS.REPORT_POWER_STATUS, power_on_callback);
    }
};
function power_on_callback(packet) {
    console.log('POWER STATUS CODE:',packet.data.val);
    console.log('POWER STATUS:',packet.data.str);
    if (packet.data.str === "ON") {
        console.log('power on detected successfully');
        console.log('please switch to a different HDMI source');
        monitor.off(cec_monitor.CECMonitor.EVENTS.REPORT_POWER_STATUS, power_on_callback);
        monitor.once(cec_monitor.CECMonitor.EVENTS.ROUTING_CHANGE, switch_hdmi_callback);
    }
};

function switch_hdmi_callback(packet) {
    console.log("HDMI switch detected");
    console.log( 'Routing changed from ' + packet.data.from.str + ' to ' + packet.data.to.str + '.' );
    console.log('Switch device to TV channel now');
    monitor.on(cec_monitor.CECMonitor.EVENTS.ROUTING_CHANGE, switch_to_tv_callback);
};
function switch_to_tv_callback(packet) {
    console.log("HDMI switch detected");
    console.log( 'Routing changed from ' + packet.data.from.str + ' to ' + packet.data.to.str + '.' );
    if (packet.data.to.str === '0.0.0.0'){
        console.log('Test finished successfully');
        monitor.off(cec_monitor.CECMonitor.EVENTS.ROUTING_CHANGE, switch_to_tv_callback);
        process.exit(0);
    } else {
        console.log('Please switch to TV');
    }
};

monitor.once(cec_monitor.CECMonitor.EVENTS._READY, function() {
  console.log( ' -- READY -- ' );
  // Low-level
  monitor.WriteMessage(cec_monitor.CEC.LogicalAddress.BROADCAST, cec_monitor.CEC.LogicalAddress.TV, cec_monitor.CEC.Opcode.GIVE_DEVICE_POWER_STATUS);
  // High-level
  monitor.SendMessage(null,null,cec_monitor.CEC.Opcode.SET_OSD_NAME,'Plex'); // Broadcast my OSD Name
  monitor.SendMessage(null, cec_monitor.CEC.LogicalAddress.TV, cec_monitor.CEC.Opcode.GIVE_OSD_NAME); // Ask TV for OSD Name
  console.log(' -- Start of the test --');
  console.log('Please turn off your TV with a remote');
  monitor.on(cec_monitor.CECMonitor.EVENTS.REPORT_POWER_STATUS, power_off_callback);
});

monitor.once(cec_monitor.CECMonitor.EVENTS.SET_OSD_NAME, function(packet) {
  console.log( 'Logical address ' + packet.source + 'has OSD name ' + packet.data.str);
});


