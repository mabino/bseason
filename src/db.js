const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../data');
const DB_FILE = process.env.NODE_ENV === 'test' 
  ? path.join(DB_DIR, 'db.test.json')
  : path.join(DB_DIR, 'db.json');

const defaultData = {
  powers: [
    { id: 'p1', name: 'Pyrokinesis', code: 'fire', description: 'Harnesses, generates, and directs thermal energy and warm flames.', color: '#ff5722', icon: '🔥' },
    { id: 'p2', name: 'Cosmic Drift', code: 'cosmic', description: 'Bends gravitational lines, controls celestial dust, and hovers in vacuum.', color: '#9c27b0', icon: '🌌' },
    { id: 'p3', name: 'Forest Whisper', code: 'nature', description: 'Communicates with plants and forest creatures, manipulating growth and vines.', color: '#4caf50', icon: '🌿' },
    { id: 'p4', name: 'Shadow Walk', code: 'void', description: 'Merges with shadows to teleport short distances and turn invisible.', color: '#673ab7', icon: '🔮' },
    { id: 'p5', name: 'Aero Glide', code: 'wind', description: 'Controls atmospheric currents to create gale winds or gentle drafts.', color: '#03a9f4', icon: '💨' },
    { id: 'p6', name: 'Frost Spike', code: 'ice', description: 'Manipulates moisture to create sharp ice constructs and sub-zero blizzards.', color: '#00bcd4', icon: '❄️' }
  ],
  contestants: [
    {
      id: 'c1',
      name: 'Barnaby',
      powers: ['p1'],
      bio: 'A cute fluffy teddy bear with a warm heart and sizzling flame powers.',
      photo: 'images/contestants/fire.svg',
      versions: [
        {
          version: 1,
          timestamp: new Date('2026-05-25T12:00:00Z').toISOString(),
          name: 'Barnaby',
          powers: ['p1'],
          bio: 'A cute fluffy teddy bear with a warm heart and sizzling flame powers.',
          photo: 'images/contestants/fire.svg',
          changeDescription: 'Initial profile creation'
        }
      ]
    },
    {
      id: 'c2',
      name: 'Penelope',
      powers: ['p2'],
      bio: 'A galactic panda who loves stars and drifting through the cosmos.',
      photo: 'images/contestants/cosmic.svg',
      versions: [
        {
          version: 1,
          timestamp: new Date('2026-05-25T12:00:00Z').toISOString(),
          name: 'Penelope',
          powers: ['p2'],
          bio: 'A galactic panda who loves stars and drifting through the cosmos.',
          photo: 'images/contestants/cosmic.svg',
          changeDescription: 'Initial profile creation'
        }
      ]
    },
    {
      id: 'c3',
      name: 'Oliver',
      powers: ['p3'],
      bio: 'A forest guardian owl who protects woodlands and talks to vines.',
      photo: 'images/contestants/nature.svg',
      versions: [
        {
          version: 1,
          timestamp: new Date('2026-05-25T12:00:00Z').toISOString(),
          name: 'Oliver',
          powers: ['p3'],
          bio: 'A forest guardian owl who protects woodlands and talks to vines.',
          photo: 'images/contestants/nature.svg',
          changeDescription: 'Initial profile creation'
        }
      ]
    },
    {
      id: 'c4',
      name: 'Barnaby Jr',
      powers: ['p4'],
      bio: 'A mysterious long-eared bunny who walks in shadows and loves carrots.',
      photo: 'images/contestants/void.svg',
      versions: [
        {
          version: 1,
          timestamp: new Date('2026-05-25T12:00:00Z').toISOString(),
          name: 'Barnaby Jr',
          powers: ['p4'],
          bio: 'A mysterious long-eared bunny who walks in shadows and loves carrots.',
          photo: 'images/contestants/void.svg',
          changeDescription: 'Initial profile creation'
        }
      ]
    }
  ],
  challenges: [
    { id: 'ch1', title: 'The Volcano Scramble', description: 'Teams must climb the active Mt. Fluff and retrieve the Golden Acorn without getting singed.' },
    { id: 'ch2', title: 'Tetherball in the Cosmos', description: 'A gravity-free game of tetherball played on a small floating meteorite.' },
    { id: 'ch3', title: 'The Tangled Vine Maze', description: 'Contestants navigate a labyrinth of sentient thorns and vines that shift in response to magic.' },
    { id: 'ch4', title: 'Glacier Slalom Run', description: 'A high-speed race down the slippery peaks of Mount Shiver on makeshift sleds.' }
  ],
  seasons: []
};

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      this.data = JSON.parse(JSON.stringify(defaultData));
      this.saveSync();
    } else {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
        
        // Backwards compatibility / Schema migrations
        if (!this.data.powers) this.data.powers = [];
        if (!this.data.contestants) this.data.contestants = [];
        if (!this.data.challenges) this.data.challenges = [];
        if (!this.data.seasons) this.data.seasons = [];
      } catch (err) {
        console.error('Failed to read database, falling back to default data:', err);
        this.data = JSON.parse(JSON.stringify(defaultData));
        this.saveSync();
      }
    }
  }

  saveSync() {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  }

  save() {
    return new Promise((resolve, reject) => {
      try {
        this.saveSync();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Model accessors
  getPowers() {
    return this.data.powers;
  }

  getContestants() {
    return this.data.contestants;
  }

  getChallenges() {
    return this.data.challenges;
  }

  getSeasons() {
    return this.data.seasons;
  }
}

const db = new Database();
module.exports = db;
