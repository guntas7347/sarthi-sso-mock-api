const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors());

// Log every request
app.use((req, res, next) => {
  console.log("\n--- Incoming Request ---");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Body:", req.body);
  console.log("------------------------\n");

  next();
});

// Routes
app.use("/internal/sso", require("./routes/authRoutes"));
app.use("/api", require("./routes/authRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Sarthi API is running",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sarthi API running on port ${PORT}`);
});
