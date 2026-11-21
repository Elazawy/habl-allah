import i18n from '../i18n';
import { getLocalizedField } from '../i18n/content';
import { WHATSAPP_NUMBER } from './constants';

export function buildWhatsAppUrl(number, message) {
  const sanitizedNumber = String(number ?? '').replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message ?? '');

  return `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;
}

export function buildCompetitionParticipationMessage(competition) {
  const competitionName = typeof competition === 'string'
    ? competition.trim()
    : getLocalizedField(competition, 'name', i18n.language).trim();

  return i18n.t('home:whatsapp.competitionParticipation', {
    name: competitionName || i18n.t('home:whatsapp.defaultCompetitionName'),
  });
}

export function getWhatsAppJoinLink(competition) {
  return buildWhatsAppUrl(
    WHATSAPP_NUMBER,
    buildCompetitionParticipationMessage(competition),
  );
}
