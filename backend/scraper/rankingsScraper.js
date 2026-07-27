const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "../rankings_cache.json");
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours cache

const COUNTRY_MAP = {
    "1": "Australia",
    "2": "Bangladesh",
    "3": "England",
    "4": "India",
    "5": "New Zealand",
    "6": "Pakistan",
    "7": "South Africa",
    "8": "Sri Lanka",
    "9": "West Indies",
    "10": "Afghanistan",
    "11": "Ireland",
    "12": "Zimbabwe",
    "13": "Nepal",
    "14": "Netherlands",
    "15": "Oman",
    "16": "Papua New Guinea",
    "17": "Scotland",
    "18": "United Arab Emirates",
    "19": "United States",
    "20": "Namibia",
    "21": "Uganda",
    "22": "Canada",
    "23": "Hong Kong",
    "24": "Kenya"
};

const TABLE_INDICES = {
    batsmen: {
        test: 3,
        odi: 4,
        t20: 5
    },
    bowlers: {
        test: 6,
        odi: 7,
        t20: 8
    },
    allrounders: {
        test: 9,
        odi: 10,
        t20: 11
    }
};

async function scrapeICCRankings() {
    let browser;
    try {
        console.log("[Rankings Scraper] Starting Playwright browser...");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        console.log("[Rankings Scraper] Navigating to ICC rankings page...");
        await page.goto("https://www.icc-cricket.com/rankings", { timeout: 60000 });

        console.log("[Rankings Scraper] Waiting for table content to hydrate...");
        await page.waitForSelector("table tr td a[href*='/rankings/']", { timeout: 30000 });

        console.log("[Rankings Scraper] Extracting rankings data...");
        const scrapedData = await page.evaluate((countryMap) => {
            const results = {};
            const tables = document.querySelectorAll("table");
            if (tables.length === 0) return null;

            const TABLE_INDICES = {
                batsmen: { test: 3, odi: 4, t20: 5 },
                bowlers: { test: 6, odi: 7, t20: 8 },
                allrounders: { test: 9, odi: 10, t20: 11 }
            };

            for (const category of Object.keys(TABLE_INDICES)) {
                results[category] = {};
                for (const format of Object.keys(TABLE_INDICES[category])) {
                    const idx = TABLE_INDICES[category][format];
                    const table = tables[idx];
                    if (!table) {
                        results[category][format] = [];
                        continue;
                    }

                    const rows = Array.from(table.querySelectorAll("tr")).slice(1);
                    results[category][format] = rows.map((tr) => {
                        const cells = Array.from(tr.querySelectorAll("td"));
                        if (cells.length < 3) return null;

                        const rankText = cells[0].innerText.trim();
                        const playerLink = cells[1].querySelector("a");
                        const name = playerLink ? playerLink.innerText.trim().replace(/\n/g, " ") : "";
                        
                        const href = playerLink?.getAttribute("href") || "";
                        const idMatch = href.match(/\/rankings\/(\d+)/) || href.match(/\/(\d+)\//) || href.match(/-(\d+)/) || href.match(/\/player-rankings\/(\d+)/);
                        const id = idMatch ? idMatch[1] : Math.random().toString(36).substring(7);

                        const flagImg = cells[1].querySelector("img[src*='teams/']");
                        const flagSrc = flagImg ? flagImg.getAttribute("src") || "" : "";
                        const flagMatch = flagSrc.match(/teams\/(\d+)\.png/);
                        const countryId = flagMatch ? flagMatch[1] : "";
                        const country = countryMap[countryId] || "Unknown";

                        const ratingText = cells[2].innerText.trim();

                        return {
                            rank: parseInt(rankText) || 1,
                            id: id,
                            name: name,
                            country: country,
                            rating: parseInt(ratingText) || 0,
                            faceImageId: id
                        };
                    }).filter(Boolean);
                }
            }
            return results;
        }, COUNTRY_MAP);

        if (scrapedData && Object.keys(scrapedData).length > 0) {
            const cachePayload = {
                timestamp: Date.now(),
                data: scrapedData
            };
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cachePayload, null, 2), "utf8");
            console.log("[Rankings Scraper] Rankings successfully updated and cached.");
            return scrapedData;
        } else {
            throw new Error("Scraping returned empty results.");
        }
    } catch (err) {
        console.error("[Rankings Scraper] Scraping failed:", err.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

function getRankingsCache(category, formatType) {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const fileContent = fs.readFileSync(CACHE_FILE, "utf8");
            const cache = JSON.parse(fileContent);
            
            // Check if cache is older than CACHE_DURATION
            const isStale = (Date.now() - cache.timestamp) > CACHE_DURATION;
            if (isStale) {
                console.log("[Rankings Scraper] Cache is stale. Triggering async background refresh...");
                scrapeICCRankings().catch(console.error);
            }

            if (cache.data && cache.data[category] && cache.data[category][formatType]) {
                return cache.data[category][formatType];
            }
        } else {
            console.log("[Rankings Scraper] Cache file does not exist. Triggering async background refresh...");
            scrapeICCRankings().catch(console.error);
        }
    } catch (err) {
        console.error("[Rankings Scraper] Error reading cache file:", err.message);
    }
    return null;
}

module.exports = {
    scrapeICCRankings,
    getRankingsCache
};
