import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, setLogLevel } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as credenciais do Firebase
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const firebaseApp = initializeApp(firebaseConfig);

setLogLevel("silent");

const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

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
    status TEXT NOT NULL,
    scheduledDate TEXT NOT NULL DEFAULT ''
  )
`);

// Add hash column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
  const hasHashColumn = tableInfo.some(col => col.name === 'hash');
  if (!hasHashColumn) {
    db.prepare("ALTER TABLE sales ADD COLUMN hash TEXT UNIQUE").run();
  }
} catch (e) {
  console.error("Error checking/adding hash column:", e);
}

// Add cpf column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
  const hasCpfColumn = tableInfo.some(col => col.name === 'cpf');
  if (!hasCpfColumn) {
    db.prepare("ALTER TABLE sales ADD COLUMN cpf TEXT NOT NULL DEFAULT ''").run();
  }
} catch (e) {
  console.error("Error checking/adding cpf column:", e);
}

// Add scheduledDate column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
  const hasScheduledDateColumn = tableInfo.some(col => col.name === 'scheduledDate');
  if (!hasScheduledDateColumn) {
    db.prepare("ALTER TABLE sales ADD COLUMN scheduledDate TEXT NOT NULL DEFAULT ''").run();
  }
} catch (e) {
  console.error("Error checking/adding scheduledDate column:", e);
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

// Sincronização com o Firestore para persistência global durável em nuvem
async function saveToFirestore(saleData: any) {
  try {
    const docRef = doc(firestoreDb, "sales", saleData.hash);
    await setDoc(docRef, {
      hash: saleData.hash,
      name: saleData.name,
      whatsapp: saleData.whatsapp || '',
      cpf: saleData.cpf || '',
      type: saleData.type,
      qty: Number(saleData.qty),
      total: Number(saleData.total),
      method: saleData.method,
      date: saleData.date,
      status: saleData.status
    });
    console.log(`Saved sale to Firestore: ${saleData.hash}`);
  } catch (e) {
    console.error(`Error saving sale to Firestore (${saleData.hash}):`, e);
  }
}

async function updateFirestoreSaleStatus(hash: string, status: string) {
  try {
    const docRef = doc(firestoreDb, "sales", hash);
    await updateDoc(docRef, { status });
    console.log(`Updated sale status in Firestore: ${hash} -> ${status}`);
  } catch (e) {
    console.error(`Error updating sale status in Firestore (${hash}):`, e);
  }
}

async function deleteFromFirestore(hash: string) {
  try {
    const docRef = doc(firestoreDb, "sales", hash);
    await deleteDoc(docRef);
    console.log(`Deleted sale from Firestore: ${hash}`);
  } catch (e) {
    console.error(`Error deleting sale from Firestore (${hash}):`, e);
  }
}

async function clearAllSalesFromFirestore() {
  try {
    const salesCol = collection(firestoreDb, "sales");
    const snapshot = await getDocs(salesCol);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(firestoreDb, "sales", docSnap.id));
    }
    console.log("Cleared all documents from Firestore sales collection");
  } catch (e) {
    console.error("Error clearing sales from Firestore:", e);
  }
}

async function syncFromFirestore() {
  try {
    console.log("Synchronizing sales from Firestore...");
    const salesCol = collection(firestoreDb, "sales");
    const snapshot = await getDocs(salesCol);
    
    let countNew = 0;
    let countUpdated = 0;
    
    const checkHash = db.prepare("SELECT * FROM sales WHERE hash = ?");
    const insertSale = db.prepare(`
      INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateSaleStatus = db.prepare("UPDATE sales SET status = ? WHERE hash = ?");
    
    const runSync = db.transaction(() => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        const existing = checkHash.get(data.hash) as any;
        if (!existing) {
          insertSale.run(
            data.hash,
            data.name,
            data.whatsapp || '',
            data.cpf || '',
            data.type,
            data.qty,
            data.total,
            data.method,
            data.date,
            data.status
          );
          countNew++;
        } else if (existing.status !== data.status) {
          updateSaleStatus.run(data.status, data.hash);
          countUpdated++;
        }
      });
    });
    
    runSync();
    console.log(`Synchronization complete: ${countNew} new sales inserted, ${countUpdated} sales updated.`);
  } catch (e) {
    console.error("Error during Firestore synchronization:", e);
  }
}

