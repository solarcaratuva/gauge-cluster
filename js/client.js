const socket = new WebSocket("ws://localhost:8080/test");

// Connection opened
socket.addEventListener("open", function (event) {
    socket.send("Hello Server!");
});

// Listen for messages
socket.addEventListener("message", function (event) {
    console.log("Message from server ", event.data);
});

function sendPing() {
    socket.send("Ping!");
}

function sendCommand(command) {
    socket.send(JSON.stringify({"command": command}))
}

