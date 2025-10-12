import { io } from "socket.io-client";
export const socket = io("https://stock-game-server.onrender.com", {
  transports: ["websocket"],
});
