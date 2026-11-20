import { lessonsByArea, matchesLesson } from './lib/lessons.mjs';
import { localRequest } from './lib/browser.mjs';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Bookmark, ClipboardList, Clock3, GraduationCap, History, LayoutDashboard, ListChecks, RotateCcw, Settings, Target } from 'lucide-react';
import { answerFor, chapters, fields, matches, optionsFor, publicationError, question, subjects, uniqueQuestions } from './lib/model.mjs';

const tabs = [
  ['chapters', '考科', BookOpen], ['bank', '練習', ListChecks], ['mock', '模擬考', Clock3],
  ['favorites', '收藏', Bookmark], ['wrong', '錯題', RotateCcw], ['history', '紀錄', History],
  ['home', '統計', LayoutDashboard], ['admin', '管理', Settings],
];
const lessonViews = [['points', '重點'], ['card', '記憶卡'], ['quiz', '練習題']];
const filterLabels = { year: '年度', exam: '甄試名稱', subject: '科目', topic: '主題' };
const labels = {
  year:'年度', exam:'甄試名稱', subject:'科目', topic:'章節／主題', number:'原始題號', kind:'題型', prompt:'題幹',
  options:'選項（以 | 分隔）', source:'原始試卷網址', page:'來源頁碼', official:'官方答案', answerSource:'官方答案來源網址',
  reference:'自編示範參考答案', explanation:'解析', verified:'資料核對狀態', reviewed:'解析審核狀態', demo:'自編示範題',
  rights:'重製使用依據', rightsDate:'重製條件確認日期', duplicate:'已確認的重複群組代號',
  examLaw:'考試當時適用法規', currentLaw:'目前法規是否需要重新核對', lawName:'法規名稱', article:'條號',
  lawVersion:'考試適用版本或日期', lawSource:'官方法規網址', lawDate:'法規核對日期',
};
const choices = {
  subject: subjects, kind: ['選擇','數字','文字','自我核對'], demo: ['是','否'],
  verified: ['待核對','已核對','不適用（自編）'], reviewed: ['待審核','已審核'],
  examLaw: ['待核對','已核對','不適用'], currentLaw: ['待核對','已核對','需重新核對','不適用'],
};
const empty = { questions: [], attempts: [], favorites: [], drafts: [] };
const date = value => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short' }).format(value);
function count(attempt, result) { return attempt.results?.filter(value => value === result).length || 0; }
function displayAnswer(item, value) {
  return item.kind === '選擇' ? optionsFor(item)[Number(value) - 1] || value : value;
}
function Link({ url, children }) {
  return /^https?:\/\//i.test(url) ? <a href={url} target="_blank" rel="noreferrer">{children}</a> : children;
}

