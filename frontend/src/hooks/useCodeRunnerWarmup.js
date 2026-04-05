import { useEffect } from 'react';

import api from '../utils/api';

const WARMUP_COOLDOWN_MS = 5 * 60 * 1000;

let warmupInFlight = null;
let lastWarmupAt = 0;

export function primeCodeRunner() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (warmupInFlight) {
    return warmupInFlight;
  }

  const now = Date.now();
  if (lastWarmupAt && now - lastWarmupAt < WARMUP_COOLDOWN_MS) {
    return Promise.resolve(null);
  }

  warmupInFlight = api.get('/system/code-runner/health', { timeout: 60000 })
    .then((response) => {
      lastWarmupAt = Date.now();
      return response.data;
    })
    .catch(() => null)
    .finally(() => {
      warmupInFlight = null;
    });

  return warmupInFlight;
}

export function useCodeRunnerWarmup() {
  useEffect(() => {
    void primeCodeRunner();
  }, []);
}