import express from "express";
import cors from "cors";
import { connectDB } from "./db/db.js";
import authRoutes from "./routes/auth.routes.js";
// import mailRoutes from "./routes/mail.routes.js";
// import webhookRoutes from "./routes/webhook.routes.js";
// import paymentRoutes from "./routes/payment.routes.js";
// import productRoutes from "./routes/product.routes.js";
// import addressRoutes from "./routes/address.routes.js";
// import orderRoutes from "./routes/order.routes.js";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "requests.log");

import dotenv from "dotenv";

dotenv.config(); // Load env variables

const app = express();
// for ip
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Connect DB
connectDB();

// Allow requests from frontend
const FRONTEND_URL = process.env.FRONTEND_URL;
const FRONTEND_URL_SLVAI = process.env.FRONTEND_URL_SLVAI;
const FRONTEND_URL_RAASNUTRITION = process.env.FRONTEND_URL_RAASNUTRITION;
const SSO_FRONTEND_URL = process.env.SSO_FRONTEND_URL;
const allowedOrigins = [
  FRONTEND_URL,
  // FRONTEND_URL_RAASNUTRITION,
  // FRONTEND_URL_SLVAI,
  SSO_FRONTEND_URL
];
// app.use(
//   cors({
//     origin: FRONTEND_URL,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true, // if you need cookies
//   })
// );
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server, Postman, mobile apps
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// ! for production 
// const normalize = (url) => url?.replace(/\/$/, "");

// const allowedOrigins = [
//   FRONTEND_URL,
//   FRONTEND_URL_RAASNUTRITION,
//   FRONTEND_URL_SLVAI,
// ].map(normalize);

// app.use(
//   cors({
//     origin(origin, callback) {
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(normalize(origin))) {
//         return callback(null, true);
//       }

//       console.error("❌ Blocked by CORS:", origin);
//       callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
// ✅ Handle CORS preflight requests
// app.options("/*", cors());


// Routes
app.use("/sso/api/auth", authRoutes);
// app.use("/api/mail", mailRoutes);
// app.use("/webhooks", webhookRoutes);
// app.use("/api/payment", paymentRoutes);
// app.use("/api/products", productRoutes);
// app.use("/api/address", addressRoutes);
// app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});
app.get("/ip", (req, res) => {
  console.log("req.ip:", req.ip);
  console.log("x-forwarded-for:", req.headers["x-forwarded-for"]);
  console.log("cf-connecting-ip:", req.headers["cf-connecting-ip"]);

  const clientIp =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.ip;

  res.json({
    message: "Backend is running ✅",
    yourIp: clientIp
  });
});

app.post("/log-request", (req, res) => {
  try {
    console.log(`/log-request route hit`)
    // 1. Create logs directory if not exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // 2. Prepare log entry
    const logEntry = {
      time: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      body: req.body
    };

    // 3. Convert to string
    const logLine = JSON.stringify(logEntry) + "\n";

    // 4. Append to file (creates file if not exists)
    fs.appendFileSync(LOG_FILE, logLine, "utf8");

    res.status(200).json({ message: "Request logged successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to log request" });
  }
});


export default app;
