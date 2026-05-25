// Set test environment
process.env.NODE_ENV = 'test';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const db = require('../src/db');

const TEST_DB_FILE = path.join(__dirname, '../data/db.test.json');

describe('REST API Endpoints', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
    db.init();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
  });

  test('GET /api/powers should return powers list', async () => {
    const response = await request(app)
      .get('/api/powers')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('code');
  });

  test('POST /api/powers should create new power library entry', async () => {
    const newPower = {
      name: 'Gravity Control',
      code: 'gravity',
      description: 'Manipulates localized gravity fields.',
      color: '#3f51b5',
      icon: '🪐'
    };

    const response = await request(app)
      .post('/api/powers')
      .send(newPower)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.code).toBe('gravity');
    expect(response.body.name).toBe('Gravity Control');
  });

  test('POST /api/contestants should create a new contestant profile', async () => {
    const newContestant = {
      name: 'Fuzzy',
      powers: ['p1'],
      bio: 'A sweet bear.',
      photo: 'images/contestants/fire_bear.png'
    };

    const response = await request(app)
      .post('/api/contestants')
      .send(newContestant)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Fuzzy');
    expect(response.body.versions).toHaveLength(1);
  });

  test('PUT /api/contestants/:id should update profile and return updated data', async () => {
    const contestants = db.getContestants();
    const id = contestants[0].id;

    const response = await request(app)
      .put(`/api/contestants/${id}`)
      .send({
        name: 'Barnaby Sr.',
        bio: 'The upgraded elder bear.',
        changeDescription: 'Promoted to elder'
      })
      .expect(200);

    expect(response.body.name).toBe('Barnaby Sr.');
    expect(response.body.versions).toHaveLength(2);
    expect(response.body.versions[1].changeDescription).toBe('Promoted to elder');
  });

  test('POST /api/seasons should initialize an active season with rounds', async () => {
    const seasonData = {
      name: 'All Stars Season 1',
      roundsCount: 3,
      teamsCount: 2,
      teams: [
        { id: 't_alpha', name: 'Team Alpha', color: '#ff0055', members: ['c1'] },
        { id: 't_omega', name: 'Team Omega', color: '#00ff55', members: ['c2'] }
      ]
    };

    const response = await request(app)
      .post('/api/seasons')
      .send(seasonData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('All Stars Season 1');
    expect(response.body.status).toBe('active');
    expect(response.body.rounds).toHaveLength(3);
    expect(response.body.rounds[0].challenges).toBeInstanceOf(Array);
  });

  test('POST /api/seasons/:id/rounds/:roundIndex/challenges should append challenge instance', async () => {
    const seasons = db.getSeasons();
    // Create a season first
    const s = await request(app)
      .post('/api/seasons')
      .send({
        name: 'Mini Season',
        roundsCount: 2,
        teamsCount: 2,
        teams: [
          { id: 't1', name: 'A', members: ['c1'] },
          { id: 't2', name: 'B', members: ['c2'] }
        ]
      });

    const sId = s.body.id;

    const challengeResponse = await request(app)
      .post(`/api/seasons/${sId}/rounds/0/challenges`)
      .send({
        challengeId: 'ch1',
        title: 'The Volcano Scramble',
        winningTeam: 't1',
        safeTeam: 't2',
        dangerTeam: 't2',
        narrative: 'Team A climbed amazingly fast!'
      })
      .expect(201);

    expect(challengeResponse.body.challenges).toHaveLength(1);
    expect(challengeResponse.body.challenges[0].winningTeam).toBe('t1');
    expect(challengeResponse.body.challenges[0].narrative).toBe('Team A climbed amazingly fast!');
  });
});
