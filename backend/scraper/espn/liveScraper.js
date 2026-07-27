const { chromium } = require("playwright");

async function scrapeLiveMatches() {
    const browser = await chromium.launch({
        headless: true,
        channel: "chrome"
    });

    const page = await browser.newPage({
        viewport: {
            width: 1600,
            height: 900
        }
    });

    let formattedMatches = [];

    // Wait until we receive the ESPN API response
    const apiResponsePromise = new Promise((resolve) => {
        page.on("response", async (response) => {
            const url = response.url();

            if (url.includes("/v1/pages/matches/current")) {
                console.log("\n✅ ESPN Match API Found\n");

                try {
                    const json = await response.json();

                    const matches = json.matches || [];

                    console.log(`Total Matches: ${matches.length}\n`);

                    formattedMatches = matches.map((match) => ({
                        matchId: String(match.id),
                        title: match.title,
                        series: match.series?.longName,
                        venue: match.ground?.longName,
                        format: match.format,
                        state: match.state,
                        status: match.statusText,
                        startTime: match.startTime,

                        team1: {
                            name: match.teams?.[0]?.team?.longName,
                            shortName: match.teams?.[0]?.team?.abbreviation,
                            score: match.teams?.[0]?.score || "Yet to bat"
                        },

                        team2: {
                            name: match.teams?.[1]?.team?.longName,
                            shortName: match.teams?.[1]?.team?.abbreviation,
                            score: match.teams?.[1]?.score || "Yet to bat"
                        },

                        json: match
                    }));

                    resolve();

                } catch (err) {
                    console.error(err);
                    resolve();
                }
            }
        });
    });

    console.log("🌐 Opening ESPN Cricinfo...");

    await page.goto(
        "https://www.espncricinfo.com/live-cricket-score",
        {
            waitUntil: "domcontentloaded",
            timeout: 60000
        }
    );

    // Wait until we captured the API response
    await apiResponsePromise;

    await browser.close();

    console.log("🎉 Scraper Finished");

    return formattedMatches;
}

module.exports = {
    scrapeLiveMatches
};