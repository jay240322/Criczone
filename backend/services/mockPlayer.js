function getMockPlayer(id, passedName = '') {
    const idNum = parseInt(id) || 12345;
    const names = [
        "Virat Kohli", "Rohit Sharma", "Jasprit Bumrah", "Joe Root", "Kane Williamson",
        "Babar Azam", "Travis Head", "Hardik Pandya", "Ravindra Jadeja", "Steve Smith",
        "Kagiso Rabada", "Wanindu Hasaranga", "Shakib Al Hasan", "Mitchell Starc", "Pat Cummins",
        "Shubman Gill", "Yashasvi Jaiswal", "Rishabh Pant", "KL Rahul", "Suryakumar Yadav"
    ];
    const nameIndex = idNum % names.length;
    const playerName = passedName ? passedName.trim() : names[nameIndex];
    
    // Roles
    const roles = ["Batsman", "Bowler", "Allrounder", "Wicketkeeper Batsman"];
    const role = roles[idNum % roles.length];
    
    // Teams
    const teams = ["India", "Australia", "England", "Pakistan", "New Zealand", "South Africa", "West Indies", "Sri Lanka", "Bangladesh"];
    const intlTeam = teams[idNum % teams.length];

    return {
        id: id.toString(),
        name: playerName,
        faceImageId: id.toString(),
        role: role,
        DoBFormat: "Nov 05, 1988 (37 years)",
        intlTeam: intlTeam,
        teamNameIds: [
            { teamName: intlTeam },
            { teamName: "Royal Challengers Bengaluru" }
        ],
        bio: `<p><strong>${playerName}</strong> is a prominent international cricketer representing <strong>${intlTeam}</strong>. Known for outstanding achievements, dedication, and match-winning capabilities, this profile serves as a stable data fallback.</p>`,
        rankings: {
            test: { rank: "1", BestRank: "1" },
            odi: { rank: "2", BestRank: "1" },
            t20: { rank: "5", BestRank: "1" }
        },
        recentBatting: {
            headers: ["Match", "Runs", "Balls", "SR", "4s", "6s"],
            rows: [
                { values: ["vs AUS", "78", "52", "150.0", "6", "3"] },
                { values: ["vs ENG", "45", "30", "150.0", "4", "1"] },
                { values: ["vs PAK", "102", "80", "127.5", "10", "2"] }
            ]
        },
        recentBowling: {
            headers: ["Match", "Overs", "Runs", "Wickets", "Econ"],
            rows: [
                { values: ["vs AUS", "4.0", "28", "2", "7.0"] },
                { values: ["vs ENG", "10.0", "45", "3", "4.5"] }
            ]
        }
    };
}

module.exports = { getMockPlayer };
