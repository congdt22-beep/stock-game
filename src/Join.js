import React, { useState } from "react";

export default function Join() {
  const [name, setName] = useState("");
  const onJoin = () => {
    if (!name.trim()) return alert("Nhập tên nhé!");
    // lưu vào localStorage rồi redirect về /
    localStorage.setItem("mtc_player_name", name.trim());
    window.location.href = "/";
  };

  return (
    <div className="center">
      <div className="card">
        <h2>Tham gia Sàn chứng khoán MTC</h2>
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nhập tên..." />
        <button onClick={onJoin}>Tạo tài khoản & Vào sảnh chờ</button>
      </div>
    </div>
  );
}
