import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisCacheService } from '../../src/shared/infrastructure/cache/redis-cache.service';
import * as redisConfig from '../../src/config/redis';

describe('RedisCacheService Unit Tests', () => {
  let mockRedisClient: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    scanStream: ReturnType<typeof vi.fn>;
    pipeline: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      scanStream: vi.fn(),
      pipeline: vi.fn(),
    };

    vi.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedisClient as unknown as import('ioredis').Redis);
    vi.spyOn(redisConfig, 'isRedisReady').mockReturnValue(true);
  });

  it('should return parsed object when key exists in cache', async () => {
    const service = new RedisCacheService(60);
    const mockData = { id: '123', name: 'Test RFQ' };
    mockRedisClient.get.mockResolvedValue(JSON.stringify(mockData));

    const result = await service.get<typeof mockData>('test:key');

    expect(result).toEqual(mockData);
    expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
  });

  it('should return null when key does not exist', async () => {
    const service = new RedisCacheService(60);
    mockRedisClient.get.mockResolvedValue(null);

    const result = await service.get('nonexistent:key');

    expect(result).toBeNull();
  });

  it('should return null safely if Redis throws on get (fail-open)', async () => {
    const service = new RedisCacheService(60);
    mockRedisClient.get.mockRejectedValue(new Error('Connection lost'));

    const result = await service.get('error:key');

    expect(result).toBeNull();
  });

  it('should set key with TTL', async () => {
    const service = new RedisCacheService(60);
    const mockData = { count: 42 };

    await service.set('test:key', mockData, 120);

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'test:key',
      JSON.stringify(mockData),
      'EX',
      120
    );
  });

  it('should delete a specific key', async () => {
    const service = new RedisCacheService(60);

    await service.del('test:key');

    expect(mockRedisClient.del).toHaveBeenCalledWith('test:key');
  });

  it('should return null and not crash when Redis is not ready', async () => {
    vi.spyOn(redisConfig, 'isRedisReady').mockReturnValue(false);
    const service = new RedisCacheService(60);

    const result = await service.get('any:key');
    expect(result).toBeNull();

    await service.set('any:key', { foo: 'bar' });
    expect(mockRedisClient.set).not.toHaveBeenCalled();

    await service.del('any:key');
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });
});
