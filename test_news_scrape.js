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
        const response = await page.goto("https://www.cricbuzz.com/cricket-news", { waitUntil: "domcontentloaded", timeout: 60000 });
        console.log("Response Status:", response ? response.status() : "none");
        console.log("Page Title:", await page.title());
        
        const pageInfo = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll("a"))
                .map(a => ({ href: a.getAttribute("href"), text: a.innerText.trim() }))
                .filter(item => item.href && (item.href.includes("news") || item.href.includes("cricket-news")))
                .slice(0, 15);
                
            const textSnippets = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
                .map(h => ({ tag: h.tagName, text: h.innerText.trim() }))
                .slice(0, 15);

            return { links, textSnippets };
        });
        
        console.log("Page Info:", JSON.stringify(pageInfo, null, 2));
    } catch (err) {
        console.error("Navigation error:", err);
    }
    
    await browser.close();
}

run().catch(console.error);
