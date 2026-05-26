import { kv } from '@vercel/kv';

const isKvConfigured = () => {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
};

// Fallback in-memory store for dev/testing when KV is not set up
const memoryStore = new Map();

export const checkRateLimit = async (identifier, limit = 5, windowInSecs = 3600) => {
  const now = Date.now();

  if (!isKvConfigured()) {
    const entry = memoryStore.get(identifier);
    if (!entry || now - entry.startedAt > windowInSecs * 1000) {
      memoryStore.set(identifier, { count: 1, startedAt: now });
      return { success: true, count: 1 };
    }
    entry.count += 1;
    return { success: entry.count <= limit, count: entry.count };
  }

  try {
    const current = await kv.incr(identifier);
    if (current === 1) {
      await kv.expire(identifier, windowInSecs);
    }
    return { success: current <= limit, count: current };
  } catch (error) {
    console.error('KV rate limit error, falling back to memory:', error);
    
    // Fallback to memoryStore
    const entry = memoryStore.get(identifier);
    if (!entry || now - entry.startedAt > windowInSecs * 1000) {
      memoryStore.set(identifier, { count: 1, startedAt: now });
      return { success: true, count: 1, fallback: 'memory' };
    }
    entry.count += 1;
    return { 
      success: entry.count <= limit, 
      count: entry.count,
      fallback: 'memory'
    };
  }
};

export const getClientId = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};
