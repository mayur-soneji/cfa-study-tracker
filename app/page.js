'use client';

import { useEffect, useMemo, useState } from 'react';
import { getActiveCurriculum } from './lib/curriculumReadings';
import { DEFAULT_EXAM_CONFIG, EXAM_CONFIG_KEY, availableAttemptMonths, formatExamWindow, normalizeExamConfig, storageKeyForConfig } from './lib/examConfig';

const STORE = 'cfa-l1-tracker-v10';
const LEGACY_STORES = ['cfa-l1-tracker-v9', 'cfa-l1-tracker-v8'];
const SCHEMA_VERSION = 2;
const PACE_START_KEY = 'cfa-tracker-first-used-at-v1';
const REVISION_WEIGHT = 20;
let curriculumReadings = {};
let readingRanges = {};
let totalLearningModules = 0;
let TOTAL_READINGS = 0;
let REWARDED_REVIEW_CREDIT = 0;
let TOPICS = [];
let TOPIC_NAMES = {};
let TOTAL_WEIGHT = 100;
let ALL_READINGS = [];
let READING_BY_ID = {};
let activeExamConfig = DEFAULT_EXAM_CONFIG;
function activateTracker(config) {
  activeExamConfig = normalizeExamConfig(config);
  const active = getActiveCurriculum(activeExamConfig.level, activeExamConfig.pathway);
  curriculumReadings = active.readings;
  readingRanges = active.readingRanges;
  totalLearningModules = active.totalLearningModules;
  TOTAL_READINGS = totalLearningModules;
  REWARDED_REVIEW_CREDIT = REVISION_WEIGHT / TOTAL_READINGS / 3;
  TOPICS = active.topics;
  TOPIC_NAMES = Object.fromEntries(TOPICS.map(([id, name]) => [id, name]));
  TOTAL_WEIGHT = TOPICS.reduce((sum, topic) => sum + topic[4], 0);
  ALL_READINGS = TOPICS.flatMap(([topicId]) => readingList(topicId));
  READING_BY_ID = Object.fromEntries(ALL_READINGS.map(item => [item.id, item]));
}
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const TODAY = () => dateKey(new Date());
const RING_CIRCUMFERENCE = 2 * Math.PI * 46;
const ringArc = span => `${RING_CIRCUMFERENCE * span / 100} ${RING_CIRCUMFERENCE}`;
const ringOffset = start => -(RING_CIRCUMFERENCE * start / 100);
const parseDate = value => new Date(`${String(value)}T12:00:00`);
const formatDate = value => { const d = parseDate(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const addDays = (value, amount) => { const d = parseDate(value); d.setDate(d.getDate() + amount); return dateKey(d); };
const daysLate = (due, today) => Math.max(0, Math.floor((parseDate(today) - parseDate(due)) / 86400000));
const readingList = topicId => { const [start] = readingRanges[topicId] || [1]; return (curriculumReadings[topicId] || []).map((title, index) => ({ topicId, number: start + index, title, id: `${topicId}:${start + index}` })); };
const readingIdFor = (topicId, number) => `${topicId}:${number}`;
const freshMocks = () => Array.from({ length: activeExamConfig.targetMocks }, (_, index) => ({ id: index + 1, score: '', done: false, completedAt: '' }));
activateTracker(DEFAULT_EXAM_CONFIG);
function emptyState() { return { schemaVersion: SCHEMA_VERSION, readDone: [], revDone: [], mocks: freshMocks(), logs: [], rest: [], readingDone: {}, readingProgress: {}, completionDates: {}, revisionTasks: [], revisionHistory: [], revisionReadinessCredit: 0 }; }
const normalizeTopic = value => ({ quant: 'quantitativeMethods', fsa1: 'financialStatementAnalysis', fsa2: 'financialStatementAnalysis', fi1: 'fixedIncome', fi2: 'fixedIncome', ci: 'corporateFinance', equity: 'equities', econ: 'economics', pm: 'portfolioConstruction', deriv: 'derivativesAndRiskManagement', alts: 'alternativeInvestments', ethics: 'ethics' }[value] || value);
function buildSchedule(topicId, readingNumber, completionDate) { const reading = READING_BY_ID[readingIdFor(topicId, readingNumber)]; if (!reading || !completionDate) return []; return [
  { taskId: `${reading.id}:d1`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 1, reviewType: 'Day 1', dueDate: addDays(completionDate, 1), status: 'pending', completedAt: '', rewardCredit: REWARDED_REVIEW_CREDIT },
  { taskId: `${reading.id}:d7`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 2, reviewType: 'Day 7', dueDate: addDays(completionDate, 7), status: 'pending', completedAt: '', rewardCredit: REWARDED_REVIEW_CREDIT },
  { taskId: `${reading.id}:d21`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 3, reviewType: 'Day 21', dueDate: addDays(completionDate, 21), status: 'pending', completedAt: '', rewardCredit: REWARDED_REVIEW_CREDIT },
  { taskId: `${reading.id}:r:${addDays(completionDate, 42)}`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 4, reviewType: 'Retention review', dueDate: addDays(completionDate, 42), status: 'pending', completedAt: '', rewardCredit: 0 },
]; }
function cleanLogs(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item, index) => {
    const topic = normalizeTopic(item.topic);
    const readingNumber = Number.isInteger(Number(item.readingNumber)) ? Number(item.readingNumber) : undefined;
    return {
      id: item.id ?? `${Date.now()}-${index}`,
      date: typeof item.date === 'string' ? item.date : TODAY(),
      hours: Number(item.hours) || 0,
      topic,
      readingId: typeof item.readingId === 'string' ? item.readingId : (readingNumber != null ? readingIdFor(topic, readingNumber) : undefined),
      readingNumber,
      readingTitle: typeof item.readingTitle === 'string' ? item.readingTitle : undefined,
      readingStatus: item.readingStatus === 'completed' || item.readingStatus === 'incomplete' ? item.readingStatus : undefined,
    };
  }).filter(item => item.hours > 0) : [];
}
function migrateState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}; const next = emptyState();
  next.readDone = Array.isArray(source.readDone) ? [...new Set(source.readDone.map(normalizeTopic).filter(id => TOPIC_NAMES[id]))] : [];
  const defaultMocks = freshMocks(); next.mocks = defaultMocks.map((fallback, index) => { const mock = Array.isArray(source.mocks) ? source.mocks[index] : null; return mock && typeof mock === 'object' ? { ...fallback, score: mock.score == null ? '' : String(mock.score), done: Boolean(mock.done), completedAt: typeof mock.completedAt === 'string' ? mock.completedAt : '' } : fallback; }); next.logs = cleanLogs(source.logs); next.rest = Array.isArray(source.rest) ? source.rest.filter(x => typeof x === 'string') : [];
  next.readingDone = source.readingDone && typeof source.readingDone === 'object' ? Object.fromEntries(Object.entries(source.readingDone).map(([id, nums]) => [normalizeTopic(id), Array.isArray(nums) ? [...new Set(nums.map(Number).filter(Number.isInteger))] : []])) : {};
  next.readingProgress = source.readingProgress && typeof source.readingProgress === 'object' ? source.readingProgress : {};
  next.completionDates = source.completionDates && typeof source.completionDates === 'object' ? source.completionDates : {};
  next.revisionHistory = Array.isArray(source.revisionHistory) ? source.revisionHistory : [];
  next.revisionTasks = Array.isArray(source.revisionTasks) ? source.revisionTasks.filter(task => task && task.taskId && task.readingId && task.dueDate).map(task => ({ ...task, status: task.status === 'completed' ? 'completed' : 'pending', completedAt: typeof task.completedAt === 'string' ? task.completedAt : '', rewardCredit: Number.isFinite(Number(task.rewardCredit)) ? Number(task.rewardCredit) : 0 })) : [];
  const doneByTopic = {};
  TOPICS.forEach(([topicId]) => {
    const existing = Array.isArray(next.readingDone[topicId]) ? [...next.readingDone[topicId]] : []; const progress = next.readingProgress[topicId];
    if (progress && typeof progress === 'object') Object.entries(progress).forEach(([number, entry]) => { if (entry?.status === 'completed') existing.push(Number(number)); });
    if (next.readDone.includes(topicId)) readingList(topicId).forEach(reading => existing.push(reading.number));
    doneByTopic[topicId] = [...new Set(existing.filter(Number.isInteger))].sort((a, b) => a - b);
  });
  next.readingDone = doneByTopic;
  /* Migration note: old tracker versions had topic/block completion but no reading completion date. For any inferred completed reading, use today's date once as a conservative anchor. */
  ALL_READINGS.forEach(reading => {
    if (!next.readingDone[reading.topicId]?.includes(reading.number)) return;
    if (!next.completionDates[reading.id]) {
      const linked = next.logs.filter(log => log.topic === reading.topicId && Number(log.readingNumber) === reading.number && log.readingStatus === 'completed').sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];
      next.completionDates[reading.id] = linked?.date || TODAY();
    }
    if (!next.revisionTasks.some(task => task.readingId === reading.id)) next.revisionTasks.push(...buildSchedule(reading.topicId, reading.number, next.completionDates[reading.id]));
  });
  next.readDone = TOPICS.filter(([topicId]) => (next.readingDone[topicId] || []).length === readingList(topicId).length).map(([topicId]) => topicId);
  next.revDone = []; next.revisionReadinessCredit = next.revisionTasks.reduce((sum, task) => sum + (task.status === 'completed' ? Number(task.rewardCredit || 0) : 0), 0); next.schemaVersion = SCHEMA_VERSION; return next;
}
function dueToday(tasks, today) { return tasks.filter(task => task.status !== 'completed' && task.dueDate === today); }
function overdueTasks(tasks, today) { return tasks.filter(task => task.status !== 'completed' && task.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); }
function upcomingTasks(tasks, today) { const end = addDays(today, 7); return tasks.filter(task => task.status !== 'completed' && task.dueDate > today && task.dueDate <= end).sort((a, b) => a.dueDate.localeCompare(b.dueDate)); }
function readinessFromState(state) {
  const first = ALL_READINGS.reduce((sum, reading) => { const done = state.readingDone?.[reading.topicId]?.includes(reading.number); const topic = TOPICS.find(item => item[0] === reading.topicId); const topicWeight = topic?.[4] || 0; const topicCount = readingList(reading.topicId).length || 1; return sum + (done ? (topicWeight / TOTAL_WEIGHT) * 50 / topicCount : 0); }, 0);
  const revision = Math.min(REVISION_WEIGHT, (state.revisionTasks || []).reduce((sum, task) => sum + (task.status === 'completed' ? Number(task.rewardCredit || 0) : 0), 0)); const mockSlots = Math.max(1, (state.mocks || []).length || activeExamConfig.targetMocks); const completedMocks = (state.mocks || []).filter(mock => mock.done).length; const mocks = Math.min(30, completedMocks / mockSlots * 30); return { first, revision, mocks, total: first + revision + mocks };
}
function formatMockReadinessWeight(mockCount) { const weight = 30 / Math.max(1, mockCount); return Number.isInteger(weight) ? String(weight) : weight.toFixed(2); }
function sameReading(log, topicId, readingNumber) {
  const readingId = readingIdFor(topicId, readingNumber);
  return log?.readingId === readingId || (log?.topic === topicId && Number(log?.readingNumber) === Number(readingNumber));
}
function removeReadingProgress(state, reading) {
  const logs = state.logs.filter(log => !sameReading(log, reading.topicId, reading.number));
  const readingDone = { ...state.readingDone, [reading.topicId]: (state.readingDone?.[reading.topicId] || []).filter(number => number !== reading.number) };
  const readingProgress = { ...state.readingProgress, [reading.topicId]: { ...(state.readingProgress?.[reading.topicId] || {}) } };
  delete readingProgress[reading.topicId][reading.number];
  const completionDates = { ...state.completionDates };
  delete completionDates[reading.id];
  const revisionTasks = state.revisionTasks.filter(task => task.readingId !== reading.id);
  const revisionHistory = state.revisionHistory.filter(item => item.readingId !== reading.id);
  const readDone = TOPICS.filter(([topicId]) => (readingDone[topicId] || []).length === readingList(topicId).length).map(([topicId]) => topicId);
  return {
    ...state, logs, readingDone, readingProgress, completionDates, revisionTasks, revisionHistory, readDone,
    revisionReadinessCredit: revisionTasks.reduce((sum, task) => sum + (task.status === 'completed' ? Number(task.rewardCredit || 0) : 0), 0),
  };
}
function createReadingProgress(existing, status, timestamp) { const count = Number(existing?.incompleteCount) || 0; if (status === 'incomplete' && count >= 2) return null; const nextCount = status === 'incomplete' ? count + 1 : count; const history = Array.isArray(existing?.history) ? [...existing.history] : []; if (status === 'completed') history.push({ status, credit: 1, at: timestamp }); else if (nextCount === 1) history.push({ status, credit: 0.5, at: timestamp }); else { const lastIncomplete = [...history].map((item, index) => [item, index]).reverse().find(([item]) => item?.status === 'incomplete'); if (lastIncomplete) history[lastIncomplete[1]] = { ...history[lastIncomplete[1]], credit: 0.25 }; history.push({ status, credit: 0.25, at: timestamp }); } return { status, incompleteCount: nextCount, credit: status === 'completed' ? 1 : 0.5, history }; }
function revisionRewardFor(task) { return task.reviewType === 'Retention review' ? 0 : REWARDED_REVIEW_CREDIT; }
function completionSummary(reading) { return `${reading.title} · ${TOPIC_NAMES[reading.topicId]}`; }

