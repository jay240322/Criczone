const client = require("./provider");

async function getLiveMatches() {
    try {

        // We'll replace this URL after we choose the provider.
        const url = "";

        const response = await client.get(url);

        return response.data;

    } catch (err) {

        console.error("Live Score Error:", err.message);

        return [];

    }
}

module.exports = {
    getLiveMatches
};