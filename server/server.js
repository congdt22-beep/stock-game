const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.send("✅ Stock Game WebSocket server is running!");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ======= STATE TOÀN CỤC =======
let roomState = {
  players: [],
  gameStarted: false,
  adminId: null,
  stocks: [
    { code: "HPG", name: "Công ty Thép", price: 100 },
    { code: "MSN", name: "Công ty Nhà Đất", price: 120 },
    { code: "MBB", name: "Ngân Hàng", price: 80 },
    { code: "SSI", name: "Công ty Chứng Khoán", price: 150 },
  ],
};

// ======= SOCKET =======
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Gửi lại toàn bộ state cho client mới
  socket.emit("init", roomState);

  // Khi người chơi join
  socket.on("join", (name) => {
    if (!name) return;
    if (roomState.players.find((p) => p.name === name)) {
      socket.emit("joinError", "Tên đã tồn tại, vui lòng đổi tên!");
      return;
    }

    if (!roomState.adminId) {
      roomState.adminId = socket.id;
      console.log("👑 Admin set:", name);
    }

    const player = { id: socket.id, name, balance: 10000, portfolio: {} };
    roomState.players.push(player);

    io.emit("playersUpdate", {
      players: roomState.players,
      adminId: roomState.adminId,
    });
  });

  // Khi admin bắt đầu game
  socket.on("startGame", () => {
    if (socket.id !== roomState.adminId) return;
    if (roomState.gameStarted) return;
    roomState.gameStarted = true;
    io.emit("gameStarted", true);
    io.emit("playersUpdate", {
      players: roomState.players,
      adminId: roomState.adminId,
    });
    console.log("🚀 Game started by admin");
  });

  // Mua bán cổ phiếu
  socket.on("buy", ({ code, qty }) => {
    const player = roomState.players.find((p) => p.id === socket.id);
    const stock = roomState.stocks.find((s) => s.code === code);
    if (!player || !stock || qty <= 0) return;

    const cost = stock.price * qty;
    if (player.balance < cost) return;

    player.balance -= cost;
    player.portfolio[code] = (player.portfolio[code] || 0) + qty;
    stock.price = Math.min(stock.price * (1 + 0.001 * qty), stock.price * 1.07);

    io.emit("stocksUpdate", roomState.stocks);
    io.emit("playersUpdate", {
      players: roomState.players,
      adminId: roomState.adminId,
    });
  });

  socket.on("sell", ({ code, qty }) => {
    const player = roomState.players.find((p) => p.id === socket.id);
    const stock = roomState.stocks.find((s) => s.code === code);
    if (!player || !stock || qty <= 0) return;
    if (!player.portfolio[code] || player.portfolio[code] < qty) return;

    player.portfolio[code] -= qty;
    player.balance += stock.price * qty;
    stock.price = Math.max(stock.price * (1 - 0.001 * qty), stock.price * 0.93);

    io.emit("stocksUpdate", roomState.stocks);
    io.emit("playersUpdate", {
      players: roomState.players,
      adminId: roomState.adminId,
    });
  });

  socket.on("resetGame", () => {
    if (socket.id !== roomState.adminId) return;
    roomState = {
      players: [],
      gameStarted: false,
      adminId: null,
      stocks: [
        { code: "HPG", name: "Công ty Thép", price: 100 },
        { code: "MSN", name: "Công ty Nhà Đất", price: 120 },
        { code: "MBB", name: "Ngân Hàng", price: 80 },
        { code: "SSI", name: "Công ty Chứng Khoán", price: 150 },
      ],
    };
    io.emit("gameReset");
    console.log("🔁 Game reset");
  });

  socket.on("disconnect", () => {
    roomState.players = roomState.players.filter((p) => p.id !== socket.id);
    if (socket.id === roomState.adminId) {
      roomState.adminId = roomState.players[0]?.id || null;
      console.log("⚠️ Admin disconnected, reassigned:", roomState.adminId);
    }
    io.emit("playersUpdate", {
      players: roomState.players,
      adminId: roomState.adminId,
    });
  });
});

// Leaderboard cập nhật 3s/lần
setInterval(() => {
  const leaderboard = roomState.players
    .map((p) => {
      let total = p.balance;
      for (const code in p.portfolio) {
        const stock = roomState.stocks.find((s) => s.code === code);
        if (stock) total += stock.price * p.portfolio[code];
      }
      return { name: p.name, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  io.emit("leaderboard", leaderboard);
}, 3000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
