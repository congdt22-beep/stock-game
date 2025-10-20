import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import QRCode from "qrcode.react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { newsList } from "./data";

console.log("✅ App.js loaded successfully!");

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "https://stock-game-server.onrender.com";
console.log("🌐 Using socket server:", SOCKET_URL);
const socket = io(SOCKET_URL, { transports: ["websocket"] });

const initialStocks = [
  { code: "HPG", name: "Công ty Thép", price: 100 },
  { code: "MSN", name: "Công ty Nhà Đất", price: 120 },
  { code: "MBB", name: "Ngân Hàng", price: 80 },
  { code: "SSI", name: "Công ty Chứng Khoán", price: 150 },
];

function App() {
  const [playerName, setPlayerName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stocks, setStocks] = useState(initialStocks);
  const [leaderboard, setLeaderboard] = useState([]);
  const [winner, setWinner] = useState(null);
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [day, setDay] = useState(1);
  const totalDays = 12;
  const [timer, setTimer] = useState(15);
  const [news, setNews] = useState(null);
  const [usedNews, setUsedNews] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantities, setQuantities] = useState({});
  const loginUrl = `https://stock-game-iota.vercel.app/join`;

  // ===== 🔥 CÁC SỰ KIỆN SOCKET BỔ SUNG =====
  useEffect(() => {
    socket.on("connect", () => console.log("✅ Connected to server"));
    socket.on("connect_error", (err) =>
      console.error("❌ Socket connect error:", err.message)
    );

    socket.on("init", (data) => {
      setPlayers(data.players || []);
      setGameStarted(!!data.gameStarted);
      setStocks(data.stocks || initialStocks);
      setIsAdmin(socket.id === data.adminId);
    });

    socket.on("playersUpdate", ({ players, adminId }) => {
      setPlayers(players || []);
      setIsAdmin(socket.id === adminId);
    });

    socket.on("stocksUpdate", (data) => setStocks(data));
    socket.on("leaderboard", (data) => setLeaderboard(data));

    socket.on("gameStarted", () => setGameStarted(true));

    socket.on("gameReset", () => {
      setGameStarted(false);
      setWinner(null);
      setBalance(10000);
      setPortfolio({});
      setDay(1);
      setUsedNews([]);
    });

    socket.on("joinError", (msg) => alert(msg));

    return () => socket.off();
  }, []);

  // ===== 🧍‍♂️ THAM GIA / ĐIỀU KHIỂN GAME =====
  const handleJoin = () => {
    if (!playerName.trim()) return alert("❌ Vui lòng nhập tên!");
    socket.emit("join", playerName);
    setLoggedIn(true);
  };

  const startGame = () => socket.emit("startGame");
  const resetGame = () => socket.emit("resetGame");

  // ===== 🛒 GỬI LỆNH MUA / BÁN LÊN SERVER =====
  const handleBuy = (stock, qty = 1) => {
    if (qty <= 0) return alert("❌ Số lượng không hợp lệ!");
    socket.emit("buy", { code: stock.code, qty });
  };

  const handleSell = (stock, qty = 1) => {
    if (qty <= 0) return alert("❌ Số lượng không hợp lệ!");
    socket.emit("sell", { code: stock.code, qty });
  };

  // ===== 📰 Tin tức mỗi ngày (giữ logic gốc) =====
  const startNewDay = useCallback(() => {
    const availableNews = newsList.filter(
      (n) => !usedNews.includes(n.headline)
    );
    const randomPool = availableNews.length > 0 ? availableNews : newsList;
    const randomNews = randomPool[Math.floor(Math.random() * randomPool.length)];
    setNews(randomNews);
    setUsedNews((prev) => [...prev, randomNews.headline]);
    setTimer(15);
  }, [usedNews]);

  // ===== ĐẾM NGÀY (giữ nguyên logic của bạn) =====
  useEffect(() => {
    if (gameStarted) {
      if (timer === 0) {
        if (day >= totalDays) {
          const finalValue = Object.keys(portfolio).reduce(
            (sum, code) => {
              const stock = stocks.find((s) => s.code === code);
              return sum + (stock ? stock.price * portfolio[code] : 0);
            },
            balance
          );
          setWinner({ name: playerName, total: finalValue });
          alert("🏁 Trò chơi kết thúc!");
        } else {
          setDay((d) => d + 1);
          startNewDay();
        }
      } else {
        const countdown = setTimeout(() => setTimer((t) => t - 1), 1000);
        return () => clearTimeout(countdown);
      }
    }
  }, [timer, gameStarted, day, totalDays, startNewDay, balance, portfolio, stocks, playerName]);

  // ======= GIAO DIỆN UI (giữ nguyên gốc của bạn) =======
  if (!loggedIn) {
    return (
      <div style={{ textAlign: "center", marginTop: 50, background: "#f4f7fb", height: "100vh" }}>
        <h1 style={{ color: "#2b7cff" }}>📲 Đăng nhập tham gia sàn giao dịch MTC</h1>
        <p>Quét mã QR hoặc nhập tên để tham gia:</p>
        <QRCode value={loginUrl} size={180} />
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Nhập tên người chơi..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ padding: 8, fontSize: 16 }}
          />
          <button
            onClick={handleJoin}
            style={{
              marginLeft: 10,
              padding: "8px 16px",
              background: "#2b7cff",
              color: "white",
              borderRadius: 6,
            }}
          >
            Tham gia
          </button>
        </div>
      </div>
    );
  }

  if (loggedIn && !gameStarted && !winner) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h1 style={{ color: "#2b7cff" }}>🕹️ Sảnh chờ trò chơi</h1>
        <h3>Xin chào, {playerName}</h3>
        <h4>👥 Người chơi hiện tại:</h4>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {players.map((p, i) => (
            <li key={i}>
              ✅ {p.name} {isAdmin && p.id === socket.id ? "👑 (Admin)" : ""}
            </li>
          ))}
        </ul>
        {isAdmin && (
          <button
            onClick={startGame}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 18,
              backgroundColor: "#2b7cff",
              color: "white",
              borderRadius: 8,
            }}
          >
            🚀 BẮT ĐẦU TRÒ CHƠI
          </button>
        )}
      </div>
    );
  }

  if (winner) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h1 style={{ color: "#2b7cff" }}>🏁 Trò chơi kết thúc!</h1>
        <h2>🎉 Người thắng: {winner.name}</h2>
        <h3>💰 Tổng tài sản: ${winner.total.toFixed(2)}</h3>

        <p style={{ marginTop: 30, fontStyle: "italic", color: "#555" }}>
          💡 Cảm ơn vì đã tham gia nghiên cứu của <strong>Đỗ Thành Công</strong> 💡
        </p>

        {isAdmin && (
          <button
            onClick={resetGame}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 18,
              backgroundColor: "#2b7cff",
              color: "white",
              borderRadius: 8,
            }}
          >
            🔁 BẮT ĐẦU LẠI TRÒ CHƠI (Về sảnh chờ)
          </button>
        )}
      </div>
    );
  }

  // ======= MÀN CHÍNH GAME =======
  return (
    <div
      onClick={() => setSelectedStock(null)}
      style={{ padding: 20, fontFamily: "Arial, sans-serif", background: "#f8faff", minHeight: "100vh" }}
    >
      <header
        style={{
          background: "linear-gradient(90deg, #2b7cff, #4b9bff)",
          padding: "10px 20px",
          color: "white",
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: 0 }}>Sàn chứng khoán Mai Thành Công</h2>
        <p style={{ margin: 0 }}>
          Ngày {day}/{totalDays} — Thời gian còn lại: {timer}s
        </p>
      </header>

      <h2>👤 Người chơi: {playerName}</h2>
      <h3>💰 Số dư: ${balance.toFixed(2)}</h3>

      {news && (
        <div
          style={{
            background: "#eef5ff",
            padding: 12,
            marginBottom: 20,
            borderLeft: "5px solid #2b7cff",
            borderRadius: 6,
          }}
        >
          <strong>📰 Tin tức hôm nay:</strong> {news.headline}
        </div>
      )}

      {/* Giao diện cổ phiếu giữ nguyên của bạn */}
      {/* ... (phần danh sách cổ phiếu + biểu đồ như code gốc) ... */}

      <div
        style={{
          marginTop: 40,
          background: "#f9f9f9",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <h3>🏆 Top 5 người chơi dẫn đầu</h3>
        <ol>
          {leaderboard.map((p, idx) => (
            <li key={idx}>
              {p.name} — <strong>${p.total.toFixed(2)}</strong>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
