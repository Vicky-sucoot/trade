import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { csvDrafts, pdfDrafts } from '../../../lib/import.mjs';
import { transact } from '../../../lib/store.mjs';

export const runtime = 'nodejs';
const run = promisify(execFile);

export async function POST(request: Request) {
  let path: string | undefined;
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) {
      return Response.json({ error: '請從本機管理頁匯入。' }, { status: 403 });
    }
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new Error('請上傳 10 MB 以內的 PDF 或 CSV。');
    const extension = file.name.toLowerCase().split('.').pop();
    let rows: Array<Record<string, string>>;
    if (extension === 'csv') {
      rows = csvDrafts(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
    } else if (extension === 'pdf') {
      path = join(tmpdir(), 'trade-study-' + crypto.randomUUID() + '.pdf');
      await writeFile(path, Buffer.from(await file.arrayBuffer()), { flag: 'wx', mode: 0o600 });
      try {
        const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', path, '-'], { timeout: 12000, maxBuffer: 4 * 1024 * 1024 });
        rows = pdfDrafts(stdout);
      } catch (error) {
        const failure = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
        if (failure.code === 'ENOENT') throw new Error('系統找不到 pdftotext，請安裝 Poppler。');
        if (failure.stderr || failure.killed) throw new Error('PDF 擷取失敗。請確認檔案可讀，或改用 CSV。');
        throw error;
      }
    } else {
      throw new Error('支援 UTF-8 CSV 與 PDF。');
    }
    if (rows.length > 1500) throw new Error('單次上限為 1,500 題，請分批匯入。');
    const batch = crypto.randomUUID();
    return Response.json(transact((state: { drafts: unknown[] }) => {
      state.drafts.push(...rows.map(row => ({ ...row, id: crypto.randomUUID(), file: file.name, batch })));
    }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '操作失敗。' }, { status: 400 });
  } finally {
    if (path) await unlink(path).catch(() => {});
  }
}
