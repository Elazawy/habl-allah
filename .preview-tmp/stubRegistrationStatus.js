// Dev-only stub: the previewed student is always an approved subscriber.
export function useCompetitionRegistrationStatus() {
  return {
    getCompetitionRegistrationState: () => ({
      disabled: true,
      label: 'أنت مشترك بالفعل',
      reason: 'subscribed',
    }),
    loadingSubscriptions: false,
    markCompetitionRequestPending: () => {},
    studentId: 's2',
  };
}
