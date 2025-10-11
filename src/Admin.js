// src/Admin.js
import React from "react";
import QRCode from "qrcode.react";

function Admin() {
  const joinURL = "http://192.168.1.10:3000/join"; // ⚠️ thay bằng IP LAN thật của bạn

  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <h1>📱 Quét mã QR để tham gia Stock Game</h1>
      <QRCode value={joinURL} size={256} />
      <p style={{ marginTop: 10 }}>{joinURL}</p>
    </div>
  );
}

export default Admin;
