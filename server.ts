import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("sales.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    total INTEGER NOT NULL,
    method TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;
  let promoStatus = false;

  // API Routes
  app.use(express.json());

  app.get("/api/sales", (req, res) => {
    const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC").all();
    res.json(sales);
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send initial state
    const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC").all();
    socket.emit("initial_sales", sales);
    socket.emit("promo_status", promoStatus);

    socket.on("new_sale", (saleData) => {
      const { name, type, qty, total, method, date, status } = saleData;
      const info = db.prepare(`
        INSERT INTO sales (name, type, qty, total, method, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, type, qty, total, method, date, status);
      
      const newSale = { id: info.lastInsertRowid, ...saleData };
      io.emit("sale_added", newSale);
    });

    socket.on("update_promo", (status) => {
      promoStatus = status;
      io.emit("promo_status", status);
    });

    socket.on("delete_sale", (saleId) => {
      db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
      io.emit("sale_deleted", saleId);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
