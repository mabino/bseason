const express = require('express');
const path = require('path');
const db = require('./src/db');
const models = require('./src/models');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ─── Powers API ──────────────────────────────────────────────────────────────
app.get('/api/powers', (req, res) => {
  res.json(db.getPowers());
});

app.post('/api/powers', (req, res) => {
  const { name, code, description, color, icon } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and Code are required' });
  }

  const powers = db.getPowers();
  if (powers.some(p => p.code === code)) {
    return res.status(400).json({ error: `Power with code "${code}" already exists` });
  }

  const newPower = {
    id: 'p_' + Date.now(),
    name,
    code,
    description: description || '',
    color: color || '#888888',
    icon: icon || '✨'
  };

  powers.push(newPower);
  db.saveSync();
  res.status(201).json(newPower);
});

app.put('/api/powers/:id', (req, res) => {
  const { id } = req.params;
  const { name, code, description, color, icon } = req.body;

  const powers = db.getPowers();
  const index = powers.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Power not found' });
  }

  if (code && code !== powers[index].code && powers.some(p => p.code === code)) {
    return res.status(400).json({ error: `Power with code "${code}" already exists` });
  }

  powers[index] = {
    ...powers[index],
    name: name !== undefined ? name : powers[index].name,
    code: code !== undefined ? code : powers[index].code,
    description: description !== undefined ? description : powers[index].description,
    color: color !== undefined ? color : powers[index].color,
    icon: icon !== undefined ? icon : powers[index].icon
  };

  db.saveSync();
  res.json(powers[index]);
});

app.delete('/api/powers/:id', (req, res) => {
  const { id } = req.params;
  const powers = db.getPowers();
  const index = powers.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Power not found' });
  }

  powers.splice(index, 1);
  db.saveSync();
  res.json({ success: true });
});

// ─── Contestants API ─────────────────────────────────────────────────────────
app.get('/api/contestants', (req, res) => {
  const contestants = db.getContestants();
  
  // Calculate records on the fly so profiles act as a live proxy reports
  const enriched = contestants.map(c => {
    const record = models.calculateCompetitiveRecord(c.id);
    return {
      ...c,
      record
    };
  });
  
  res.json(enriched);
});

app.get('/api/contestants/:id', (req, res) => {
  const { id } = req.params;
  const contestants = db.getContestants();
  const contestant = contestants.find(c => c.id === id);
  
  if (!contestant) {
    return res.status(404).json({ error: 'Contestant not found' });
  }

  const record = models.calculateCompetitiveRecord(id);
  res.json({
    ...contestant,
    record
  });
});

app.post('/api/contestants', (req, res) => {
  const { name, powers, bio, photo, changeDescription } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const newContestant = models.createContestant({ name, powers, bio, photo, changeDescription });
  res.status(201).json(newContestant);
});

app.put('/api/contestants/:id', (req, res) => {
  const { id } = req.params;
  const { name, powers, bio, photo, changeDescription } = req.body;

  const updated = models.updateContestant(id, { name, powers, bio, photo, changeDescription });
  if (!updated) {
    return res.status(404).json({ error: 'Contestant not found or no changes made' });
  }

  res.json(updated);
});

app.delete('/api/contestants/:id', (req, res) => {
  const { id } = req.params;
  const success = models.deleteContestant(id);
  if (!success) {
    return res.status(404).json({ error: 'Contestant not found' });
  }
  res.json({ success: true });
});

// ─── Challenges API ──────────────────────────────────────────────────────────
app.get('/api/challenges', (req, res) => {
  res.json(db.getChallenges());
});

app.post('/api/challenges', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const challenges = db.getChallenges();
  const newChallenge = {
    id: 'ch_' + Date.now(),
    title,
    description: description || ''
  };

  challenges.push(newChallenge);
  db.saveSync();
  res.status(201).json(newChallenge);
});

