require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "https://hive-front-end-three.vercel.app", "https://www.hivethread.com"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}));

// Routes
app.use("/api/v1/products", require("./routes/productRoute"));  
app.use("/api/v1/user", require("./routes/userRoute"));         
app.use("/api/v1/", require("./routes/transactionRoute"));
app.use("/api/v1/", require("./routes/orderRoute"));     

// Test Route
app.get("/", (req, res) => {
  res.json({ message: "Hive Fashion API Server" });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Server error" });
});

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI not found in environment variables");
  process.exit(1);
}

console.log("🔗 Connecting to MongoDB...");

mongoose.connect(MONGO_URI, {
  dbName: 'Hive',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log("✅ MongoDB Connected - Database: Hive");
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    if (err.message.includes('ETIMEOUT')) {
      console.error("💡 Tip: Check MongoDB Atlas Network Access settings");
      console.error("💡 Make sure 0.0.0.0/0 is whitelisted");
    }
    process.exit(1);
  });
module.exports = app;