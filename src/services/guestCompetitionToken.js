// Guest competition participant token helpers.
//
// After a guest applies (or recovers by phone) we persist the returned
// `public_access_token` in localStorage so the visitor can track their
// competition progress on this device without logging in.

const KEY_PREFIX = 'habl-competition-guest-token:';

function buildStorageKey(competitionId) {
  return `${KEY_PREFIX}${competitionId}`;
}

export function getGuestCompetitionToken(competitionId) {
  if (typeof window === 'undefined' || !competitionId) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(buildStorageKey(competitionId));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const token = typeof parsed.token === 'string' ? parsed.token : '';
    const phone = typeof parsed.phone === 'string' ? parsed.phone : '';
    if (!token || parsed.competitionId !== competitionId) {
      return null;
    }

    return { competitionId, token, phone };
  } catch {
    return null;
  }
}

export function saveGuestCompetitionToken(competitionId, token, phone) {
  if (typeof window === 'undefined' || !competitionId || !token) {
    return;
  }

  try {
    window.localStorage.setItem(
      buildStorageKey(competitionId),
      JSON.stringify({ competitionId, token, phone: phone ?? '' })
    );
  } catch {
    // localStorage may be unavailable (private mode, quota); progress tracking
    // simply falls back to the recovery button in that case.
  }
}

export function clearGuestCompetitionToken(competitionId) {
  if (typeof window === 'undefined' || !competitionId) {
    return;
  }

  try {
    window.localStorage.removeItem(buildStorageKey(competitionId));
  } catch {
    // ignore
  }
}
