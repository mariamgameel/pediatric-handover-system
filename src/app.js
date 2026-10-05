const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const AppError = require("./utils/AppError");
const errorHandler = require("./middlewares/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const auditRoutes = require("./routes/auditRoutes");
const patientRoutes = require("./routes/patientRoutes");
const vitalRoutes = require("./routes/vitalRoutes");
const problemRoutes = require("./routes/problemRoutes");
const clinicalUpdateRoutes = require("./routes/clinicalUpdateRoutes");
const managementPlanRoutes = require("./routes/managementPlanRoutes");
const investigationRoutes = require("./routes/investigationRoutes");
const taskRoutes = require("./routes/taskRoutes");
const handoverRoutes = require("./routes/handoverRoutes");
const alertRoutes = require("./routes/alertRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const guidelineRoutes = require("./routes/guidelineRoutes");
const protocolRoutes = require("./routes/protocolRoutes");
const manpowerRoutes = require("./routes/manpowerRoutes");

const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
}

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "../public")));

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./config/swagger");

// API Health Check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Pediatric Handover API is running smoothly",
        timestamp: new Date(),
    });
});

// Swagger UI Interactive API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Pediatric Handover API Documentation",
}));

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/vitals", vitalRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/clinical-updates", clinicalUpdateRoutes);
app.use("/api/management-plans", managementPlanRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/handovers", handoverRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/guidelines", guidelineRoutes);
app.use("/api/protocols", protocolRoutes);
app.use("/api/manpower", manpowerRoutes);

// Catch-all for undefined routes
app.all("/api/*splat", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Single-page application fallback for root web navigation
app.get("/*splat", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Centralized operational and programming error handler
app.use(errorHandler);

module.exports = app;