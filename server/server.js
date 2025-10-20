// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" })); // ✅ cho phép tất cả domain

app.get("/", (req, res) => {
  res.send("✅ Stock Game WebSocket server is running!");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // ✅ rất quan trọng
    methods: ["GET", "POST"],
  },
});

// ======= STATE TOÀN CỤC =======
let players = [];
let gameStarted = false;
let adminId = null;

let stocks = [
  { code: "HPG", name: "Công ty Thép", price: 100 },
  { code: "MSN", name: "Công ty Nhà Đất", price: 120 },
  { code: "MBB", name: "Ngân Hàng", price: 80 },
  { code: "SSI", name: "Công ty Chứng Khoán", price: 150 },
];

// ======= SOCKET =======
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.emit("init", { players, gameStarted, stocks, adminId });

  socket.on("join", (name) => {
    if (!name) return;
    if (players.find((p) => p.name === name)) {
      socket.emit("joinError", "Tên đã tồn tại, vui lòng đổi tên!");
      return;
    }

    if (!adminId) adminId = socket.id;

    const player = { id: socket.id, name, balance: 10000, portfolio: {} };
    players.push(player);

    io.emit("playersUpdate", { players, adminId });
    console.log(`👤 ${name} joined`);
  });

  socket.on("startGame", () => {
    if (socket.id !== adminId) return;
    if (gameStarted) return;
    gameStarted = true;
    io.emit("gameStarted");
    io.emit("playersUpdate", { players, adminId });
    console.log("🚀 Game started by admin");
  });

  socket.on("buy", ({ code, qty }) => {
    const player = players.find((p) => p.id === socket.id);
    const stock = stocks.find((s) => s.code === code);
    if (!player || !stock || qty <= 0) return;
    const cost = stock.price * qty;
    if (player.balance < cost) return;

    player.balance -= cost;
    player.portfolio[code] = (player.portfolio[code] || 0) + qty;
    stock.price = Math.min(stock.price * (1 + 0.002 * qty), stock.price * 1.07);

    io.emit("stocksUpdate", stocks);
    io.emit("playersUpdate", { players, adminId });
  });

  socket.on("sell", ({ code, qty }) => {
    const player = players.find((p) => p.id === socket.id);
    const stock = stocks.find((s) => s.code === code);
    if (!player || !stock || qty <= 0) return;
    if (!player.portfolio[code] || player.portfolio[code] < qty) return;

    player.portfolio[code] -= qty;
    player.balance += stock.price * qty;
    stock.price = Math.max(stock.price * (1 - 0.002 * qty), stock.price * 0.93);

    io.emit("stocksUpdate", stocks);
    io.emit("playersUpdate", { players, adminId });
  });

  socket.on("resetGame", () => {
    if (socket.id !== adminId) return;
    players = [];
    gameStarted = false;
    adminId = null;
    stocks = [
      { code: "HPG", name: "Công ty Thép", price: 100 },
      { code: "MSN", name: "Công ty Nhà Đất", price: 120 },
      { code: "MBB", name: "Ngân Hàng", price: 80 },
      { code: "SSI", name: "Công ty Chứng Khoán", price: 150 },
    ];
    io.emit("gameReset");
    console.log("🔁 Game reset by admin");
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    if (socket.id === adminId) adminId = players[0]?.id || null;
    io.emit("playersUpdate", { players, adminId });
    console.log("❌ Disconnect:", socket.id);
  });
});

setInterval(() => {
  const leaderboard = players
    .map((p) => {
      let total = p.balance;
      for (const code in p.portfolio) {
        const stock = stocks.find((s) => s.code === code);
        if (stock) total += stock.price * p.portfolio[code];
      }
      return { name: p.name, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  io.emit("leaderboard", leaderboard);
}, 5000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🔥 Server running on port ${PORT}`)
);
