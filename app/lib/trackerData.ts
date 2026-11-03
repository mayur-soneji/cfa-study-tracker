import { curriculumReadings, readingRanges, totalLearningModules } from "./curriculumReadings";

export const TRACKER_STORAGE_KEY = "cfa-l1-tracker-v10";
export const TRACKER_APP = "cfa-level-1-tracker";
export const TRACKER_SCHEMA_VERSION = 2;
export const REVISION_WEIGHT = 20;
export const REWARDED_REVISION_CREDIT = REVISION_WEIGHT / totalLearningModules / 3;

export interface MockRecord { id: number; date: string; score: string; done: boolean; completedAt: string; }
export interface StudyLog { id: string | number; date: string; hours: number; topic: string; focus: string; readingNumber?: number; readingTitle?: string; readingStatus?: "completed" | "incomplete"; }
export interface RevisionTask { taskId: string; readingId: string; topicId: string; readingNumber: number; readingTitle: string; completionDate: string; reviewNumber: number; reviewType: "Day 1" | "Day 7" | "Day 21" | "Retention review"; dueDate: string; status: "pending" | "completed"; completedAt: string; rewardCredit: number; }
export interface RevisionHistory extends RevisionTask { rewardCredit: number; }
export interface ReadingDone { [topicId: string]: number[]; }
export interface ReadingAttempt { status?: string; credit?: number; at?: string; }
export interface ReadingProgressEntry { status?: string; incompleteCount?: number; credit?: number; history?: ReadingAttempt[]; }
export interface ReadingProgress { [topicId: string]: { [readingNumber: string]: ReadingProgressEntry }; }
export interface TrackerState { schemaVersion: number; readDone: string[]; revDone: string[]; mocks: MockRecord[]; logs: StudyLog[]; rest: string[]; readingDone?: ReadingDone; readingProgress?: ReadingProgress; completionDates?: Record<string, string>; revisionTasks?: RevisionTask[]; revisionHistory?: RevisionHistory[]; revisionReadinessCredit?: number; }
export interface TrackerExport { schemaVersion: number; app: typeof TRACKER_APP; exportedAt: string; data: TrackerState; }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => dateKey(new Date());
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const addDays = (value: string, amount: number) => { const date = parseDate(value); date.setDate(date.getDate() + amount); return dateKey(date); };
const topicNames: Record<string, string> = { quantitativeMethods: "Quantitative Methods", financialStatementAnalysis: "Financial Statement Analysis", fixedIncome: "Fixed Income", corporateFinance: "Corporate Finance", equities: "Equities", economics: "Economics", portfolioConstruction: "Portfolio Construction", derivativesAndRiskManagement: "Derivatives and Risk Management", alternativeInvestments: "Alternative Investments", ethics: "Ethical and Professional Standards" };
const aliases: Record<string, string> = { quant: "quantitativeMethods", fsa1: "financialStatementAnalysis", fsa2: "financialStatementAnalysis", fi1: "fixedIncome", fi2: "fixedIncome", ci: "corporateFinance", equity: "equities", econ: "economics", pm: "portfolioConstruction", deriv: "derivativesAndRiskManagement", alts: "alternativeInvestments" };
const normalizeTopic = (value: unknown) => aliases[String(value)] || String(value || "");
const readingsFor = (topicId: string) => { const [start] = readingRanges[topicId as keyof typeof readingRanges] || [1]; return (curriculumReadings[topicId as keyof typeof curriculumReadings] || []).map((title, index) => ({ topicId, number: start + index, title, id: `${topicId}:${start + index}` })); };
const allReadings = Object.keys(topicNames).flatMap(readingsFor);
const readingById = Object.fromEntries(allReadings.map(reading => [reading.id, reading]));

