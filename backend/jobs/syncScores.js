const Score = require("../models/Score");
const { scrapeLiveMatches } = require("../scraper/espn/liveScraper");

async function syncScores() {
    try {
        console.log("\n🔄 Starting live score sync...");

        const matches = await scrapeLiveMatches();

        console.log(`Found ${matches.length} matches`);

        for (const match of matches) {

            await Score.findOneAndUpdate(
                {
                    matchId: String(match.matchId)
                },
                {
                    matchId: String(match.matchId),

                    seriesName: match.series,
                    matchDesc: match.title,
                    matchFormat: match.format,

                    startDate: match.startTime,

                    state: match.state,
                    status: match.status,

                    venue: match.venue,

                    team1: {
                        name: match.team1.name,
                        shortName: match.team1.shortName,
                        score: match.team1.score
                    },

                    team2: {
                        name: match.team2.name,
                        shortName: match.team2.shortName,
                        score: match.team2.score
                    },

                    json: match
                },
                {
                    upsert: true,
                    new: true
                }
            );

            console.log(
                `✔ ${match.team1.shortName} vs ${match.team2.shortName}`
            );
        }

        console.log("✅ Sync Completed\n");

    } catch (err) {

        console.error("❌ Sync Failed");

        console.error(err);

    }
}

module.exports = syncScores;

// Allow manual execution
if (require.main === module) {

    require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

    const mongoose = require("mongoose");

    mongoose
        .connect(process.env.MONGO_URI)
        .then(async () => {

            console.log("✅ MongoDB Connected");

            await syncScores();

            await mongoose.disconnect();

            process.exit(0);

        })
        .catch(console.error);

}