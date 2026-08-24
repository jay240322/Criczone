const { chromium } = require("playwright");

async function scrapeLiveMatches() {
    let browser;
    try {
        console.log("[Live Scraper] Starting Playwright browser in stealth off-screen mode...");
        browser = await chromium.launch({
            headless: false,
            channel: "chrome",
            args: [
                "--window-position=-32000,-32000",
                "--window-size=10,10"
            ]
        }).catch(err => {
            console.log("[Live Scraper] Failed to launch with Chrome channel, falling back to default chromium...");
            return chromium.launch({
                headless: false,
                args: [
                    "--window-position=-32000,-32000",
                    "--window-size=10,10"
                ]
            });
        });

        const page = await browser.newPage({
            viewport: {
                width: 1600,
                height: 900
            }
        });

        let formattedMatches = [];
        let resolved = false;

        // Wait until we receive the ESPN API response with a 30s timeout safety net
        const apiResponsePromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    console.log("⚠️ [Live Scraper] Timeout waiting for ESPN API response.");
                    resolved = true;
                    resolve();
                }
            }, 30000);

            page.on("response", async (response) => {
                const url = response.url();

                if (url.includes("/v1/pages/matches/current")) {
                    console.log("\n✅ [Live Scraper] ESPN Match API Found\n");

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

                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve();

                    } catch (err) {
                        console.error("[Live Scraper] Error parsing response JSON:", err);
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                }
            });
        });

        console.log("🌐 [Live Scraper] Opening ESPN Cricinfo Live Scores page...");

        await page.goto(
            "https://www.espncricinfo.com/live-cricket-score",
            {
                waitUntil: "domcontentloaded",
                timeout: 60000
            }
        ).catch(err => {
            console.error("[Live Scraper] Navigation failed:", err.message);
        });

        // Wait until we captured the API response or hit the safety timeout
        await apiResponsePromise;
        return formattedMatches;

    } catch (err) {
        console.error("❌ [Live Scraper] Scraper failed:", err);
        return [];
    } finally {
        if (browser) {
            await browser.close().catch(err => console.error("[Live Scraper] Error closing browser:", err));
        }
        console.log("🎉 [Live Scraper] Scraper Finished");
    }
}

module.exports = {
    scrapeLiveMatches
};