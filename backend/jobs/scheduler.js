const cron = require("node-cron");
const syncScores = require("./syncScores");

let isRunning = false;

async function runSync() {
    if (isRunning) {
        console.log("⏳ Previous sync still running. Skipping...");
        return;
    }

    try {
        isRunning = true;
        await syncScores();
    } catch (err) {
        console.error(err);
    } finally {
        isRunning = false;
    }
}

function startScheduler() {
    console.log("🕒 Live Score Scheduler Started");

    // First sync
    runSync();

    // Every 30 seconds
    cron.schedule("*/30 * * * * *", runSync);
}

module.exports = startScheduler;