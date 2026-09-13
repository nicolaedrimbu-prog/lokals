/*
 * lokals-zones.js — sursa centrala pentru zonele geografice (Rasnov, Sacele - Darste, ...).
 *
 * Toate zonele traiesc in tabela Supabase `zone_ghid` (slug, nume, judet, activa, ordine),
 * NU in codul acestui fisier sau al paginilor care il folosesc.
 *
 * Ca sa redenumesti o zona, sa activezi/dezactivezi una sau sa adaugi una noua:
 *   update public.zone_ghid set nume = 'Sacele - Darste' where slug = 'sacele-brasov';
 *   insert into public.zone_ghid (slug, nume, judet, activa, ordine)
 *     values ('brasov-poiana-brasov', 'Brasov - Poiana Brasov', 'Brasov', true, 3);
 * Nu trebuie atinsa nicio pagina — la urmatoarea incarcare, toate paginile (formulare de
 * inscriere, ghidul de oaspeti, afisul QR, panoul de admin) preiau automat schimbarea.
 *
 * Folosire intr-o pagina:
 *   <script src="lokals-zones.js"></script>
 *   ...
 *   const zone = await LokalsZones.load(SUPABASE_URL, SUPABASE_KEY);
 *   const eticheta = LokalsZones.label(zone, 'sacele-brasov'); // -> "Sacele - Darste"
 *   const active = LokalsZones.activeList(zone); // doar zonele cu activa=true, in ordine
 */
(function (global) {
  let cache = null;
  let pending = null;

  async function load(supabaseUrl, supabaseKey) {
    if (cache) return cache;
    if (pending) return pending;
    pending = fetch(`${supabaseUrl}/rest/v1/zone_ghid?select=slug,nume,judet,activa,ordine&order=ordine.asc`, {
      headers: { apikey: supabaseKey },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        cache = rows || [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
    return pending;
  }

  // O zona care nu (mai) apare in tabela e afisata cu propriul slug, ca sa nu disparem
  // silentios continut vechi — mai usor de observat si reparat decat un camp gol.
  function label(zoneList, slug) {
    const s = (slug || '').trim();
    const row = (zoneList || []).find((z) => z.slug === s);
    return (row && row.nume) || s || 'zona ta';
  }

  function activeList(zoneList) {
    return (zoneList || []).filter((z) => z.activa);
  }

  global.LokalsZones = { load, label, activeList };
})(window);
