const { chromium } = require("playwright");

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log("Navigating to ICC Rankings...");
    await page.goto("https://www.icc-cricket.com/rankings", { timeout: 60000 });

    const tableHeaders = await page.evaluate(() => {
        const results = [];
        const tables = document.querySelectorAll("table");
        tables.forEach((table, index) => {
            // Find the closest heading or section preceding the table
            let heading = "";
            let sibling = table.parentElement;
            while (sibling && !heading) {
                const h = sibling.querySelector("h1, h2, h3, h4, h5, h6, .title, [class*='title'], [class*='heading']");
                if (h) {
                    heading = h.innerText.trim();
                }
                sibling = sibling.parentElement;
            }

            // Also check table headers
            const ths = Array.from(table.querySelectorAll("th")).map(th => th.innerText.trim());
            const firstRowText = Array.from(table.querySelectorAll("tr td")).slice(0, 5).map(td => td.innerText.trim());

            results.push({
                index,
                heading,
                headers: ths,
                firstRowText
            });
        });
        return results;
    });

    console.log("Tables metadata:", JSON.stringify(tableHeaders, null, 2));

    await browser.close();
}

run().catch(console.error);
