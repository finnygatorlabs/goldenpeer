require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { apiLimiter } = require("./src/middleware/rateLimit");
const { errorHandler, notFoundHandler } = require("./src/middleware/errorHandler");
const { initDatabase } = require("./src/models/index");

const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/user");
const voiceRoutes = require("./src/routes/voice");
const scamRoutes = require("./src/routes/scam");
const familyRoutes = require("./src/routes/family");
const contactsRoutes = require("./src/routes/contacts");
const billingRoutes = require("./src/routes/billing");
const telecomRoutes = require("./src/routes/telecom");
const insuranceRoutes = require("./src/routes/insurance");
const facilitiesRoutes = require("./src/routes/facilities");
const emergencyRoutes = require("./src/routes/emergency");
const adminRoutes = require("./src/routes/admin");
const analyticsRoutes = require("./src/routes/analytics");
const helpRoutes = require("./src/routes/help");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/scam", scamRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/telecom", telecomRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/facilities", facilitiesRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/support", helpRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SeniorShield Backend API running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
