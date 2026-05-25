const db = require('./db');

/**
 * Calculates a contestant's detailed competitive record based on season data.
 */
function calculateCompetitiveRecord(contestantId, seasons = db.getSeasons()) {
  let seasonsPlayed = 0;
  let challengesWon = 0;
  let challengesSafe = 0;
  let challengesDanger = 0;
  let eliminatedCount = 0;
  
  const seasonStats = [];

  for (const season of seasons) {
    // Check if contestant was in this season (in any team)
    let teamInSeason = null;
    let isContestantInSeason = false;

    if (season.teams) {
      for (const team of season.teams) {
        if (team.members && team.members.includes(contestantId)) {
          teamInSeason = team.id;
          isContestantInSeason = true;
          break;
        }
      }
    }

    if (!isContestantInSeason) continue;

    seasonsPlayed++;
    let wins = 0;
    let safe = 0;
    let danger = 0;
    let isEliminated = false;
    let eliminationRound = null;

    if (season.rounds) {
      for (let rIndex = 0; rIndex < season.rounds.length; rIndex++) {
        const round = season.rounds[rIndex];
        
        // Count challenge results
        if (round.challenges) {
          for (const chInstance of round.challenges) {
            if (chInstance.winningTeam === teamInSeason) wins++;
            else if (chInstance.safeTeam === teamInSeason) safe++;
            else if (chInstance.dangerTeam === teamInSeason) danger++;
          }
        }

        // Check if contestant was eliminated in this round
        if (round.eliminations && round.eliminations.includes(contestantId)) {
          isEliminated = true;
          eliminationRound = rIndex + 1;
        }
      }
    }

    if (isEliminated) {
      eliminatedCount++;
    }

    challengesWon += wins;
    challengesSafe += safe;
    challengesDanger += danger;

    let placement = 'Active/Completed';
    if (isEliminated) {
      placement = `Eliminated (Round ${eliminationRound})`;
    } else if (season.status === 'completed') {
      placement = 'Survivor/Winner';
    }

    seasonStats.push({
      seasonId: season.id,
      seasonName: season.name,
      teamName: season.teams.find(t => t.id === teamInSeason)?.name || 'Unknown',
      wins,
      safe,
      danger,
      placement
    });
  }

  return {
    seasonsPlayed,
    challengesWon,
    challengesSafe,
    challengesDanger,
    eliminatedCount,
    history: seasonStats
  };
}

/**
 * Creates a new contestant.
 */
function createContestant(data) {
  const contestants = db.getContestants();
  const id = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const newContestant = {
    id,
    name: data.name || 'Unnamed Contestant',
    powers: data.powers || [],
    bio: data.bio || '',
    photo: data.photo || 'images/contestants/fire_bear.png',
    versions: [
      {
        version: 1,
        timestamp: new Date().toISOString(),
        name: data.name || 'Unnamed Contestant',
        powers: data.powers || [],
        bio: data.bio || '',
        photo: data.photo || 'images/contestants/fire_bear.png',
        changeDescription: data.changeDescription || 'Initial profile creation'
      }
    ]
  };

  contestants.push(newContestant);
  db.saveSync();
  return newContestant;
}

/**
 * Updates a contestant profile and appends a version history entry if changes are made.
 */
function updateContestant(id, updatedData) {
  const contestants = db.getContestants();
  const index = contestants.findIndex(c => c.id === id);
  if (index === -1) return null;

  const current = contestants[index];
  
  // Check if anything has actually changed
  const nameChanged = updatedData.name !== undefined && updatedData.name !== current.name;
  const bioChanged = updatedData.bio !== undefined && updatedData.bio !== current.bio;
  const photoChanged = updatedData.photo !== undefined && updatedData.photo !== current.photo;
  
  // Array comparison helper
  const currentPowers = current.powers || [];
  const newPowers = updatedData.powers || currentPowers;
  const powersChanged = JSON.stringify([...currentPowers].sort()) !== JSON.stringify([...newPowers].sort());

  if (nameChanged || bioChanged || photoChanged || powersChanged) {
    const nextVersionNum = (current.versions ? current.versions.length : 0) + 1;
    
    // Create details for change description
    const changes = [];
    if (nameChanged) changes.push(`Name changed to "${updatedData.name}"`);
    if (bioChanged) changes.push('Bio updated');
    if (photoChanged) changes.push('Avatar portrait updated');
    if (powersChanged) changes.push('Powers library tags updated');

    const changeDescription = updatedData.changeDescription || changes.join(', ') || `Update v${nextVersionNum}`;

    const newVersion = {
      version: nextVersionNum,
      timestamp: new Date().toISOString(),
      name: updatedData.name !== undefined ? updatedData.name : current.name,
      powers: updatedData.powers !== undefined ? updatedData.powers : current.powers,
      bio: updatedData.bio !== undefined ? updatedData.bio : current.bio,
      photo: updatedData.photo !== undefined ? updatedData.photo : current.photo,
      changeDescription
    };

    current.name = newVersion.name;
    current.powers = newVersion.powers;
    current.bio = newVersion.bio;
    current.photo = newVersion.photo;
    
    if (!current.versions) current.versions = [];
    current.versions.push(newVersion);
    
    db.saveSync();
  }

  return current;
}

/**
 * Deletes a contestant.
 */
function deleteContestant(id) {
  const contestants = db.getContestants();
  const index = contestants.findIndex(c => c.id === id);
  if (index === -1) return false;
  contestants.splice(index, 1);
  db.saveSync();
  return true;
}

/**
 * Creates a new Season.
 */
function createSeason(data) {
  const seasons = db.getSeasons();
  const id = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const numRounds = parseInt(data.roundsCount, 10) || 5;
  const rounds = [];
  for (let i = 0; i < numRounds; i++) {
    rounds.push({
      roundNumber: i + 1,
      challenges: [],
      eliminations: []
    });
  }

  const newSeason = {
    id,
    name: data.name || 'New Reality Season',
    status: 'active', // active, completed
    roundsCount: numRounds,
    teamsCount: parseInt(data.teamsCount, 10) || 2,
    teams: data.teams || [], // { id, name, color, members: [c1, c2...] }
    rounds,
    createdAt: new Date().toISOString()
  };

  seasons.push(newSeason);
  db.saveSync();
  return newSeason;
}

/**
 * Updates a Season.
 */
function updateSeason(id, updatedData) {
  const seasons = db.getSeasons();
  const index = seasons.findIndex(s => s.id === id);
  if (index === -1) return null;

  seasons[index] = { ...seasons[index], ...updatedData };
  db.saveSync();
  return seasons[index];
}

/**
 * Deletes a Season.
 */
function deleteSeason(id) {
  const seasons = db.getSeasons();
  const index = seasons.findIndex(s => s.id === id);
  if (index === -1) return false;
  seasons.splice(index, 1);
  db.saveSync();
  return true;
}

module.exports = {
  calculateCompetitiveRecord,
  createContestant,
  updateContestant,
  deleteContestant,
  createSeason,
  updateSeason,
  deleteSeason
};
