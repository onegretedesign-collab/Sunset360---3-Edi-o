import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();
const ticketsCol = db.collection('tickets');

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const PORT = 3000;
  let promoStatus = false;

  app.use(express.json({ limit: '10mb' }));
  
  // Serve public tickets
  const ticketsDir = path.join(__dirname, 'public', 'generated_tickets');
  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
  }

  // --- API Routes ---

  // Generate Ticket with Image
  app.post("/api/tickets/generate", async (req, res) => {
    try {
      const { name, whatsapp, type, qty, total, method } = req.body;
      const hash = uuidv4();
      const createdAt = new Date().toISOString();

      // 1. Save to Firestore
      await ticketsCol.doc(hash).set({
        hash,
        name,
        whatsapp: whatsapp || '',
        type,
        qty,
        total,
        method,
        status: 'Ativa',
        checkedIn: false,
        createdAt: admin.firestore.Timestamp.now()
      });

      // 2. Generate Image with QR Code
      try {
        // Base image URL from the app
        const baseImageUrl = "https://i.postimg.cc/bwNcM5kp/ARTE-SUNSET-STORY.jpg";
        const canvas = createCanvas(800, 1200); // Proportions of a story/ticket
        const ctx = canvas.getContext('2d');

        // Load background
        const bg = await loadImage(baseImageUrl);
        ctx.drawImage(bg, 0, 0, 800, 1200);

        // QR Code generation
        const qrData = `${process.env.OFFICIAL_URL || 'http://localhost:3000'}/?ticket=${hash}`;
        const qrBuffer = await QRCode.toBuffer(qrData, {
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        const qrImage = await loadImage(qrBuffer);

        // Draw QR box
        const qrSize = 250;
        const qrX = (800 - qrSize) / 2;
        const qrY = 800; // Positioned at the bottom area

        // Draw white bg for QR
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // Add Customer Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), 400, 750);
        ctx.font = '20px Arial';
        ctx.fillText(`${type.toUpperCase()} - ${qty} UN`, 400, 780);

        // Save image
        const fileName = `ticket_${hash}.png`;
        const filePath = path.join(ticketsDir, fileName);
        const out = fs.createWriteStream(filePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);

        await new Promise((resolve, reject) => {
          out.on('finish', resolve);
          out.on('error', reject);
        });

        const imageUrl = `/generated_tickets/${fileName}`;
        
        // Update firestore with imageUrl
        await ticketsCol.doc(hash).update({ imageUrl });

        res.json({ success: true, hash, imageUrl });
        
        // Notify via socket
        io.emit("sale_added", { id: hash, hash, name, type, qty, total, method, date: createdAt.split('T')[0], status: 'Ativa' });

      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
        res.json({ success: true, hash, imageUrl: null }); // Fallback sans image
      }

    } catch (error) {
      console.error("Generate error:", error);
      res.status(500).json({ error: "Failed to generate ticket" });
    }
  });

  // Validate Ticket
  app.post("/api/tickets/validate", async (req, res) => {
    try {
      const { hash } = req.body;
      const tdoc = await ticketsCol.doc(hash).get();
      
      if (!tdoc.exists) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const ticket = tdoc.data();
      if (ticket?.checkedIn) {
        return res.json({ success: false, alreadyUsed: true, ticket });
      }

      // Update check-in status
      await ticketsCol.doc(hash).update({
        checkedIn: true,
        checkedInAt: admin.firestore.Timestamp.now()
      });

      res.json({ success: true, ticket: { ...ticket, checkedIn: true } });
      
      // Update stats via socket
      io.emit("sale_updated", { id: hash, checkedIn: true });

    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get Sales (for admin)
  app.get("/api/sales", async (req, res) => {
    try {
      const snapshot = await ticketsCol.orderBy('createdAt', 'desc').get();
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  // Socket.io for real-time legacy support (if needed)
  io.on("connection", (socket) => {
    socket.on("update_promo", (status) => {
      promoStatus = status;
      io.emit("promo_status", status);
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
