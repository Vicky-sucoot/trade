export const subjects = ['學科', '術科'];
export const chapters = [
  {
    name: '貿易概論與流程',
    focus: '學科觀念',
    topics: ['貿易流程'],
    points: [
      '交易流程：沿著開發客戶、詢報價、訂約、備貨、出運、交單、收款的順序，辨認各階段的文件與參與者。',
      '進出口簽證與報關：練習辨識哪些貨品需要輸出入許可，再對照申報、查驗與放行的流程。',
      '貿易結算：比較匯付、託收與信用狀的付款時點、單據流向、銀行角色及買賣雙方風險。',
      '貿易法規與商業道德：辨認品名、價格及原產地申報的合規問題，複習誠實申報、保密與避免利益衝突。',
    ],
  },
  {
    name: '基礎貿易英文',
    focus: '學科字彙與句型',
    topics: ['貿易英文'],
    points: [
      '貿易條件：辨認 Incoterms® 的常見縮寫與指定港口或地點，搭配 delivery、risk、freight、insurance 理解交貨、風險及費用。',
      '進出口函電：依推銷、詢價、報價與催款區分寫信目的，掌握 inquiry、quotation、validity、overdue invoice 等常見字彙。',
      '句型練習：「Could you quote your best price and lead time?」用來詢問價格和交期。「Please let us know when payment will be made.」用來請對方確認付款時間。',
    ],
  },
  {
    name: '出口價格核算',
    focus: '術科計算',
    topics: ['報價計算'],
    points: [
      '海運與空運：依題給費率判斷計費單位。海運題先看重量或材積的計費條件，空運題比較實重與材積重量，再核對最低收費及附加費。',
      '保險費：先算投保金額，再乘以費率。如果題目以 CIF 價為投保基礎，換算時把投保成數及保費納入同一公式。',
      '出口報價：依指定貿易條件判斷應計入的成本、運費與保險費。換算前先確認幣別、匯率方向、總價或單價，以及進位方式。',
    ],
  },
  {
    name: '商業信用狀分析',
    focus: '術科條款判讀',
    topics: ['信用狀', '商業信用狀'],
    points: [
      '用信用狀找欄位：核對申請人、受益人、幣別、金額、數量容差及付款方式，區分即期與遠期。',
      '把日期放在同一條時間軸：分辨最遲裝運日、交單期限及信用狀到期日，再檢查交單地點與所需單據。',
      '銀行實務：辨認開狀行、通知行與保兌行的角色。依題目所指定的信用狀條款與 ICC 規則版本練習審單、辨認不符點及判斷是否需要改狀。',
    ],
  },
  {
    name: '貿易單據製作',
    focus: '術科填製',
    topics: ['貿易單據', '單據填製'],
    points: [
      '商業發票（Commercial Invoice）：練習填寫買賣雙方、品名、數量、單價、總額、幣別與貿易條件。',
      '包裝單（Packing List）：逐箱核對箱號、包裝件數、內裝數量、淨重、毛重與尺寸，再加總確認。',
      '匯票（Draft）：核對出票人、付款人、受款人、幣別、金額及付款期限。依題目指示填製，並與信用狀及發票交叉核對。',
    ],
  },
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
  ['學科','基礎貿易英文','選擇','買方想詢問價格與交期，哪一句最符合目的？','Please remit the overdue balance.|Could you quote your best price and lead time?|We confirm receipt of your payment.|Please find the packing list attached.','2','quote 意為報價，lead time 在此指交貨所需時間。'],
  ['術科','商業信用狀分析','選擇','某信用狀分別列有最遲裝運日與到期日。檢查貨物是否依時出運，應先將運輸單據上的裝運日期與哪一項比較？','到期日|開狀日|最遲裝運日|發票日','3','最遲裝運日用來核對裝運時點。交單時間則須另外對照交單期限及到期日。'],
];

export const seed = {
  questions: examples.map(([subject, topic, kind, prompt, options, reference, explanation], index) => ({
    ...question({ subject, topic, kind, prompt, options, reference, explanation, exam: '自編示範', number: index + 1,
      rights: '自編', verified: '不適用（自編）', examLaw: '不適用', currentLaw: '不適用' }),
    id: 'demo-' + (index + 1), version: 1, published: true,
  })),
  favorites: [], attempts: [], drafts: [],
};

export function addMissingDemoQuestions(state) {
  const ids = new Set(state.questions.map(item => item.id));
  state.questions.push(...seed.questions.filter(item => !ids.has(item.id)).map(item => ({ ...item })));
}

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
  const chapter = chapters.find(row => row.name === filters.topic);
  const topicMatches = !filters.topic || (item.topic || '未提供') === filters.topic || chapter?.topics.includes(item.topic);
  return Boolean(topicMatches) && ['year', 'exam', 'subject'].every(key => !filters[key] || (item[key] || '未提供') === filters[key]);
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
