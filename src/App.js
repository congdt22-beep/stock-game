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
  const totalDays = 12;
  const [timer, setTimer] = useState(15);
  const [news, setNews] = useState(null);
  const [usedNews, setUsedNews] = useState([]); // ✅ thêm để tránh trùng tin tức
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
      setPlayers(data.players || []);
      setGameStarted(data.gameStarted || false);
    });
    socket.on("playersUpdate", (updated) => setPlayers(updated));
    socket.on("gameStarted", () => setGameStarted(true));
    socket.on("gameReset", () => {
      setGameStarted(false);
      setPlayers([]);
      setLoggedIn(false);
      setWinner(null);
      setDay(1);
      setBalance(10000);
      setPortfolio({});
      setUsedNews([]);
    });
    socket.on("joinError", (msg) => alert(msg));

    return () => socket.off();
  }, []);

  const handleJoin = () => {
    if (!playerName.trim()) return alert("❌ Vui lòng nhập tên!");
    socket.emit("join", playerName);
    setLoggedIn(true);
    if (players.length === 0) setIsAdmin(true);
  };

  const startGame = () => socket.emit("startGame");
  const resetGame = () => socket.emit("resetGame");

  // ✅ Tin tức mỗi ngày không trùng + có ảnh hưởng đến giá
  const startNewDay = useCallback(() => {
    const availableNews = newsList.filter(
      (n) => !usedNews.includes(n.headline)
    );
    const randomPool = availableNews.length > 0 ? availableNews : newsList;
    const randomNews = randomPool[Math.floor(Math.random() * randomPool.length)];

    setNews(randomNews);
    setUsedNews((prev) => [...prev, randomNews.headline]);
    setTimer(15);
    setTimeTick(1);

    // ✅ Tin tức ảnh hưởng nhẹ đến thị trường (ngẫu nhiên +-3%)
    setStocks((prev) =>
      prev.map((s) => {
        const effect = (Math.random() - 0.5) * 0.06; // ±3%
        const influencedPrice = s.price * (1 + effect);
        return {
          ...s,
          prevPrice: s.price,
          price: Math.min(s.ceiling, Math.max(s.floor, influencedPrice)),
          ceiling: s.price * 1.07,
          floor: s.price * 0.93,
        };
      })
    );
  }, [usedNews]);

  // ======= Đếm ngày =======
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

  // ✅ Cập nhật giá theo cung cầu thực (số lượng mua/bán)
  const updateStockPrice = (code, action, qty = 1) => {
    setStocks((prev) =>
      prev.map((s) => {
        if (s.code !== code) return s;

        // tăng/giảm theo khối lượng (mỗi cổ phiếu tác động 0.2%)
        const changePercent = action === "up" ? 0.002 * qty : -0.002 * qty;
        const newPrice = Math.min(
          s.ceiling,
          Math.max(s.floor, s.price * (1 + changePercent))
        );

        return {
          ...s,
          prevPrice: s.price,
          price: newPrice,
          history: [
            ...s.history,
            { time: timeTick, price: newPrice, volume: qty },
          ],
        };
      })
    );
  };

  const handleBuy = (stock, qty = 1) => {
    if (balance < stock.price * qty) return alert("❌ Không đủ tiền!");
    setBalance((b) => Math.max(0, b - stock.price * qty));
    setPortfolio((p) => ({
      ...p,
      [stock.code]: (p[stock.code] || 0) + qty,
    }));
    updateStockPrice(stock.code, "up", qty);
  };

  const handleSell = (stock, qty = 1) => {
    if (!portfolio[stock.code] || portfolio[stock.code] < qty)
      return alert("❌ Bạn không có đủ cổ phiếu!");
    setBalance((b) => Math.max(0, b + stock.price * qty));
    setPortfolio((p) => ({
      ...p,
      [stock.code]: p[stock.code] - qty,
    }));
    updateStockPrice(stock.code, "down", qty);
  };

  // ======= Bảng xếp hạng =======
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
            : p.balance || 100000;
          return { name: p.name, total: totalValue };
        });
        newData.sort((a, b) => b.total - a.total);
        return newData.slice(0, 5);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [players, stocks, portfolio, balance, playerName]);

  // ======= UI =======
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

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", background: "#f8faff", minHeight: "100vh" }}>
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
        <p style={{ margin: 0 }}>Ngày {day}/{totalDays} — Thời gian còn lại: {timer}s</p>
      </header>

      <h2>👤 Người chơi: {playerName}</h2>
      <h3>💰 Số dư: ${balance.toFixed(2)}</h3>

      {news && (
        <div style={{
          background: "#eef5ff",
          padding: 12,
          marginBottom: 20,
          borderLeft: "5px solid #2b7cff",
          borderRadius: 6
        }}>
          <strong>📰 Tin tức hôm nay:</strong> {news.headline}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
        gap: 20
      }}>
        {stocks.map((s) => (
          <div key={s.code} style={{
            background: "#fff",
            borderRadius: 10,
            padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{s.name} ({s.code})</h3>
              <div style={{
                fontWeight: 600,
                color: s.price > s.prevPrice ? "green" : s.price < s.prevPrice ? "red" : "#333"
              }}>
                ${s.price.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#777" }}>
              Trần: {s.ceiling.toFixed(2)} | Sàn: {s.floor.toFixed(2)}
            </div>

            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min="1"
                placeholder="Số lượng"
                id={`qty-${s.code}`}
                style={{
                  width: 80,
                  padding: 6,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                }}
              />
              <button
                onClick={() => {
                  const qty = Number(document.getElementById(`qty-${s.code}`).value || 0);
                  if (qty > 0) handleBuy(s, qty);
                }}
                style={{ background: "#2b7cff", color: "white", borderRadius: 6 }}
              >
                Mua
              </button>
              <button
                onClick={() => {
                  const qty = Number(document.getElementById(`qty-${s.code}`).value || 0);
                  if (qty > 0) handleSell(s, qty);
                }}
                style={{ background: "#e38cb7", color: "white", borderRadius: 6 }}
              >
                Bán
              </button>
              <span style={{ marginLeft: 20, fontSize: 13 }}>
                Sở hữu: {portfolio[s.code] || 0} cp
              </span>
            </div>

            <LineChart width={380} height={140} data={s.history} style={{ marginTop: 10 }}>
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey="time" hide />
              <YAxis domain={["dataMin", "dataMax"]} />
              <Tooltip />
              <Line dataKey="price" stroke="#2b7cff" dot={false} />
            </LineChart>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 40,
        background: "#f9f9f9",
        padding: 12,
        borderRadius: 8
      }}>
        <h3>🏆 Top 5 người chơi dẫn đầu</h3>
        <ol>
          {leaderboard.map((p, idx) => (
            <li key={idx}>{p.name} — <strong>${p.total.toFixed(2)}</strong></li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
