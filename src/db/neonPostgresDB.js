import pkg from "pg";
const { Pool } = pkg;

let neonPool;

export const connectNeonDB = async () => {
    try {
        neonPool = new Pool({
            host: process.env.PGHOST,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            port: process.env.PGPORT || 5432,

            ssl: {
                rejectUnauthorized: false, // required for Neon
            },
        });

        // ✅ ADD IT HERE 👇
        neonPool.on("connect", () => {
            console.log("📦 New DB connection from pool");
        });

        neonPool.on("error", (err) => {
            console.error("❌ Neon DB Unexpected Error:", err.message);
        });

        // Test connection
        const client = await neonPool.connect();
        console.log("✅ Neon PostgreSQL Connected");

        client.release();

    } catch (error) {
        console.error("❌ Neon DB Connection Failed");
        console.error(error.message);
        process.exit(1);
    }
};

// Query helper
export const neonQuery = async (text, params) => {
    try {
        const res = await neonPool.query(text, params);
        return res;
    } catch (error) {
        console.error("❌ Neon Query Error:", error.message);
        throw error;
    }
};