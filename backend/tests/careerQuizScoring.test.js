// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

describe('Career quiz MBTI + RIASEC scoring', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum!!!';
    process.env.ALLOWED_ORIGIN = 'http://localhost';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // eslint-disable-next-line global-require
    app = require('../api/index.js');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('serves 60 default questions across enjoyment and introspection sections', async () => {
    const res = await request(app).get('/api/career-quiz/definition');

    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
    const questions = Array.isArray(res.body?.quiz?.questions) ? res.body.quiz.questions : [];
    expect(questions.length).toBe(60);

    const sectionCounts = questions.reduce((acc, question) => {
      const section = String(question?.section || 'enjoyment');
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {});

    expect(sectionCounts.enjoyment).toBe(30);
    expect(sectionCounts.introspection).toBe(30);
  });

  it('returns confidence and major/supporting role recommendations on submit', async () => {
    const defRes = await request(app).get('/api/career-quiz/definition');
    const questions = Array.isArray(defRes.body?.quiz?.questions) ? defRes.body.quiz.questions : [];

    const answers = questions.map((question) => ({
      questionId: question.id,
      optionKey: '4',
    }));

    const submitRes = await request(app)
      .post('/api/career-quiz/submit')
      .send({ answers });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body?.ok).toBe(true);

    const result = submitRes.body?.result;
    expect(typeof result?.personalityType).toBe('string');
    expect(result?.riasecScores).toBeTruthy();
    expect(Array.isArray(result?.topInterests)).toBe(true);
    expect(result.topInterests.length).toBeGreaterThan(0);
    expect(result?.confidence).toBeTruthy();
    expect(typeof result.confidence.score).toBe('number');
    expect(typeof result.confidence.band).toBe('string');
    expect(result.confidence.score >= 0 && result.confidence.score <= 100).toBe(true);
    expect(['emerging', 'medium', 'high']).toContain(result.confidence.band);
    
    // Validate per-section confidence breakdown
    expect(result.confidence.sectionBreakdown).toBeTruthy();
    expect(result.confidence.sectionBreakdown.enjoyment).toBeTruthy();
    expect(result.confidence.sectionBreakdown.introspection).toBeTruthy();
    expect(typeof result.confidence.sectionBreakdown.enjoyment.score).toBe('number');
    expect(typeof result.confidence.sectionBreakdown.introspection.score).toBe('number');
    expect(typeof result.confidence.sectionBreakdown.enjoyment.band).toBe('string');
    expect(typeof result.confidence.sectionBreakdown.introspection.band).toBe('string');
    
    // Validate role recommendations
    expect(Array.isArray(result?.majorRoles)).toBe(true);
    expect(Array.isArray(result?.supportingRoles)).toBe(true);
    expect(result.majorRoles.length).toBeGreaterThan(0);
    expect(result.supportingRoles.length).toBeGreaterThan(0);
    
    // Validate role rationale
    expect(Array.isArray(result?.roleRationale)).toBe(true);
    expect(result.roleRationale.length).toBeGreaterThan(0);
    for (const rationale of result.roleRationale) {
      expect(typeof rationale.role).toBe('string');
      expect(['major', 'supporting']).toContain(rationale.category);
      expect(Array.isArray(rationale.matchedCodes)).toBe(true);
      expect(typeof rationale.explanation).toBe('string');
      expect(rationale.explanation.length).toBeGreaterThan(0);
    }
  });
});
