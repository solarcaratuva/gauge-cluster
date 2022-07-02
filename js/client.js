var url = "ws://" + window.location.hostname + ":8080/ws";
var socket;

var turnSignalToggle = false;
var turnSignalMode = 0;
var turnSignalInterval;
var turnSignals = document.getElementById("turn-signals").children;
var leftTurnSignal = turnSignals[0];
var rightTurnSignal = turnSignals[1];

function turnSignalsBlink(mode) {
    let onTurnSignalColor = "#00ff00";
    let offTurnSignalColor = "#fff";
    if (mode != turnSignalMode) {
        clearInterval(turnSignalInterval);
        turnSignalInterval = setInterval(function () {
            console.log(turnSignalToggle);
            if (turnSignalToggle) {
                if (turnSignalMode == 1 || turnSignalMode == 2) {
                    leftTurnSignal.style.color = onTurnSignalColor;
                    rightTurnSignal.style.color = offTurnSignalColor;
                }
                if (turnSignalMode == 1 || turnSignalMode == 3) {
                    leftTurnSignal.style.color = offTurnSignalColor;
                    rightTurnSignal.style.color = onTurnSignalColor;
                }
            } else {
                leftTurnSignal.style.color = offTurnSignalColor;
                rightTurnSignal.style.color = offTurnSignalColor;
            }
            turnSignalToggle = !turnSignalToggle;
        }, 750);
        turnSignalMode = mode;
    }
}


function updateGUI(toUpdate) {
    // 0x123
    if ("fan_error" in toUpdate) {
        let bpsIndicator = document.querySelector("#bps-indicator > span");
        if (toUpdate.bps_error) {
            bpsIndicator.style.background = "rgba(255, 0, 0, 1)";
        }
    }
    // 0x201
    if ("throttle" in toUpdate) {
        //gauge.update({value: toUpdate.throttle});
    }
    // 0x301
    if ("hazards" in toUpdate) {
        if (toUpdate.hazards == 1) {
            turnSignalsBlink(1);
        } else if (toUpdate.left_turn_signal == 1) {
            turnSignalsBlink(2);
        } else if (toUpdate.right_turn_signal == 1) {
            turnSignalsBlink(3);
        } else {
            turnSignalIntervalMode = 0;
            clearInterval(turnSignalInterval);
        }
    }
    // 0x325
    if ("battery_voltage" in toUpdate) {
        // 460-470mm wheel diameter
        // ~18.3inches
        let speed = toUpdate.motor_rpm * 18.8 * Math.PI * 60.0 / 63360.0;
        document.getElementById("speed").innerHTML = Math.floor(speed);
        document.getElementById("motor-current").innerHTML = toUpdate.motor_current;
        document.getElementById("motor-temp").innerHTML = toUpdate.fet_temp;
        console.log(toUpdate);
    }
    // 0x315
    if ("power_mode" in toUpdate) {
        let gearDisplay = document.getElementById("gear");
        //console.log(gearDisplay.children[0]);
        let selectFontSize = "4rem";
        let unselectFontSize = "3rem";
        let selectColor = "#fff";
        let unselectColor = "#757575";
        let mode = document.querySelector("#mode > span");
        if (toUpdate.power_mode == 0) {
            mode.innerHTML = "ECO";
            mode.style.color = "rgba(0, 255, 0, 1)";
        } else {
            mode.innerHTML = "STD";
            mode.style.color = "rgba(255, 255, 0, 1)";
        }
        switch(toUpdate.motor_status) {
            case 2:
                // forward indicator
                gearDisplay.children[0].style.fontSize = selectFontSize;
                gearDisplay.children[0].style.color = selectColor;
                gearDisplay.children[1].style.fontSize = unselectFontSize;
                gearDisplay.children[1].style.color = unselectColor;
                gearDisplay.children[2].style.fontSize = unselectFontSize;
                gearDisplay.children[2].style.color = unselectColor;
                setWebcam(0);
                break;
            case 3:
                // reverse indicator
                gearDisplay.children[0].style.fontSize = unselectFontSize;
                gearDisplay.children[0].style.color = unselectColor;
                gearDisplay.children[1].style.fontSize = unselectFontSize;
                gearDisplay.children[1].style.color = unselectColor;
                gearDisplay.children[2].style.fontSize = selectFontSize;
                gearDisplay.children[2].style.color = selectColor;
                setWebcam(3);
                break;
            default:
                // neutral indicator
                gearDisplay.children[0].style.fontSize = unselectFontSize;
                gearDisplay.children[0].style.color = unselectColor;
                gearDisplay.children[1].style.fontSize = selectFontSize;
                gearDisplay.children[1].style.color = selectColor;
                gearDisplay.children[2].style.fontSize = unselectFontSize;
                gearDisplay.children[2].style.color = unselectColor;
                setWebcam(0);
        }
    }
    // 0x406
    if ("pack_voltage" in toUpdate) {
        document.getElementById("battery-voltage").innerHTML = Math.round(toUpdate.pack_voltage / 100);
        document.getElementById("battery-current").innerHTML = toUpdate.pack_current / 10.0;
    }
}

