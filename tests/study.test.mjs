import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { after, test } from 'node:test';
import { csvDrafts, pdfDrafts } from '../lib/import.mjs';
import { grade, publicationError, question, seed, uniqueQuestions } from '../lib/model.mjs';
import { change, transact } from '../lib/store.mjs';

const folder = mkdtempSync(join(tmpdir(), 'trade-test-'));
process.env.TRADE_DB = join(folder, 'test.sqlite');
after(() => rmSync(folder, { recursive: true, force: true }));

test('數字與選擇題評分、缺官方答案及自我核對', () => {
  assert.equal(grade(seed.questions[3], '７２０.０'), true);
  assert.equal(grade(seed.questions[3], '720 美元'), false);
  assert.equal(grade(seed.questions[0], '1'), true);
  assert.equal(grade(seed.questions[5], '5 箱，共 60 件'), null);
  assert.equal(grade(question({ demo: '否', reference: '1' }), '1'), null);
});

test('匯入保留原始資料，官方答案預設留空', () => {
  const [csv] = csvDrafts('prompt,number\n"第一行,含逗號\n第二行",4');
  assert.equal(csv.prompt, '第一行,含逗號\n第二行');
  assert.equal(csv.location, 'CSV 第 3 行');
  assert.equal(csv.demo, '否');
  const [pdf] = pdfDrafts('\f4. 這是哪份單據？\n(1) 裝箱單  (2) 收據\f');
  assert.equal(pdf.options, '裝箱單|收據');
  assert.equal(pdf.page, '2');
  assert.equal(pdf.official, '');
  assert.throws(() => pdfDrafts(' \f '), /沒有可擷取/);
});

test('發布檢查重製依據、答案來源與引用欄位', () => {
  const item = question({ demo: '否', prompt: '題目', topic: '貿易單據', number: '7', kind: '文字', year: '2025', exam: '測試試卷' });
  assert.match(publicationError(item), /重製/);
  const licensed = { ...item, rights: '測試用授權資料', rightsDate: '2026-11-20' };
  assert.equal(publicationError(licensed), '');
  assert.match(publicationError({ ...licensed, official: 'A' }), /答案來源/);
  assert.match(publicationError({ ...licensed, lawName: '測試欄位' }), /引用法規/);
  assert.match(publicationError({ ...licensed, rightsDate: '2026-02-30' }), /確認日期/);
});

test('不同試卷保留各自出處，模擬考抽題才去重', () => {
  const items = [{ id: 'a', duplicate: 'group', source: 'a' }, { id: 'b', duplicate: 'group', source: 'b' }];
  assert.equal(items.length, 2);
  assert.deepEqual(uniqueQuestions(items).map(item => item.id), ['a']);
});

test('作答歷史保留原題版本，逾時拒收新的答案', () => {
  const source = seed.questions[0];
  const { id } = change({ action: 'start', ids: [source.id], mode: '模擬考', minutes: 1 }).attempts.at(-1);
  change({ action: 'answer', id, questionId: source.id, value: source.reference });
  const draft = change({ action: 'edit', id: source.id }).drafts.at(-1);
  assert.throws(() => change({ action: 'publish', id: draft.id, fields: draft }), /使用條件/);
  change({ action: 'publish', id: draft.id, confirmed: true, fields: { ...draft, reference: '2' } });
  transact(state => { state.attempts[0].deadline = Date.now() - 1000; });
  const state = change({ action: 'answer', id, questionId: source.id, value: '2' });
  assert.equal(state.questions[0].version, 2);
  assert.equal(state.attempts[0].items[0].version, 1);
  assert.equal(state.attempts[0].responses[source.id], source.reference);
  assert.equal(state.attempts[0].results[0], true);
});