async function startServer() {
  // Limpa os dados de testes anteriores
  try {
    db.prepare("DELETE FROM sales").run();
    await clearAllSalesFromFirestore();
    console.log("Banco de dados SQLite e Firestore limpos com sucesso para início dos testes reais.");
  } catch (e) {
    console.error("Erro ao limpar dados iniciais de teste:", e);
  }

  // Sincroniza vendas do Firestore para o SQLite ao iniciar o servidor
  await syncFromFirestore();

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

  app.get("/api/sales/hash/:hash", (req, res) => {
    try {
      const hash = req.params.hash;
      const sale = db.prepare("SELECT * FROM sales WHERE hash = ?").get(hash);
      if (sale) {
        res.json(sale);
      } else {
        res.status(404).json({ error: "Compra não encontrada" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create a new purchase via REST (robust fallback/primary storage check)
  app.post("/api/sales", (req, res) => {
    try {
      const saleData = req.body || {};
      const { hash: clientHash, name, whatsapp, cpf, type, qty, total, method, date, status, scheduledDate } = saleData;
      if (!name) {
        return res.status(400).json({ success: false, error: "Nome do comprador é obrigatório." });
      }
      const hash = clientHash || generateHash();
      const cleanQty = Number(qty) || 1;
      const cleanType = type || 'individual';
      const cleanPrice = cleanType === 'individual' ? 30 : 50;
      const cleanTotal = Number(total) || (cleanQty * cleanPrice);
      const cleanMethod = method || 'Pix';
      const cleanDate = date || new Date().toISOString();
      const cleanStatus = status || 'Ativa';
      const cleanWhatsapp = whatsapp ? String(whatsapp) : '';
      const cleanCpf = cpf ? String(cpf) : '';
      const cleanScheduledDate = scheduledDate ? String(scheduledDate) : '';
      
      const info = db.prepare(`
        INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status, scheduledDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, name, cleanWhatsapp, cleanCpf, cleanType, cleanQty, cleanTotal, cleanMethod, cleanDate, cleanStatus, cleanScheduledDate);
      
      const saleId = Number(info.lastInsertRowid);
      const newSale = { 
        ...saleData, 
        id: saleId, 
        hash,
        name,
        whatsapp: cleanWhatsapp,
        cpf: cleanCpf,
        type: cleanType,
        qty: cleanQty,
        total: cleanTotal,
        method: cleanMethod,
        date: cleanDate,
        status: cleanStatus,
        scheduledDate: cleanScheduledDate
      };
      
      // Salva no Firestore de forma assíncrona
      saveToFirestore(newSale);

      // Emit socket event for real-time dashboard updates
      io.emit("sale_added", newSale);
      
      res.status(201).json({ success: true, sale: newSale });
    } catch (e: any) {
      console.error("Error creating sale via API:", e);
      res.status(500).json({ success: false, error: e.message || "Erro ao salvar no banco de dados" });
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

      // Busca a venda para obter o hash antes de excluir
      const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;

      db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
      
      if (sale && sale.hash) {
        deleteFromFirestore(sale.hash);
      }

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
      
      // Busca a venda para obter o hash e atualizar no Firestore
      const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;
      if (sale && sale.hash) {
        updateFirestoreSaleStatus(sale.hash, 'Entregue');
      }

      // Emit socket event for real-time dashboard updates
      io.emit("sale_updated", { id: Number(saleId), status: 'Entregue' });
      
      res.json({ success: true, message: "Status atualizado para Entregue com sucesso." });
    } catch (e: any) {
      console.error("Error confirming delivery via API:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Clear all sales API route (admin authentication required)
  app.post("/api/sales/clear-all", async (req, res) => {
    try {
      const { login, password } = req.body || {};
      if (login !== "Sunset" || password !== "124578") {
        return res.status(401).json({ success: false, error: "Acesso negado. Login e senha de admin incorretos." });
      }

      db.prepare("DELETE FROM sales").run();
      await clearAllSalesFromFirestore();

      io.emit("sales_cleared");
      res.json({ success: true, message: "Todas as vendas foram limpas com sucesso!" });
    } catch (e: any) {
      console.error("Error clearing all sales:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Activate a sale (confirm payment) via REST
  app.post("/api/sales/:id/activate", (req, res) => {
    try {
      const saleId = req.params.id;
      db.prepare("UPDATE sales SET status = 'Ativa' WHERE id = ?").run(saleId);
      
      // Busca a venda para obter o hash e atualizar no Firestore
      const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;
      if (sale && sale.hash) {
        updateFirestoreSaleStatus(sale.hash, 'Ativa');
      }

      // Emit socket event for real-time dashboard updates
      io.emit("sale_updated", { id: Number(saleId), status: 'Ativa' });
      
      res.json({ success: true, message: "Status atualizado para Ativa com sucesso." });
    } catch (e: any) {
      console.error("Error activating sale via API:", e);
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
      const { hash: clientHash, name, whatsapp, cpf, type, qty, total, method, date, status, scheduledDate } = saleData;
      const hash = clientHash || generateHash();
      const cleanScheduledDate = scheduledDate ? String(scheduledDate) : '';
      const info = db.prepare(`
        INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status, scheduledDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, name, whatsapp || '', cpf || '', type, qty, total, method, date, status, cleanScheduledDate);
      
      const newSale = { id: info.lastInsertRowid, hash, ...saleData, scheduledDate: cleanScheduledDate };
      
      // Salva no Firestore de forma assíncrona
      saveToFirestore(newSale);

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
      
      // Busca a venda para obter o hash e atualizar no Firestore
      const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;
      if (sale && sale.hash) {
        updateFirestoreSaleStatus(sale.hash, 'Entregue');
      }

      io.emit("sale_updated", { id: saleId, status: 'Entregue' });
    });

    socket.on("activate_sale", (saleId) => {
      db.prepare("UPDATE sales SET status = 'Ativa' WHERE id = ?").run(saleId);
      
      // Busca a venda para obter o hash e atualizar no Firestore
      const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;
      if (sale && sale.hash) {
        updateFirestoreSaleStatus(sale.hash, 'Ativa');
      }

      io.emit("sale_updated", { id: saleId, status: 'Ativa' });
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
          // Busca a venda para obter o hash antes de excluir
          const sale = db.prepare("SELECT hash FROM sales WHERE id = ?").get(saleId) as any;

          db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);

          if (sale && sale.hash) {
            deleteFromFirestore(sale.hash);
          }

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
