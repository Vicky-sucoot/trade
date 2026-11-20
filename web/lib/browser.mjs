import { addMissingDemoQuestions, finish, seed } from './model.mjs';
import { change } from './change.mjs';
import { csvDrafts, pdfDrafts } from './import.mjs';

const key = 'trade-study-v1';

async function readPdf(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL('./assets/pdf.worker.mjs', location.href).href;
  const task = getDocument({
    data: await file.arrayBuffer(),
    cMapUrl: new URL('./assets/cmaps/', location.href).href,
    cMapPacked: true,
    isEvalSupported: false,
  });
  try {
    const document = await task.promise;
    if (document.numPages > 180) throw new Error('請將 PDF 分成每份 180 頁以內再匯入。');
    const pages = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const { items } = await page.getTextContent();
      let text = '';
      let previousY = null;
      for (const item of items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== null && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
        text += item.str + (item.hasEOL ? '\n' : '');
        previousY = y;
      }
      pages.push(text);
    }
    return pdfDrafts(pages.join('\f'));
  } finally {
    await task.destroy();
  }
}

async function importRows(file) {
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new Error('請上傳 10 MB 以內的 PDF 或 CSV。');
  const extension = file.name.toLowerCase().split('.').pop();
  let rows;
  if (extension === 'csv') rows = csvDrafts(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
  else if (extension === 'pdf') rows = await readPdf(file);
  else throw new Error('支援 UTF-8 CSV 與 PDF。');
  if (rows.length > 1500) throw new Error('單次上限為 1,500 題，請分批匯入。');
  const batch = crypto.randomUUID();
  return rows.map(row => ({ ...row, id: crypto.randomUUID(), file: file.name, batch }));
}

export async function localRequest(input, form) {
  try {
    const rows = form ? await importRows(form.get('file')) : null;
    const state = JSON.parse(localStorage.getItem(key)) || structuredClone(seed);
    addMissingDemoQuestions(state);
    const now = Date.now();
    for (const attempt of state.attempts) {
      if (attempt.deadline && attempt.deadline <= now) finish(attempt, now);
    }
    if (rows) state.drafts.push(...rows);
    else if (input) change(state, input, now);
    localStorage.setItem(key, JSON.stringify(state));
    return Response.json(state);
  } catch (error) {
    return Response.json({ error: error.name === 'QuotaExceededError'
      ? '瀏覽器儲存空間已滿，本次操作未儲存。'
      : error.message || '操作失敗。' }, { status: 400 });
  }
}
