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
  origin: ["http://localhost:3000", "http://localhost:5173", "https://hive-front-end-three.vercel.app"],
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
app.use("/api/v1", require("./routes/userRoute"));
app.use("/api/v1", require("./routes/productRoute"));

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

// Start Server
mongoose.connect(process.env.MONGO_URL, {
  dbName: 'Hive' 
})
  .then(() => {
    console.log("✓ Connected to MongoDB - Database: Hive");
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;