// Set test environment
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const models = require('../src/models');

const TEST_DB_FILE = path.join(__dirname, '../data/db.test.json');

describe('Domain Models & Versioning Logic', () => {
  beforeEach(() => {
    // Force reset db to default state
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
    db.init();
  });

  afterAll(() => {
    // Cleanup test database
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
  });

  test('should create a contestant with version 1 history', () => {
    const contestant = models.createContestant({
      name: 'Sparky',
      powers: ['p1'],
      bio: 'A high-voltage squirrel.',
      photo: 'images/contestants/sparky.png'
    });

    expect(contestant).toHaveProperty('id');
    expect(contestant.name).toBe('Sparky');
    expect(contestant.versions).toHaveLength(1);
    expect(contestant.versions[0].version).toBe(1);
    expect(contestant.versions[0].name).toBe('Sparky');
    expect(contestant.versions[0].changeDescription).toBe('Initial profile creation');
  });

  test('should create a new version history entry only when profile fields change', () => {
    const contestant = models.createContestant({
      name: 'Sparky',
      powers: ['p1'],
      bio: 'A high-voltage squirrel.'
    });

    // Update with no actual changes - should not add new version
    const updatedNoChange = models.updateContestant(contestant.id, {
      name: 'Sparky',
      bio: 'A high-voltage squirrel.'
    });
    expect(updatedNoChange.versions).toHaveLength(1);

    // Update with changed bio - should create version 2
    const updatedBio = models.updateContestant(contestant.id, {
      name: 'Sparky',
      bio: 'A supercharged fluffy squirrel!'
    });
    expect(updatedBio.versions).toHaveLength(2);
    expect(updatedBio.versions[1].version).toBe(2);
    expect(updatedBio.versions[1].changeDescription).toContain('Bio updated');
  });

  test('should calculate correct competitive records for a contestant in active seasons', () => {
    const cId = 'c1'; // Barnaby from default data
    
    // Setup a mock season with Barnaby (c1) in a team
    const season = models.createSeason({
      name: 'Season of Fire & Ice',
      roundsCount: 2,
      teamsCount: 2,
      teams: [
        { id: 'team_red', name: 'Red Pyros', color: '#ff0000', members: [cId] },
        { id: 'team_blue', name: 'Blue Frosts', color: '#0000ff', members: ['c2'] }
      ]
    });

    // Round 1 Challenge: Barnaby's team wins
    season.rounds[0].challenges.push({
      id: 'inst_1',
      title: 'Scramble',
      winningTeam: 'team_red',
      safeTeam: 'team_blue',
      dangerTeam: 'team_blue'
    });

    // Round 2 Challenge: Barnaby's team in danger
    season.rounds[1].challenges.push({
      id: 'inst_2',
      title: 'Frost Slalom',
      winningTeam: 'team_blue',
      safeTeam: 'team_blue',
      dangerTeam: 'team_red'
    });

    // Barnaby gets eliminated in Round 2
    season.rounds[1].eliminations.push(cId);

    // Save changes
    db.saveSync();

    const record = models.calculateCompetitiveRecord(cId);

    expect(record.seasonsPlayed).toBe(1);
    expect(record.challengesWon).toBe(1);
    expect(record.challengesDanger).toBe(1);
    expect(record.eliminatedCount).toBe(1);
    expect(record.history).toHaveLength(1);
    expect(record.history[0].teamName).toBe('Red Pyros');
    expect(record.history[0].placement).toBe('Eliminated (Round 2)');
  });
});
