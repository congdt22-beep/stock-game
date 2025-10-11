// src/Join.js
import React, { useState } from "react";

function Join({ onJoin }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleJoin = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("⚠️ Vui lòng nhập tên trước khi tham gia!");
      return;
    }

    // Lưu tên vào localStorage để tự động đăng nhập lần sau
    localStorage.setItem("playerName", name.trim());

    // Gửi tên người chơi về App
    onJoin(name.trim());
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1>📝 Đăng nhập vào trò chơi</h1>
      <p>Nhập tên của bạn để tham gia phòng chờ</p>

      <form onSubmit={handleJoin} style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Nhập tên người chơi..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(""); // reset lỗi khi người dùng nhập lại
          }}
          style={{
            padding: 10,
            fontSize: 18,
            width: 250,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            marginLeft: 10,
            padding: "10px 20px",
            fontSize: 18,
            borderRadius: 6,
            border: "none",
            backgroundColor: "#4CAF50",
            color: "white",
            cursor: "pointer",
          }}
        >
          🚀 Vào chơi
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}

export default Join;
