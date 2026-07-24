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
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripeInstance;
}

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

  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      const { name, whatsapp, cpf, type, qty, hash } = req.body;
      const cleanHash = hash || generateHash();
      const qtyNum = Number(qty) || 1;
      const unitPrice = type === "individual" ? 30 : 50;
      const total = qtyNum * unitPrice;

      // Cria a venda pendente localmente no SQLite
      const insertPending = db.prepare(`
        INSERT OR REPLACE INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertPending.run(
        cleanHash,
        name,
        whatsapp || "",
        cpf || "",
        type,
        qtyNum,
        total,
        "Stripe",
        new Date().toISOString(),
        "Pendente de Pagamento"
      );

      // Salva no Firestore
      const pendingSaleObj = {
        hash: cleanHash,
        name,
        whatsapp: whatsapp || "",
        cpf: cpf || "",
        type,
        qty: qtyNum,
        total,
        method: "Stripe",
        date: new Date().toISOString(),
        status: "Pendente de Pagamento"
      };
      await saveToFirestore(pendingSaleObj);

      const stripe = getStripe();
      if (!stripe) {
        // Se a API Key não estiver configurada, use a URL de Checkout Simulado (modo demonstração)
        console.log("Stripe API key not configured. Using mocked checkout redirect.");
        const mockUrl = `/api/checkout/success?session_id=mock_${cleanHash}&hash=${cleanHash}`;
        res.json({ url: mockUrl, isMock: true });
        return;
      }

      // Cria a sessão de Checkout real no Stripe (Suporta Cartão e Pix no Brasil)
      const title = type === "individual" ? "Sunset 360º - Individual" : "Sunset 360º - Casadinho";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "pix"],
        payment_method_options: {
          pix: {
            expires_after_seconds: 3600, // Pix expira em 1 hora
          },
        },
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: title,
                description: `Reserva de ${qtyNum}x pacote(s) do tipo ${type === 'individual' ? 'Individual' : 'Casadinho'} para o Sunset 360º 3ª Edição.`,
              },
              unit_amount: unitPrice * 100, // valor em centavos
            },
            quantity: qtyNum,
          },
        ],
        metadata: {
          hash: cleanHash,
          name,
          whatsapp,
          cpf,
          type,
          qty: String(qtyNum),
          total: String(total),
        },
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}&hash=${cleanHash}`,
        cancel_url: `${req.protocol}://${req.get("host")}/index.html?payment_status=cancel`,
      });

      res.json({ url: session.url, isMock: false });
    } catch (e: any) {
      console.error("Erro ao criar sessão do Stripe:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/checkout/success", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      const hash = req.query.hash as string;

      if (!hash) {
        res.redirect("/index.html?payment_status=fail");
        return;
      }

      // 1. Caso de pagamento simulado
      if (sessionId && sessionId.startsWith("mock_")) {
        console.log(`Processing mocked checkout success for hash: ${hash}`);
        const existing = db.prepare("SELECT * FROM sales WHERE hash = ?").get(hash) as any;
        if (existing) {
          db.prepare("UPDATE sales SET status = 'Ativa' WHERE hash = ?").run(hash);
          await updateFirestoreSaleStatus(hash, "Ativa");
          io.emit("sale_updated", { id: existing.id, status: "Ativa" });
        }
        res.redirect(`/index.html?payment_status=success&hash=${hash}`);
        return;
      }

      // 2. Caso de checkout real com o Stripe
      const stripe = getStripe();
      if (!stripe) {
        res.redirect(`/index.html?payment_status=fail&error=stripe_not_configured`);
        return;
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const metadata = session.metadata;
        const finalHash = metadata?.hash || hash;

        const existing = db.prepare("SELECT * FROM sales WHERE hash = ?").get(finalHash) as any;
        if (existing) {
          db.prepare("UPDATE sales SET status = 'Ativa' WHERE hash = ?").run(finalHash);
          await updateFirestoreSaleStatus(finalHash, "Ativa");
          io.emit("sale_updated", { id: existing.id, status: "Ativa" });
        } else if (metadata) {
          // Fallback: Insere o registro caso não tenha sido criado anteriormente
          const name = metadata.name || "Cliente Stripe";
          const whatsapp = metadata.whatsapp || "";
          const cpf = metadata.cpf || "";
          const type = metadata.type || "individual";
          const qty = Number(metadata.qty) || 1;
          const total = Number(metadata.total) || (qty * (type === "individual" ? 30 : 50));

          const info = db.prepare(`
            INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(finalHash, name, whatsapp, cpf, type, qty, total, "Stripe", new Date().toISOString(), "Ativa");

          const newSale = {
            id: info.lastInsertRowid,
            hash: finalHash,
            name,
            whatsapp,
            cpf,
            type,
            qty,
            total,
            method: "Stripe",
            date: new Date().toISOString(),
            status: "Ativa"
          };
          await saveToFirestore(newSale);
          io.emit("sale_added", newSale);
        }

        res.redirect(`/index.html?payment_status=success&hash=${finalHash}`);
      } else {
        res.redirect(`/index.html?payment_status=fail`);
      }
    } catch (e: any) {
      console.error("Erro no processamento do webhook/sucesso do Stripe:", e);
      res.redirect(`/index.html?payment_status=fail&error=${encodeURIComponent(e.message)}`);
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
      
      // Salva no Firestore de forma assíncrona
      saveToFirestore(newSale);

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
      const { hash: clientHash, name, whatsapp, cpf, type, qty, total, method, date, status } = saleData;
      const hash = clientHash || generateHash();
      const info = db.prepare(`
        INSERT INTO sales (hash, name, whatsapp, cpf, type, qty, total, method, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, name, whatsapp || '', cpf || '', type, qty, total, method, date, status);
      
      const newSale = { id: info.lastInsertRowid, hash, ...saleData };
      
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