function hex2bin(hex){
    return (parseInt(hex, 16).toString(2)).padStart(8, '0');
}

function setWebcam(motorStatus, video) {
    video = document.getElementById("webcam");
    gauges = document.getElementById("gauges");
    if (motorStatus == 3) {
        if (video.getAttribute("hidden") != null) {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log("enabling webcam");
                navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                    video.srcObject = stream;
                })
                .catch(function (err0r) {
                    console.log("Something went wrong!");
                });
                gauges.style.visibility = "hidden";
                gauges.style.display = "none";
                video.removeAttribute("hidden");
            } else {
                console.log("Webcam not enabled or detected!");
                video.setAttribute("hidden", "true");
                gauges.style.display = "flex";
                gauges.style.visibility = "visible";
            }
        }
    } else {
        if (video.getAttribute("hidden") == null) {
            video.setAttribute("hidden", "true");
            gauges.style.display = "flex";
            gauges.style.visibility = "visible";
        }
    }
}

function parseCANMessage(msg) {
    let result = JSON.parse(msg);
    if ("throttle" in result) {
        result.throttle = Math.floor(100 * result.throttle / 256);
        result.regen = Math.floor(100 * result.regen / 256);
    } else if ("power_mode" in result) {
        //setWebcam(result["motor_status"]);
    } else if ("battery_voltage" in result) {
        result.battery_voltage *= 0.5;
        result.fet_temp *= 5;
        result.pwm_duty *= 0.5;
        result.lead_angle *= 0.5;
    }
    updateGUI(result);
}

function connectToServer(command) {
    let wsStatus = document.getElementById("websocket-status");
    if (socket == null) {
        socket = new WebSocket(url);
        // Connection opened
        socket.addEventListener("open", function (event) {
            console.log("Connected to", url);
            sendCommand(JSON.stringify(command));
            wsStatus.innerHTML = "OK";
            wsStatus.style.color = "#00ff00";
        });
        // Listen for messages
        socket.addEventListener("message", function (event) {
           parseCANMessage(event.data);
        });
        socket.addEventListener("error", function (event) {
            console.log("WebSocket error: ", event);
            wsStatus.innerHTML = "ERR";
            wsStatus.style.color = "#ff0000";
        });
        socket.addEventListener("close", function (event) {
            console.log("WebSocket closed: ", event);
            wsStatus.innerHTML = "ERR";
            wsStatus.style.color = "#ff0000";
        });
    } else {
        if (socket.url == url) {
            if (socket.readyState == WebSocket.CONNECTING) {
                console.log("Already connecting!");
            } else if (socket.readyState == WebSocket.OPEN) {
                console.log("Already connected!");
            }
        }
    }
}

function disconnectFromServer() {
    let wsStatus = document.getElementById("websocket-status");
    wsStatus.innerHTML = "ERR";
    wsStatus.style.color = "#ff0000";
    if (socket == null) {
        console.log("Not connected!");
    } else {
        socket.close();
        socket = null;
        console.log("Disconnected from websocket server!");
    }
}


function sendCommand(command) {
    if (socket == null) {
        console.log("Not connected to websocket server!");
        return false;
    } else {
        socket.send(command);
        console.log("Sent command", command); 
        return true;
    }
}

var manualWebcamToggle = 0;
function toggleWebcam() {
    if (manualWebcamToggle == 0) {
        manualWebcamToggle = 3;
    } else {
        manualWebcamToggle = 0;
    }
    setWebcam(manualWebcamToggle);
}

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log("enabling webcam");
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
        document.getElementById("constant-webcam").srcObject = stream;
    })
    .catch(function (err0r) {
        console.log("Something went wrong!");
    });
}

connectToServer({"subscribe": [0x123, 0x201, 0x301, 0x315, 0x325, 0x406]});
