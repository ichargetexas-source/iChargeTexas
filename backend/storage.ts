const storage = new Map<string, string>();

export const kv = {
  async get(key: string): Promise<string | null> {
    return storage.get(key) || null;
  },

  async set(key: string, value: string): Promise<void> {
    storage.set(key, value);
  },

  async delete(key: string): Promise<void> {
    storage.delete(key);
  },

  async has(key: string): Promise<boolean> {
    return storage.has(key);
  },

  async keys(): Promise<string[]> {
    return Array.from(storage.keys());
  },

  async clear(): Promise<void> {
    storage.clear();
  },
};
