export const EXAM_CONFIG_KEY = 'cfa-tracker-config-v1';
export const DEFAULT_EXAM_CONFIG = {
  level: 'l1',
  pathway: 'portfolioManagement',
  attemptMonth: 8,
  attemptYear: 2027,
  examDate: '2027-08-15',
  targetMocks: 12,
  onboardingComplete: false,
};
export const ATTEMPT_MONTHS = [2, 5, 8, 11];
export const LEVEL_STORAGE_KEYS = {
  l1: 'cfa-tracker-v11-l1',
  l2: 'cfa-tracker-v11-l2',
  'l3-portfolioManagement': 'cfa-tracker-v11-l3-portfolioManagement',
  'l3-privateMarkets': 'cfa-tracker-v11-l3-privateMarkets',
  'l3-privateWealth': 'cfa-tracker-v11-l3-privateWealth',
};
export function availableAttemptMonths(attemptYear, now = new Date()) {
  const year = Number(attemptYear);
  const currentYear = now.getFullYear();
  if (year < currentYear) return [];
  if (year > currentYear) return ATTEMPT_MONTHS;
  return ATTEMPT_MONTHS.filter(month => month >= now.getMonth() + 1);
}

export const legacyLevelOneKeys = ['cfa-l1-tracker-v10', 'cfa-l1-tracker-v9', 'cfa-l1-tracker-v8'];

export function normalizeExamConfig(value = {}) {
  const level = ['l1', 'l2', 'l3'].includes(value.level) ? value.level : DEFAULT_EXAM_CONFIG.level;
  const pathway = ['portfolioManagement', 'privateMarkets', 'privateWealth'].includes(value.pathway) ? value.pathway : DEFAULT_EXAM_CONFIG.pathway;
  const attemptYear = Math.min(2029, Math.max(2026, Number(value.attemptYear) || DEFAULT_EXAM_CONFIG.attemptYear));
  const eligibleMonths = availableAttemptMonths(attemptYear);
  const attemptMonth = eligibleMonths.includes(Number(value.attemptMonth)) ? Number(value.attemptMonth) : (eligibleMonths[0] || DEFAULT_EXAM_CONFIG.attemptMonth);
  const lastDay = new Date(attemptYear, attemptMonth, 0).getDate();
  const fallback = String(DEFAULT_EXAM_CONFIG.examDate);
  const candidate = typeof value.examDate === 'string' ? value.examDate : fallback;
  const date = new Date(`${candidate}T12:00:00`);
  const sameAttempt = date.getFullYear() === attemptYear && date.getMonth() + 1 === attemptMonth;
  const examDate = sameAttempt && !Number.isNaN(date.getTime()) ? candidate : `${attemptYear}-${String(attemptMonth).padStart(2, '0')}-${String(Math.min(15, lastDay)).padStart(2, '0')}`;
  return { level, pathway, attemptMonth, attemptYear, examDate, targetMocks: Math.min(20, Math.max(1, Number(value.targetMocks) || 12)), onboardingComplete: Boolean(value.onboardingComplete) };
}
export function storageKeyForConfig(config) {
  const normalized = normalizeExamConfig(config);
  return normalized.level === 'l1' ? LEVEL_STORAGE_KEYS.l1 : normalized.level === 'l2' ? LEVEL_STORAGE_KEYS.l2 : LEVEL_STORAGE_KEYS[`l3-${normalized.pathway}`];
}
export function buildMockDates(examDate, targetMocks) {
  const count = Math.min(20, Math.max(1, Number(targetMocks) || 12));
  const exam = new Date(`${examDate}T12:00:00`);
  const windowStart = new Date(exam); windowStart.setDate(windowStart.getDate() - 56);
  const span = Math.max(1, Math.floor((exam.getTime() - windowStart.getTime()) / 86400000));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(windowStart);
    date.setDate(date.getDate() + Math.round(((index + 1) * span) / (count + 1)));
    return date.toISOString().slice(0, 10);
  });
}
export function formatExamWindow(config) {
  const normalized = normalizeExamConfig(config);
  const month = new Date(normalized.attemptYear, normalized.attemptMonth - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();
  const level = normalized.level === 'l1' ? 'CFA LEVEL I' : normalized.level === 'l2' ? 'CFA LEVEL II' : `CFA LEVEL III (${normalized.pathway.replace(/([A-Z])/g, ' $1').toUpperCase()})`;
  return `${level} · ${month}`;
}