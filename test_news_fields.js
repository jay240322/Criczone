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
        
        const newsItems = await page.evaluate(() => {
            const results = [];
            // Find all news title links
            const titleLinks = Array.from(document.querySelectorAll("a[href*='/cricket-news/']"));
            
            // Filter unique links that contain a numeric story ID and have class or text to verify they are titles
            const storyLinks = titleLinks.filter(a => {
                const href = a.getAttribute("href") || "";
                const isStory = /\/cricket-news\/\d+\//.test(href);
                const hasText = a.innerText.trim().length > 10; // title is usually long
                return isStory && hasText;
            });
            
            // Remove duplicates (each story might have title link and thumbnail link)
            const seenIds = new Set();
            
            for (const linkEl of storyLinks) {
                const href = linkEl.getAttribute("href");
                const idMatch = href.match(/\/cricket-news\/(\d+)/);
                const id = idMatch ? idMatch[1] : "";
                
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    
                    const headline = linkEl.innerText.trim();
                    
                    // Find container to search details
                    let parent = linkEl.parentElement;
                    // Go up to find card container (usually has flex or bg-cbWhite class)
                    while (parent && !parent.classList.contains("py-4") && parent.tagName !== "BODY") {
                        parent = parent.parentElement;
                    }
                    if (!parent) parent = linkEl.parentElement.parentElement;
                    
                    const pEl = parent ? parent.querySelector("p") : null;
                    const intro = pEl ? pEl.innerText.trim() : "";
                    
                    const imgEl = parent ? parent.querySelector("img") : null;
                    const imgUrl = imgEl ? imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || "" : "";
                    const imgMatch = imgUrl.match(/i1\/c(\d+)/) || imgUrl.match(/c(\d+)\//);
                    const imageId = imgMatch ? imgMatch[1] : "";
                    
                    results.push({
                        id,
                        headline,
                        hline: headline,
                        intro,
                        pubTime: Date.now().toString(), // current time
                        imageId,
                        source: "Cricbuzz Scraper",
                        storyType: "News",
                        coverImage: {
                            id: imageId,
                            caption: headline,
                            source: "Cricbuzz"
                        }
                    });
                }
            }
            return results;
        });
        
        console.log("Scraped News Items:", JSON.stringify(newsItems.slice(0, 5), null, 2));
    } catch (err) {
        console.error("Error during news extraction:", err);
    }
    
    await browser.close();
}

run().catch(console.error);
