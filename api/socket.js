import { Server } from "socket.io";

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("🔌 Khởi tạo Socket.io server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*", // Cho phép mọi nguồn (hoặc bạn có thể ghi rõ domain của bạn)
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("🟢 Người chơi mới kết nối:", socket.id);

      socket.on("send_message", (data) => {
        io.emit("receive_message", data);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Người chơi ngắt kết nối:", socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