export default function Study() {
  const [data, setData] = useState(empty);
  const [tab, setTab] = useState('chapters');
  const [areaIndex, setAreaIndex] = useState(0);
  const [lesson, setLesson] = useState(null);
  const [lessonView, setLessonView] = useState('points');
  const [flipped, setFlipped] = useState(false);
  const [chapterAttempt, setChapterAttempt] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({});
  const [limit, setLimit] = useState('');
  const [minutes, setMinutes] = useState('15');
  const [active, setActive] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [draft, setDraft] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [entry, setEntry] = useState(null);
  const requestInFlight = useRef(false);
  const lastAttempt = data.attempts.at(-1);
  const attempt = data.attempts.find(row => row.id === active);
  const item = attempt?.items[attempt.index];

  async function load() {
    try {
      const response = await localRequest();
      if (!response.ok) throw new Error('無法讀取資料庫。');
      setData(await response.json());
      setReady(true);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => {
    load();
    if (location.hash.startsWith('#attempt=')) {
      setActive(location.hash.slice(9));
      setTab('attempt');
    }
  }, []);

  const entryKey = attempt && item ? attempt.id + ':' + item.id : '';
  const value = entry?.key === entryKey ? entry.value : item ? attempt.responses[item.id] || '' : '';
  const setValue = value => setEntry({ key: entryKey, value });

  async function request(action, args = {}, form) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await localRequest({ action, ...args }, form);
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || '操作失敗。');
      setData(next);
      return next;
    } catch (err) { setError(err.message); }
    finally { requestInFlight.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (!attempt?.deadline || attempt.finished) return;
    const tick = () => {
      setClock(Date.now());
      if (Date.now() >= attempt.deadline && !requestInFlight.current) request('submit', { id: attempt.id });
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [attempt?.id, attempt?.deadline, attempt?.finished]);

  useEffect(() => {
    if (!item || item.kind === '選擇' || attempt.finished || value === (attempt.responses[item.id] || '')) return;
    const timer = setTimeout(() => {
      if (!requestInFlight.current) request('answer', { id: attempt.id, questionId: item.id, value });
    }, 450);
    return () => clearTimeout(timer);
  }, [item?.id, value, attempt, busy]);

  function navigate(next) {
    setError('');
    setTab(next);
    if (next !== 'attempt') history.replaceState(null, '', location.pathname);
    window.scrollTo(0, 0);
  }
  function openLesson(entry) {
    setLesson(entry);
    setLessonView('points');
    setFlipped(false);
    navigate('lesson');
  }

  function openAttempt(id) {
    setActive(id);
    setClock(Date.now());
    navigate('attempt');
    history.replaceState(null, '', '#attempt=' + id);
  }
  async function start(items, mode = '練習') {
    const next = await request('start', { ids: items.map(row => row.id), mode, minutes: Number(minutes) });
    if (!next) return;
    const id = next.attempts.at(-1).id;
    if (tab === 'lesson') setChapterAttempt({ id, lesson, areaIndex });
    openAttempt(id);
  }

  async function saveAnd(action, args = {}) {
    return request(action, { id: attempt.id, questionId: item.id, value, ...args });
  }

  const done = data.attempts.filter(row => row.finished).reverse();
  const wrong = new Map();
  for (const row of done) {
    row.items.forEach((entry, index) => {
      if (!wrong.has(entry.id) && row.results[index] !== null) wrong.set(entry.id, row.results[index] === false);
    });
  }
  const wrongItems = data.questions.filter(row => wrong.get(row.id));
  const savedItems = data.questions.filter(row => data.favorites.includes(row.id));
  const filtered = data.questions.filter(row => matches(row, filters));
  const mockItems = uniqueQuestions(filtered);
  const remaining = Math.max(0, Math.ceil(((attempt?.deadline || clock) - clock) / 1000));

  const area = chapters[areaIndex];
  const areaLessons = lessonsByArea[areaIndex];
  const nextLesson = lesson && areaLessons[areaLessons.indexOf(lesson) + 1];
  const lessonItems = lesson ? data.questions.filter(row => matchesLesson(row, lesson)) : [];
  const completed = new Set(done.flatMap(row => row.items.filter(item => row.responses[item.id]).map(item => item.id)));

  function favorite(row) {
    const saved = data.favorites.includes(row.id);
    return <button className={'icon-button ' + (saved ? 'saved' : '')} title={saved ? '取消收藏' : '收藏題目'}
      aria-label={saved ? '取消收藏' : '收藏題目'} aria-pressed={saved} disabled={busy}
      onClick={() => request('favorite', { id: row.id, enabled: !saved })}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'} /></button>;
  }

  function questionList(items, message) {
    return <div className="stack">{items.length ? items.map(row => <article className="card question-row" key={row.id}>
      <div className="grow"><div className="tags"><span>{row.subject}</span><span>{row.topic}</span>
        {row.demo === '是' && <span>自編示範題</span>}{row.duplicate && <span>重複 · {row.duplicate}</span>}</div>
        <h3>{row.prompt}</h3><p className="muted">{row.year ? row.year + ' 年 · ' : ''}{row.exam || '甄試名稱未提供'} · 第 {row.number} 題 · {row.verified}</p>
        <Meta item={row} />
      </div><div className="actions">{favorite(row)}<button className="button small" disabled={busy} onClick={() => start([row], tab === 'wrong' ? '錯題重練' : '練習')}>練習 <ArrowRight size={15}/></button></div>
    </article>) : <div className="card empty">{message}</div>}</div>;
  }

  function filterBar() {
    return <div className="card filter-grid">{Object.entries(filterLabels).map(([key, label]) => {
      const chapterNames = key === 'topic' ? chapters.map(row => row.name) : [];
      const values = [...new Set(data.questions.map(row => row[key] || '未提供'))].sort();
      const options = [...new Set([...chapterNames, ...values])];
      return <label key={key}>{label}<select aria-label={label} value={filters[key] || ''} onChange={event => setFilters({ ...filters, [key]: event.target.value })}>
        <option value="">全部</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
    })}</div>;
  }

  function historyList(rows) {
    return <div className="stack">{rows.length ? rows.map(row => <button className="card history-row" key={row.id} onClick={() => openAttempt(row.id)}>
      <span><strong>{row.mode}</strong><small>{date(row.started)} · {row.items.length} 題</small></span>
      <span>{row.finished ? '答對 ' + count(row, true) + ' 題' : '繼續作答'} <ArrowRight size={17}/></span>
    </button>) : <div className="empty card">完成練習後，作答紀錄會顯示在這裡。</div>}</div>;
  }

  function edit(row) {
    setDraft(row);
    setConfirmed(false);
  }

  return <div className="shell">
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={() => navigate('chapters')}><span><GraduationCap size={23}/></span>國貿自習室</button>
        <nav aria-label="主選單">{tabs.map(([key, label, Icon]) => <button key={key} onClick={() => navigate(key)}
          aria-current={tab === key || (key === 'chapters' && tab === 'lesson') ? 'page' : undefined}><Icon size={17}/>{label}</button>)}</nav>
      </div>
    </header>
    <main>
      <div className="content">
        {error && <div className="error" role="alert">{error} {!ready && <button onClick={load}>重新讀取</button>}</div>}
        {!ready ? <p role="status">讀取題庫中…</p> : <>
        {tab === 'home' && <>
          <section className="hero">
            <div className="hero-copy"><span className="hero-label"><GraduationCap size={18}/> 國貿丙級</span><h1>學習統計</h1>
              <p>複習學科與術科章節，透過逐題練習及限時模擬考掌握自己的進度。</p>
              <div className="actions"><button className="button light" onClick={() => navigate('bank')}>開始練習 <ArrowRight size={17}/></button><button className="outline light" onClick={() => navigate('chapters')}>瀏覽章節</button></div>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="orb"/><ClipboardList size={110} strokeWidth={1}/><span><Target size={27}/></span></div>
          </section>
          <h2>各科正確率</h2>
          <div className="metrics">{subjects.map(subject => {
            const grades = done.flatMap(row => row.results.filter((_, index) => row.items[index].subject === subject));
            const graded = grades.filter(value => value !== null);
            const accuracy = graded.length ? Math.round(100 * graded.filter(Boolean).length / graded.length) : null;
            return <section className="card metric" key={subject}><div className="metric-icon"><BookOpen size={21}/></div>
              <div className="grow"><h3>{subject}</h3><p className="muted">已評分 {graded.length} 題 · 未評分 {grades.length - graded.length} 題</p><progress aria-label={subject + '正確率'} max="100" value={accuracy ?? 0}/></div>
              <strong>{accuracy === null ? '—' : accuracy + '%'}</strong></section>;
          })}</div>
          <div className="section-title"><h2>近期作答紀錄</h2><button className="text-button" onClick={() => navigate('history')}>查看全部 <ArrowRight size={16}/></button></div>
          {historyList(data.attempts.slice(-4).reverse())}
        </>}
        {tab === 'chapters' && <>
          <h1>考科與章節</h1>
          <div className="study-switch" role="group" aria-label="考科">
            {chapters.map((row, index) => <button key={row.name} aria-pressed={index === areaIndex}
              onClick={() => setAreaIndex(index)}>{row.name}</button>)}
          </div>
          <section className="card study-panel">
            <div className="section-title"><h2>{area.name}</h2><span className="muted">{area.focus} · {areaLessons.length} 章</span></div>
            <div className="lesson-list">{areaLessons.map(row => {
              const items = data.questions.filter(item => matchesLesson(item, row));
              const answered = items.filter(item => completed.has(item.id)).length;
              return <button key={row.id} className="lesson-row" onClick={() => openLesson(row)}>
                <span><strong>{row.title}</strong><small>1 張記憶卡 · 已作答 {answered}／{items.length} 題</small></span>
                <ArrowRight size={18} aria-hidden="true"/>
              </button>;
            })}</div>
          </section>
        </>}
        {tab === 'lesson' && lesson && <>
          <button className="text-button back-link" onClick={() => navigate('chapters')}>返回考科總覽</button>
          <p className="muted">{area.name}</p>
          <h1>{lesson.title}</h1>
          <div className="study-switch" role="group" aria-label="章節內容">
            {lessonViews.map(([key, label]) => <button key={key} aria-pressed={lessonView === key} onClick={() => {
              setLessonView(key);
              setFlipped(false);
            }}>{label}{key === 'quiz' ? '（' + lessonItems.length + '）' : ''}</button>)}
          </div>
          {lessonView === 'points' && <section className="card study-panel">
            <h2>複習重點</h2>
            <ul className="chapter-points">{lesson.points.map(point => <li key={point}>{point}</li>)}</ul>
            {lesson.id === 'payments' && <table className="study-table">
              <caption>三種結算方式比較</caption>
              <thead><tr><th scope="col">方式</th><th scope="col">銀行的主要角色</th></tr></thead>
              <tbody>
                <tr><th scope="row">匯付</th><td>依付款人的指示移轉款項</td></tr>
                <tr><th scope="row">託收</th><td>按託收指示處理單據及交單</td></tr>
                <tr><th scope="row">信用狀</th><td>開狀行依信用狀條件對相符提示承擔付款義務</td></tr>
              </tbody>
            </table>}
            {lesson.id === 'freight' && <>
              <h3>空運計算示例</h3>
              <ol className="chapter-points">
                <li>題給實重 24 公斤，材積重量 30 公斤，按較大者計費。</li>
                <li>選出計費重量 30 公斤。</li>
                <li>套入每公斤 2 美元的費率，空運費為 30 × 2 = 60 美元。</li>
              </ol>
            </>}
            {['customs', 'ethics'].includes(lesson.id) && <p className="muted">法規適用條件待以主管機關最新公告核對。</p>}
          </section>}
          {lessonView === 'card' && <button type="button" className="card flashcard" onClick={() => setFlipped(!flipped)}>
            <span className="muted">{flipped ? '答案' : '問題'}</span>
            <strong>{lesson.card[flipped ? 1 : 0]}</strong>
            <span className="muted">{flipped ? '點擊返回問題' : '點擊翻面'}</span>
          </button>}
          {lessonView === 'quiz' && <section>
            <div className="section-title"><h2>本章練習</h2><button className="button" disabled={!lessonItems.length || busy}
              onClick={() => start(lessonItems)}>練習本章</button></div>
            {questionList(lessonItems, '本章尚無題目。')}
          </section>}
          {nextLesson && <div className="lesson-footer"><button className="outline" onClick={() => openLesson(nextLesson)}>下一章 · {nextLesson.title}</button></div>}
        </>}
        {tab === 'bank' && <><h1>題庫練習</h1>{filterBar()}<div className="section-title"><h2>{filtered.length} 道題目</h2>
          <button className="button" disabled={!filtered.length || busy} onClick={() => start(filtered)}>練習篩選結果 <ArrowRight size={16}/></button></div>
          {questionList(filtered, '沒有符合篩選條件的題目。')}</>}
        {tab === 'mock' && <><h1>限時模擬考</h1>{filterBar()}<form className="card mock" onSubmit={event => {
          event.preventDefault();
          const pool = [...mockItems];
          for (let index = pool.length - 1; index > 0; index--) {
            const other = Math.floor(Math.random() * (index + 1));
            [pool[index], pool[other]] = [pool[other], pool[index]];
          }
          start(pool.slice(0, Number(limit || Math.min(10, mockItems.length))), '模擬考');
        }}>
          <p>符合條件且去重後有 {mockItems.length} 題，可設定題數及練習時間。時間到會自動交卷。</p>
          <div className="form-pair"><label>題數<input type="number" min="1" max={Math.max(1, mockItems.length)} value={limit || (mockItems.length ? Math.min(10, mockItems.length) : '')} onChange={event => setLimit(event.target.value)}/></label>
            <label>時間（分鐘）<input type="number" min="1" max="180" value={minutes} onChange={event => setMinutes(event.target.value)}/></label></div>
          <button className="button" disabled={!mockItems.length || busy}>開始模擬考 <Clock3 size={17}/></button>
        </form>{lastAttempt && !lastAttempt.finished && lastAttempt.mode === '模擬考' && <button className="text-button" onClick={() => openAttempt(lastAttempt.id)}>繼續上次模擬考</button>}</>}
        {tab === 'wrong' && <><div className="section-title"><h1>錯題重練</h1><button className="button" disabled={!wrongItems.length || busy} onClick={() => start(wrongItems, '錯題重練')}>重練全部</button></div>{questionList(wrongItems, '最近一次評分答錯的題目會顯示在這裡。')}</>}
        {tab === 'favorites' && <><h1>收藏題目</h1>{questionList(savedItems, '使用題目旁的書籤按鈕收藏題目。')}</>}
        {tab === 'history' && <><h1>作答紀錄</h1>{historyList(data.attempts.slice().reverse())}</>}
        {tab === 'attempt' && !attempt && <div className="card empty">找不到作答紀錄。</div>}
        {tab === 'attempt' && attempt && !attempt.finished && <><div className="section-title"><h1>{attempt.mode}</h1>
          {attempt.deadline && <div className="timer"><Clock3 size={18}/>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</div>}</div>
          <div className="card attempt"><div className="section-title"><span>第 {attempt.index + 1} / {attempt.items.length} 題 · {item.subject} · {item.topic}</span>{favorite(item)}</div>
            {item.demo === '是' && <div className="tags"><span>自編示範題</span></div>}
            <h2>{item.prompt}</h2>
            {item.kind === '選擇' ? <fieldset className="options"><legend className="sr-only">選擇答案</legend>{optionsFor(item).map((option, index) => <label key={index} className={value === String(index + 1) ? 'selected' : ''}>
              <input type="radio" name={'answer-' + item.id} checked={value === String(index + 1)} disabled={busy} onChange={() => {
                const next = String(index + 1);
                setValue(next);
                request('answer', { id: attempt.id, questionId: item.id, value: next });
              }}/>{option}</label>)}</fieldset> : <label>你的作答<textarea value={value} maxLength={4000} onChange={event => setValue(event.target.value)}
                inputMode={item.kind === '數字' ? 'decimal' : 'text'}/></label>}
            <Meta item={item}/>
            <div className="pager" aria-label="跳至題號">{attempt.items.map((row, index) => <button key={row.id} disabled={busy}
              aria-current={index === attempt.index ? 'step' : undefined} className={attempt.responses[row.id] ? 'answered' : ''} onClick={() => saveAnd('move', { index })}>{index + 1}</button>)}</div>
            <div className="attempt-actions"><button className="outline" disabled={busy || attempt.index === 0} onClick={() => saveAnd('move', { index: attempt.index - 1 })}>上一題</button>
              <button className="outline" disabled={busy || attempt.index + 1 === attempt.items.length} onClick={() => saveAnd('move', { index: attempt.index + 1 })}>下一題</button>
              <button className="button" disabled={busy} onClick={() => saveAnd('submit')}>交卷 <ArrowRight size={16}/></button></div>
          </div></>}
        {tab === 'attempt' && attempt?.finished && <>
          <div className="section-title"><h1>作答結果</h1><div className="actions">
            {chapterAttempt?.id === attempt.id && <button className="outline" onClick={() => {
              setAreaIndex(chapterAttempt.areaIndex);
              openLesson(chapterAttempt.lesson);
              setLessonView('quiz');
            }}>回本章練習</button>}
            <button className="outline" onClick={() => navigate('history')}>作答紀錄</button></div></div>
          <div className="card result-summary"><span>答對 <strong>{count(attempt, true)}</strong> 題</span><span>答錯 <strong>{count(attempt, false)}</strong> 題</span><span>未評分 <strong>{count(attempt, null)}</strong> 題</span>
            <button className="button" disabled={busy || !count(attempt, false)} onClick={() => start(attempt.items.filter((_, index) => attempt.results[index] === false), '錯題重練')}>重練本次錯題</button></div>
          <div className="stack">{attempt.items.map((row, index) => <article className="card result" key={row.id}>
            <div className="section-title"><div className="tags"><span>{attempt.results[index] === null ? '未評分' : attempt.results[index] ? '答對' : '答錯'}</span>{row.demo === '是' && <span>自編示範題</span>}</div>{favorite(row)}</div>
            <h3>{row.prompt}</h3><p>你的作答　{displayAnswer(row, attempt.responses[row.id]) || '未作答'}</p>
            <p>{row.demo === '是' ? '示範參考答案' : '官方答案'}　{displayAnswer(row, answerFor(row)) || (row.demo === '是' ? '未提供' : '缺少官方答案')}</p>
            {row.answerSource && <p><Link url={row.answerSource}>查看官方答案來源</Link></p>}
            <p>解析（{row.reviewed}）　{row.explanation || '未提供'}</p><Meta item={row}/>
          </article>)}</div>
        </>}
        {tab === 'admin' && <><h1>題庫管理</h1>
          <form className="card upload" onSubmit={async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const next = await request(null, {}, new FormData(form));
            if (next) { form.reset(); edit(next.drafts.at(-1)); }
          }}><label>匯入 PDF 或 UTF-8 CSV<input type="file" name="file" accept=".pdf,.csv" required/></label>
            <div className="actions"><button className="button" disabled={busy}>匯入待校對</button><button type="button" className="outline" onClick={() => edit(question({ demo: '否' }))}>手動新增</button></div>
            <p className="muted">PDF 需有文字層。題庫與作答資料儲存在目前瀏覽器。匯入後請校對題目與答案，並確認重製使用條件。</p></form>
          <div className="editor-grid"><section className="stack"><h2>待校對（{data.drafts.length}）</h2>
            {data.drafts.map(row => <button key={row.id} className={'card draft-row ' + (draft?.id === row.id ? 'selected' : '')} onClick={() => edit(row)}>
              <strong>{row.prompt || '題幹待補'}</strong><small>{[row.file, row.location].filter(Boolean).join(' · ') || '手動編輯'}</small></button>)}
            <h2>已發布（{data.questions.length}）</h2>{data.questions.map(row => <button className="card draft-row" key={row.id} disabled={busy}
              onClick={async () => { const next = await request('edit', { id: row.id }); if (next) edit(next.drafts.find(entry => entry.questionId === row.id)); }}><strong>{row.prompt}</strong><small>版本 {row.version} · 編輯</small></button>)}
          </section>
          {draft && <form className="card editor" onSubmit={async event => {
            event.preventDefault();
            const next = await request('draft', { id: draft.id, fields: draft });
            if (next) edit(next.drafts.find(row => row.id === draft.id) || next.drafts.at(-1));
          }}><h2>校對題目</h2>
            {draft.original && <details open><summary>擷取原文</summary><pre>{draft.original}</pre></details>}
            <div className="form-pair">{fields.map(key => <label key={key} className={['prompt','explanation','options'].includes(key) ? 'wide' : ''}>{labels[key]}
              {choices[key] ? <select aria-label={labels[key]} value={draft[key]} onChange={event => { setConfirmed(false); setDraft({ ...draft, [key]: event.target.value }); }}>
                {!choices[key].includes(draft[key]) && <option>{draft[key]}</option>}{choices[key].map(option => <option key={option}>{option}</option>)}</select>
                : ['prompt','explanation','options'].includes(key) ? <textarea value={draft[key] || ''} onChange={event => { setConfirmed(false); setDraft({ ...draft, [key]: event.target.value }); }}/>
                : <input value={draft[key] || ''} onChange={event => { setConfirmed(false); setDraft({ ...draft, [key]: event.target.value }); }}/>}</label>)}</div>
            {draft.demo !== '是' && <p className="muted">{!draft.source && '缺少原始試卷網址。'} {!draft.official && '缺少官方答案。'}</p>}
            <p className="muted">選擇題答案填選項序號。確認是重複題後，請為各來源填入相同群組代號。</p>
            <p className="muted">{publicationError(draft)}</p>
            <label className="check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/>已檢查擷取內容及重製使用條件</label>
            <div className="actions"><button className="outline" disabled={busy}>儲存草稿</button><button type="button" className="button" disabled={busy || !confirmed || !!publicationError(draft)}
              onClick={async () => { const next = await request('publish', { id: draft.id, fields: draft, confirmed }); if (next) edit(null); }}>發布題目</button></div>
          </form>}</div>
        </>}
        </>}
      </div>
    </main>
  </div>;
}

function Meta({ item }) {
  return <details className="metadata"><summary>來源與法規</summary><dl>
    <div><dt>原始試卷</dt><dd>{item.source ? <Link url={item.source}>查看原始試卷</Link> : item.demo === '是' ? '不適用（自編）' : '缺少原始試卷網址'}</dd></div>
    <div><dt>出題資訊</dt><dd>{item.year || '年度未提供'} · {item.exam || '甄試名稱未提供'} · 第 {item.number} 題{item.page ? ' · 第 ' + item.page + ' 頁' : ''}</dd></div>
    <div><dt>資料核對</dt><dd>{item.verified}{item.demo !== '是' && !item.official ? ' · 缺少官方答案' : ''}</dd></div>
    <div><dt>考試當時適用法規</dt><dd>{item.examLaw}{item.lawName && <> · <Link url={item.lawSource}>{item.lawName} {item.article}</Link> · 版本 {item.lawVersion} · 核對日期 {item.lawDate}</>}</dd></div>
    <div><dt>目前法規是否需要重新核對</dt><dd>{item.currentLaw}</dd></div>
  </dl></details>;
}
