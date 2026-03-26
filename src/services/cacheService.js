/**
 * Lightweight in-memory cache with TTL (Time-To-Live).
 * Used to cache API responses on the frontend for snappier UX.
 */
class MemoryCache {
    /**
     * @param {number} ttlMs — default time-to-live in milliseconds (default 60 s)
     */
    constructor(ttlMs = 60000) {
        this._store = new Map();
        this._ttl = ttlMs;
    }

    /**
     * Get a cached value. Returns `undefined` if missing or expired.
     */
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.ts > this._ttl) {
            this._store.delete(key);
            return undefined;
        }
        return entry.value;
    }

    /**
     * Store a value with the current timestamp.
     */
    set(key, value) {
        this._store.set(key, { value, ts: Date.now() });
    }

    /**
     * Delete a specific key.
     */
    del(key) {
        this._store.delete(key);
    }

    /**
     * Clear all entries whose key includes the given substring.
     * If no pattern is given, clears everything.
     */
    invalidate(pattern) {
        if (!pattern) {
            this._store.clear();
            return;
        }
        for (const key of this._store.keys()) {
            if (key.includes(pattern)) this._store.delete(key);
        }
    }

    /**
     * Flush the entire cache.
     */
    clear() {
        this._store.clear();
    }

    /**
     * Number of entries currently held.
     */
    get size() {
        return this._store.size;
    }
}

export default MemoryCache;
