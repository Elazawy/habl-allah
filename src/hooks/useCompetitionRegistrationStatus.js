import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMyCompetitionParticipants, SUBSCRIBED_STATUSES } from '../services/competitionParticipation';
import { fetchGuestCompetitionParticipantByToken } from '../services/competitionsService';
import { getGuestCompetitionToken, getSavedGuestCompetitionIds } from '../services/guestCompetitionToken';
import { useVisibleRefresh } from './useVisibleRefresh';

export function useCompetitionRegistrationStatus() {
  const { user, isStudent, studentProfile, loading: authLoading } = useAuth();
  const studentId = user && isStudent && studentProfile?.id === user.id ? user.id : null;
  const [resource, setResource] = useState({ owner: undefined, participants: new Map() });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    window.dispatchEvent(new Event('competition-participation-changed'));
  }, []);

  useEffect(() => {
    let active = true;
    // Ignore completions from the previous account after login/logout.
    const load = async () => {
      if (authLoading) return;
      try {
        const rows = studentId ? await fetchMyCompetitionParticipants() : await Promise.all(
          getSavedGuestCompetitionIds().map(async (competitionId) => {
            const saved = getGuestCompetitionToken(competitionId);
            return saved ? fetchGuestCompetitionParticipantByToken({ competitionId, token: saved.token }) : null;
          })
        );
        if (active) setResource({ owner: studentId, participants: new Map(rows.filter(Boolean).map((row) => [row.competition_id, row])) });
      } catch (error) {
        console.error('[competition status failed]', error);
        if (active) setResource((previous) => ({
          owner: studentId, error: true,
          participants: previous.owner === studentId ? previous.participants : new Map(),
        }));
      }
    };
    load();
    const invalidate = () => setRevision((value) => value + 1);
    window.addEventListener('competition-participation-changed', invalidate);
    window.addEventListener('storage', invalidate);
    return () => {
      active = false;
      window.removeEventListener('competition-participation-changed', invalidate);
      window.removeEventListener('storage', invalidate);
    };
  }, [authLoading, studentId, revision]);
  useVisibleRefresh(refresh, !authLoading);

  const loadingSubscriptions = authLoading || resource.owner !== studentId;
  const participants = loadingSubscriptions ? new Map() : resource.participants;
  const getCompetitionRegistrationState = (competition) => {
    const participant = participants.get(competition?.id);
    if (loadingSubscriptions) return { disabled: true, label: 'جارٍ التحقق...', reason: 'loading' };
    if (SUBSCRIBED_STATUSES.includes(participant?.status)) {
      return { disabled: true, label: 'مشترك بالفعل', reason: 'subscribed' };
    }
    if (participant?.status === 'pending') return { disabled: true, label: 'تم إرسال طلب الاشتراك', reason: 'pending' };
    if (participant?.status === 'rejected') return { disabled: true, label: 'تم رفض طلب الاشتراك', reason: 'rejected' };
    if (resource.error) return { disabled: true, label: 'تعذر التحقق من الاشتراك', reason: 'error' };
    if (competition?.registration_deadline && new Date(`${competition.registration_deadline}T23:59:59`) < new Date()) {
      return { disabled: true, label: 'انتهى التسجيل', reason: 'closed' };
    }
    return { disabled: false, label: 'سجّل الآن', reason: 'available' };
  };

  return {
    getCompetitionRegistrationState, loadingSubscriptions, studentId, participants,
    markCompetitionRequestPending: refresh,
  };
}