function freshRevisionTasks(topicId: string, readingNumber: number, completionDate: string): RevisionTask[] {
  const reading = readingById[`${topicId}:${readingNumber}`];
  if (!reading) return [];
  return [
    { taskId: `${reading.id}:d1`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 1, reviewType: "Day 1", dueDate: addDays(completionDate, 1), status: "pending", completedAt: "", rewardCredit: REWARDED_REVISION_CREDIT },
    { taskId: `${reading.id}:d7`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 2, reviewType: "Day 7", dueDate: addDays(completionDate, 7), status: "pending", completedAt: "", rewardCredit: REWARDED_REVISION_CREDIT },
    { taskId: `${reading.id}:d21`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 3, reviewType: "Day 21", dueDate: addDays(completionDate, 21), status: "pending", completedAt: "", rewardCredit: REWARDED_REVISION_CREDIT },
    { taskId: `${reading.id}:r:${addDays(completionDate, 42)}`, readingId: reading.id, topicId, readingNumber, readingTitle: reading.title, completionDate, reviewNumber: 4, reviewType: "Retention review", dueDate: addDays(completionDate, 42), status: "pending", completedAt: "", rewardCredit: 0 },
  ];
}

const isMockRecord = (value: unknown): value is MockRecord => isObject(value) && typeof value.id === "number" && typeof value.date === "string" && typeof value.score === "string" && typeof value.done === "boolean" && typeof value.completedAt === "string";
const isStudyLog = (value: unknown): value is StudyLog => isObject(value) && (typeof value.id === "string" || typeof value.id === "number") && typeof value.date === "string" && typeof value.hours === "number" && Number.isFinite(value.hours) && typeof value.topic === "string" && typeof value.focus === "string" && (value.readingNumber === undefined || (typeof value.readingNumber === "number" && Number.isInteger(value.readingNumber))) && (value.readingTitle === undefined || typeof value.readingTitle === "string") && (value.readingStatus === undefined || value.readingStatus === "completed" || value.readingStatus === "incomplete");
const isRevisionTask = (value: unknown): value is RevisionTask => isObject(value) && typeof value.taskId === "string" && typeof value.readingId === "string" && typeof value.topicId === "string" && typeof value.readingNumber === "number" && typeof value.readingTitle === "string" && typeof value.completionDate === "string" && typeof value.reviewNumber === "number" && typeof value.reviewType === "string" && typeof value.dueDate === "string" && (value.status === "pending" || value.status === "completed") && typeof value.completedAt === "string" && typeof value.rewardCredit === "number" && Number.isFinite(value.rewardCredit);
const isRevisionHistory = (value: unknown): value is RevisionHistory => isRevisionTask(value) && typeof value.rewardCredit === "number" && Number.isFinite(value.rewardCredit);
const isReadingDone = (value: unknown): value is ReadingDone => isObject(value) && Object.values(value).every(items => Array.isArray(items) && items.every(item => typeof item === "number" && Number.isInteger(item) && item > 0));
const isReadingProgress = (value: unknown): value is ReadingProgress => isObject(value);

export function isTrackerState(value: unknown): value is TrackerState {
  if (!isObject(value)) return false;
  return typeof value.schemaVersion === "number" && Array.isArray(value.readDone) && value.readDone.every(item => typeof item === "string") && Array.isArray(value.revDone) && value.revDone.every(item => typeof item === "string") && Array.isArray(value.mocks) && value.mocks.every(isMockRecord) && Array.isArray(value.logs) && value.logs.every(isStudyLog) && Array.isArray(value.rest) && value.rest.every(item => typeof item === "string") && (value.readingDone === undefined || isReadingDone(value.readingDone)) && (value.readingProgress === undefined || isReadingProgress(value.readingProgress)) && (value.completionDates === undefined || isObject(value.completionDates)) && (value.revisionTasks === undefined || (Array.isArray(value.revisionTasks) && value.revisionTasks.every(isRevisionTask))) && (value.revisionHistory === undefined || (Array.isArray(value.revisionHistory) && value.revisionHistory.every(isRevisionHistory))) && (value.revisionReadinessCredit === undefined || (typeof value.revisionReadinessCredit === "number" && Number.isFinite(value.revisionReadinessCredit)));
}

