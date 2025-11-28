const storage = new Map<string, string>();

export const kv = {
  async get(key: string): Promise<string | null> {
    const value = storage.get(key) || null;
    console.log(`[Storage] GET ${key}: ${value ? 'found' : 'not found'}`);
    return value;
  },

  async set(key: string, value: string): Promise<void> {
    console.log(`[Storage] SET ${key}`);
    storage.set(key, value);
  },

  async delete(key: string): Promise<void> {
    console.log(`[Storage] DELETE ${key}`);
    storage.delete(key);
  },

  async has(key: string): Promise<boolean> {
    const exists = storage.has(key);
    console.log(`[Storage] HAS ${key}: ${exists}`);
    return exists;
  },

  async keys(): Promise<string[]> {
    const allKeys = Array.from(storage.keys());
    console.log(`[Storage] KEYS: ${allKeys.length} keys`);
    return allKeys;
  },

  async clear(): Promise<void> {
    console.log(`[Storage] CLEAR - removing ${storage.size} keys`);
    storage.clear();
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      console.log(`[Storage] getJSON ${key}: no data found`);
      return null;
    }
    try {
      const parsed = JSON.parse(value) as T;
      console.log(`[Storage] getJSON ${key}: successfully parsed`);
      return parsed;
    } catch (error) {
      console.error(`[Storage] Error parsing JSON for key ${key}:`, error);
      return null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    const jsonString = JSON.stringify(value, null, 2);
    console.log(`[Storage] setJSON ${key}: storing ${jsonString.length} characters`);
    await this.set(key, jsonString);
  },

  tenant(tenantId: string) {
    return {
      async get(key: string): Promise<string | null> {
        return kv.get(`tenant:${tenantId}:${key}`);
      },

      async set(key: string, value: string): Promise<void> {
        return kv.set(`tenant:${tenantId}:${key}`, value);
      },

      async delete(key: string): Promise<void> {
        return kv.delete(`tenant:${tenantId}:${key}`);
      },

      async has(key: string): Promise<boolean> {
        return kv.has(`tenant:${tenantId}:${key}`);
      },

      async getJSON<T>(key: string): Promise<T | null> {
        return kv.getJSON<T>(`tenant:${tenantId}:${key}`);
      },

      async setJSON<T>(key: string, value: T): Promise<void> {
        return kv.setJSON(`tenant:${tenantId}:${key}`, value);
      },

      async keys(): Promise<string[]> {
        const allKeys = await kv.keys();
        const prefix = `tenant:${tenantId}:`;
        return allKeys
          .filter(k => k.startsWith(prefix))
          .map(k => k.replace(prefix, ""));
      },
    };
  },
};

export type TenantStorage = ReturnType<typeof kv.tenant>;