app.put('/api/challenges/:id', (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const challenges = db.getChallenges();
  const index = challenges.findIndex(ch => ch.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  challenges[index] = {
    ...challenges[index],
    title: title !== undefined ? title : challenges[index].title,
    description: description !== undefined ? description : challenges[index].description
  };

  db.saveSync();
  res.json(challenges[index]);
});

app.delete('/api/challenges/:id', (req, res) => {
  const { id } = req.params;
  const challenges = db.getChallenges();
  const index = challenges.findIndex(ch => ch.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  challenges.splice(index, 1);
  db.saveSync();
  res.json({ success: true });
});

// ─── Seasons API ─────────────────────────────────────────────────────────────
app.get('/api/seasons', (req, res) => {
  res.json(db.getSeasons());
});

app.get('/api/seasons/:id', (req, res) => {
  const { id } = req.params;
  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) {
    return res.status(404).json({ error: 'Season not found' });
  }
  res.json(season);
});

app.post('/api/seasons', (req, res) => {
  const { name, roundsCount, teamsCount, teams } = req.body;
  if (!name || !teams || teams.length === 0) {
    return res.status(400).json({ error: 'Name and teams are required' });
  }

  const newSeason = models.createSeason({ name, roundsCount, teamsCount, teams });
  res.status(201).json(newSeason);
});

app.put('/api/seasons/:id', (req, res) => {
  const { id } = req.params;
  const updated = models.updateSeason(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Season not found' });
  }
  res.json(updated);
});

app.delete('/api/seasons/:id', (req, res) => {
  const { id } = req.params;
  const success = models.deleteSeason(id);
  if (!success) {
    return res.status(404).json({ error: 'Season not found' });
  }
  res.json({ success: true });
});

// ─── Season Challenge Instance API ───────────────────────────────────────────
app.post('/api/seasons/:id/rounds/:roundIndex/challenges', (req, res) => {
  const { id, roundIndex } = req.params;
  const { challengeId, title, description, winningTeam, safeTeam, dangerTeam, narrative } = req.body;

  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const rIdx = parseInt(roundIndex, 10);
  if (isNaN(rIdx) || rIdx < 0 || rIdx >= season.rounds.length) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const newInstance = {
    id: 'inst_' + Date.now(),
    challengeId: challengeId || null,
    title: title || 'Unnamed Challenge',
    description: description || '',
    winningTeam: winningTeam || null,
    safeTeam: safeTeam || null,
    dangerTeam: dangerTeam || null,
    narrative: narrative || ''
  };

  if (!season.rounds[rIdx].challenges) {
    season.rounds[rIdx].challenges = [];
  }

  season.rounds[rIdx].challenges.push(newInstance);
  db.saveSync();
  res.status(201).json(season.rounds[rIdx]);
});

app.put('/api/seasons/:id/rounds/:roundIndex/challenges/:challengeInstId', (req, res) => {
  const { id, roundIndex, challengeInstId } = req.params;
  
  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const rIdx = parseInt(roundIndex, 10);
  if (isNaN(rIdx) || rIdx < 0 || rIdx >= season.rounds.length) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const round = season.rounds[rIdx];
  if (!round.challenges) return res.status(404).json({ error: 'No challenges in this round' });

  const chIdx = round.challenges.findIndex(c => c.id === challengeInstId);
  if (chIdx === -1) return res.status(404).json({ error: 'Challenge instance not found' });

  round.challenges[chIdx] = {
    ...round.challenges[chIdx],
    ...req.body
  };

  db.saveSync();
  res.json(round);
});

app.delete('/api/seasons/:id/rounds/:roundIndex/challenges/:challengeInstId', (req, res) => {
  const { id, roundIndex, challengeInstId } = req.params;
  
  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const rIdx = parseInt(roundIndex, 10);
  if (isNaN(rIdx) || rIdx < 0 || rIdx >= season.rounds.length) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const round = season.rounds[rIdx];
  if (!round.challenges) return res.status(404).json({ error: 'No challenges in this round' });

  const chIdx = round.challenges.findIndex(c => c.id === challengeInstId);
  if (chIdx === -1) return res.status(404).json({ error: 'Challenge instance not found' });

  round.challenges.splice(chIdx, 1);
  db.saveSync();
  res.json(round);
});

// ─── Season Eliminations API ──────────────────────────────────────────────────
app.post('/api/seasons/:id/rounds/:roundIndex/eliminations', (req, res) => {
  const { id, roundIndex } = req.params;
  const { contestantId } = req.body;

  if (!contestantId) return res.status(400).json({ error: 'Contestant ID is required' });

  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const rIdx = parseInt(roundIndex, 10);
  if (isNaN(rIdx) || rIdx < 0 || rIdx >= season.rounds.length) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const round = season.rounds[rIdx];
  if (!round.eliminations) {
    round.eliminations = [];
  }

  if (!round.eliminations.includes(contestantId)) {
    round.eliminations.push(contestantId);
  }

  db.saveSync();
  res.status(201).json(round);
});

app.delete('/api/seasons/:id/rounds/:roundIndex/eliminations/:contestantId', (req, res) => {
  const { id, roundIndex, contestantId } = req.params;

  const seasons = db.getSeasons();
  const season = seasons.find(s => s.id === id);
  if (!season) return res.status(404).json({ error: 'Season not found' });

  const rIdx = parseInt(roundIndex, 10);
  if (isNaN(rIdx) || rIdx < 0 || rIdx >= season.rounds.length) {
    return res.status(400).json({ error: 'Invalid round index' });
  }

  const round = season.rounds[rIdx];
  if (!round.eliminations) return res.status(404).json({ error: 'No eliminations found' });

  const index = round.eliminations.indexOf(contestantId);
  if (index === -1) return res.status(404).json({ error: 'Eliminated contestant not found in this round' });

  round.eliminations.splice(index, 1);
  db.saveSync();
  res.json(round);
});

// ─── Image Upload API ────────────────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  const fs = require('fs');
  try {
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data format' });
    }

    const type = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Create uploads directory inside public
    const uploadsDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let extension = 'jpg';
    if (type.includes('png')) extension = 'png';
    else if (type.includes('webp')) extension = 'webp';

    const filename = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    res.json({ photo: `uploads/${filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save uploaded image: ' + err.message });
  }
});

// Resilient fallback for SPA base routing
app.get('*', (req, res) => {
  // If request is for api, return 404
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server if called directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`B-Season backend listening on port ${PORT}`);
  });
}

module.exports = app; // For integration testing
