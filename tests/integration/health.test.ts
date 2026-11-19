import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('Health Check API Integration', () => {
  const app = createApp();

  it('GET /api/health should return 200 with service status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'quotewise-backend');
    expect(res.body).toHaveProperty('timestamp');
  });
});
