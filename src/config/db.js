const mongoose = require("mongoose");
const { PrismaClient } = require("@prisma/client");

// Construct SQL connection URL if provided
const getDatabaseUrl = () => {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("${")) {
        return process.env.DATABASE_URL;
    }
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || 5432;
    const name = process.env.DB_NAME || "pediatric_handover_db";
    const user = process.env.DB_USER || "postgres";
    const pass = process.env.DB_PASSWORD || "";
    return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${name}?schema=public`;
};

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: getDatabaseUrl(),
        },
    },
});

const connectDB = async () => {
    // 1. Connect MongoDB for local models & immediate hosting
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pediatric_handover";
    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log("Database connected successfully (Ready for login & operations)");
    } catch (error) {
        console.warn("MongoDB connection skipped or unavailable:", error.message);
    }

    // 2. Initialize SQL Prisma connection if reachable
    try {
        await prisma.$connect();
        console.log(`SQL Database (${process.env.DB_NAME || "pediatric_handover_db"}) connected successfully`);
    } catch (error) {
        // Silently catch if local postgres is not started; ready for VPS deployment
    }
};

connectDB.prisma = prisma;
connectDB.connectDB = connectDB;

module.exports = connectDB;