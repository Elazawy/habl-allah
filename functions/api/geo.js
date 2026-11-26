export function onRequestGet(context) {
  const rawCountry = context?.request?.cf?.country;
  const normalized = typeof rawCountry === 'string' ? rawCountry.trim().toUpperCase() : '';
  const country = /^[A-Z]{2}$/.test(normalized) && normalized !== 'XX' && normalized !== 'T1'
    ? normalized
    : null;

  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