function migrate(value: unknown): TrackerState {
  const source = isObject(value) ? value : {};
  const readDone = Array.isArray(source.readDone) ? [...new Set(source.readDone.map(normalizeTopic).filter(id => topicNames[id]))] : [];
  const logs: StudyLog[] = Array.isArray(source.logs) ? source.logs.filter(isStudyLog).map(log => ({ ...log, topic: normalizeTopic(log.topic) })).filter(log => log.hours > 0) : [];
  const readingProgress = isReadingProgress(source.readingProgress) ? source.readingProgress : {};
  const sourceReadingDone = isObject(source.readingDone) ? source.readingDone : {};
  const completionDates: Record<string, string> = isObject(source.completionDates) ? Object.fromEntries(Object.entries(source.completionDates).filter(([, value]) => typeof value === "string")) as Record<string, string> : {};
  const readingDone: ReadingDone = {};
  Object.keys(topicNames).forEach(topicId => {
    const known = Array.isArray(sourceReadingDone[topicId]) ? sourceReadingDone[topicId] : [];
    const progress = isObject(readingProgress[topicId]) ? readingProgress[topicId] : {};
    const inferred = Object.entries(progress).filter(([, item]) => isObject(item) && item.status === "completed").map(([number]) => Number(number));
    const topicComplete = readDone.includes(topicId) ? readingsFor(topicId).map(reading => reading.number) : [];
    readingDone[topicId] = [...new Set([...known, ...inferred, ...topicComplete].filter(item => typeof item === "number" && Number.isInteger(item)))].sort((a, b) => a - b);
  });
  const revisionTasks: RevisionTask[] = Array.isArray(source.revisionTasks) ? source.revisionTasks.filter(isRevisionTask) : [];
  allReadings.forEach(reading => {
    if (!readingDone[reading.topicId]?.includes(reading.number) || revisionTasks.some(task => task.readingId === reading.id)) return;
    const linked = logs.filter(log => log.topic === reading.topicId && log.readingNumber === reading.number && log.readingStatus === "completed").sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())[0];
    /* Migration note: v1 had no reading completion date. Prefer an exact linked completion-session date; otherwise anchor once to today's date rather than inventing an older date. */
    const completionDate = completionDates[reading.id] || linked?.date || today();
    completionDates[reading.id] = completionDate;
    revisionTasks.push(...freshRevisionTasks(reading.topicId, reading.number, completionDate));
  });
  const revisionHistory: RevisionHistory[] = Array.isArray(source.revisionHistory) ? source.revisionHistory.filter(isRevisionHistory) : [];
  const mocks = Array.isArray(source.mocks) && source.mocks.every(isMockRecord) ? source.mocks : [];
  const rest = Array.isArray(source.rest) ? source.rest.filter(item => typeof item === "string") : [];
  const credit = revisionTasks.reduce((sum, task) => sum + (task.status === "completed" ? task.rewardCredit : 0), 0);
  return { schemaVersion: TRACKER_SCHEMA_VERSION, readDone, revDone: [], mocks, logs, rest, readingDone, readingProgress, completionDates, revisionTasks, revisionHistory, revisionReadinessCredit: Math.min(REVISION_WEIGHT, credit) };
}

export function readTrackerStateFromStorage(): TrackerState {
  if (typeof window === "undefined") throw new Error("Tracker data is only available in the browser.");
  const raw = window.localStorage.getItem(TRACKER_STORAGE_KEY) || window.localStorage.getItem("cfa-l1-tracker-v9") || window.localStorage.getItem("cfa-l1-tracker-v8");
  if (!raw) return migrate(null);
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error("The saved tracker data is not valid JSON."); }
  const data = isObject(parsed) && "data" in parsed && parsed.data ? parsed.data : parsed;
  return migrate(data);
}

export function exportTrackerData(state: TrackerState): void {
  const migrated = migrate(state);
  const payload: TrackerExport = { schemaVersion: TRACKER_SCHEMA_VERSION, app: TRACKER_APP, exportedAt: new Date().toISOString(), data: migrated };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `cfa-level-1-tracker-${today()}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importTrackerData(file: File): Promise<TrackerState> {
  if (!file) throw new Error("No file selected."); const text = await file.text(); let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("The selected file is not valid JSON."); }
  if (!isObject(parsed) || parsed.app !== TRACKER_APP) throw new Error("This file is not a CFA Level I Tracker backup.");
  if (parsed.schemaVersion !== TRACKER_SCHEMA_VERSION && parsed.schemaVersion !== 1) throw new Error(`Unsupported backup version: ${String(parsed.schemaVersion)}.`);
  if (!isObject(parsed.data)) throw new Error("The backup contains no tracker data.");
  return migrate(parsed.data);
}

export function saveTrackerStateToStorage(state: TrackerState): void {
  if (typeof window === "undefined") throw new Error("Tracker data is only available in the browser.");
  window.localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(migrate(state)));
}
