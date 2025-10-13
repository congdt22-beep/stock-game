alert("✅ App.js loaded successfully!");

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
  BarChart,
  Bar,
} from "recharts";
import { newsList } from "./data";

console.log("🟢 App.js loaded");

// Tạo socket với fallback rõ ràng
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "https://stock-game-server.onrender.com";

console.log("🌐 Using socket server:", SOCKET_URL);

const socket = io(SOCKET_URL, { transports: ["websocket"] });

const initialStocks = [
  { code: "AAA", name: "Công ty AAA", price: 100 },
  { code: "BBB", name: "Công ty BBB", price: 120 },
  { code: "CCC", name: "Công ty CCC", price: 80 },
  { code: "DDD", name: "Công ty DDD", price: 150 },
];

function App() {
  console.log("🟢 App component rendered");

  const [playerName, setPlayerName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [stocks, setStocks] = useState(
    initialStocks.map((s) => ({
      ...s,
      ceiling: s.price * 1.07,
      floor: s.price * 0.93,
      prevPrice: s.price,
      history: [{ time: 0, price: s.price, volume: 0 }],
    }))
  );

  const [day, setDay] = useState(1);
  const totalDays = 22;
  const [timer, setTimer] = useState(10);
  const [news, setNews] = useState(null);
  const [timeTick, setTimeTick] = useState(1);
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [winner, setWinner] = useState(null);

  const loginUrl = `https://stock-game-iota.vercel.app/join`;

  // ======= SOCKET =======
  useEffect(() => {
    socket.on("connect", () => console.log("✅ Connected to server"));
    socket.on("connect_error", (err) =>
      console.error("❌ Socket connect error:", err.message)
    );

    socket.on("init", (data) => {
      console.log("📡 Received init data:", data);
      setPlayers(data.players || []);
      setGameStarted(data.gameStarted || false);
    });
    socket.on("playersUpdate", (updated) => {
      console.log("👥 Players updated:", updated);
      setPlayers(updated);
    });
    socket.on("gameStarted", () => {
      console.log("🚀 Game started!");
      setGameStarted(true);
    });
    socket.on("gameReset", () => {
      console.log("🔁 Game reset!");
      setGameStarted(false);
      setPlayers([]);
      setLoggedIn(false);
    });
    socket.on("joinError", (msg) => alert(msg));

    return () => {
      socket.off();
    };
  }, []);

  // ======= JOIN =======
  const handleJoin = () => {
    if (!playerName.trim()) return alert("❌ Vui lòng nhập tên!");
    console.log("🧍 Joining game as:", playerName);
    socket.emit("join", playerName);
    setLoggedIn(true);
    if (players.length === 0) setIsAdmin(true);
  };

  const startGame = () => {
    console.log("🎮 Admin started game");
    socket.emit("startGame");
  };

  // ======= LOGIC NGÀY MỚI =======
  const startNewDay = useCallback(() => {
    const randomNews = newsList[Math.floor(Math.random() * newsList.length)];
    setNews(randomNews);
    setTimer(10);
    setTimeTick(1);
    setStocks((prev) =>
      prev.map((s) => ({
        ...s,
        ceiling: s.price * 1.07,
        floor: s.price * 0.93,
      }))
    );
  }, []);

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
        const countdown = setTimeout(() => {
          setTimer((t) => t - 1);
          setTimeTick((tick) => tick + 1);
        }, 1000);
        return () => clearTimeout(countdown);
      }
    }
  }, [timer, gameStarted, day, totalDays, startNewDay, balance, portfolio, stocks, playerName]);

  // ======= MUA/BÁN =======
  const handleBuy = (stock) => {
    if (balance < stock.price) return alert("❌ Không đủ tiền!");
    setBalance((b) => b - stock.price);
    setPortfolio((p) => ({
      ...p,
      [stock.code]: (p[stock.code] || 0) + 1,
    }));
    updateStockPrice(stock.code, "up");
  };

  const handleSell = (stock) => {
    if (!portfolio[stock.code]) return alert("❌ Bạn không có cổ phiếu này!");
    setBalance((b) => b + stock.price);
    setPortfolio((p) => ({
      ...p,
      [stock.code]: p[stock.code] - 1,
    }));
    updateStockPrice(stock.code, "down");
  };

  const updateStockPrice = (code, action) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.code !== code) return s;
        const change = action === "up" ? 1.03 : 0.97;
        const newPrice = Math.min(
          s.ceiling,
          Math.max(s.floor, s.price * change)
        );
        return {
          ...s,
          prevPrice: s.price,
          price: newPrice,
          history: [
            ...s.history,
            {
              time: timeTick,
              price: newPrice,
              volume: Math.floor(Math.random() * 1000),
            },
          ],
        };
      })
    );
  };

  // ======= BẢNG XẾP HẠNG =======
  useEffect(() => {
    const interval = setInterval(() => {
      setLeaderboard(() => {
        const newData = [...players].map((p) => {
          const isMe = p.name === playerName;
          const totalValue = isMe
            ? Object.keys(portfolio).reduce((sum, code) => {
                const stock = stocks.find((s) => s.code === code);
                return sum + (stock ? stock.price * portfolio[code] : 0);
              }, balance)
            : p.balance || 10000;
          return { name: p.name, total: totalValue };
        });
        newData.sort((a, b) => b.total - a.total);
        return newData.slice(0, 5);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [players, stocks, portfolio, balance, playerName]);

  // ======= GIAO DIỆN =======
  if (!loggedIn) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h1>📲 Đăng nhập tham gia sàn giao dịch</h1>
        <p>Quét mã QR hoặc nhập tên để tham gia:</p>
        <QRCode value={loginUrl} size={200} />
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
            style={{ marginLeft: 10, padding: "8px 16px" }}
          >
            Tham gia
          </button>
        </div>
      </div>
    );
  }

  if (loggedIn && !gameStarted) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h1>🕹️ Sảnh chờ trò chơi</h1>
        <h3>Xin chào, {playerName}</h3>
        <h4>👥 Người chơi hiện tại:</h4>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {players.map((p, i) => (
            <li key={i}>✅ {p.name}</li>
          ))}
        </ul>
        {isAdmin && (
          <button
            onClick={startGame}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 18,
              backgroundColor: "green",
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

  return (
    <div style={{ padding: 20 }}>
      <h1>📈 Stock Game – Ngày {day}/{totalDays}</h1>
      <h2>👤 Người chơi: {playerName}</h2>
      <h3>💰 Số dư: ${balance.toFixed(2)}</h3>
      <h3>⏳ Thời gian còn lại: {timer}s</h3>
      {news && (
        <div style={{ marginBottom: 20 }}>
          <strong>Tin tức hôm nay:</strong> {news.headline}
        </div>
      )}
      {/* Bảng xếp hạng */}
      <div style={{ marginBottom: 20, background: "#f9f9f9", padding: 10, borderRadius: 8 }}>
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
