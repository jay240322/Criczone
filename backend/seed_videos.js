const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

const sampleVideos = [
    {
        videoId: "F-PhLBVhgsc",
        title: "India vs Sri Lanka | World Cup 2011 Final | Highlights",
        thumbnail: "https://i.ytimg.com/vi/F-PhLBVhgsc/hqdefault.jpg",
        channelTitle: "ICC",
        publishTime: new Date("2011-04-02T18:00:00Z"),
        category: "classic"
    },
    {
        videoId: "DiB9da7VzIY",
        title: "Best Cricket Moments of 2024 | MNL Clips",
        thumbnail: "https://i.ytimg.com/vi/DiB9da7VzIY/hqdefault.jpg",
        channelTitle: "MNL Clips",
        publishTime: new Date("2024-01-01T10:00:00Z"),
        category: "highlight"
    },
    {
        videoId: "NqgJt2aA", // Placeholder for 2019, if invalid will need user replacement
        title: "England vs New Zealand 2019 World Cup Final | Super Over",
        thumbnail: "https://placehold.co/600x338?text=2019+WC+Final",
        channelTitle: "ICC",
        publishTime: new Date("2019-07-14T18:00:00Z"),
        category: "classic"
    },
    {
        videoId: "K_7t_yYl8j0", // Nidahas Trophy
        title: "Nidahas Trophy 2018 Final | India vs Bangladesh",
        thumbnail: "https://i.ytimg.com/vi/K_7t_yYl8j0/hqdefault.jpg",
        channelTitle: "Sri Lanka Cricket",
        publishTime: new Date("2018-03-18T18:00:00Z"),
        category: "classic"
    },
    {
        videoId: "3AjdR1j_A9w", // 2016 T20 Final
        title: "Carlos Brathwaite 4 Sixes | T20 World Cup 2016 Final",
        thumbnail: "https://i.ytimg.com/vi/3AjdR1j_A9w/hqdefault.jpg",
        channelTitle: "ICC",
        publishTime: new Date("2016-04-03T18:00:00Z"),
        category: "classic"
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        await Video.deleteMany({});
        console.log('Cleared existing videos');

        await Video.insertMany(sampleVideos);
        console.log(`Seeded ${sampleVideos.length} videos`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
