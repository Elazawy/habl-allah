import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMySubscribedCompetitions } from '../services/studentsService';

const GUEST_PENDING_REQUESTS_KEY = 'habl-competition-registration-pending:guest';
const STUDENT_PENDING_REQUESTS_PREFIX = 'habl-competition-registration-pending:student:';

function getStudentId(user, isStudent, studentProfile) {
  if (!user || !isStudent || !studentProfile?.id || studentProfile.id !== user.id) {
    return null;
  }

  return studentProfile.id;
}

function getPendingRequestsStorageKey(studentId) {
  return studentId
    ? `${STUDENT_PENDING_REQUESTS_PREFIX}${studentId}`
    : GUEST_PENDING_REQUESTS_KEY;
}

function readPendingCompetitionIds(storageKey) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((competitionId) => typeof competitionId === 'string' && competitionId.trim() !== '');
  } catch {
    return [];
  }
}

function writePendingCompetitionIds(storageKey, competitionIds) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!Array.isArray(competitionIds) || competitionIds.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  const uniqueCompetitionIds = [...new Set(competitionIds.filter((competitionId) => typeof competitionId === 'string' && competitionId.trim() !== ''))];

  if (uniqueCompetitionIds.length === 0) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(uniqueCompetitionIds));
}

function removePendingCompetitionIds(storageKey, competitionIds) {
  if (!Array.isArray(competitionIds) || competitionIds.length === 0) {
    return;
  }

  const nextIds = readPendingCompetitionIds(storageKey).filter(
    (storedCompetitionId) => !competitionIds.includes(storedCompetitionId)
  );

  writePendingCompetitionIds(storageKey, nextIds);
}

function isCompetitionClosed(registrationDeadline) {
  if (!registrationDeadline) {
    return false;
  }

  return new Date(`${registrationDeadline}T23:59:59`) < new Date();
}

export function useCompetitionRegistrationStatus() {
  const { user, isStudent, studentProfile, loading: authLoading } = useAuth();
  const studentId = getStudentId(user, isStudent, studentProfile);
  const storageKey = getPendingRequestsStorageKey(studentId);

  const [pendingCompetitionIds, setPendingCompetitionIds] = useState(() => new Set(readPendingCompetitionIds(storageKey)));
  const [subscribedCompetitionIds, setSubscribedCompetitionIds] = useState(new Set());
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(Boolean(authLoading || studentId));

  useEffect(() => {
    setPendingCompetitionIds(new Set(readPendingCompetitionIds(storageKey)));
  }, [storageKey]);

  useEffect(() => {
    let active = true;

    if (authLoading) {
      setLoadingSubscriptions(true);
      return () => {
        active = false;
      };
    }

    if (!studentId) {
      setSubscribedCompetitionIds(new Set());
      setLoadingSubscriptions(false);
      return () => {
        active = false;
      };
    }

    setLoadingSubscriptions(true);

    fetchMySubscribedCompetitions()
      .then((subscriptions) => {
        if (!active) {
          return;
        }

        const subscribedIds = subscriptions
          .map((subscription) => subscription.competition_id ?? subscription.quran_competitions?.id)
          .filter((competitionId) => typeof competitionId === 'string' && competitionId.trim() !== '');

        setSubscribedCompetitionIds(new Set(subscribedIds));

        removePendingCompetitionIds(GUEST_PENDING_REQUESTS_KEY, subscribedIds);

        setPendingCompetitionIds((prev) => {
          if (subscribedIds.length === 0) {
            return prev;
          }

          let changed = false;
          const next = new Set(prev);

          subscribedIds.forEach((competitionId) => {
            if (next.delete(competitionId)) {
              changed = true;
            }
          });

          if (!changed) {
            return prev;
          }

          writePendingCompetitionIds(storageKey, [...next]);
          return next;
        });

        setLoadingSubscriptions(false);
      })
      .catch((error) => {
        console.error('[competition subscription check failed]', error);
        if (!active) {
          return;
        }

        setSubscribedCompetitionIds(new Set());
        setLoadingSubscriptions(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, studentId, storageKey]);

  const markCompetitionRequestPending = (competitionId) => {
    if (typeof competitionId !== 'string' || competitionId.trim() === '') {
      return;
    }

    setPendingCompetitionIds((prev) => {
      if (prev.has(competitionId)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(competitionId);
      writePendingCompetitionIds(storageKey, [...next]);
      return next;
    });
  };

  const getCompetitionRegistrationState = (competition) => {
    const competitionId = competition?.id;

    if (loadingSubscriptions) {
      return {
        disabled: true,
        label: 'جارٍ التحقق...',
        reason: 'loading',
      };
    }

    if (competitionId && subscribedCompetitionIds.has(competitionId)) {
      return {
        disabled: true,
        label: 'أنت مشترك بالفعل',
        reason: 'subscribed',
      };
    }

    if (competitionId && pendingCompetitionIds.has(competitionId)) {
      return {
        disabled: true,
        label: 'تم إرسال طلب الاشتراك',
        reason: 'pending',
      };
    }

    if (isCompetitionClosed(competition?.registration_deadline)) {
      return {
        disabled: true,
        label: 'انتهى التسجيل',
        reason: 'closed',
      };
    }

    return {
      disabled: false,
      label: 'سجّل الآن',
      reason: 'available',
    };
  };

  return {
    getCompetitionRegistrationState,
    loadingSubscriptions,
    markCompetitionRequestPending,
    studentId,
  };
}
