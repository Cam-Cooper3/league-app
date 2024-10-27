import { getGameModeName, getChampionNameById, formatTimeInGame, isRankedGame } from './utils.js';

// Centralized error handler for displaying error messages
function displayError(message, elementId = 'stats') {
    const element = document.getElementById(elementId);
    element.innerHTML = `<p style="color: red;">${message}</p>`;
    element.style.display = 'block';
}

// Fetch data from the server or external APIs
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error in API call');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

document.getElementById('summoner-form').addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent form from reloading the page

    const summonerName = document.getElementById('summoner-name').value.trim(); 
    var summonerTagline = document.getElementById('summoner-tagline').value.trim();
    
    // If the user does not enter a tagline, default to NA1
    var summonerTagline = summonerTagline || 'NA1';

    // Remove the # from the tagline if the user enters it
    if (summonerTagline.includes("#")) {
        summonerTagline = summonerTagline.replace("#", "");
    }

    // Display page warning to user if nothing is entered in prompt(s)
    if (!summonerName || !summonerTagline) {  // Check for both summoner name and tagline
        alert("Please enter a summoner name and tagline.");
        return;
    }

    // Show loading spinner
    document.getElementById('loading-spinner').style.display = 'block';

    try {
        // Fetch the latest Data Dragon version
        const versionResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await versionResponse.json();
        const latestVersion = versions[0];  // Get the latest version

        // Send a request to the server to get summoner data
        const response = await fetch(`/summoner/${encodeURIComponent(summonerName)}/${encodeURIComponent(summonerTagline)}`);
        if (!response.ok) {
            throw new Error('Summoner not found or error in API call.');
        }
        const data = await response.json();
        displayStats(data, latestVersion);  // Pass the latest version to displayStats

        // Pass puuid and latest version for in-game status check
        checkInGameStatus(data.puuid, latestVersion);  // Pass latestVersion here
    } catch (error) {
        console.error('Error fetching summoner data:', error);
        document.getElementById('stats').innerText = 'Error retrieving data. Summoner not found';
    } finally {
        // Hide loading spinner
        document.getElementById('loading-spinner').style.display = 'none';
    }
});

// Function to check if summoner is in-game
async function checkInGameStatus(puuid, latestVersion) {
    if (!puuid) {
        return;  // If no puuid is provided, exit the function
    }

    // Clear or hide the in-game status section before making a new request
    document.getElementById('in-game-status').style.display = 'none';
    document.getElementById('in-game-status').innerHTML = '';  // Clear previous content

    try {
        const inGameResponse = await fetch(`/ingame/${puuid}`);
        const inGameData = await inGameResponse.json();

        if (inGameData.message) {
            // Show the in-game status section and display the message
            document.getElementById('in-game-status').style.display = 'block';
            document.getElementById('in-game-status').innerText = inGameData.message;
        } else {
            // Find the correct participant by matching puuid
            const participant = inGameData.participants.find(p => p.puuid === puuid);

            if (participant) {
                const gameMode = getGameModeName(inGameData.gameMode);
                const championName = await getChampionNameById(participant.championId, latestVersion);
                const timeInGame = formatTimeInGame(inGameData.gameLength);
                
                // Check if the match is ranked
                const rankedStatus = isRankedGame(inGameData.gameQueueConfigId) ? 'Ranked Game' : 'Normal Game';

                // Display the in-game status and show the section
                document.getElementById('in-game-status').style.display = 'block';
                document.getElementById('in-game-status').innerHTML = `
                    <strong>In-Game Status:</strong> <br>
                    Game Mode: ${gameMode} <br>
                    Match Type: ${rankedStatus} <br>
                    Champion: ${championName} <br>
                    Time in game: ${timeInGame}
                `;
            } else {
                document.getElementById('in-game-status').style.display = 'block';
                document.getElementById('in-game-status').innerText = 'Summoner not found in game.';
            }
        }
    } catch (error) {
        console.error('Error fetching in-game status:', error);
        document.getElementById('in-game-status').style.display = 'block';
        document.getElementById('in-game-status').innerText = 'Error retrieving in-game status.';
    }
}

// Function to display summoner ranked stats
function displayStats(data, latestVersion) {
    const statsDiv = document.getElementById('stats');
    const profileIconUrl = `http://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${data.profileIconId}.png`;

    let rankedHtml = '';

    // Check if ranked data is available
    if (data.rankedData && data.rankedData.length > 0) {
        rankedHtml = '<h3>Ranked Stats:</h3>';
        data.rankedData.forEach(queue => {
            const wins = queue.wins;
            const losses = queue.losses;
            const totalGames = wins + losses;
            const winRate = ((wins / totalGames) * 100).toFixed(2);

            rankedHtml += `
                Rank: ${queue.tier} ${queue.rank}</p>
                LP: ${queue.leaguePoints} LP</p>
                Wins: ${wins}</p>
                Losses: ${losses}</p>
                Win Rate: ${winRate}%</p>
            `;
        });
    } else {
        rankedHtml = '<p>This summoner has no ranked stats available.</p>';
    }

    statsDiv.innerHTML = `
        <h2>Summoner: ${data.summonerName}</h2>
        <p>Level: ${data.summonerLevel}</p>
        <img src="${profileIconUrl}" alt="Profile Icon" id="profile-icon" style="width:100px;height:100px;border-radius:50px">
        ${rankedHtml}
    `;
    statsDiv.style.display = 'block';  // Show the stats div
}

// Function to display in-game status
async function displayInGameStatus(inGameData, latestVersion, puuid) {
    const inGameDiv = document.getElementById('in-game-status');

    if (inGameData.message) {
        inGameDiv.innerText = inGameData.message;
    } else {
        const participant = inGameData.participants.find(p => p.puuid === puuid);

        if (participant) {
            const gameMode = getGameModeName(inGameData.gameMode);
            const championName = await getChampionNameById(participant.championId, latestVersion);  // Await the promise here
            const timeInGame = formatTimeInGame(inGameData.gameLength);

            // Check if the match is ranked
            const rankedStatus = isRankedGame(inGameData.gameQueueConfigId) ? 'Ranked Game' : 'Normal Game';

            inGameDiv.innerHTML = `
                <h3>In-Game Status:</h3>
                Game Mode: ${gameMode}
                Match Type: ${rankedStatus}
                Champion: ${championName}
                Time in game: ${timeInGame}
            `;
        } else {
            inGameDiv.innerText = 'Summoner not found in game.';
        }
    }

    inGameDiv.style.display = 'block';  // Show the in-game-status div
}

