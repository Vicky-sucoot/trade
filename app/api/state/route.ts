import { change, transact } from '../../../lib/store.mjs';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json(transact(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return Response.json({ error: '操作需要 JSON 格式。' }, { status: 415 });
    }
    return Response.json(change(await request.json()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '操作失敗。' }, { status: 400 });
  }
}
