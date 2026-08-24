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
        
        const rowHtml = await page.evaluate(() => {
            // Find all news links. We want to find one that is actually a story (contains /cricket-news/\d+/)
            const links = Array.from(document.querySelectorAll("a[href*='/cricket-news/']"));
            const storyLink = links.find(a => /\/cricket-news\/\d+\//.test(a.getAttribute("href") || ""));
            
            if (!storyLink) return "No story links found";
            
            // Go up to find the closest wrapper div that acts as the news item card
            let container = storyLink.parentElement;
            for (let i = 0; i < 4; i++) {
                if (container && container.tagName !== "BODY") {
                    container = container.parentElement;
                }
            }
            return container ? container.outerHTML : "No parent wrapper found";
        });
        
        console.log("Row HTML snippet:\n", rowHtml ? rowHtml.substring(0, 3000) : "empty");
    } catch (err) {
        console.error("Error:", err);
    }
    
    await browser.close();
}

run().catch(console.error);
