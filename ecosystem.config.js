module.exports = {
    apps: [
        {
            name: "pediatric-handover",
            script: "server.js",
            instances: "max", // Cluster mode across all available VPS CPU cores
            exec_mode: "cluster",
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "development",
                PORT: 5000,
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 5000,
            },
        },
    ],
};
