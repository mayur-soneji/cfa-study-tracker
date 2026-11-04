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
const formatDate = value => { const d = parseDate(value); return Number.isNaN(d.getTime()) ? 'â€”' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
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
function completionSummary(reading) { return `${reading.title} Â· ${TOPIC_NAMES[reading.topicId]}`; }

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
  const saveReadingDialog = () => { if (!dialog?.reading) return; const numericHours = Number(dialog.hours); if (!dialog.date || !Number.isFinite(numericHours) || numericHours <= 0) { setDialog(prev => ({ ...prev, error: 'Study hours must be a positive number.' })); return; } if (dialog.existing?.status === 'completed') { setDialog(prev => ({ ...prev, error: 'This reading is already completed. Remove it from Topics before recording it again.' })); return; } const { reading, status, date } = dialog; const timestamp = new Date().toISOString(); setState(prev => { const next = migrateState(prev); const progressByTopic = { ...next.readingProgress, [reading.topicId]: { ...(next.readingProgress?.[reading.topicId] || {}) } }; const existing = progressByTopic[reading.topicId]?.[reading.number] || {}; const updatedProgress = createReadingProgress(existing, status, timestamp); if (!updatedProgress) return next; progressByTopic[reading.topicId][reading.number] = updatedProgress; const readingDone = { ...next.readingDone, [reading.topicId]: [...(next.readingDone?.[reading.topicId] || [])] }; const currentDone = new Set(readingDone[reading.topicId]); const logs = [...next.logs]; const session = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, date, hours: numericHours, topic: reading.topicId, readingId: reading.id, readingNumber: reading.number, readingTitle: reading.title, readingStatus: status }; if (status === 'completed') { currentDone.add(reading.number); next.completionDates = { ...next.completionDates, [reading.id]: date }; next.revis…3500 tokens truncated…? 'As readings are completed, the next tasks will appear here in due-date order.' : 'Your spaced-repetition queue is clear for this view.'}</p></div> : <div className="revisionList">{selectedRevisionTasks.map(task => <RevisionRow key={`${task.taskId}-${task.completedAt || ''}`} task={task} today={today} onComplete={markRevisionComplete} history={revisionFilter === 'Completed history'} />)}</div>}</section>}
    {tab === 'Topics' && <section className="panel"><div className="panelHead"><div><span className="sectionLabel">READING TRACKER</span><h2>Topics & readings</h2><p>Complete readings one at a time. Each completion asks for study time, stores a reading-linked session, and starts its revision cycle.</p></div><button className="ghost glassAction resetStudyButton" type="button" onClick={resetStudy}>Reset Study Data</button></div><div className="topicGrid readingTopicGrid">{topicStats.map(topic => <article className="topic readingTopicCard" key={topic.topicId}><div className="topicTop"><div><span className="topicTitle">{topic.name}</span><span>{topic.completed}/{topic.readings.length} readings Â· {topic.logged.toFixed(1)}h logged Â· {topic.hours}h planned</span></div></div><div className="topicModuleProgress" role="progressbar" aria-label={`${topic.name} reading completion`} aria-valuemin="0" aria-valuemax={topic.readings.length} aria-valuenow={topic.completed} aria-valuetext={`${topic.completed} of ${topic.readings.length} readings complete`}><span className="topicModuleTrack"><span className="topicModuleFill" style={{ width: `${topic.completed / topic.readings.length * 100}%` }} /></span><span className="topicModuleValue">{topic.completed}/{topic.readings.length}</span></div><ol className="topicReadingsList">{topic.readings.map(reading => { const done = state.readingDone?.[reading.topicId]?.includes(reading.number); const progress = state.readingProgress?.[reading.topicId]?.[reading.number]; const incompleteCount = Number(progress?.incompleteCount) || 0; const locked = incompleteCount >= 2 && !done; return <li key={reading.id} className={done ? 'isComplete' : locked ? 'isLockedIncomplete' : ''}><label className="topicReadingCheck"><input type="checkbox" checked={done} onChange={() => done ? confirmUncomplete(reading) : openCompletionDialog(reading, 'topics')} aria-label={`Reading ${reading.number}: ${reading.title}. ${done ? 'Completed' : locked ? 'Two incomplete attempts used' : 'Open'}.`} /><span className="topicReadingCheckBox" aria-hidden="true" /><span className="topicReadingNumber">Reading {String(reading.number).padStart(2, '0')}</span><span className="topicReadingTitle">{reading.title}</span><span className="topicReadingStatus">{done ? 'Completed' : locked ? '2 incomplete attempts' : incompleteCount ? 'Incomplete Â· 50% credit' : 'Open'}</span></label></li>; })}</ol></article>)}</div></section>}
    {tab === 'Study Log' && <section className="panel studyLogPanel"><div className="panelHead"><div><span className="sectionLabel">EXECUTION LOG</span><h2>Study Log</h2><p>Record completed or incomplete readings; every completed outcome remains linked to its revision schedule.</p></div><button className="ghost glassAction resetStudyButton" type="button" onClick={resetStudy}>Reset Study Data</button></div><div className="studyLogCompletionCta"><div><span className="sectionLabel">READING OUTCOME</span><strong>Log a completed or incomplete reading</strong><p>Choose the reading, study date, and hours in the dialog. Completion starts or resets its spaced-repetition schedule.</p></div><button className="primary" type="button" onClick={() => openCompletionDialog(ALL_READINGS.find(reading => state.readingProgress?.[reading.topicId]?.[reading.number]?.status !== 'completed') || ALL_READINGS[0], 'studyLog')}>Log reading outcome</button></div><div className="logStats"><KpiCard label="Total study" value={`${studyHours.toFixed(1)}h`} sub={`${state.logs.length} sessions`} tone="blue" /><KpiCard label="Completed readings" value={String(topicCompletedReadings)} sub={`of ${TOTAL_READINGS}`} tone="cyan" /><KpiCard label="Revision credit" value={`${readiness.revision.toFixed(2)}%`} sub="of 20%" tone="purple" /><KpiCard label="Study streak" value={`${streak}`} sub="active study days" tone="orange" /></div><div className="logList">{state.logs.length ? state.logs.map(log => <div className="logRow" key={log.id}><span>{formatDate(log.date)}</span><span className="logHoursValue">{Number(log.hours).toFixed(1)}h</span><span>{TOPIC_NAMES[log.topic] || log.topic}</span><span>{log.readingNumber ? `Reading ${String(log.readingNumber).padStart(2, '0')} Â· ${log.readingTitle || 'Reading'}` : 'Reading session'}</span><button type="button" onClick={() => deleteLog(log.id)} aria-label={`Delete study session from ${formatDate(log.date)}`}>Ã—</button></div>) : <div className="empty">No study sessions logged yet.</div>}</div></section>}
    {tab === 'Mocks' && <section className="panel mockPage"><div className="panelHead"><div><span className="sectionLabel">MOCK PRACTICE Â· 30%</span><h2>Mock score bank</h2><p>Each completed mock earns {formatMockReadinessWeight(state.mocks.length)}% of overall readiness, regardless of its score. The score remains for your record.</p></div><button className="ghost glassAction resetMocksButton" type="button" onClick={() => setState(prev => ({ ...prev, mocks: freshMocks() }))}>Reset mock data</button></div><div className="mockGrid">{state.mocks.map(mock => <article className={`mock ${mock.done ? 'mockDone' : ''}`} key={mock.id}><div className="mockTop"><div><span>MOCK {mock.id}</span></div><button type="button" className={`check ${mock.done ? 'done' : ''}`} aria-pressed={mock.done} onClick={() => toggleMock(mock.id)}>{mock.done ? 'âœ“' : ''}</button></div><div className="mockScore">{mock.done ? <><span className="mockScoreValue">{mock.score}%</span><span>{`+${formatMockReadinessWeight(state.mocks.length)}% readiness`}</span></> : <span>Not completed Â· {`+${formatMockReadinessWeight(state.mocks.length)}% available`}</span>}</div><button type="button" className="ghost mockAction" onClick={() => toggleMock(mock.id)}>{mock.done ? 'Mark incomplete' : 'Mark completed'}</button></article>)}</div></section>}
    {dialog?.kind === 'readingCompletion' && <ReadingDialog dialog={dialog} setDialog={setDialog} onSave={saveReadingDialog} topics={TOPICS} readingsFor={readingList} readingProgress={state.readingProgress} />}
    {dialog?.kind === 'uncompleteReading' && <div className="modalBackdrop" role="presentation"><div className="modal glassDialog" role="alertdialog" aria-modal="true" aria-labelledby="uncomplete-title"><span className="sectionLabel">REMOVE LINKED PROGRESS</span><h2 id="uncomplete-title">Uncheck this reading?</h2><p>This removes the readingâ€™s completion state, every Study Log session linked to Reading {String(dialog.reading.number).padStart(2, '0')}, its full revision schedule, completed revision history, and revision credit. Unrelated sessions stay untouched.</p><div className="dialogReadingSummary"><strong>Reading {String(dialog.reading.number).padStart(2, '0')}</strong><span>{completionSummary(dialog.reading)}</span></div><div className="modalActions"><button className="ghost" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger" type="button" onClick={() => doUncomplete(dialog.reading)}>Remove linked progress</button></div></div></div>}
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
      <div className="readingDialogHead"><div><span className="sectionLabel">{dialog.source === 'topics' ? 'TOPICS COMPLETION' : 'STUDY LOG'}</span><h2 id="reading-dialog-title">{dialog.source === 'topics' ? 'Complete this reading' : 'Record a reading outcome'}</h2><p>{TOPIC_NAMES[reading.topicId]} Â· Reading {String(reading.number).padStart(2, '0')} Â· {reading.title}</p></div><button className="modalClose" type="button" aria-label="Close" onClick={close}>Ã—</button></div>
      <form onSubmit={submit}>
        <div className="readingDialogFields">
          <label>Study date<input type="date" value={dialog.date} onChange={event => setField('date', event.target.value)} required /></label>
          <label>Study hours<input autoFocus type="number" min="0.25" step="0.25" value={dialog.hours} onChange={event => setField('hours', event.target.value)} placeholder="2.5" required /></label>
          <label>Topic<select value={reading.topicId} onChange={event => { const nextReadings = openReadingsFor(event.target.value); const nextReading = nextReadings[0]; const existing = readingProgress?.[event.target.value]?.[nextReading?.number]; setDialog(prev => ({ ...prev, reading: nextReading, existing, error: '' })); }}>{topics.filter(([id]) => openReadingsFor(id).length > 0).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Reading<select value={reading.number} onChange={event => { const next = readingsFor(reading.topicId).find(item => item.number === Number(event.target.value)); const existing = readingProgress?.[reading.topicId]?.[next?.number]; setDialog(prev => ({ ...prev, reading: next, existing, error: '' })); }}>{readingOptions.map(item => <option key={item.id} value={item.number}>Reading {String(item.number).padStart(2, '0')} â€” {item.title}</option>)}</select></label>
        </div>
        <div className="readingStatusGroup" role="group" aria-label="Reading completion status"><span className="readingStatusLabel">Reading outcome</span><div className="readingStatusOptions"><button type="button" className={dialog.status === 'completed' ? 'selected' : ''} onClick={() => setField('status', 'completed')}>Completed</button><button type="button" className={`${dialog.status === 'incomplete' ? 'selected' : ''} ${existingCount >= 2 ? 'disabled' : ''}`} disabled={existingCount >= 2} onClick={() => setField('status', 'incomplete')}>Incomplete</button></div>{existingCount === 1 && dialog.status === 'incomplete' && <p className="readingStatusHint">First incomplete attempt = 50% credit. A second incomplete attempt converts the two attempts to 25% + 25% credit.</p>}{existingCount >= 2 && dialog.status === 'completed' && <p className="readingStatusHint">Two incomplete attempts already used. Completion is still allowed.</p>}{dialog.error && <p className="readingStatusHint warning">{dialog.error}</p>}</div>
        <div className="readingDialogPreview"><span>Selected</span><strong>Reading {String(reading.number).padStart(2, '0')}</strong><p>{reading.title}</p><small>{dialog.status === 'completed' ? 'Completion date becomes the Revision base date.' : 'No revision tasks are created for an incomplete attempt.'}</small></div>
        <div className="modalActions"><button className="ghost" type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={!canSave}>{dialog.status === 'completed' ? 'Save & complete reading' : 'Save incomplete attempt'}</button></div>
      </form>
    </div>
  </div>;
}
function RevisionRow({ task, today, onComplete, history = false }) { const overdue = task.status !== 'completed' && task.dueDate < today; const earned = Number(task.rewardCredit || 0) > 0; const historyEarned = Number(task.earnedCredit || task.rewardCredit || 0) > 0; const canComplete = task.status !== 'completed' && task.dueDate <= today; return <article className={`revisionTaskRow ${overdue ? 'isOverdue' : ''} ${task.status === 'completed' ? 'isCompleted' : ''}`}><div className="revisionTaskMain"><div className="revisionTaskEyebrow"><span className={`revisionStatusDot ${task.status === 'completed' ? 'complete' : overdue ? 'overdue' : 'pending'}`} aria-hidden="true" />{task.reviewType}{task.reviewType === 'Retention review' ? <span className="retentionBadge">RETENTION</span> : null}</div><h3>Reading {String(task.readingNumber).padStart(2, '0')} Â· {task.readingTitle}</h3><p>{TOPIC_NAMES[task.topicId]} Â· Review {task.reviewNumber} Â· Completion base {formatDate(task.completionDate)}</p></div><div className="revisionTaskMeta"><span><small>{task.status === 'completed' ? 'Due date' : 'Due date'}</small><strong>{formatDate(task.dueDate)}</strong></span>{overdue && <span><small>Overdue</small><strong>{daysLate(task.dueDate, today)}d</strong></span>}<span><small>Reward</small><strong>{(history ? historyEarned : earned) ? `+${(history ? task.earnedCredit : task.rewardCredit).toFixed(4)}%` : 'Retention only'}</strong></span></div>{history ? <div className="revisionCompletionState"><span className="completedCheck">âœ“</span><span>{formatDate(task.completedAt)}</span><small>{historyEarned ? 'Credit earned' : 'Retention review Â· no extra credit'}</small></div> : <button className="primary revisionCompleteButton" type="button" disabled={!canComplete} onClick={() => onComplete(task)}>{canComplete ? 'Mark revised' : 'Not due yet'}</button>}</article>; }
function KpiCard({ label, value, sub, tone }) { return <article className={`card tone-${tone}`}><span>{label}</span><span className="kpiValue">{value}</span><span className="kpiSub">{sub}</span></article>; }
function ReadinessBar({ label, value, maximum, tone, detail }) {
  const progress = Math.min(100, Math.max(0, value / maximum * 100));
  return <article className={`readinessBar ${tone}`}><div className="readinessBarMeta"><span>{label}</span><strong>{value.toFixed(2)}% <small>/ {maximum}%</small></strong></div><div className="readinessBarTrack" role="progressbar" aria-label={`${label} readiness`} aria-valuemin="0" aria-valuemax={maximum} aria-valuenow={Number(value.toFixed(2))} aria-valuetext={`${value.toFixed(2)} of ${maximum} percent earned`}><span style={{ width: `${progress}%` }} /></div><p>{detail}</p></article>;
}

