import { WHATSAPP_NUMBER } from './constants';

export function buildWhatsAppUrl(number, message) {
  const sanitizedNumber = String(number ?? '').replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message ?? '');

  return `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;
}

export function buildCompetitionParticipationMessage(competition) {
  const competitionName = typeof competition === 'string'
    ? competition.trim()
    : competition?.name?.trim();

  return `السلام عليكم ورحمة الله وبركاته، أرغب في المشاركة في مسابقة ${competitionName || 'المسابقة القرآنية'}، وأود معرفة خطوات التسجيل والشروط.`;
}

export function getWhatsAppJoinLink(competition) {
  return buildWhatsAppUrl(
    WHATSAPP_NUMBER,
    buildCompetitionParticipationMessage(competition)
  );
}
