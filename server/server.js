// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.get("/", (req,res) => res.send("✅ Stock Game WebSocket server is running!"));

let players = [];
let gameStarted = false;

io.on("connection", socket => {
  console.log("client connected", socket.id);
  socket.emit("init", { players, gameStarted });

  socket.on("join", (name) => {
    const p = { id: socket.id, name, balance: 10000 };
    // prevent duplicate names
    if(players.find(x=>x.name === name)){
      socket.emit("joinError", "Tên đã tồn tại, vui lòng đổi tên");
      return;
    }
    players.push(p);
    io.emit("playersUpdate", players);
    console.log("join", name);
  });

  socket.on("startGame", () => {
    if(gameStarted) return;
    gameStarted = true;
    io.emit("gameStarted");
    io.emit("playersUpdate", players);
    console.log("Game started");
  });

  socket.on("gameOver", (data) => {
    // can record winner etc.
    console.log("gameOver", data);
  });

  socket.on("trade", (trade) => {
    // broadcast trade to everyone (frontend handles prices), could update server-side balances
    io.emit("tradeBroadcast", trade);
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit("playersUpdate", players);
    console.log("disconnect", socket.id);
  });

  socket.on("resetGame", () => {
    players = [];
    gameStarted = false;
    io.emit("gameReset");
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=>console.log(`🔥 WebSocket server running on port ${PORT}`));
