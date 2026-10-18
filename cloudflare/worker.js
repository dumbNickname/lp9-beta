// Static assets + daily keep-alive (PRD-57, D-57.6). Supabase free
// projects pause after ~7 days without database requests; one small
// read per project per day prevents that. URLs and publishable keys are
// Worker secrets set by scripts/deploy-beta.sh; unset targets are skipped.
const TARGETS = [
  ["beta", "BETA_SUPABASE_URL", "BETA_SUPABASE_KEY"],
  ["prod", "PROD_SUPABASE_URL", "PROD_SUPABASE_KEY"],
];

async function ping(name, url, key) {
  if (!url || !key) {
    console.log(`keepalive ${name}: not configured`);
    return;
  }
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key },
    });
    // Anon has no read rights, so Postgres itself answers 42501: the
    // database was reached, which is what counts as activity.
    const body = await res.text();
    const reached = res.ok || body.includes("42501");
    console.log(`keepalive ${name}: ${reached ? "ok" : "FAILED"} ${res.status}`);
  } catch (err) {
    console.log(`keepalive ${name}: failed ${err}`);
  }
}

export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env) {
    await Promise.all(TARGETS.map(([name, u, k]) => ping(name, env[u], env[k])));
  },
};
