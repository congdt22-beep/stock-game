import React from "react";
import io from "socket.io-client";

// Admin.js
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://stock-game-server-cong.onrender.com";
const socket = io(SOCKET_URL, { transports: ["websocket"] });

export default function Admin(){
  const start = () => {
    socket.emit("startGame");
    alert("Đã gửi lệnh bắt đầu");
  };
  const reset = () => {
    if(!window.confirm("Reset game?")) return;
    socket.emit("resetGame");
  };
  return (
    <div className="center">
      <div className="card">
        <h2>Admin – MTC</h2>
        <button onClick={start}>Bắt đầu trò chơi</button>
        <button onClick={reset} style={{marginLeft:10}}>Reset</button>
      </div>
    </div>
  );
}
