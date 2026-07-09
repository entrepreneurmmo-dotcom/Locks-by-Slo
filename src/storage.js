// ── Supabase storage adapter ──────────────────────────────────────
const SUPABASE_URL = "https://xgopcleadkpogwnnjnvw.supabase.co";
const SUPABASE_KEY = "sb_publishable_6zcAnoBJpMfgsP94NOjIzA_AphqR0L_";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const storage = {
  async get(key) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers });
      const data = await res.json();
      if (data && data.length > 0) return { value: data[0].value };
      return null;
    } catch { return null; }
  },

  async set(key, value) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kv_store`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
      return res.ok;
    } catch { return null; }
  },

  async delete(key) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers,
      });
      return res.ok;
    } catch { return null; }
  },

  async list(prefix) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/kv_store?key=like.${encodeURIComponent(prefix)}*&select=key`, { headers });
      const data = await res.json();
      if (data && Array.isArray(data)) return { keys: data.map(d => d.key) };
      return { keys: [] };
    } catch { return { keys: [] }; }
  },
};

export default storage;
