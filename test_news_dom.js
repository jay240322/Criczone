const { chromium } = require("playwright");

async function run() {
    console.log("Launching browser in off-screen headful mode...");
    const browser = await chromium.launch({
        headless: false,
        args: [
            "--window-position=-32000,-32000",
            "--window-size=10,10"
        ]
    });
    const page = await browser.newPage();
    
    console.log("Navigating to Cricbuzz news...");
    try {
        await page.goto("https://www.cricbuzz.com/cricket-news", { waitUntil: "domcontentloaded", timeout: 60000 });
        
        const outerHtml = await page.evaluate(() => {
            const firstNewsLink = document.querySelector("a[href*='/cricket-news/']");
            if (!firstNewsLink) return "No news links found";
            
            // Go up a few levels to find the parent container and get its HTML
            let container = firstNewsLink.parentElement;
            for (let i = 0; i < 3; i++) {
                if (container && container.tagName !== "BODY") {
                    container = container.parentElement;
                }
            }
            return container ? container.outerHTML.substring(0, 3000) : "No parent container";
        });
        
        console.log("Parent Container HTML snippet:\n", outerHtml);
    } catch (err) {
        console.error("Error:", err);
    }
    
    await browser.close();
}

run().catch(console.error);
