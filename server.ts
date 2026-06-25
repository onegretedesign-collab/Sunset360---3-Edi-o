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
    hash TEXT UNIQUE,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL DEFAULT '',
    cpf TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    total INTEGER NOT NULL,
    method TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL
  )
`);

// Add hash column if it doesn't exist (for existing databases)
try {
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
  const hasHashColumn = tableInfo.some(col => col.name === 'hash');
  
  if (!hasHashColumn) {
    console.log("Adding 'hash' column to sales table...");
    db.prepare("ALTER TABLE sales ADD COLUMN hash TEXT UNIQUE").run();
  }
} catch (e) {
  console.error("Error checking/adding hash column:", e);
}

// Add cpf column if it doesn't exist (for existing databases)
try {
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
  const hasCpfColumn = tableInfo.some(col => col.name === 'cpf');
  
  if (!hasCpfColumn) {
    console.log("Adding 'cpf' column to sales table...");
    db.prepare("ALTER TABLE sales ADD COLUMN cpf TEXT NOT NULL DEFAULT ''").run();
  }
} catch (e) {
  console.error("Error checking/adding cpf column:", e);
}

// Helper to generate a random hash
const generateHash = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Migrate existing records without hashes
try {
  const salesWithoutHash = db.prepare("SELECT id FROM sales WHERE hash IS NULL").all() as any[];
  if (salesWithoutHash.length > 0) {
    console.log(`Migrating ${salesWithoutHash.length} records to add hashes...`);
    const updateHash = db.prepare("UPDATE sales SET hash = ? WHERE id = ?");
    const migrate = db.transaction((records) => {
      for (const record of records) {
        updateHash.run(generateHash(), record.id);
      }
    });
    migrate(salesWithoutHash);
  }
} catch (e) {
  console.error("Error migrating hashes:", e);
}

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
    try {
      const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC").all();
      res.json(sales);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create a new purchase via REST (robust fallback/primary storage check)
  app.post("/api/sales", (req, res) => {
    try {
      const saleData = req.body;
      const { hash: clientHash, name, whatsapp, cpf, type, qty, total, method, date, status } = saleData;
      const hash = clientHash || generateHash();
      
      const info = db.prepare(`
        INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, name, whatsapp || '', cpf || '', type, qty, total, method, date, status);
      
      const newSale = { id: info.lastInsertRowid, hash, ...saleData };
      
      // Emit socket event for real-time dashboard updates
      io.emit("sale_added", newSale);
      
      res.status(201).json({ success: true, sale: newSale });
    } catch (e: any) {
      console.error("Error creating sale via API:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Delete a sale via REST - ONLY with correct admin login and password
  app.delete("/api/sales/:id", (req, res) => {
    try {
      const saleId = req.params.id;
      const { login, password } = req.body || {};

      if (login !== "Sunset" || password !== "124578") {
        return res.status(401).json({ success: false, error: "Acesso negado. Apenas o administrador autenticado com login e senha corretos pode excluir compras." });
      }

      db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
      
      // Emit socket event for real-time dashboard updates
      io.emit("sale_deleted", Number(saleId));
      
      res.json({ success: true, message: "Venda excluída com sucesso." });
    } catch (e: any) {
      console.error("Error deleting sale via API:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Confirm delivery of a sale via REST
  app.post("/api/sales/:id/deliver", (req, res) => {
    try {
      const saleId = req.params.id;
      db.prepare("UPDATE sales SET status = 'Entregue' WHERE id = ?").run(saleId);
      
      // Emit socket event for real-time dashboard updates
      io.emit("sale_updated", { id: Number(saleId), status: 'Entregue' });
      
      res.json({ success: true, message: "Status atualizado para Entregue com sucesso." });
    } catch (e: any) {
      console.error("Error confirming delivery via API:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send initial state
    const sales = db.prepare("SELECT * FROM sales ORDER BY id DESC").all();
    socket.emit("initial_sales", sales);
    socket.emit("promo_status", promoStatus);

    socket.on("new_sale", (saleData) => {
      const { hash: clientHash, name, whatsapp, cpf, type, qty, total, method, date, status } = saleData;
      const hash = clientHash || generateHash();
      const info = db.prepare(`
        INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, name, whatsapp || '', cpf || '', type, qty, total, method, date, status);
      
      const newSale = { id: info.lastInsertRowid, hash, ...saleData };
      io.emit("sale_added", newSale);
      socket.emit("sale_confirmed", newSale); // Send back to the creator so they get the hash
    });

    socket.on("validate_ticket", (hash) => {
      const ticket = db.prepare("SELECT * FROM sales WHERE hash = ?").get(hash);
      if (ticket) {
        socket.emit("ticket_validated", ticket);
      } else {
        socket.emit("ticket_invalid");
      }
    });

    socket.on("confirm_delivery", (saleId) => {
      db.prepare("UPDATE sales SET status = 'Entregue' WHERE id = ?").run(saleId);
      io.emit("sale_updated", { id: saleId, status: 'Entregue' });
    });

    socket.on("update_promo", (status) => {
      promoStatus = status;
      io.emit("promo_status", status);
    });

    socket.on("delete_sale", (data) => {
      let saleId: any;
      let login = "";
      let password = "";
      
      if (data && typeof data === "object") {
        saleId = data.id;
        login = data.login;
        password = data.password;
      } else {
        saleId = data;
      }

      if (login === "Sunset" && password === "124578") {
        try {
          db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
          io.emit("sale_deleted", Number(saleId));
        } catch (err) {
          console.error("Error executing delete via socket:", err);
        }
      } else {
        console.warn("Tentativa não autorizada de exclusão via socket para ID:", saleId);
      }
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
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

console.log("Starting server process...");
startServer().catch(err => {
  console.error("Failed to start server:", err);
});