export default function Home() {
  const [tab, setTab] = useState('Dashboard'), [state, setState] = useState(emptyState()), [ready, setReady] = useState(false), [config, setConfig] = useState(DEFAULT_EXAM_CONFIG), [configReady, setConfigReady] = useState(false), [configOpen, setConfigOpen] = useState(false), [dialog, setDialog] = useState(null), [revisionFilter, setRevisionFilter] = useState('Due today'), [revisionSort, setRevisionSort] = useState('due'), [mockDialog, setMockDialog] = useState(null), [mockScore, setMockScore] = useState(''), [mockAttemptedDate, setMockAttemptedDate] = useState(TODAY()); const [trackerStartedAt, setTrackerStartedAt] = useState('');
  activateTracker(config);
  const storageKey = storageKeyForConfig(config);
  useEffect(() => { try { const saved = window.localStorage.getItem(EXAM_CONFIG_KEY); const next = normalizeExamConfig(saved ? JSON.parse(saved) : DEFAULT_EXAM_CONFIG); setConfig(next); setConfigOpen(!next.onboardingComplete); } catch { setConfigOpen(true); } finally { setConfigReady(true); } }, []);
  useEffect(() => { if (!configReady) return; const fallback = TODAY(); try { const stored = window.localStorage.getItem(PACE_START_KEY); const start = /^\d{4}-\d{2}-\d{2}$/.test(stored || '') ? stored : fallback; if (!stored) window.localStorage.setItem(PACE_START_KEY, start); setTrackerStartedAt(start); } catch { setTrackerStartedAt(fallback); } }, [configReady]);
  useEffect(() => { if (!configReady) return; try { const raw = window.localStorage.getItem(storageKey) || (config.level === 'l1' ? LEGACY_STORES.map(key => window.localStorage.getItem(key)).find(Boolean) : null); const parsed = raw ? JSON.parse(raw) : {}; const migrated = migrateState(parsed); setState(migrated); window.localStorage.setItem(storageKey, JSON.stringify(migrated)); } catch { setState(emptyState()); } finally { setReady(true); } }, [storageKey, configReady]);
  useEffect(() => { if (!ready || !configReady) return; try { window.localStorage.setItem(storageKey, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION })); } catch {} }, [state, ready, storageKey, configReady]);
  const saveExamConfig = next => { const normalized = normalizeExamConfig({ ...next, onboardingComplete: true }); activateTracker(normalized); setState(prev => migrateState(prev)); setConfig(normalized); setReady(false); try { window.localStorage.setItem(EXAM_CONFIG_KEY, JSON.stringify(normalized)); } catch {} window.dispatchEvent(new Event("cfa-exam-config-change")); setConfigOpen(false); };
  const readiness = useMemo(() => readinessFromState(state), [state]); const today = TODAY(); const todayTasks = useMemo(() => dueToday(state.revisionTasks || [], today), [state.revisionTasks, today]); const overdue = useMemo(() => overdueTasks(state.revisionTasks || [], today), [state.revisionTasks, today]); const upcoming = useMemo(() => upcomingTasks(state.revisionTasks || [], today), [state.revisionTasks, today]); const completedHistory = useMemo(() => (state.revisionHistory || []).slice().sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))), [state.revisionHistory]); const selectedRevisionTasks = useMemo(() => revisionFilter === 'Due today' ? todayTasks : revisionFilter === 'Overdue' ? overdue : revisionFilter === 'Upcoming' ? upcoming.slice().sort((a, b) => revisionSort === 'due' ? a.dueDate.localeCompare(b.dueDate) : a.readingTitle.localeCompare(b.readingTitle)) : completedHistory, [revisionFilter, todayTasks, overdue, upcoming, completedHistory, revisionSort]);
  const studyHours = state.logs.reduce((sum, log) => sum + Number(log.hours || 0), 0); const topicStats = useMemo(() => TOPICS.map(topic => { const [topicId, name, dateRange, hours, weight] = topic; const readings = readingList(topicId); const completed = readings.filter(reading => state.readingDone?.[topicId]?.includes(reading.number)).length; const logged = state.logs.filter(log => log.topic === topicId).reduce((sum, log) => sum + Number(log.hours || 0), 0); return { topicId, name, dateRange, hours, weight, readings, completed, logged }; }), [state.readingDone, state.logs]);
  const streak = useMemo(() => { let count = 0; const cursor = new Date(); cursor.setHours(12, 0, 0, 0); for (let i = 0; i < 365; i += 1) { const key = cursor.toISOString().slice(0, 10); const active = state.logs.some(log => log.date === key && Number(log.hours) > 0); if (!active && !state.rest.includes(key)) break; if (active) count += 1; cursor.setDate(cursor.getDate() - 1); } return count; }, [state.logs, state.rest]);
  const openCompletionDialog = (reading, source = 'topics') => { const selectedReading = source === 'studyLog' ? (ALL_READINGS.find(item => state.readingProgress?.[item.topicId]?.[item.number]?.status !== 'completed') || reading) : reading; const existing = state.readingProgress?.[selectedReading.topicId]?.[selectedReading.number]; setDialog({ kind: 'readingCompletion', source, reading: selectedReading, status: 'completed', date: today, hours: '', error: '', existing }); };
  const saveReadingDialog = () => { if (!dialog?.reading) return; const numericHours = Number(dialog.hours); if (!dialog.date || !Number.isFinite(numericHours) || numericHours <= 0) { setDialog(prev => ({ ...prev, error: 'Study hours must be a positive number.' })); return; } if (dialog.existing?.status === 'completed') { setDialog(prev => ({ ...prev, error: 'This reading is already completed. Remove it from Topics before recording it again.' })); return; } const { reading, status, date } = dialog; const timestamp = new Date().toISOString(); setState(prev => { const next = migrateState(prev); const progressByTopic = { ...next.readingProgress, [reading.topicId]: { ...(next.readingProgress?.[reading.topicId] || {}) } }; const existing = progressByTopic[reading.topicId]?.[reading.number] || {}; const updatedProgress = createReadingProgress(existing, status, timestamp); if (!updatedProgress) return next; progressByTopic[reading.topicId][reading.number] = updatedProgress; const readingDone = { ...next.readingDone, [reading.topicId]: [...(next.readingDone?.[reading.topicId] || [])] }; const currentDone = new Set(readingDone[reading.topicId]); const logs = [...next.logs]; const session = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, date, hours: numericHours, topic: reading.topicId, readingId: reading.id, readingNumber: reading.number, readingTitle: reading.title, readingStatus: status }; if (status === 'completed') { currentDone.add(reading.number); next.completionDates = { ...next.completionDates, [reading.id]: date }; next.revisionTasks = [...next.revisionTasks.filter(task => task.readingId !== reading.id), ...buildSchedule(reading.topicId, reading.number, date)]; } else currentDone.delete(reading.number); readingDone[reading.topicId] = [...currentDone].sort((a, b) => a - b); const allCompleted = readingDone[reading.topicId].length === readingList(reading.topicId).length; const readDone = new Set(next.readDone); if (allCompleted) readDone.add(reading.topicId); else readDone.delete(reading.topicId); logs.unshift(session); return { ...next, readingProgress: progressByTopic, readingDone, readDone: [...readDone], logs }; }); setDialog(null); };
  const confirmUncomplete = reading => setDialog({ kind: 'uncompleteReading', reading, error: '' });
  const doUncomplete = reading => { setState(prev => removeReadingProgress(migrateState(prev), reading)); setDialog(null); };
  const markRevisionComplete = task => { if (!task || task.status === 'completed' || task.dueDate > today) return; const completedAt = today; setState(prev => { const next = migrateState(prev); const completedTask = { ...task, status: 'completed', completedAt }; const tasks = next.revisionTasks.map(item => item.taskId === task.taskId ? completedTask : item); const history = [{ ...completedTask, earnedCredit: revisionRewardFor(task) }, ...next.revisionHistory]; if (task.reviewType === 'Retention review') { const nextDue = addDays(task.dueDate, 21); tasks.push({ ...task, taskId: `${task.readingId}:r:${nextDue}`, reviewNumber: Number(task.reviewNumber || 4) + 1, reviewType: 'Retention review', dueDate: nextDue, status: 'pending', completedAt: '', rewardCredit: 0 }); } const credit = tasks.reduce((sum, item) => sum + (item.status === 'completed' ? Number(item.rewardCredit || 0) : 0), 0); return { ...next, revisionTasks: tasks, revisionHistory: history, revisionReadinessCredit: Math.min(REVISION_WEIGHT, credit) }; }); };
  const deleteLog = id => setState(prev => {
    const log = prev.logs.find(item => item.id === id);
    if (!log) return prev;
    const reading = log.readingId ? READING_BY_ID[log.readingId] : ALL_READINGS.find(item => sameReading(log, item.topicId, item.number));
    // A completed-reading log is the completion record, so deleting it clears the entire reading-linked record.
    if (reading && log.readingStatus === 'completed') return removeReadingProgress(migrateState(prev), reading);
    return { ...prev, logs: prev.logs.filter(item => item.id !== id) };
  });
  const resetStudy = () => { if (!window.confirm('Reset Study Data? This clears Study Log entries, reading completion/progress history, revision schedules/history/credit, and rest days.')) return; setState(prev => ({ ...emptyState(), mocks: prev.mocks.map(mock => ({ ...mock })) })); };
  const toggleMock = id => { const mock = state.mocks.find(item => item.id === id); if (!mock) return; if (mock.done) { setState(prev => ({ ...prev, mocks: prev.mocks.map(item => item.id === id ? { ...item, done: false, completedAt: '' } : item) })); return; } setMockScore(mock.score || ''); setMockAttemptedDate(TODAY()); setMockDialog(id); };
  const completeMock = () => { const score = Number(mockScore); if (mockDialog == null || !Number.isFinite(score) || score < 0 || score > 100) return; setState(prev => ({ ...prev, mocks: prev.mocks.map(item => item.id === mockDialog ? { ...item, score: String(score), done: true, completedAt: mockAttemptedDate } : item) })); setMockDialog(null); setMockScore(''); };
  const dueOrOverdueCount = todayTasks.length + overdue.length;
  const topicCompletedReadings = ALL_READINGS.filter(reading => state.readingDone?.[reading.topicId]?.includes(reading.number)).length;
  const nextReading = ALL_READINGS.find(reading => !state.readingDone?.[reading.topicId]?.includes(reading.number));
  const nextMock = state.mocks.find(mock => !mock.done);
  const pace = useMemo(() => {
    if (!trackerStartedAt) return null;
    const start = parseDate(trackerStartedAt);
    const elapsedDays = Math.max(0, Math.floor((parseDate(today) - start) / 86400000));
    if (elapsedDays < 7) return null;
    const exam = parseDate(config.examDate);
    const studyWindowDays = Math.max(1, Math.floor((exam - start) / 86400000));
    const planned = Math.min(100, Math.max(0, (elapsedDays / studyWindowDays) * 100));
    const delta = readiness.total - planned;
    if (Math.abs(delta) <= 2) return { tone: 'steady', label: 'On plan' };
    const amount = Math.abs(delta).toFixed(0) + '% ';
    return delta > 0
      ? { tone: 'ahead', label: '↑ ' + amount + 'ahead of plan' }
      : { tone: 'behind', label: '↓ ' + amount + 'behind plan' };
  }, [config.examDate, readiness.total, today, trackerStartedAt]);
  return <main className="shell appShell">
    <header className="topbar"><div><div className="eyebrow">{formatExamWindow(config)}</div><h1>Study Tracker</h1><p>Track first-pass completion, reading-level revision, study time, and mocks in one system.</p></div><div className="topbarActions"><button type="button" className="ghost examConfigTrigger" onClick={() => setConfigOpen(true)}>Configure exam</button><div className="count"><strong>{Math.max(0, Math.ceil((parseDate(config.examDate) - parseDate(today)) / 86400000))}</strong><span>days to exam</span></div></div></header>
    <nav className="nav" aria-label="Primary navigation">{[
      ['Dashboard', 'dashboard'], ['Revision', 'revision'], ['Topics', 'topics'], ['Study Log', 'study-log'], ['Mocks', 'mocks'],
    ].map(([item, tone]) => <button key={item} type="button" className={`${tab === item ? 'active ' : ''}nav-${tone}`} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === 'Dashboard' && <>
      <section className="readinessCommand" aria-labelledby="readiness-title">
        <div className="readinessCommandHead">
          <div><span className="sectionLabel">EXAM READINESS</span><h2 id="readiness-title">Today's exam readiness</h2><p>Progress signals from first-pass coverage, retention practice, and scored mock exams.</p></div>
          {pace && <span className={`paceChip ${pace.tone}`}>{pace.label}</span>}
        </div>
        <div className="readinessCommandMain">
          <div className="readinessDialCard">
            <div className="readinessGauge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Number(readiness.total.toFixed(2))} aria-label={`${readiness.total.toFixed(2)} percent exam readiness`}>
              <svg viewBox="0 0 120 72" aria-hidden="true">
                <defs><mask id="readiness-segments"><rect width="120" height="72" fill="#000" /><path pathLength="100" d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="butt" strokeDasharray="6.5 2" /></mask></defs>
                <path className="readinessGaugeTrack" pathLength="100" d="M 12 62 A 48 48 0 0 1 108 62" strokeDasharray="6.5 2" />
                <path className="readinessGaugeFill gauge-coverage" mask="url(#readiness-segments)" pathLength="100" d="M 12 62 A 48 48 0 0 1 108 62" strokeDasharray={`${readiness.first} 100`} strokeDashoffset="0" />
                <path className="readinessGaugeFill gauge-retention" mask="url(#readiness-segments)" pathLength="100" d="M 12 62 A 48 48 0 0 1 108 62" strokeDasharray={`${readiness.revision} 100`} strokeDashoffset={`-${readiness.first}`} />
                <path className="readinessGaugeFill gauge-mocks" mask="url(#readiness-segments)" pathLength="100" d="M 12 62 A 48 48 0 0 1 108 62" strokeDasharray={`${readiness.mocks} 100`} strokeDashoffset={`-${readiness.first + readiness.revision}`} />
              </svg>
            </div>
            <div className="readinessGaugeValue"><strong>{readiness.total.toFixed(2)}%</strong><span>readiness</span></div>
            <div className="readinessGaugeLegend" aria-label="Readiness categories">
              <span className="gauge-coverage"><i aria-hidden="true" />Coverage <b>{readiness.first.toFixed(2)}% / 50%</b></span>
              <span className="gauge-retention"><i aria-hidden="true" />Retention practice <b>{readiness.revision.toFixed(2)}% / 20%</b></span>
              <span className="gauge-mocks"><i aria-hidden="true" />Mock completion <b>{readiness.mocks.toFixed(2)}% / 30%</b></span>
            </div>
          </div>
          <div className="readinessActions">
            <button type="button" className="readinessAction readiness-action-first" onClick={() => setTab('Topics')}><span className="readinessActionIcon" aria-hidden="true">▱</span><span><strong>First pass</strong><small>{nextReading ? `Next: Reading ${nextReading.number} · ${nextReading.title}` : 'Every reading is complete'}</small></span><span className="readinessActionCta">Continue studying →</span></button>
            <button type="button" className="readinessAction readiness-action-practice" onClick={() => { setTab('Revision'); setRevisionFilter(overdue.length ? 'Overdue' : 'Due today'); }}><span className="readinessActionIcon" aria-hidden="true">↻</span><span><strong>Retention practice</strong><small>{dueOrOverdueCount ? `${dueOrOverdueCount} review${dueOrOverdueCount === 1 ? '' : 's'} ready to practise` : 'No reviews due today'}</small></span><span className="readinessActionCta">Open revision →</span></button>
            <button type="button" className="readinessAction readiness-action-mock" onClick={() => setTab('Mocks')}><span className="readinessActionIcon" aria-hidden="true">◉</span><span><strong>Mock completion</strong><small>{`${state.mocks.filter(mock => mock.done).length}/${state.mocks.length} mocks completed`}</small></span><span className="readinessActionCta">View mocks →</span></button>
          </div>
        </div>
      </section>
      <section className="panel revisionTodayPanel" aria-labelledby="dashboard-revisions-title"><div className="panelHead"><div><span className="sectionLabel">PRACTICE QUEUE</span><h2 id="dashboard-revisions-title">Today’s reviews</h2><p>{upcoming.length} due in the next 7 days beyond today. Complete late tasks without moving their original due dates.</p></div><button className="primary" type="button" onClick={() => { setTab('Revision'); setRevisionFilter('Due today'); }}>Open Revision</button></div>{todayTasks.length === 0 && overdue.length === 0 ? <div className="revisionEmpty"><div className="emptyIcon" aria-hidden="true">✓</div><h3>No reviews are due today.</h3><p>Keep the queue clean. Your next spaced-practice tasks will appear here automatically.</p></div> : <div className="revisionQueue">{overdue.length > 0 && <div className="queueGroup"><div className="queueGroupHead"><span>OVERDUE</span><strong>{overdue.length}</strong></div>{overdue.map(task => <RevisionRow key={task.taskId} task={task} today={today} onComplete={markRevisionComplete} />)}</div>}{todayTasks.length > 0 && <div className="queueGroup"><div className="queueGroupHead"><span>DUE TODAY</span><strong>{todayTasks.length}</strong></div>{todayTasks.map(task => <RevisionRow key={task.taskId} task={task} today={today} onComplete={markRevisionComplete} />)}</div>}</div>}<div className="upcomingCompact"><span><strong>{upcoming.length}</strong> upcoming in the next 7 days</span><button type="button" className="ghost" onClick={() => { setTab('Revision'); setRevisionFilter('Upcoming'); }}>View upcoming</button></div></section>
      <section className="panel activityPanel"><div className="panelHead"><div><span className="sectionLabel">EXECUTION</span><h3>Study activity</h3><p>{studyHours.toFixed(1)}h logged · {streak} day streak</p></div></div><div className="activitySummary"><div className="activityMetric"><strong>{state.logs.length}</strong><small>study sessions</small></div><div className="activityMetric"><strong>{topicCompletedReadings}</strong><small>readings complete</small></div><div className="activityMetric"><strong>{dueOrOverdueCount}</strong><small>reviews due or overdue</small></div></div></section>
    </>}
    {tab === 'Revision' && <section className="panel revisionPage"><div className="panelHead revisionPageHead"><div><span className="sectionLabel">SPACED REPETITION</span><h2>Revision workspace</h2><p>Every completed reading is scheduled for Day 1, Day 7, Day 21, then a rolling 21-day retention cycle.</p></div><div className="revisionReadinessBadge"><strong>{readiness.revision.toFixed(2)}%</strong><span>earned / 20%</span></div></div><div className="grid four revisionSummaryCards"><KpiCard label="Revision readiness" value={`${readiness.revision.toFixed(2)}%`} sub={`out of ${REVISION_WEIGHT}%`} tone="purple" /><KpiCard label="Due today" value={String(todayTasks.length)} sub="Ready to review now" tone="blue" /><KpiCard label="Overdue" value={String(overdue.length)} sub="Complete without losing the due date" tone="orange" /><KpiCard label="Next 7 days" value={String(upcoming.length)} sub="Upcoming revision tasks" tone="cyan" /></div><div className="revisionControls" role="toolbar" aria-label="Revision filters"><div className="tabStrip" role="tablist" aria-label="Revision sections">{['Due today', 'Overdue', 'Upcoming', 'Completed history'].map(filter => <button key={filter} type="button" role="tab" aria-selected={revisionFilter === filter} className={revisionFilter === filter ? 'selected' : ''} onClick={() => setRevisionFilter(filter)}>{filter}</button>)}</div>{revisionFilter === 'Upcoming' && <label>Sort<select value={revisionSort} onChange={event => setRevisionSort(event.target.value)}><option value="due">Due date</option><option value="reading">Reading title</option></select></label>}</div>{selectedRevisionTasks.length === 0 ? <div className="revisionEmpty large"><div className="emptyIcon" aria-hidden="true">{revisionFilter === 'Completed history' ? '↺' : '✓'}</div><h3>{revisionFilter === 'Completed history' ? 'No revision history yet.' : `No ${revisionFilter.toLowerCase()} revision tasks.`}</h3><p>{revisionFilter === 'Upcoming' ? 'As readings are completed, the next tasks will appear here in due-date order.' : 'Your spaced-repetition queue is clear for this view.'}</p></div> : <div className="revisionList">{selectedRevisionTasks.map(task => <RevisionRow key={`${task.taskId}-${task.completedAt || ''}`} task={task} today={today} onComplete={markRevisionComplete} history={revisionFilter === 'Completed history'} />)}</div>}</section>}
    {tab === 'Topics' && <section className="panel"><div className="panelHead"><div><span className="sectionLabel">READING TRACKER</span><h2>Topics & readings</h2><p>Complete readings one at a time. Each completion asks for study time, stores a reading-linked session, and starts its revision cycle.</p></div><button className="ghost glassAction resetStudyButton" type="button" onClick={resetStudy}>Reset Study Data</button></div><div className="topicGrid readingTopicGrid">{topicStats.map(topic => <article className="topic readingTopicCard" key={topic.topicId}><div className="topicTop"><div><span className="topicTitle">{topic.name}</span><span>{topic.completed}/{topic.readings.length} readings · {topic.logged.toFixed(1)}h logged · {topic.hours}h planned</span></div></div><div className="topicModuleProgress" role="progressbar" aria-label={`${topic.name} reading completion`} aria-valuemin="0" aria-valuemax={topic.readings.length} aria-valuenow={topic.completed} aria-valuetext={`${topic.completed} of ${topic.readings.length} readings complete`}><span className="topicModuleTrack"><span className="topicModuleFill" style={{ width: `${topic.completed / topic.readings.length * 100}%` }} /></span><span className="topicModuleValue">{topic.completed}/{topic.readings.length}</span></div><ol className="topicReadingsList">{topic.readings.map(reading => { const done = state.readingDone?.[reading.topicId]?.includes(reading.number); const progress = state.readingProgress?.[reading.topicId]?.[reading.number]; const incompleteCount = Number(progress?.incompleteCount) || 0; const locked = incompleteCount >= 2 && !done; return <li key={reading.id} className={done ? 'isComplete' : locked ? 'isLockedIncomplete' : ''}><label className="topicReadingCheck"><input type="checkbox" checked={done} onChange={() => done ? confirmUncomplete(reading) : openCompletionDialog(reading, 'topics')} aria-label={`Reading ${reading.number}: ${reading.title}. ${done ? 'Completed' : locked ? 'Two incomplete attempts used' : 'Open'}.`} /><span className="topicReadingCheckBox" aria-hidden="true" /><span className="topicReadingNumber">Reading {String(reading.number).padStart(2, '0')}</span><span className="topicReadingTitle">{reading.title}</span><span className="topicReadingStatus">{done ? 'Completed' : locked ? '2 incomplete attempts' : incompleteCount ? 'Incomplete · 50% credit' : 'Open'}</span></label></li>; })}</ol></article>)}</div></section>}
    {tab === 'Study Log' && <section className="panel studyLogPanel"><div className="panelHead"><div><span className="sectionLabel">EXECUTION LOG</span><h2>Study Log</h2><p>Record completed or incomplete readings; every completed outcome remains linked to its revision schedule.</p></div><button className="ghost glassAction resetStudyButton" type="button" onClick={resetStudy}>Reset Study Data</button></div><div className="studyLogCompletionCta"><div><span className="sectionLabel">READING OUTCOME</span><strong>Log a completed or incomplete reading</strong><p>Choose the reading, study date, and hours in the dialog. Completion starts or resets its spaced-repetition schedule.</p></div><button className="primary" type="button" onClick={() => openCompletionDialog(ALL_READINGS.find(reading => state.readingProgress?.[reading.topicId]?.[reading.number]?.status !== 'completed') || ALL_READINGS[0], 'studyLog')}>Log reading outcome</button></div><div className="logStats"><KpiCard label="Total study" value={`${studyHours.toFixed(1)}h`} sub={`${state.logs.length} sessions`} tone="blue" /><KpiCard label="Completed readings" value={String(topicCompletedReadings)} sub={`of ${TOTAL_READINGS}`} tone="cyan" /><KpiCard label="Revision credit" value={`${readiness.revision.toFixed(2)}%`} sub="of 20%" tone="purple" /><KpiCard label="Study streak" value={`${streak}`} sub="active study days" tone="orange" /></div><div className="logList">{state.logs.length ? state.logs.map(log => <div className="logRow" key={log.id}><span>{formatDate(log.date)}</span><span className="logHoursValue">{Number(log.hours).toFixed(1)}h</span><span>{TOPIC_NAMES[log.topic] || log.topic}</span><span>{log.readingNumber ? `Reading ${String(log.readingNumber).padStart(2, '0')} · ${log.readingTitle || 'Reading'}` : 'Reading session'}</span><button type="button" onClick={() => deleteLog(log.id)} aria-label={`Delete study session from ${formatDate(log.date)}`}>×</button></div>) : <div className="empty">No study sessions logged yet.</div>}</div></section>}
    {tab === 'Mocks' && <section className="panel mockPage"><div className="panelHead"><div><span className="sectionLabel">MOCK PRACTICE · 30%</span><h2>Mock score bank</h2><p>Each completed mock earns {formatMockReadinessWeight(state.mocks.length)}% of overall readiness, regardless of its score. The score remains for your record.</p></div><button className="ghost glassAction resetMocksButton" type="button" onClick={() => setState(prev => ({ ...prev, mocks: freshMocks() }))}>Reset mock data</button></div><div className="mockGrid">{state.mocks.map(mock => <article className={`mock ${mock.done ? 'mockDone' : ''}`} key={mock.id}><div className="mockTop"><div><span>MOCK {mock.id}</span></div><button type="button" className={`check ${mock.done ? 'done' : ''}`} aria-pressed={mock.done} onClick={() => toggleMock(mock.id)}>{mock.done ? '✓' : ''}</button></div><div className="mockScore">{mock.done ? <><span className="mockScoreValue">{mock.score}%</span><span>{`+${formatMockReadinessWeight(state.mocks.length)}% readiness`}</span></> : <span>Not completed · {`+${formatMockReadinessWeight(state.mocks.length)}% available`}</span>}</div><button type="button" className="ghost mockAction" onClick={() => toggleMock(mock.id)}>{mock.done ? 'Mark incomplete' : 'Mark completed'}</button></article>)}</div></section>}
    {dialog?.kind === 'readingCompletion' && <ReadingDialog dialog={dialog} setDialog={setDialog} onSave={saveReadingDialog} topics={TOPICS} readingsFor={readingList} readingProgress={state.readingProgress} />}
    {dialog?.kind === 'uncompleteReading' && <div className="modalBackdrop" role="presentation"><div className="modal glassDialog" role="alertdialog" aria-modal="true" aria-labelledby="uncomplete-title"><span className="sectionLabel">REMOVE LINKED PROGRESS</span><h2 id="uncomplete-title">Uncheck this reading?</h2><p>This removes the reading’s completion state, every Study Log session linked to Reading {String(dialog.reading.number).padStart(2, '0')}, its full revision schedule, completed revision history, and revision credit. Unrelated sessions stay untouched.</p><div className="dialogReadingSummary"><strong>Reading {String(dialog.reading.number).padStart(2, '0')}</strong><span>{completionSummary(dialog.reading)}</span></div><div className="modalActions"><button className="ghost" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger" type="button" onClick={() => doUncomplete(dialog.reading)}>Remove linked progress</button></div></div></div>}
    {mockDialog != null && <div className="modalBackdrop" role="presentation"><div className="modal glassDialog" role="dialog" aria-modal="true" aria-labelledby="mock-dialog-title"><span className="sectionLabel">COMPLETE MOCK {mockDialog}</span><h2 id="mock-dialog-title">Enter mock score</h2><p>Enter the score first, then choose when you attempted the mock. Today is selected by default.</p><label>Mock score (%)<input autoFocus type="number" min="0" max="100" value={mockScore} onChange={event => setMockScore(event.target.value)} placeholder="e.g. 72" /></label><label>Date attempted<input required type="date" value={mockAttemptedDate} onChange={event => setMockAttemptedDate(event.target.value)} /></label><div className="modalActions"><button className="ghost" type="button" onClick={() => { setMockDialog(null); setMockScore(''); }}>Cancel</button><button className="primary" type="button" disabled={mockScore === '' || !Number.isFinite(Number(mockScore)) || Number(mockScore) < 0 || Number(mockScore) > 100} onClick={completeMock}>Complete mock</button></div></div></div>}
    {configOpen && <ExamConfigDialog initial={config} onCancel={() => config.onboardingComplete && setConfigOpen(false)} onSave={saveExamConfig} />}
  </main>;
}
function ExamConfigDialog({ initial, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...initial, targetMocks: initial.onboardingComplete ? String(initial.targetMocks) : '' });
  const availableMonths = availableAttemptMonths(draft.attemptYear);
  const days = new Date(draft.attemptYear, draft.attemptMonth, 0).getDate();
  const canSave = Number.isInteger(Number(draft.targetMocks)) && Number(draft.targetMocks) >= 1 && Number(draft.targetMocks) <= 60;
  const updateSelection = changes => setDraft(current => ({ ...normalizeExamConfig({ ...current, ...changes }), targetMocks: current.targetMocks }));
  const setMonth = month => { if (!availableMonths.includes(month)) return; updateSelection({ attemptMonth: month, examDate: [draft.attemptYear, String(month).padStart(2, '0'), '15'].join('-') }); };
  const submit = event => { event.preventDefault(); if (canSave) onSave({ ...draft, targetMocks: Number(draft.targetMocks) }); };
  return <div className="modalBackdrop" role="presentation"><div className="modal glassDialog examConfigModal" role="dialog" aria-modal="true" aria-labelledby="exam-config-title" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (canSave) onSave({ ...draft, targetMocks: Number(draft.targetMocks) }); } }}><span className="sectionLabel">CFA STUDY TRACKER</span><h2 id="exam-config-title">Configure your CFA attempt</h2><p>Your progress is stored separately for each level and Level III pathway.</p><form onSubmit={submit}><div className="readingDialogFields"><label>CFA level<select value={draft.level} onChange={event => updateSelection({ level: event.target.value })}><option value="l1">Level I</option><option value="l2">Level II</option><option value="l3">Level III</option></select></label>{draft.level === 'l3' && <label>Level III pathway<select value={draft.pathway} onChange={event => updateSelection({ pathway: event.target.value })}><option value="portfolioManagement">Portfolio Management</option><option value="privateMarkets">Private Markets</option><option value="privateWealth">Private Wealth</option></select></label>}<label>Attempt year<select value={draft.attemptYear} onChange={event => updateSelection({ attemptYear: Number(event.target.value) })}>{[2026, 2027, 2028, 2029].map(year => <option key={year} value={year}>{year}</option>)}</select></label><label>Target mocks<input autoFocus required type="number" min="1" max="60" value={draft.targetMocks} onChange={event => setDraft(current => ({ ...current, targetMocks: event.target.value }))} placeholder="e.g. 12" /></label></div><div className="readingStatusGroup"><span className="readingStatusLabel">Attempt month</span><div className="readingStatusOptions attemptMonthOptions" style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (availableMonths.length || 1) + ', minmax(0, 1fr))', gap: '8px', width: '100%' }}>{availableMonths.map(month => <button key={month} type="button" className={draft.attemptMonth === month ? 'selected' : ''} onClick={() => setMonth(month)}>{new Date(2000, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' })}</button>)}</div></div><label>Exact exam date<input type="date" min={[draft.attemptYear, String(draft.attemptMonth).padStart(2, '0'), '01'].join('-')} max={[draft.attemptYear, String(draft.attemptMonth).padStart(2, '0'), String(days)].join('-')} value={draft.examDate} onChange={event => updateSelection({ examDate: event.target.value })} /></label><p className="readingStatusHint">{canSave ? 'Your ' + Number(draft.targetMocks) + ' mock slots will be evenly scheduled across the final eight weeks.' : 'Choose the number of mock exams you plan to take.'}</p><div className="modalActions">{initial.onboardingComplete && <button className="ghost" type="button" onClick={onCancel}>Cancel</button>}<button className="primary" type="submit" disabled={!canSave}>Save configuration</button></div></form></div></div>;
}

function ReadingDialog({ dialog, setDialog, onSave, topics, readingsFor, readingProgress }) {
  const reading = dialog.reading;
  const isCompleted = item => readingProgress?.[item.topicId]?.[item.number]?.status === 'completed';
  const openReadingsFor = topicId => readingsFor(topicId).filter(item => !isCompleted(item));
  const readingOptions = openReadingsFor(reading.topicId);
  const setField = (key, value) => setDialog(prev => ({ ...prev, [key]: value, error: '' }));
  const existingCount = Number(dialog.existing?.incompleteCount) || 0;
  const alreadyCompleted = dialog.existing?.status === 'completed';
  const close = () => setDialog(null);
  const canSave = Boolean(dialog.date && dialog.hours && Number(dialog.hours) > 0 && Number.isFinite(Number(dialog.hours)) && !alreadyCompleted);
  const submit = event => { event.preventDefault(); if (canSave) onSave(); };
  return <div className="modalBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal glassDialog readingLogModal" role="dialog" aria-modal="true" aria-labelledby="reading-dialog-title">
      <div className="readingDialogHead"><div><span className="sectionLabel">{dialog.source === 'topics' ? 'TOPICS COMPLETION' : 'STUDY LOG'}</span><h2 id="reading-dialog-title">{dialog.source === 'topics' ? 'Complete this reading' : 'Record a reading outcome'}</h2><p>{TOPIC_NAMES[reading.topicId]} · Reading {String(reading.number).padStart(2, '0')} · {reading.title}</p></div><button className="modalClose" type="button" aria-label="Close" onClick={close}>×</button></div>
      <form onSubmit={submit}>
        <div className="readingDialogFields">
          <label>Study date<input type="date" value={dialog.date} onChange={event => setField('date', event.target.value)} required /></label>
          <label>Study hours<input autoFocus type="number" min="0.25" step="0.25" value={dialog.hours} onChange={event => setField('hours', event.target.value)} placeholder="2.5" required /></label>
          <label>Topic<select value={reading.topicId} onChange={event => { const nextReadings = openReadingsFor(event.target.value); const nextReading = nextReadings[0]; const existing = readingProgress?.[event.target.value]?.[nextReading?.number]; setDialog(prev => ({ ...prev, reading: nextReading, existing, error: '' })); }}>{topics.filter(([id]) => openReadingsFor(id).length > 0).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Reading<select value={reading.number} onChange={event => { const next = readingsFor(reading.topicId).find(item => item.number === Number(event.target.value)); const existing = readingProgress?.[reading.topicId]?.[next?.number]; setDialog(prev => ({ ...prev, reading: next, existing, error: '' })); }}>{readingOptions.map(item => <option key={item.id} value={item.number}>Reading {String(item.number).padStart(2, '0')} — {item.title}</option>)}</select></label>
        </div>
        <div className="readingStatusGroup" role="group" aria-label="Reading completion status"><span className="readingStatusLabel">Reading outcome</span><div className="readingStatusOptions"><button type="button" className={dialog.status === 'completed' ? 'selected' : ''} onClick={() => setField('status', 'completed')}>Completed</button><button type="button" className={`${dialog.status === 'incomplete' ? 'selected' : ''} ${existingCount >= 2 ? 'disabled' : ''}`} disabled={existingCount >= 2} onClick={() => setField('status', 'incomplete')}>Incomplete</button></div>{existingCount === 1 && dialog.status === 'incomplete' && <p className="readingStatusHint">First incomplete attempt = 50% credit. A second incomplete attempt converts the two attempts to 25% + 25% credit.</p>}{existingCount >= 2 && dialog.status === 'completed' && <p className="readingStatusHint">Two incomplete attempts already used. Completion is still allowed.</p>}{dialog.error && <p className="readingStatusHint warning">{dialog.error}</p>}</div>
        <div className="readingDialogPreview"><span>Selected</span><strong>Reading {String(reading.number).padStart(2, '0')}</strong><p>{reading.title}</p><small>{dialog.status === 'completed' ? 'Completion date becomes the Revision base date.' : 'No revision tasks are created for an incomplete attempt.'}</small></div>
        <div className="modalActions"><button className="ghost" type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={!canSave}>{dialog.status === 'completed' ? 'Save & complete reading' : 'Save incomplete attempt'}</button></div>
      </form>
    </div>
  </div>;
}
function RevisionRow({ task, today, onComplete, history = false }) { const overdue = task.status !== 'completed' && task.dueDate < today; const earned = Number(task.rewardCredit || 0) > 0; const historyEarned = Number(task.earnedCredit || task.rewardCredit || 0) > 0; const canComplete = task.status !== 'completed' && task.dueDate <= today; return <article className={`revisionTaskRow ${overdue ? 'isOverdue' : ''} ${task.status === 'completed' ? 'isCompleted' : ''}`}><div className="revisionTaskMain"><div className="revisionTaskEyebrow"><span className={`revisionStatusDot ${task.status === 'completed' ? 'complete' : overdue ? 'overdue' : 'pending'}`} aria-hidden="true" />{task.reviewType}{task.reviewType === 'Retention review' ? <span className="retentionBadge">RETENTION</span> : null}</div><h3>Reading {String(task.readingNumber).padStart(2, '0')} · {task.readingTitle}</h3><p>{TOPIC_NAMES[task.topicId]} · Review {task.reviewNumber} · Completion base {formatDate(task.completionDate)}</p></div><div className="revisionTaskMeta"><span><small>{task.status === 'completed' ? 'Due date' : 'Due date'}</small><strong>{formatDate(task.dueDate)}</strong></span>{overdue && <span><small>Overdue</small><strong>{daysLate(task.dueDate, today)}d</strong></span>}<span><small>Reward</small><strong>{(history ? historyEarned : earned) ? `+${(history ? task.earnedCredit : task.rewardCredit).toFixed(4)}%` : 'Retention only'}</strong></span></div>{history ? <div className="revisionCompletionState"><span className="completedCheck">✓</span><span>{formatDate(task.completedAt)}</span><small>{historyEarned ? 'Credit earned' : 'Retention review · no extra credit'}</small></div> : <button className="primary revisionCompleteButton" type="button" disabled={!canComplete} onClick={() => onComplete(task)}>{canComplete ? 'Mark revised' : 'Not due yet'}</button>}</article>; }
function KpiCard({ label, value, sub, tone }) { return <article className={`card tone-${tone}`}><span>{label}</span><span className="kpiValue">{value}</span><span className="kpiSub">{sub}</span></article>; }
function ReadinessBar({ label, value, maximum, tone, detail }) {
  const progress = Math.min(100, Math.max(0, value / maximum * 100));
  return <article className={`readinessBar ${tone}`}><div className="readinessBarMeta"><span>{label}</span><strong>{value.toFixed(2)}% <small>/ {maximum}%</small></strong></div><div className="readinessBarTrack" role="progressbar" aria-label={`${label} readiness`} aria-valuemin="0" aria-valuemax={maximum} aria-valuenow={Number(value.toFixed(2))} aria-valuetext={`${value.toFixed(2)} of ${maximum} percent earned`}><span style={{ width: `${progress}%` }} /></div><p>{detail}</p></article>;
}
