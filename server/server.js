// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ Cấu hình CORS cho phép cả localhost và domain Vercel
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",               // chạy local dev
      "https://stock-game-p6ug.vercel.app",  // domain Vercel thật
    ],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => res.send("✅ Stock Game WebSocket server is running!"));

let players = [];
let gameStarted = false;

io.on("connection", (socket) => {
  console.log("client connected", socket.id);
  socket.emit("init", { players, gameStarted });

  socket.on("join", (name) => {
    const p = { id: socket.id, name, balance: 10000 };
    // prevent duplicate names
    if (players.find((x) => x.name === name)) {
      socket.emit("joinError", "Tên đã tồn tại, vui lòng đổi tên");
      return;
    }
    players.push(p);
    io.emit("playersUpdate", players);
    console.log("join", name);
  });

  socket.on("startGame", () => {
    if (gameStarted) return;
    gameStarted = true;
    io.emit("gameStarted");
    io.emit("playersUpdate", players);
    console.log("Game started");
  });

  socket.on("gameOver", (data) => {
    // có thể ghi lại người thắng, v.v.
    console.log("gameOver", data);
  });

  socket.on("trade", (trade) => {
    // broadcast trade tới tất cả client
    io.emit("tradeBroadcast", trade);
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
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
server.listen(PORT, () =>
  console.log(`🔥 WebSocket server running on port ${PORT}`)
);
