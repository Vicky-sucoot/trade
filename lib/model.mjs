export const subjects = ['學科', '術科'];
export const chapters = [
  { subject: '學科', name: '貿易流程', summary: '練習從詢價、報價、確認訂單到備貨出運。比較各階段常見文件的用途。' },
  { subject: '學科', name: '貿易單據', summary: '商業發票記載交易內容及金額。裝箱單著重箱數、包裝、重量與尺寸。' },
  { subject: '術科', name: '報價計算', summary: '先確認幣別與計量單位，再依題意計算單價乘數量、附加費及折扣。' },
  { subject: '術科', name: '單據填製', summary: '依題目提供的交易資料填寫欄位，完成後檢查數量、單位、幣別與原始資料是否一致。' },
];

export const fields = [
  'year', 'exam', 'subject', 'topic', 'number', 'kind', 'prompt', 'options',
  'source', 'page', 'official', 'answerSource', 'reference', 'explanation',
  'verified', 'reviewed', 'demo', 'rights', 'rightsDate', 'duplicate',
  'examLaw', 'currentLaw', 'lawName', 'article', 'lawVersion', 'lawSource', 'lawDate',
];

export const defaults = {
  exam: '', subject: '學科', kind: '選擇', verified: '待核對', reviewed: '待審核',
  demo: '是', rights: '', examLaw: '待核對', currentLaw: '待核對',
};

export function question(raw = {}) {
  return Object.fromEntries(fields.map(key => [key, String(raw[key] ?? defaults[key] ?? '').trim()]));
}

const examples = [
  ['學科','貿易流程','選擇','買方尚未下單，想了解單價和交貨期，通常會先做什麼？','發出詢價|製作裝箱單|安排到貨驗收|簽發收據','1','詢價用來取得價格、交期與交易條件。'],
  ['學科','貿易單據','選擇','哪一種單據通常會逐箱列出包裝件數及重量？','商業發票|裝箱單|詢價單|收據','2','裝箱單提供貨物的包裝明細，便於查驗及收貨。'],
  ['學科','貿易流程','選擇','報價標示有效期，買方逾期後仍想採購，應先做什麼？','沿用原價直接付款|請賣方確認報價是否仍有效|另填提單|自行修改報價','2','逾期後應向賣方確認價格及相關條件。'],
  ['術科','報價計算','數字','每件 18 美元，共 40 件。貨款總額是多少美元？','','720','18 × 40 = 720 美元。'],
  ['術科','報價計算','數字','貨款為 250 美元，另加 30 美元運費。合計多少美元？','','280','將 250 美元貨款與 30 美元運費相加。'],
  ['術科','單據填製','自我核對','一批貨共有 5 箱、每箱 12 件。請寫出裝箱單的包裝箱數和貨物總件數。','','5 箱，共 60 件','先填 5 箱，再用 5 × 12 算出總件數。'],
];

export const seed = {
  questions: examples.map(([subject, topic, kind, prompt, options, reference, explanation], index) => ({
    ...question({ subject, topic, kind, prompt, options, reference, explanation, exam: '自編示範', number: index + 1,
      rights: '自編', verified: '不適用（自編）', examLaw: '不適用', currentLaw: '不適用' }),
    id: 'demo-' + (index + 1), version: 1, published: true,
  })),
  favorites: [], attempts: [], drafts: [],
};

export function optionsFor(item) {
  return item.options.split('|').map(option => option.trim()).filter(Boolean);
}

export function answerFor(item) {
  return item.demo === '是' ? item.reference : item.official;
}

export function grade(item, response = '') {
  const answer = answerFor(item);
  if (!answer || item.kind === '自我核對') return null;
  const normalize = value => value.normalize('NFKC').trim().toLowerCase();
  if (item.kind === '數字') {
    const number = value => {
      const cleaned = normalize(value);
      return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned) ? Number(cleaned) : NaN;
    };
    return Number.isFinite(number(answer)) && number(answer) === number(response);
  }
  return normalize(response) === normalize(answer);
}

export function matches(item, filters) {
  return ['year', 'exam', 'subject', 'topic'].every(key => !filters[key] || (item[key] || '未提供') === filters[key]);
}

export function uniqueQuestions(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.duplicate) return true;
    if (seen.has(item.duplicate)) return false;
    seen.add(item.duplicate);
    return true;
  });
}

export function publicationError(item) {
  if (!item.prompt || !subjects.includes(item.subject) || !item.topic || !item.number) return '請填寫題幹、科目、主題及題號。';
  if (!['是', '否'].includes(item.demo)) return '請確認是否為自編示範題。';
  if (!['選擇','數字','文字','自我核對'].includes(item.kind)) return '請選擇題型。';
  if (item.kind === '選擇' && optionsFor(item).length < 2) return '選擇題至少需要兩個選項。';
  const answer = answerFor(item);
  if (answer && item.kind === '選擇' && (!/^[1-9]\d*$/.test(answer) || Number(answer) > optionsFor(item).length)) return '選擇題答案應為選項序號。';
  if (answer && item.kind === '數字' && !grade(item, answer)) return '數字題答案應為數字。';
  if (item.demo === '是' && (item.official || item.answerSource)) return '自編示範題請使用示範參考答案欄。';
  if (item.demo === '否' && (!item.year || !item.exam || !item.rights || !validDate(item.rightsDate))) return '歷屆題請填寫年度、甄試名稱、重製依據及確認日期。';
  if (item.official && !item.answerSource) return '請附官方答案來源，或將未確認的答案留空。';
  if ([item.lawName, item.article, item.lawVersion, item.lawSource, item.lawDate].some(Boolean)
    && !(item.lawName && item.article && item.lawVersion && validUrl(item.lawSource) && validDate(item.lawDate))) return '引用法規需填名稱、條號、適用版本、官方網址及核對日期。';
  if (!item.lawName && !['待核對', '不適用'].includes(item.examLaw)) return '已核對的適用法規需要完整引用資料。';
  if (item.currentLaw === '已核對' && !item.lawName) return '已核對的現行法規需要完整引用資料。';
  if (item.source && !validUrl(item.source)) return '試卷網址須使用 HTTP 或 HTTPS。';
  if (item.answerSource && !validUrl(item.answerSource)) return '答案來源網址須使用 HTTP 或 HTTPS。';
  return '';
}

function validUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function finish(attempt, now = Date.now()) {
  if (attempt.finished) return;
  attempt.finished = now;
  attempt.results = attempt.items.map(item => grade(item, attempt.responses[item.id]));
}
