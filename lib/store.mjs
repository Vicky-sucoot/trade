import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { seed, question, publicationError, finish } from './model.mjs';

let db;
function connection() {
  if (db) return db;
  const path = resolve(process.env.TRADE_DB || 'data/study.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS study (id INTEGER PRIMARY KEY, body TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO study VALUES (1, ?)').run(JSON.stringify(seed));
  return db;
}

/** @param {(state: any, now: number) => void} [operation] */
export function transact(operation = () => {}) {
  const database = connection();
  database.exec('BEGIN IMMEDIATE');
  try {
    const state = JSON.parse(database.prepare('SELECT body FROM study WHERE id = 1').get().body);
    const now = Date.now();
    for (const attempt of state.attempts) {
      if (attempt.deadline && attempt.deadline <= now) finish(attempt, now);
    }
    operation(state, now);
    database.prepare('UPDATE study SET body = ? WHERE id = 1').run(JSON.stringify(state));
    database.exec('COMMIT');
    return state;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function change(input) {
  return transact((state, now) => {
    const { action, id } = input;
    const published = state.questions.filter(item => item.published);
    const item = published.find(item => item.id === id);
    if (action === 'favorite' && item) {
      state.favorites = input.enabled ? [...new Set([...state.favorites, id])] : state.favorites.filter(value => value !== id);
      return;
    }
    if (action === 'start') {
      const { ids, minutes, mode } = input;
      if (!Array.isArray(ids) || !ids.length || !['練習','錯題重練','模擬考'].includes(mode)) throw new Error('請選擇題目。');
      if (mode === '模擬考' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)) throw new Error('請設定 1 至 180 分鐘。');
      const items = [...new Set(ids)].map(key => published.find(row => row.id === key));
      if (items.some(row => !row)) throw new Error('有題目已無法使用，請重新選題。');
      state.attempts.push({ id: crypto.randomUUID(), items, mode, responses: {}, index: 0, started: now,
        deadline: mode === '模擬考' ? now + minutes * 60000 : null });
      return;
    }
    if (['answer','move','submit'].includes(action)) {
      const attempt = state.attempts.find(row => row.id === id);
      if (!attempt) throw new Error('找不到作答紀錄。');
      if (attempt.finished) return;
      if (attempt.items.some(row => row.id === input.questionId) && typeof input.value === 'string') {
        attempt.responses[input.questionId] = input.value.slice(0, 4000);
      }
      if (action === 'submit') finish(attempt, now);
      if (action === 'move' && Number.isInteger(input.index) && attempt.items[input.index]) attempt.index = input.index;
      return;
    }
    if (action === 'draft' || action === 'publish') {
      const draft = state.drafts.find(row => row.id === id);
      if (!draft && id) throw new Error('找不到待校對項目。');
      const fields = question(input.fields);
      if (action === 'draft') {
        if (draft) Object.assign(draft, fields);
        else state.drafts.push({ ...fields, id: crypto.randomUUID(), original: '手動新增' });
        return;
      }
      if (input.confirmed !== true) throw new Error('請確認已檢查資料及使用條件。');
      const error = publicationError(fields);
      if (error) throw new Error(error);
      const previous = state.questions.find(row => row.id === draft?.questionId);
      const record = { ...fields, id: previous?.id || crypto.randomUUID(), version: (previous?.version || 0) + 1, published: true };
      if (previous) state.questions[state.questions.indexOf(previous)] = record;
      else state.questions.push(record);
      state.drafts = state.drafts.filter(row => row.id !== id);
      return;
    }
    if (action === 'edit' && item) {
      if (!state.drafts.some(row => row.questionId === id)) {
        state.drafts.push({ ...item, id: crypto.randomUUID(), questionId: id, original: item.prompt });
      }
      return;
    }
    throw new Error('無法執行這項操作。');
  });
}
