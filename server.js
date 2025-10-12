// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Khởi tạo Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép tất cả client kết nối (React app)
    methods: ["GET", "POST"],
  },
});

// ======= ROUTE KIỂM TRA =======
app.get("/", (req, res) => {
  res.send("✅ Stock Game WebSocket server is running!");
});

// ======= STATE CHÍNH =======
let players = [];      // Danh sách người chơi hiện tại
let gameStarted = false; // Trạng thái trò chơi (đã bắt đầu hay chưa)

// ======= XỬ LÝ KHI CLIENT KẾT NỐI =======
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.emit("init", { players, gameStarted });

  socket.on("join", (name) => {
    if (gameStarted) {
      socket.emit("joinError", "Trò chơi đã bắt đầu, vui lòng chờ ván sau!");
      return;
    }

    const newPlayer = { id: socket.id, name };
    players.push(newPlayer);

    console.log(`👤 ${name} joined`);
    io.emit("playersUpdate", players);
  });

  socket.on("startGame", () => {
    if (gameStarted) return;
    gameStarted = true;
    io.emit("gameStarted");
    console.log("🎮 Game started!");
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    io.emit("playersUpdate", players);
    console.log(`❌ Player ${socket.id} disconnected`);
  });

  socket.on("resetGame", () => {
    players = [];
    gameStarted = false;
    io.emit("gameReset");
    console.log("🔄 Game reset by admin.");
  });
});

// ======= KHỞI ĐỘNG SERVER =======
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🔥 WebSocket server running on port ${PORT}`);
});
