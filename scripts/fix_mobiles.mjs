import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY environment variables.');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const args = process.argv.slice(2);
const cmd = args[0] || 'help';

const normalize = (m) => (m || '').toString().replace(/\D/g, '');

async function listRecent(limit = 50) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, mobile_number, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function findByNumber(q) {
  const norm = normalize(q);
  // try exact
  let { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, mobile_number')
    .eq('mobile_number', norm)
    .maybeSingle();

  if (error) throw error;
  if (data) return [data];

  // try contains
  ({ data, error } = await supabase
    .from('user_profiles')
    .select('id, email, mobile_number')
    .ilike('mobile_number', `%${norm}%`)
    .limit(50));

  if (error) throw error;
  return data || [];
}

async function proposeNormalize(dryRun = true) {
  const { data, error } = await supabase.from('user_profiles').select('id, mobile_number');
  if (error) throw error;
  const updates = [];
  for (const row of data) {
    const orig = row.mobile_number || '';
    const norm = normalize(orig);
    if (norm && norm !== orig) updates.push({ id: row.id, from: orig, to: norm });
  }
  if (dryRun) return updates;

  // apply updates
  for (const u of updates) {
    const { error: e } = await supabase.from('user_profiles').update({ mobile_number: u.to }).eq('id', u.id);
    if (e) console.error('Failed update', u.id, e.message || e);
    else console.log('Updated', u.id, u.from, '→', u.to);
  }
  return updates;
}

(async () => {
  try {
    if (cmd === 'help') {
      console.log('Usage: node scripts/fix_mobiles.mjs <command> [args]');
      console.log('Commands:');
      console.log('  info [n]            List recent user_profiles (n default 50)');
      console.log('  find <number>       Search for profiles by mobile number (flexible)');
      console.log('  propose             Show normalization candidates (dry-run)');
      console.log('  normalize [--yes]    Normalize mobile_number for all profiles; include --yes to apply');
      process.exit(0);
    }

    if (cmd === 'info') {
      const n = parseInt(args[1] || '50', 10);
      const rows = await listRecent(n);
      console.table(rows);
      process.exit(0);
    }

    if (cmd === 'find') {
      const q = args[1];
      if (!q) throw new Error('Provide a number to search');
      const rows = await findByNumber(q);
      console.table(rows);
      process.exit(0);
    }

    if (cmd === 'propose') {
      const rows = await proposeNormalize(true);
      if (!rows.length) console.log('No normalization needed');
      else console.table(rows);
      process.exit(0);
    }

    if (cmd === 'normalize') {
      const yes = args.includes('--yes') || args.includes('-y');
      if (!yes) {
        console.log('Dry-run only. Add --yes to apply updates.');
        const rows = await proposeNormalize(true);
        console.table(rows);
        process.exit(0);
      }
      const rows = await proposeNormalize(false);
      console.log('Applied updates:', rows.length);
      process.exit(0);
    }

    throw new Error('Unknown command');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
