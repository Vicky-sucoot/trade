import { parse } from 'csv-parse/sync';
import { question } from './model.mjs';

export function csvDrafts(text) {
  const rows = parse(text, { bom: true, columns: true, skip_empty_lines: true, info: true });
  if (!rows.length) throw new Error('CSV 沒有資料列。');
  if (!Object.hasOwn(rows[0].record, 'prompt')) throw new Error('CSV 找不到 prompt 欄，請使用範本。');
  return rows.map(({ record, info }) => ({
    ...question({ demo: '否', ...record }), original: JSON.stringify(record, null, 2), location: 'CSV 第 ' + info.lines + ' 行',
  }));
}

export function pdfDrafts(text) {
  const rows = text.split('\f').flatMap((page, index) => {
    const content = page.trim();
    if (!content) return [];
    const parts = content.split(/(?=^\s*\d{1,4}[.．、)]\s*\S)/m).map(part => part.trim()).filter(Boolean);
    const numbered = parts.filter(part => /^\d{1,4}[.．、)]/.test(part));
    return (numbered.length ? numbered : [content]).map(original => {
      const match = original.match(/^(\d{1,4})[.．、)]\s*([\s\S]*)$/);
      const segments = (match?.[2] || original).split(/\s*(?:\([A-D1-4]\)|（[A-D1-4１-４]）)\s*/);
      return {
        ...question({ demo: '否', kind: segments.length > 2 ? '選擇' : '自我核對', prompt: segments[0],
          options: segments.slice(1).join('|'), number: match?.[1], page: index + 1 }),
        original, location: 'PDF 第 ' + (index + 1) + ' 頁',
      };
    });
  });
  if (!rows.length) throw new Error('PDF 沒有可擷取的文字。掃描件可改用 CSV 或手動輸入。');
  return rows;
}
