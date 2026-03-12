const fs = require('fs');
const path = require('path');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const getApiKey = (req) => {
    return (req && req.headers && req.headers['x-rapidapi-key']) || process.env.RAPIDAPI_KEY;
};

const IMAGE_DIR = path.join(__dirname, '../uploads/images');

// Ensure directory exists
if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function downloadImage(id, req = null) {
    const filePath = path.join(IMAGE_DIR, `${id}.jpg`);

    // Check if already exists
    if (fs.existsSync(filePath)) {
        console.log(`[Image] Already exists locally: ${id}`);
        return filePath;
    }

    try {
        const v1Host = 'cricbuzz-cricket.p.rapidapi.com';
        // Try to get high quality if possible, otherwise standard
        // Static pattern: https://static.cricbuzz.com/a/img/v1/600x400/i1/c{id}/o.jpg
        let url = `https://static.cricbuzz.com/a/img/v1/600x400/i1/c${id}/o.jpg`;
        console.log(`[Image] Downloading: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            // Fallback to rapidapi v1 if static fails
            url = `https://${v1Host}/img/v1/i1/c${id}/i.jpg`;
            const apiKey = getApiKey(req);
            const v1Headers = {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': v1Host
            };
            console.log(`[Image] Downloading Fallback: ${url}`);
            const fallbackResp = await fetch(url, { headers: v1Headers });
            if (!fallbackResp.ok) {
                console.error(`[Image] Failed to download ${id}: ${fallbackResp.status}`);
                return null;
            }
            const buffer = await fallbackResp.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
            return filePath;
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`[Image] Saved: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error(`[Image] Download Error for ${id}:`, error);
        return null;
    }
}

exports.getImage = async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(IMAGE_DIR, `${id}.jpg`);

        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }

        // If not found, try to download on the fly
        const downloadedPath = await downloadImage(id, req);
        if (downloadedPath) {
            return res.sendFile(downloadedPath);
        }

        res.status(404).send('Image not found');

    } catch (error) {
        console.error("Image Proxy Error:", error);
        res.status(500).send('Error fetching image');
    }
};

exports.downloadImage = downloadImage;
