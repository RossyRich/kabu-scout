// カブスカウト 共通描画ロジック（デザイン案比較用）
// 本番 index.html のスクリプトと同一。data.js を ../ から読み込む前提。
(function () {
  const DATA = (window.KABU_DATA || []).slice();
  if (!DATA.length) return;

  let currentIdx = 0;
  let dirFilter = 'all';
  let query = '';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const DIR_LABEL = { up: '▲ 買い注目', down: '▼ 売り警戒', watch: '◆ 様子見' };
  const SIDE_LABEL = { buy: '▲ 買い方向', sell: '▼ 売り方向', avoid: '◆ 見送り' };
  const SIDE_DIR = { buy: 'up', sell: 'down', avoid: 'watch' };
  const CONF_FALLBACK = { '高': 75, '中': 55, '低': 25 };
  const confScore = (p) => (typeof p.confidenceScore === 'number')
    ? p.confidenceScore : (CONF_FALLBACK[p.confidence] || 0);
  const WD = ['日', '月', '火', '水', '木', '金', '土'];

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD[d.getDay()] + '）';
  }

  function renderDates() {
    $('#dates').innerHTML = DATA.map((d, i) =>
      '<button class="date-tab' + (i === currentIdx ? ' active' : '') + '" data-i="' + i + '">' +
      esc(fmtDate(d.targetDate)) + ' 分</button>'
    ).join('');
    $('#dates').querySelectorAll('.date-tab').forEach(btn => {
      btn.addEventListener('click', () => { currentIdx = +btn.dataset.i; dirFilter = 'all'; query = ''; render(); });
    });
  }

  function priceChip(day, code) {
    const pr = day.prices && day.prices[code];
    if (!code || !pr || !pr.close || pr.close === '不明') return '';
    const ch = pr.change || '';
    const cls = ch.indexOf('-') === 0 ? 'down' : (ch.indexOf('+') === 0 ? 'up' : '');
    return '<a class="price ' + cls + '" href="https://kabutan.jp/stock/chart/?code=' + esc(code) +
      '" target="_blank" rel="noopener" title="クリックでチャートを開く">' +
      '終値 ' + esc(pr.close) + '<span class="yen">円</span>' +
      (ch ? '<span class="chg">' + esc(ch) + '</span>' : '') + '</a>';
  }

  function itemMatches(item) {
    if (dirFilter !== 'all' && item.direction !== dirFilter) return false;
    if (query) {
      const hay = [item.code, item.name, item.tag, item.headline, item.detail].join(' ').toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  }

  function cardHTML(item, day) {
    const dir = DIR_LABEL[item.direction] ? item.direction : 'watch';
    const nameInner = item.code
      ? '<a href="https://kabutan.jp/stock/?code=' + esc(item.code) + '" target="_blank" rel="noopener">' + esc(item.name) + '</a>'
      : esc(item.name);
    const extLinks = item.code
      ? '<a href="https://kabutan.jp/stock/chart/?code=' + esc(item.code) + '" target="_blank" rel="noopener">チャート</a>' +
        '<a href="https://finance.yahoo.co.jp/quote/' + esc(item.code) + '.T" target="_blank" rel="noopener">Yahoo!板</a>'
      : '';
    const srcLinks = (item.sources || []).map(s =>
      '<a class="src" href="' + esc(s.url) + '" target="_blank" rel="noopener">出典: ' + esc(s.label) + '</a>'
    ).join('');
    return '<article class="card">' +
      '<div class="card-top">' +
        '<span class="dir ' + dir + '">' + DIR_LABEL[dir] + '</span>' +
        (item.code ? '<span class="code">' + esc(item.code) + '</span>' : '') +
        '<span class="name">' + nameInner + '</span>' +
        (item.tag ? '<span class="tag">' + esc(item.tag) + '</span>' : '') +
        priceChip(day, item.code) +
      '</div>' +
      '<div class="headline">' + esc(item.headline) + '</div>' +
      '<div class="detail">' + esc(item.detail) + '</div>' +
      '<div class="links">' + extLinks + srcLinks + '</div>' +
    '</article>';
  }

  function render() {
    renderDates();
    const d = DATA[currentIdx];
    $('#collected').textContent = d.date + ' ' + (d.collectedAt || '') + ' 収集';

    let html = '<div class="target"><h1>' + esc(fmtDate(d.targetDate)) + ' の寄り付きに向けて</h1>' +
      '<span class="sub">' + esc(d.date) + ' 夕方時点の情報</span></div>';

    const m = d.market || {};
    html += '<section class="market">' +
      '<div class="summary">' + esc(m.summary) + '</div>' +
      '<div class="points">' + (m.points || []).map(p =>
        '<div class="point"><div class="label">' + esc(p.label) + '</div>' +
        '<div class="value">' + esc(p.value) + '</div>' +
        '<div class="note">' + esc(p.note) + '</div></div>'
      ).join('') + '</div>' +
      '<div class="outlook"><div class="lbl">OUTLOOK — 翌営業日の見通し</div><p>' + esc(m.outlook) + '</p></div>' +
      ((d.themes && d.themes.length)
        ? '<div class="themes">' + d.themes.map(t => '<span class="theme-chip">' + esc(t) + '</span>').join('') + '</div>'
        : '') +
    '</section>';

    if (d.plans && d.plans.items && d.plans.items.length) {
      html += '<section class="plans">' +
        '<div class="plans-head"><span class="no">PLAN</span><h2>翌朝のトレードプラン（参考シナリオ）</h2></div>' +
        '<div class="plans-caution">複数の情報源の重なりから自動生成した参考シナリオです。投資助言ではありません。売買の判断と結果はご自身の責任で。</div>' +
        (d.plans.note ? '<div class="plan-note">' + esc(d.plans.note) + '</div>' : '') +
        d.plans.items.slice().sort((a, b) => confScore(b) - confScore(a)).map((p, idx) => {
          const side = SIDE_DIR[p.side] ? p.side : 'avoid';
          const score = (typeof p.confidenceScore === 'number')
            ? Math.max(0, Math.min(100, Math.round(p.confidenceScore))) : null;
          const nameInner = p.code
            ? '<a href="https://kabutan.jp/stock/?code=' + esc(p.code) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a>'
            : esc(p.name);
          const cells = [
            ['ENTRY — 入り方の目安', p.entry],
            ['EXIT — 撤退・無効化ライン', p.invalidation],
            ['RISK — 想定リスク', p.risk]
          ].filter(c => c[1]);
          return '<article class="plan ' + side + '">' +
            '<div class="plan-top">' +
              '<span class="plan-rank">' + (idx + 1) + '</span>' +
              '<span class="dir ' + SIDE_DIR[side] + '">' + SIDE_LABEL[side] + '</span>' +
              (p.code ? '<span class="code">' + esc(p.code) + '</span>' : '') +
              '<span class="name">' + nameInner + '</span>' +
              (p.stance ? '<span class="tag">' + esc(p.stance) + '</span>' : '') +
              priceChip(d, p.code) +
              (score !== null
                ? '<span class="conf">自信度 <b>' + score + '</b><span class="max">/100</span>' +
                  '<span class="conf-bar"><span style="width:' + score + '%"></span></span></span>'
                : (p.confidence ? '<span class="conf">自信度 <b>' + esc(p.confidence) + '</b></span>' : '')) +
            '</div>' +
            (p.basis ? '<div class="plan-basis">根拠の重なり: ' + esc(p.basis) + '</div>' : '') +
            '<div class="plan-scenario">' + esc(p.scenario) + '</div>' +
            (cells.length ? '<div class="plan-grid">' + cells.map(c =>
              '<div class="plan-cell"><div class="lbl">' + esc(c[0]) + '</div><p>' + esc(c[1]) + '</p></div>'
            ).join('') + '</div>' : '') +
          '</article>';
        }).join('') +
      '</section>';
    }

    html += '<div class="filters">' +
      ['all', 'up', 'down', 'watch'].map(f =>
        '<button class="chip' + (dirFilter === f ? ' active' : '') + '" data-f="' + f + '">' +
        (f === 'all' ? 'すべて' : DIR_LABEL[f]) + '</button>'
      ).join('') +
      '<input id="q" type="search" placeholder="銘柄名・コード・キーワードで絞り込み" value="' + esc(query) + '">' +
    '</div>';

    (d.sections || []).forEach((sec, i) => {
      const items = (sec.items || []).filter(itemMatches);
      html += '<section class="section">' +
        '<div class="section-head"><span class="no">0' + (i + 1) + '</span><h2>' + esc(sec.title) + '</h2>' +
        '<span class="count">' + items.length + ' / ' + (sec.items || []).length + '銘柄</span></div>' +
        (items.length ? items.map(it => cardHTML(it, d)).join('') : '<div class="empty">該当する銘柄はありません</div>') +
      '</section>';
    });

    $('#app').innerHTML = html;

    $('#app').querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => { dirFilter = btn.dataset.f; render(); });
    });
    const q = $('#q');
    q.addEventListener('input', () => {
      query = q.value;
      const pos = q.selectionStart;
      render();
      const nq = $('#q');
      nq.focus();
      nq.setSelectionRange(pos, pos);
    });
  }

  render();
})();
