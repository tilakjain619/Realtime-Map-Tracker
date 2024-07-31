const express = require('express');
const app = express();
const port = 3000;
const path = require('path')

const http = require('http');

const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server);


app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")))

io.on("connection", (socket) => {
    socket.on("send-location", (data) => {
        io.emit("receive-location", { id: socket.id, ...data });
    })
    console.log("Connected to SocketIO");
    socket.on("disconnect", () =>{
        io.emit("user-disconnected", socket.id);
    })
})

app.get("/", (req, res) => {
    res.render("index");
})
server.listen(port, () => {
    console.log("Server listening on " + port);
})