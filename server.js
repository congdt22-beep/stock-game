// server.js
const http = require("http");
const { Server } = require("socket.io");

// Tạo server HTTP
const server = http.createServer();

// Khởi tạo Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép tất cả client kết nối (React app)
    methods: ["GET", "POST"],
  },
});

// ======= STATE CHÍNH =======
let players = [];      // Danh sách người chơi hiện tại
let gameStarted = false; // Trạng thái trò chơi (đã bắt đầu hay chưa)

// ======= XỬ LÝ KHI CLIENT KẾT NỐI =======
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Gửi dữ liệu khởi tạo cho client mới (danh sách & trạng thái)
  socket.emit("init", { players, gameStarted });

  // Khi người chơi gửi tên để tham gia
  socket.on("join", (name) => {
    if (gameStarted) {
      // Nếu game đã bắt đầu, không cho người mới vào
      socket.emit("joinError", "Trò chơi đã bắt đầu, vui lòng chờ ván sau!");
      return;
    }

    const newPlayer = { id: socket.id, name };
    players.push(newPlayer);

    console.log(`👤 ${name} joined`);
    io.emit("playersUpdate", players);
  });

  // Khi admin bấm nút bắt đầu trò chơi
  socket.on("startGame", () => {
    if (gameStarted) return;
    gameStarted = true;
    io.emit("gameStarted");
    console.log("🎮 Game started!");
  });

  // Khi người chơi rời khỏi server
  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    io.emit("playersUpdate", players);
    console.log(`❌ Player ${socket.id} disconnected`);
  });

  // Khi admin muốn reset lại game
  socket.on("resetGame", () => {
    players = [];
    gameStarted = false;
    io.emit("gameReset");
    console.log("🔄 Game reset by admin.");
  });
});

// ======= KHỞI ĐỘNG SERVER =======
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🔥 WebSocket server running on port ${PORT}`);
});
