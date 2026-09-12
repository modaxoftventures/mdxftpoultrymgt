/* MODAXOFT POULTRY MANAGEMENT SYSTEM - Frontend v5.1 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxDVZ8fFhJxX5XasJLkHbe7VOmF5xtHTSnbeSBZYyBM099h24HtLstVWynEbvt4zpY5Og/exec';

const $ = id => document.getElementById(id);

let S = null;
let BIZ = null;
let page = 'Dashboard';
let timer = null;
let LINKCACHE = {};

try {
  S = JSON.parse(localStorage.getItem('mp_v5') || 'null');
} catch (e) {
  localStorage.removeItem('mp_v5');
  S = null;
}


/* =========================================================
   TABLE / DATABASE DEFINITIONS
========================================================= */

const F = {
  Users: [
    'username',
    'password',
    'name',
    'role',
    'farm_id',
    'active'
  ],

  Farms: [
    'farm_code',
    'name',
    'location',
    'manager_user_id',
    'active'
  ],

  Flocks: [
    'batch',
    'breed',
    'date_placed',
    'birds',
    'status',
    'notes'
  ],

  Daily_Log: [
    'flock_id',
    'date',
    'deaths',
    'culls',
    'feed_kg',
    'eggs',
    'notes'
  ],

  Feed: [
    'name',
    'sku',
    'quantity',
    'unit',
    'unit_cost',
    'minimum_stock',
    'stock_value',
    'supplier',
    'location',
    'active'
  ],

  Customers: [
    'name',
    'phone',
    'email',
    'location'
  ],

  Products: [
    'sku',
    'name',
    'category',
    'unit',
    'price',
    'cost_price',
    'quantity',
    'minimum_stock',
    'active',
    'description'
  ],

  Sales: [
    'invoice',
    'date',
    'customer_id',
    'product_id',
    'quantity',
    'unit_price',
    'total',
    'payment_status',
    'status',
    'payment_reference'
  ],

  Expenses: [
    'date',
    'category',
    'description',
    'amount',
    'payment_method',
    'reference'
  ],

  Employees: [
    'employee_no',
    'name',
    'phone',
    'department',
    'job_title',
    'basic_salary',
    'status'
  ],

  Attendance: [
    'employee_id',
    'date',
    'status',
    'notes'
  ],

  Payroll: [
    'period',
    'employee_id',
    'basic_salary',
    'allowances',
    'deductions',
    'net_pay',
    'status',
    'payment_reference'
  ],

  Notifications: [
    'recipient_type',
    'recipient_user_id',
    'title',
    'message',
    'priority',
    'status'
  ],

  Service_Requests: [
    'request_no',
    'title',
    'description',
    'category',
    'priority',
    'status',
    'assigned_to',
    'response'
  ],

  Chart_of_Accounts: [
    'code',
    'account_name',
    'type',
    'subtype',
    'normal_balance',
    'active',
    'description'
  ],

  Journal: [
    'date',
    'reference',
    'account_code',
    'description',
    'debit',
    'credit',
    'source',
    'source_id'
  ],

  Shared_Files: [
    'name',
    'description',
    'url',
    'category',
    'active'
  ],

  Management_Files: [
    'name',
    'description',
    'url',
    'category',
    'active'
  ],

  Calendar: [
    'title',
    'description',
    'type',
    'start_at',
    'end_at',
    'all_day',
    'priority',
    'assigned_to',
    'status',
    'location'
  ],

  Tasks: [
    'task_no',
    'title',
    'description',
    'category',
    'priority',
    'due_date',
    'assigned_to',
    'status',
    'progress'
  ],

  Payment_Transactions: [
    'reference',
    'invoice',
    'amount',
    'currency',
    'channel',
    'status',
    'paid_at',
    'customer_email'
  ],

  Audit_Log: [
    'timestamp',
    'username',
    'action',
    'table_name',
    'record_id',
    'status',
    'message',
    'details'
  ]
};


/* =========================================================
   NAVIGATION
========================================================= */

const P = [
  'Dashboard',
  ...Object.keys(F).filter(
    x => !['Payment_Transactions', 'Audit_Log'].includes(x)
  ),
  'Ledger',
  'Trial_Balance',
  'Invoices',
  'My_Activity',
  'Audit_Log',
  'Settings'
];


/* =========================================================
   RELATIONSHIPS
========================================================= */

const LINK = {
  Daily_Log: {
    flock_id: 1
  },

  Sales: {
    customer_id: 1,
    product_id: 1
  },

  Attendance: {
    employee_id: 1
  },

  Payroll: {
    employee_id: 1
  },

  Service_Requests: {
    assigned_to: 1
  },

  Notifications: {
    recipient_user_id: 1
  },

  Calendar: {
    assigned_to: 1
  },

  Tasks: {
    assigned_to: 1
  },

  Journal: {
    account_code: 1
  },

  Users: {
    farm_id: 1
  },

  Farms: {
    manager_user_id: 1
  }
};


/* =========================================================
   API
========================================================= */

async function api(action, data = {}, auth = true) {

  const q = {
    action,
    ...data
  };

  if (auth && S) {
    q.token = S.token;
  }

  let response;

  try {

    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(q)
    });

  } catch (e) {

    throw new Error(
      'Cannot reach the Google Apps Script backend. Check API_URL and deployment access.'
    );

  }

  let json;

  try {

    json = await response.json();

  } catch (e) {

    throw new Error(
      'Backend returned an invalid response.'
    );

  }

  if (!json.ok) {
    throw new Error(
      json.error || 'Operation failed'
    );
  }

  return json.data;
}


/* =========================================================
   ROLE / PERMISSIONS
========================================================= */

function roleAllowed(name) {

  const r = S?.user?.role;

  if (r === 'ADMIN') {
    return true;
  }

  if (name === 'Audit_Log') {
    return false;
  }

  if (name === 'Settings') {
    return r === 'ADMIN';
  }

  if (name === 'Farms') {
    return r === 'ADMIN' || r === 'MANAGER';
  }

  if (name === 'Ledger' || name === 'Trial_Balance') {
    return r === 'ACCOUNTANT' || r === 'MANAGER';
  }

  if (name === 'Invoices' || name === 'My_Activity') {
    return true;
  }

  if (name === 'Management_Files') {
    return r === 'MANAGER' || r === 'ACCOUNTANT';
  }

  return (
    (
      [
        'Dashboard',
        'Flocks',
        'Daily_Log',
        'Feed',
        'Customers',
        'Products',
        'Sales',
        'Notifications',
        'Service_Requests',
        'Shared_Files',
        'Calendar',
        'Tasks'
      ].includes(name)
      && r === 'FARM_STAFF'
    )
    ||
    (
      [
        'Dashboard',
        'Customers',
        'Products',
        'Sales',
        'Expenses',
        'Payroll',
        'Notifications',
        'Service_Requests',
        'Chart_of_Accounts',
        'Journal',
        'Shared_Files',
        'Calendar',
        'Tasks',
        'Invoices',
        'My_Activity'
      ].includes(name)
      && r === 'ACCOUNTANT'
    )
    ||
    (
      [
        'Dashboard',
        'Employees',
        'Attendance',
        'Payroll',
        'Notifications',
        'Service_Requests',
        'Shared_Files',
        'Calendar',
        'Tasks',
        'My_Activity'
      ].includes(name)
      && r === 'HR'
    )
    ||
    (
      [
        'Dashboard',
        'Flocks',
        'Daily_Log',
        'Feed',
        'Customers',
        'Products',
        'Sales',
        'Expenses',
        'Employees',
        'Attendance',
        'Payroll',
        'Notifications',
        'Service_Requests',
        'Chart_of_Accounts',
        'Journal',
        'Shared_Files',
        'Management_Files',
        'Calendar',
        'Tasks',
        'Invoices',
        'My_Activity'
      ].includes(name)
      && r === 'MANAGER'
    )
  );
}


function visiblePages() {
  return P.filter(roleAllowed);
}


/* =========================================================
   LOGIN
========================================================= */

function setLoginBusy(busy) {

  const b = $('loginSubmit');

  if (b) {

    b.disabled = busy;

    b.innerHTML = busy
      ? '<span class="spinner"></span> Signing in…'
      : 'Sign in <span>→</span>';
  }

  if ($('username')) {
    $('username').disabled = busy;
  }

  if ($('password')) {
    $('password').disabled = busy;
  }
}


if ($('loginForm')) {

  $('loginForm').onsubmit = async e => {

    e.preventDefault();

    const err = $('error');

    if (err) {
      err.textContent = '';
      err.hidden = true;
    }

    const username = $('username').value.trim();
    const password = $('password').value;

    if (!username || !password) {

      if (err) {
        err.textContent =
          'Enter your username and password.';
        err.hidden = false;
      }

      return;
    }

    setLoginBusy(true);

    try {

      S = await api(
        'login',
        {
          username,
          password
        },
        false
      );

      localStorage.setItem(
        'mp_v5',
        JSON.stringify(S)
      );

      await boot();

    } catch (ex) {

      S = null;

      localStorage.removeItem('mp_v5');

      if (err) {
        err.textContent =
          ex.message || 'Login failed.';
        err.hidden = false;
      }

      const p = $('password');

      if (p) {
        p.focus();
        p.select();
      }

    } finally {

      setLoginBusy(false);

    }
  };
}


/* =========================================================
   APPLICATION BOOT
========================================================= */

async function boot() {

  clearInterval(timer);

  if (!S) {

    if ($('login')) {
      $('login').hidden = false;
    }

    if ($('app')) {
      $('app').hidden = true;
    }

    return;
  }

  try {

    BIZ = await api(
      'publicSettings',
      {},
      false
    );

    await api('myProfile');

    if ($('login')) {
      $('login').hidden = true;
    }

    if ($('app')) {
      $('app').hidden = false;
    }

    if ($('user')) {

      $('user').textContent =
        (S.user.name || S.user.username)
        + ' · '
        + S.user.role;
    }

    applyBrand();

    nav();

    await show('Dashboard');

    timer = setInterval(() => {

      if (
        !document.hidden &&
        $('modal') &&
        $('modal').hidden
      ) {

        refreshNotificationBadge();

        show(page);

      }

    }, 20000);

  } catch (err) {

    localStorage.removeItem('mp_v5');

    S = null;

    if ($('error')) {

      $('error').textContent =
        err.message ||
        'Session expired. Please sign in again.';

      $('error').hidden = false;
    }

    if ($('login')) {
      $('login').hidden = false;
    }

    if ($('app')) {
      $('app').hidden = true;
    }
  }
}


/* =========================================================
   BRANDING
========================================================= */

function applyBrand() {

  document.title =
    BIZ?.portal_name ||
    BIZ?.business_name ||
    'Modaxoft Poultry';

  document.documentElement.style.setProperty(
    '--brand',
    BIZ?.theme_color || '#b91c1c'
  );

  if ($('brandName')) {

    $('brandName').textContent =
      BIZ?.portal_name ||
      BIZ?.business_name ||
      'Modaxoft Poultry';
  }

  if ($('brandNameTop')) {

    $('brandNameTop').textContent =
      BIZ?.portal_name ||
      BIZ?.business_name ||
      'Modaxoft Poultry';
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

function nav() {

  if (!$('nav')) return;

  $('nav').replaceChildren(

    ...visiblePages().map(name => {

      const b =
        document.createElement('button');

      b.textContent =
        icon(name) + ' ' + label(name);

      b.className =
        name === page ? 'active' : '';

      b.onclick = () => {

        closeSidebar();

        show(name);

      };

      return b;

    })
  );
}


function label(x) {
  return String(x).replaceAll('_', ' ');
}


function icon(x) {

  return ({
    Dashboard: '⌂',
    Flocks: '🐔',
    Daily_Log: '📋',
    Feed: '🌾',
    Customers: '👥',
    Products: '📦',
    Sales: '💰',
    Expenses: '💸',
    Employees: '👤',
    Attendance: '🕘',
    Payroll: '🧾',
    Notifications: '🔔',
    Service_Requests: '🛠',
    Chart_of_Accounts: '📚',
    Journal: '✍',
    Ledger: '📒',
    Trial_Balance: '⚖',
    Shared_Files: '📁',
    Management_Files: '🗂',
    Calendar: '📅',
    Tasks: '✅',
    Invoices: '🧾',
    My_Activity: '🧑‍💻',
    Audit_Log: '🔐',
    Settings: '⚙',
    Farms: '🏡'
  })[x] || '•';
}


/* =========================================================
   HELPERS
========================================================= */

function reportHeader(title) {

  return `
    <div class="report-head">

      <div>

        <h1>
          ${esc(BIZ?.business_name || 'Modaxoft Poultry')}
        </h1>

        <p>
          ${esc(BIZ?.address || '')}
          ${BIZ?.email ? ' | ' + esc(BIZ.email) : ''}
          ${BIZ?.phone ? ' | ' + esc(BIZ.phone) : ''}
        </p>

        <p>
          <b>${esc(title)}</b>
          ·
          ${esc(new Date().toLocaleString())}
        </p>

      </div>

      <div class="report-mark">

        ${
          BIZ?.logo_url
            ? `<img src="${esc(BIZ.logo_url)}" alt="">`
            : '🐔'
        }

      </div>

    </div>
  `;
}


function esc(x) {

  return String(x ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );
}


function money(x) {

  return (
    BIZ?.currency || 'KES'
  )
  + ' '
  + (Number(x) || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}


function num(x) {
  return Number(x) || 0;
}


function fmtDate(x) {

  if (!x) return '';

  const d = new Date(x);

  return isNaN(d)
    ? String(x)
    : d.toLocaleDateString();
}


function fmtDateTime(x) {

  if (!x) return '';

  const d = new Date(x);

  return isNaN(d)
    ? String(x)
    : d.toLocaleString();
}


function toLocalInput(x) {

  if (!x) return '';

  const d = new Date(x);

  if (isNaN(d)) {
    return String(x).slice(0, 16);
  }

  const pad =
    n => String(n).padStart(2, '0');

  return (
    `${d.getFullYear()}-` +
    `${pad(d.getMonth() + 1)}-` +
    `${pad(d.getDate())}T` +
    `${pad(d.getHours())}:` +
    `${pad(d.getMinutes())}`
  );
}


/* =========================================================
   PAGE ROUTER
========================================================= */

async function show(p) {

  if (!roleAllowed(p)) {

    toast(
      'You do not have permission to open this section.'
    );

    return;
  }

  page = p;

  nav();

  try {

    if (p === 'Dashboard')
      return dashboardPage();

    if (p === 'Notifications')
      return showNotifications();

    if (p === 'Ledger')
      return ledgerPage();

    if (p === 'Trial_Balance')
      return trialBalancePage();

    if (p === 'Invoices')
      return invoicePage();

    if (p === 'My_Activity')
      return activityPage();

    if (p === 'Audit_Log')
      return auditPage();

    if (p === 'Settings')
      return settingsPage();

    if (p === 'Payroll')
      return payrollPage();

    if (p === 'Calendar')
      return calendarPage();

    if (p === 'Tasks')
      return tasksPage();

    if (
      p === 'Shared_Files' ||
      p === 'Management_Files'
    ) {
      return filesPage(p);
    }

    return tablePage(p);

  } catch (err) {

    if ($('content')) {

      $('content').innerHTML = `
        <div class="panel error-panel">

          <h2>
            Unable to load ${esc(label(p))}
          </h2>

          <p>
            ${esc(err.message)}
          </p>

          <button
            onclick="show('${esc(p)}')">
            Retry
          </button>

        </div>
      `;
    }
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function dashboardPage() {

  const d =
    await api('dashboard');

  $('content').innerHTML =

    reportHeader('Operations Dashboard')

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          My operational dashboard
        </h1>

        <p class="muted">
          Your role, activity and farm performance
          in one view.
        </p>

      </div>

      <div class="actions">

        <button
          class="secondary"
          id="dashPdf">
          Print / PDF
        </button>

        <button id="dashRefresh">
          Refresh
        </button>

      </div>

    </div>

    <div class="cards">

      ${
        [
          ['Current Birds', d.birds, '🐔'],
          ['Active Flocks', d.flocks, '🪺'],
          ['Deaths & Culls', d.deaths, '⚠'],
          ['Sales', money(d.sales), '💰'],
          ['Expenses', money(d.expenses), '💸'],
          ['Payroll', money(d.payroll), '🧾'],
          ['Net Result', money(d.profit), '📈'],
          ['Active Employees', d.employees, '👥'],
          ['Low Feed', d.lowFeed, '🌾'],
          ['Unread', d.notifications, '🔔']
        ]
        .map(x => `

          <div class="card">

            <span class="card-icon">
              ${x[2]}
            </span>

            <small>
              ${x[0]}
            </small>

            <div class="value">
              ${x[1]}
            </div>

          </div>

        `)
        .join('')
      }

    </div>

    <div class="cards">

      <div class="card">
        <small>My logged activity</small>
        <div class="value">${d.myActivityCount}</div>
      </div>

      <div class="card">
        <small>My creates</small>
        <div class="value">${d.myCreates}</div>
      </div>

      <div class="card">
        <small>My updates</small>
        <div class="value">${d.myUpdates}</div>
      </div>

      <div class="card">
        <small>My failed actions</small>
        <div class="value">${d.myFailures}</div>
      </div>

      <div class="card">
        <small>My open tasks</small>
        <div class="value">${d.myTasks}</div>
      </div>

      <div class="card">
        <small>My open requests</small>
        <div class="value">${d.myRequests}</div>
      </div>

      <div class="card">
        <small>My recorded sales</small>
        <div class="value">${money(d.mySales)}</div>
      </div>

    </div>

    <div class="chart-grid">

      <div class="panel">

        <div class="panel-title">

          <h2>
            Sales vs expenses
          </h2>

          <span>
            ${d.monthly?.length || 0} months
          </span>

        </div>

        <canvas
          id="financeChart"
          height="260">
        </canvas>

      </div>

      <div class="panel">

        <div class="panel-title">

          <h2>
            Quick access
          </h2>

        </div>

        <button
          class="wide"
          onclick="show('Calendar')">
          📅 Calendar & schedule
        </button>

        <button
          class="wide"
          onclick="show('Tasks')">
          ✅ My tasks
        </button>

        <button
          class="wide"
          onclick="show('Shared_Files')">
          📁 Production resources
        </button>

        <button
          class="wide"
          onclick="show('Invoices')">
          🧾 Filter invoices
        </button>

        <button
          class="wide secondary"
          onclick="show('My_Activity')">
          🧑‍💻 My activity report
        </button>

      </div>

    </div>
    `;

  if ($('dashPdf')) {
    $('dashPdf').onclick = printPage;
  }

  if ($('dashRefresh')) {
    $('dashRefresh').onclick =
      () => show('Dashboard');
  }

  drawFinanceChart(
    d.monthly || []
  );

  await refreshNotificationBadge();
}


/* =========================================================
   FINANCE CHART
========================================================= */

function drawFinanceChart(rows) {

  const c = $('financeChart');

  if (!c) return;

  const ctx =
    c.getContext('2d');

  const rect =
    c.getBoundingClientRect();

  const ratio =
    devicePixelRatio || 1;

  c.width =
    rect.width * ratio;

  c.height =
    260 * ratio;

  ctx.scale(ratio, ratio);

  const w = rect.width;
  const h = 260;

  ctx.clearRect(0, 0, w, h);

  if (!rows.length) {

    ctx.fillText(
      'No monthly transactions yet.',
      20,
      40
    );

    return;
  }

  const max =
    Math.max(
      1,
      ...rows.map(
        r =>
          Math.max(
            num(r.sales),
            num(r.expenses)
          )
      )
    );

  const left = 45;
  const right = 15;
  const top = 20;
  const bottom = 40;

  const cw =
    w - left - right;

  const ch =
    h - top - bottom;

  ctx.strokeStyle = '#e5e7eb';

  for (let i = 0; i < 5; i++) {

    const y =
      top + ch * i / 4;

    ctx.beginPath();

    ctx.moveTo(left, y);
    ctx.lineTo(w - right, y);

    ctx.stroke();
  }

  const step =
    cw / Math.max(rows.length, 1);

  const barW =
    Math.max(
      10,
      Math.min(24, step * .28)
    );

  rows.forEach((r, i) => {

    const x =
      left +
      i * step +
      step / 2;

    const hs =
      num(r.sales) / max * ch;

    const he =
      num(r.expenses) / max * ch;

    ctx.fillStyle = '#b91c1c';

    ctx.fillRect(
      x - barW - 2,
      top + ch - hs,
      barW,
      hs
    );

    ctx.fillStyle = '#374151';

    ctx.fillRect(
      x + 2,
      top + ch - he,
      barW,
      he
    );

    ctx.fillText(
      String(r.month).slice(0, 7),
      x,
      h - 15
    );
  });
}


/* =========================================================
   STANDARD TABLE PAGE
========================================================= */

async function tablePage(t) {

  const rows =
    await api(
      'list',
      { table: t }
    );

  const fields =
    F[t] || [];

  const canDelete =
    S.user.role === 'ADMIN';

  $('content').innerHTML =

    reportHeader(
      label(t) + ' Report'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          ${esc(label(t))}
        </h1>

        <p class="muted">

          ${rows.length}
          record${rows.length === 1 ? '' : 's'}

          ·

          only Admin can delete

        </p>

      </div>

      <div class="actions">

        <button
          class="secondary"
          id="pdf">
          Print / PDF
        </button>

        <button id="add">
          + Add
        </button>

      </div>

    </div>

    <div class="panel">

      <div class="toolbar no-print">

        <input
          id="search"
          class="search"
          placeholder="Search ${esc(label(t))}..."
        >

        <button
          class="secondary"
          id="clearSearch">
          Clear
        </button>

      </div>

      <div class="tablewrap">

        <table>

          <thead>

            <tr>

              ${
                fields
                .filter(
                  f =>
                    !(t === 'Users' &&
                      f === 'password')
                )
                .map(
                  f =>
                    `<th>${esc(f)}</th>`
                )
                .join('')
              }

              <th class="no-print">
                Actions
              </th>

            </tr>

          </thead>

          <tbody id="body"></tbody>

        </table>

      </div>

    </div>
    `;

  $('pdf').onclick =
    printPage;

  $('add').onclick =
    () => form(t);

  $('clearSearch').onclick =
    () => {

      $('search').value = '';

      render();
    };

  function render() {

    const q =
      $('search')
        .value
        .toLowerCase();

    $('body').replaceChildren(

      ...rows
        .filter(
          r =>
            JSON.stringify(r)
              .toLowerCase()
              .includes(q)
        )
        .map(
          r =>
            rowElement(
              t,
              r,
              fields,
              canDelete
            )
        )
    );
  }

  $('search').oninput =
    render;

  render();
}


/* =========================================================
   TABLE ROW
========================================================= */

function rowElement(
  t,
  r,
  fields,
  canDelete
) {

  const tr =
    document.createElement('tr');

  fields
    .filter(
      f =>
        !(t === 'Users' &&
          f === 'password')
    )
    .forEach(f => {

      const td =
        document.createElement('td');

      let v =
        r[f];

      if (
        [
          'created_at',
          'updated_at',
          'read_at'
        ].includes(f)
        && v
      ) {

        v =
          fmtDateTime(v);
      }

      if (
        [
          'price',
          'cost_price',
          'unit_cost',
          'stock_value',
          'total',
          'amount',
          'basic_salary',
          'allowances',
          'deductions',
          'net_pay',
          'debit',
          'credit'
        ].includes(f)
        && v !== ''
      ) {

        v =
          money(v);
      }

      td.textContent =
        v ?? '';

      tr.append(td);
    });

  const td =
    document.createElement('td');

  td.className =
    'no-print';

  const e =
    document.createElement('button');

  e.textContent =
    'Edit';

  e.onclick =
    () => form(t, r);

  td.append(e);

  if (canDelete) {

    const d =
      document.createElement('button');

    d.textContent =
      'Delete';

    d.className =
      'danger';

    d.onclick =
      () => remove(t, r.id);

    td.append(d);
  }

  tr.append(td);

  return tr;
}


/* =========================================================
   LINKED OPTIONS
========================================================= */

async function opts(t, f) {

  const k =
    t + '_' + f;

  if (LINKCACHE[k]) {
    return LINKCACHE[k];
  }

  LINKCACHE[k] =
    await api(
      'linkedOptions',
      {
        table: t,
        field: f
      }
    );

  return LINKCACHE[k];
}


/* =========================================================
   INPUT TYPES
========================================================= */

function inputType(f) {

  if (
    [
      'birds',
      'deaths',
      'culls',
      'eggs',
      'quantity',
      'minimum_stock',
      'progress'
    ].includes(f)
  ) {
    return 'number';
  }

  if (
    [
      'feed_kg',
      'unit_cost',
      'price',
      'cost_price',
      'unit_price',
      'amount',
      'basic_salary',
      'allowances',
      'deductions',
      'debit',
      'credit'
    ].includes(f)
  ) {
    return 'number';
  }

  if (f === 'period') {
    return 'month';
  }

  if (
    [
      'date',
      'date_placed',
      'due_date'
    ].includes(f)
  ) {
    return 'date';
  }

  if (
    [
      'start_at',
      'end_at'
    ].includes(f)
  ) {
    return 'datetime-local';
  }

  return 'text';
}


/* =========================================================
   SELECT VALUES
========================================================= */

function selectValues(t, f) {

  if (
    t === 'Users' &&
    f === 'role'
  ) {
    return [
      'ADMIN',
      'MANAGER',
      'ACCOUNTANT',
      'HR',
      'FARM_STAFF'
    ];
  }

  if (
    t === 'Users' &&
    f === 'active'
  ) {
    return [
      'TRUE',
      'FALSE'
    ];
  }

  if (
    t === 'Products' &&
    f === 'category'
  ) {
    return [
      'CHICKEN',
      'EGGS',
      'FEED',
      'MANURE',
      'OTHER'
    ];
  }

  if (
    t === 'Products' &&
    f === 'active'
  ) {
    return [
      'TRUE',
      'FALSE'
    ];
  }

  if (
    t === 'Flocks' &&
    f === 'status'
  ) {
    return [
      'ACTIVE',
      'CLOSED',
      'SOLD'
    ];
  }

  if (
    t === 'Sales' &&
    f === 'payment_status'
  ) {
    return [
      'PAID',
      'PENDING',
      'PARTIAL',
      'REFUNDED'
    ];
  }

  if (
    t === 'Sales' &&
    f === 'status'
  ) {
    return [
      'COMPLETED',
      'PENDING',
      'VOID'
    ];
  }

  if (
    t === 'Employees' &&
    f === 'status'
  ) {
    return [
      'ACTIVE',
      'INACTIVE'
    ];
  }

  if (
    t === 'Attendance' &&
    f === 'status'
  ) {
    return [
      'PRESENT',
      'ABSENT',
      'LEAVE',
      'OFF'
    ];
  }

  if (
    t === 'Payroll' &&
    f === 'status'
  ) {
    return [
      'DRAFT',
      'PAID',
      'CANCELLED'
    ];
  }

  if (
    t === 'Notifications' &&
    f === 'recipient_type'
  ) {
    return [
      'ALL',
      'ADMIN',
      'USER'
    ];
  }

  if (
    t === 'Notifications' &&
    f === 'priority'
  ) {
    return [
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    ];
  }

  if (
    t === 'Notifications' &&
    f === 'status'
  ) {
    return [
      'UNREAD',
      'READ'
    ];
  }

  if (
    t === 'Service_Requests' &&
    f === 'priority'
  ) {
    return [
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    ];
  }

  if (
    t === 'Service_Requests' &&
    f === 'status'
  ) {
    return [
      'OPEN',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED'
    ];
  }

  if (
    t === 'Chart_of_Accounts' &&
    f === 'type'
  ) {
    return [
      'ASSET',
      'LIABILITY',
      'EQUITY',
      'INCOME',
      'EXPENSE'
    ];
  }

  if (
    t === 'Chart_of_Accounts' &&
    f === 'normal_balance'
  ) {
    return [
      'DEBIT',
      'CREDIT'
    ];
  }

  if (
    t === 'Chart_of_Accounts' &&
    f === 'active'
  ) {
    return [
      'TRUE',
      'FALSE'
    ];
  }

  if (
    t === 'Calendar' &&
    f === 'type'
  ) {
    return [
      'EVENT',
      'PROJECT',
      'MEETING',
      'DEADLINE',
      'REMINDER'
    ];
  }

  if (
    t === 'Calendar' &&
    f === 'priority'
  ) {
    return [
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    ];
  }

  if (
    t === 'Calendar' &&
    f === 'status'
  ) {
    return [
      'PLANNED',
      'IN_PROGRESS',
      'DONE',
      'CANCELLED'
    ];
  }

  if (
    t === 'Calendar' &&
    f === 'all_day'
  ) {
    return [
      'TRUE',
      'FALSE'
    ];
  }

  if (
    t === 'Tasks' &&
    f === 'priority'
  ) {
    return [
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    ];
  }

  if (
    t === 'Tasks' &&
    f === 'status'
  ) {
    return [
      'OPEN',
      'IN_PROGRESS',
      'DONE',
      'CANCELLED'
    ];
  }

  if (
    (
      t === 'Shared_Files' ||
      t === 'Management_Files'
    )
    &&
    f === 'active'
  ) {
    return [
      'TRUE',
      'FALSE'
    ];
  }

  return null;
}


/* =========================================================
   ADD / EDIT FORM
========================================================= */

async function form(t, r = null) {

  if (!$('modalContent')) {
    toast('Modal form is not available.');
    return;
  }

  $('modalContent').replaceChildren();

  const h =
    document.createElement('h2');

  h.textContent =
    (r ? 'Edit ' : 'Add ')
    + label(t);

  const fm =
    document.createElement('form');

  const g =
    document.createElement('div');

  g.className =
    'grid';

  for (const f of (F[t] || [])) {

    const l =
      document.createElement('label');

    l.textContent =
      label(f);

    let i;

    if (
      LINK[t]?.[f]
    ) {

      i =
        document.createElement('select');

      i.add(
        new Option(
          'Select ' + label(f),
          ''
        )
      );

      const linked =
        await opts(t, f);

      for (const o of linked) {

        const op =
          new Option(
            o.label,
            o.id
          );

        if (
          String(r?.[f]) ===
          String(o.id)
        ) {
          op.selected = true;
        }

        i.add(op);
      }

    } else if (
      selectValues(t, f)
    ) {

      i =
        document.createElement('select');

      selectValues(t, f)
        .forEach(v =>
          i.add(
            new Option(v, v)
          )
        );

      i.value =
        r?.[f] ??
        (
          f === 'active'
            ? 'TRUE'
            : ''
        );

    } else {

      i =
        document.createElement(
          [
            'notes',
            'description',
            'message',
            'response'
          ].includes(f)
            ? 'textarea'
            : 'input'
        );

      i.type =
        inputType(f);

      if (i.type === 'number') {
        i.step = 'any';
      }

      if (
        r &&
        i.type !== 'month' &&
        i.type !== 'date' &&
        i.type !== 'datetime-local'
      ) {
        i.value =
          r[f] ?? '';
      }

      if (
        r &&
        [
          'date',
          'date_placed',
          'due_date'
        ].includes(f)
      ) {
        i.value =
          String(
            r[f] || ''
          ).slice(0, 10);
      }

      if (
        r &&
        i.type === 'month'
      ) {
        i.value =
          String(
            r[f] || ''
          ).slice(0, 7);
      }

      if (
        r &&
        i.type === 'datetime-local'
      ) {
        i.value =
          toLocalInput(r[f]);
      }
    }

    i.name = f;

    if (
      t === 'Users' &&
      f === 'password'
    ) {

      i.type =
        'password';

      i.placeholder =
        r
          ? 'Leave blank to keep current password'
          : 'Minimum 8 characters';
    }

    /*
      SYSTEM-GENERATED FIELDS
    */

    if (
      [
        'total',
        'stock_value',
        'net_pay',
        'invoice',
        'request_no',
        'task_no',
        'payment_reference',
        'sku'
      ].includes(f)
    ) {

      i.readOnly = true;
    }

    if (
      t === 'Journal' &&
      [
        'source',
        'source_id'
      ].includes(f)
    ) {

      i.readOnly = true;
    }

    if (
      t === 'Shared_Files' ||
      t === 'Management_Files'
    ) {

      if (f === 'url') {

        i.placeholder =
          'Paste Google Drive/shared resource URL';
      }
    }

    /*
      EMPLOYEE SALARY IS DISPLAYED AS READ-ONLY
      IN PAYROLL
    */

    if (
      t === 'Payroll' &&
      f === 'basic_salary'
    ) {

      i.readOnly = true;

      i.placeholder =
        'Automatically loaded from employee record';
    }

    l.append(i);

    g.append(l);
  }

  const actions =
    document.createElement('div');

  actions.className =
    'modal-actions';

  const cancel =
    document.createElement('button');

  cancel.type =
    'button';

  cancel.className =
    'secondary';

  cancel.textContent =
    'Cancel';

  cancel.onclick =
    closeModal;

  const save =
    document.createElement('button');

  save.type =
    'submit';

  save.textContent =
    'Save Record';

  actions.append(
    cancel,
    save
  );

  fm.append(
    g,
    actions
  );

  $('modalContent').append(
    h,
    fm
  );

  $('modal').hidden = false;


  /*
    LIVE CALCULATIONS
  */

  fm.addEventListener(
    'input',
    () => calc(t, fm)
  );


  /* =======================================================
     PAYROLL EMPLOYEE SELECTION
     AUTOLOAD BASIC SALARY
  ======================================================= */

  const emp =
    fm.elements.employee_id;

  if (
    t === 'Payroll' &&
    emp
  ) {

    emp.onchange =
      async () => {

        try {

          const os =
            LINKCACHE[
              t + '_employee_id'
            ]
            ||
            await opts(
              t,
              'employee_id'
            );

          const o =
            os.find(
              x =>
                String(x.id) ===
                String(emp.value)
            );

          if (
            o &&
            fm.elements.basic_salary
          ) {

            const salary =
              o.data?.basic_salary ??
              o.basic_salary ??
              0;

            fm.elements.basic_salary.value =
              Number(salary || 0)
                .toFixed(2);
          }

          calc(t, fm);

        } catch (err) {

          toast(
            'Could not load employee salary: '
            + err.message
          );
        }
      };


    /*
      Also load salary immediately when
      editing an existing payroll record
    */

    if (emp.value) {

      setTimeout(
        () => emp.onchange(),
        50
      );
    }
  }


  /* =======================================================
     SALES PRODUCT PRICE AUTOLOAD
  ======================================================= */

  const ps =
    fm.elements.product_id;

  if (
    t === 'Sales' &&
    ps
  ) {

    ps.onchange =
      async () => {

        try {

          const products =
            LINKCACHE[
              t + '_product_id'
            ]
            ||
            await opts(
              t,
              'product_id'
            );

          const o =
            products.find(
              x =>
                String(x.id) ===
                String(ps.value)
            );

          if (
            o &&
            fm.elements.unit_price
          ) {

            const price =
              o.data?.price ??
              o.price ??
              0;

            fm.elements.unit_price.value =
              Number(price || 0)
                .toFixed(2);
          }

          calc(t, fm);

        } catch (err) {

          toast(
            'Could not load product price: '
            + err.message
          );
        }
      };


    if (ps.value) {

      setTimeout(
        () => ps.onchange(),
        50
      );
    }
  }


  calc(t, fm);


  /*
    AUTO-GENERATE INVOICE
  */

  if (
    t === 'Sales' &&
    !r &&
    fm.elements.invoice
  ) {

    try {

      const x =
        await api('nextInvoice');

      fm.elements.invoice.value =
        x.invoice;

    } catch (e) {

      console.warn(
        'Could not generate invoice number',
        e
      );
    }
  }


  /*
    PRODUCT SKU
  */

  if (
    t === 'Products' &&
    !r &&
    fm.elements.sku
  ) {

    fm.elements.sku.value =
      'Auto-generated on save';
  }


  /*
    FEED SKU
  */

  if (
    t === 'Feed' &&
    !r &&
    fm.elements.sku
  ) {

    fm.elements.sku.value =
      'Auto-generated on save';
  }


  /* =======================================================
     SAVE RECORD
  ======================================================= */

  fm.onsubmit =
    async e => {

      e.preventDefault();

      const d =
        Object.fromEntries(
          new FormData(fm)
        );


      /*
        Do not overwrite existing user
        password with a blank password
      */

      if (
        t === 'Users' &&
        !d.password
      ) {

        delete d.password;
      }


      /*
        Prevent manually changing calculated
        payroll basic salary from browser
      */

      if (
        t === 'Payroll' &&
        d.employee_id
      ) {

        try {

          const os =
            await opts(
              'Payroll',
              'employee_id'
            );

          const employee =
            os.find(
              x =>
                String(x.id) ===
                String(d.employee_id)
            );

          if (employee) {

            d.basic_salary =
              Number(
                employee.data?.basic_salary ??
                employee.basic_salary ??
                d.basic_salary ??
                0
              );
          }

        } catch (err) {

          console.warn(
            'Salary verification failed',
            err
          );
        }
      }


      /*
        Calculate payroll net pay
      */

      if (
        t === 'Payroll'
      ) {

        d.net_pay =
          (
            num(d.basic_salary)
            +
            num(d.allowances)
            -
            num(d.deductions)
          ).toFixed(2);
      }


      /*
        Calculate sales total
      */

      if (
        t === 'Sales'
      ) {

        d.total =
          (
            num(d.quantity)
            *
            num(d.unit_price)
          ).toFixed(2);
      }


      /*
        Calculate feed stock value
      */

      if (
        t === 'Feed'
      ) {

        d.stock_value =
          (
            num(d.quantity)
            *
            num(d.unit_cost)
          ).toFixed(2);
      }


      try {

        const saved =
          await api(
            r
              ? 'update'
              : 'create',
            {
              table: t,
              id: r?.id,
              data: d
            }
          );

        closeModal();

        LINKCACHE = {};

        toast(
          'Saved successfully'
        );

        await show(t);

        if (
          t === 'Sales' &&
          !r &&
          saved?.invoice
        ) {

          toast(
            'Invoice '
            + saved.invoice
            + ' generated automatically.'
          );
        }

      } catch (err) {

        toast(
          err.message
        );
      }
    };
}


/* =========================================================
   CALCULATIONS
========================================================= */

function calc(t, f) {

  if (!f) return;

  const n =
    x =>
      num(
        f.elements[x]?.value
      );

  const set =
    (x, v) => {

      if (f.elements[x]) {

        f.elements[x].value =
          Number(v || 0)
            .toFixed(2);
      }
    };


  if (t === 'Feed') {

    set(
      'stock_value',
      n('quantity') *
      n('unit_cost')
    );
  }


  if (t === 'Sales') {

    set(
      'total',
      n('quantity') *
      n('unit_price')
    );
  }


  if (t === 'Payroll') {

    set(
      'net_pay',
      n('basic_salary')
      +
      n('allowances')
      -
      n('deductions')
    );
  }
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function showNotifications() {

  const rows =
    await api(
      'myNotifications'
    );

  $('content').innerHTML =

    reportHeader(
      'Alerts Inbox'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        Alerts Inbox
      </h1>

      <button
        class="secondary"
        id="pdf">
        Print / PDF
      </button>

    </div>

    <div
      class="panel"
      id="notes">
    </div>
    `;

  $('pdf').onclick =
    printPage;

  const box =
    $('notes');

  if (!rows.length) {

    box.innerHTML =
      '<div class="empty">No notifications.</div>';
  }

  rows.forEach(r => {

    const d =
      document.createElement('div');

    d.className =
      'notify'
      +
      (
        r.status !== 'READ'
          ? ' unread-notification'
          : ''
      );

    d.innerHTML =

      `
      <div>

        <b>
          ${esc(r.title)}
        </b>

        <p>
          ${esc(r.message)}
        </p>

        <small>
          ${esc(r.priority)}
          ·
          ${esc(fmtDateTime(r.created_at))}
        </small>

      </div>
      `;

    if (
      r.status !== 'READ'
    ) {

      const b =
        document.createElement('button');

      b.textContent =
        'Mark read';

      b.onclick =
        async () => {

          try {

            await api(
              'markNotificationRead',
              {
                id: r.id
              }
            );

            showNotifications();

          } catch (err) {

            toast(
              err.message
            );
          }
        };

      d.append(b);
    }

    box.append(d);
  });

  refreshNotificationBadge(rows);
}


/* =========================================================
   NOTIFICATION BADGE
========================================================= */

async function refreshNotificationBadge(
  rows = null
) {

  try {

    rows =
      rows ||
      await api(
        'myNotifications'
      );

    const unread =
      rows.filter(
        x =>
          x.status !== 'READ'
      );

    const count =
      unread.length;

    let b =
      $('notificationBadge');

    if (
      !b &&
      $('menu')
    ) {

      b =
        document.createElement('span');

      b.id =
        'notificationBadge';

      b.className =
        'notification-badge';

      $('menu').append(b);
    }

    if (b) {

      b.textContent =
        count > 99
          ? '99+'
          : count;

      b.hidden =
        count === 0;

      b.classList.toggle(
        'pulse',
        count > 0
      );
    }


    let ticker =
      $('notificationTicker');

    if (!ticker) {

      ticker =
        document.createElement('button');

      ticker.id =
        'notificationTicker';

      ticker.className =
        'notification-ticker';

      ticker.onclick =
        () => show('Notifications');

      document.body.append(ticker);
    }

    ticker.hidden =
      count === 0;

    if (count) {

      const latest =
        unread[0];

      ticker.innerHTML =
        `🔔 <b>${count} new notification${count === 1 ? '' : 's'}</b>`
        +
        (
          latest
            ? ' — ' + esc(latest.title)
            : ''
        );

      ticker.classList.remove(
        'notify-bounce'
      );

      void ticker.offsetWidth;

      ticker.classList.add(
        'notify-bounce'
      );
    }

  } catch (e) {

    console.warn(
      'Notification refresh failed',
      e
    );
  }
}


/* =========================================================
   GENERAL LEDGER
========================================================= */

async function ledgerPage() {

  const accounts =
    await api(
      'list',
      {
        table:
          'Chart_of_Accounts'
      }
    );

  const active =
    accounts.filter(
      a =>
        String(a.active)
          .toUpperCase() !==
        'FALSE'
    );

  $('content').innerHTML =

    reportHeader(
      'General Ledger'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        General Ledger
      </h1>

      <button
        class="secondary"
        id="pdf">
        Print / PDF
      </button>

    </div>

    <div class="panel no-print">

      <div class="filters">

        <label>
          Account

          <select id="ledgerAccount">

            ${
              active
              .map(
                a =>
                  `
                  <option
                    value="${esc(a.code)}">

                    ${esc(
                      a.code +
                      ' · ' +
                      a.account_name
                    )}

                  </option>
                  `
              )
              .join('')
            }

          </select>

        </label>

        <label>
          From
          <input
            type="date"
            id="ledgerFrom">
        </label>

        <label>
          To
          <input
            type="date"
            id="ledgerTo">
        </label>

        <button
          id="loadLedger">
          Load Ledger
        </button>

      </div>

    </div>

    <div id="ledgerResult"></div>
    `;

  $('pdf').onclick =
    printPage;

  $('loadLedger').onclick =
    loadLedger;

  if (active.length) {

    $('ledgerAccount').value =
      active.find(
        a =>
          a.code === '1000'
      )?.code
      ||
      active[0].code;

    await loadLedger();
  }
}


async function loadLedger() {

  const code =
    $('ledgerAccount').value;

  if (!code) {

    toast(
      'Select an account'
    );

    return;
  }

  const r =
    await api(
      'ledger',
      {
        account_code: code,
        from: $('ledgerFrom').value,
        to: $('ledgerTo').value
      }
    );

  $('ledgerResult').innerHTML =

    `
    <div class="panel">

      <div class="ledger-head">

        <div>

          <h2>
            ${esc(r.account.code)}
            ·
            ${esc(r.account.account_name)}
          </h2>

          <small>
            Normal balance:
            ${esc(r.account.normal_balance)}
          </small>

        </div>

        <div>

          <small>
            Closing balance
          </small>

          <b>
            ${money(r.closing_balance)}
          </b>

        </div>

      </div>

      <div class="tablewrap">

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Source</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Running</th>
            </tr>

          </thead>

          <tbody>

            ${
              r.rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(fmtDate(x.date))}
                    </td>

                    <td>
                      ${esc(x.reference)}
                    </td>

                    <td>
                      ${esc(x.description)}
                    </td>

                    <td>
                      ${esc(x.source)}
                    </td>

                    <td>
                      ${
                        x.debit
                          ? money(x.debit)
                          : ''
                      }
                    </td>

                    <td>
                      ${
                        x.credit
                          ? money(x.credit)
                          : ''
                      }
                    </td>

                    <td>
                      <b>
                        ${money(x.running_balance)}
                      </b>
                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td
                  colspan="7"
                  class="empty">
                  No entries.
                </td>
              </tr>
              `
            }

          </tbody>

          <tfoot>

            <tr>

              <th colspan="4">
                Totals
              </th>

              <th>
                ${money(r.total_debit)}
              </th>

              <th>
                ${money(r.total_credit)}
              </th>

              <th>
                ${money(r.closing_balance)}
              </th>

            </tr>

          </tfoot>

        </table>

      </div>

    </div>
    `;
}


/* =========================================================
   TRIAL BALANCE
========================================================= */

async function trialBalancePage() {

  $('content').innerHTML =

    reportHeader(
      'Trial Balance'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        Trial Balance
      </h1>

      <button
        class="secondary"
        id="pdf">
        Print / PDF
      </button>

    </div>

    <div class="panel no-print">

      <div class="filters">

        <label>
          From
          <input
            type="date"
            id="tbFrom">
        </label>

        <label>
          To
          <input
            type="date"
            id="tbTo">
        </label>

        <button id="loadTB">
          Load Trial Balance
        </button>

      </div>

    </div>

    <div id="tbResult"></div>
    `;

  $('pdf').onclick =
    printPage;

  $('loadTB').onclick =
    loadTB;

  await loadTB();
}


async function loadTB() {

  const r =
    await api(
      'trialBalance',
      {
        from:
          $('tbFrom').value,

        to:
          $('tbTo').value
      }
    );

  const ok =
    Math.abs(
      r.total_debit -
      r.total_credit
    ) < .01;

  $('tbResult').innerHTML =

    `
    <div class="panel">

      <div
        class="balance-banner
        ${ok ? 'ok' : 'bad'}">

        <b>
          ${
            ok
              ? '✓ BALANCED'
              : '⚠ NOT BALANCED'
          }
        </b>

        <span>
          Debit ${money(r.total_debit)}
          ·
          Credit ${money(r.total_credit)}
        </span>

      </div>

      <div class="tablewrap">

        <table>

          <thead>

            <tr>
              <th>Code</th>
              <th>Account</th>
              <th>Type</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>

          </thead>

          <tbody>

            ${
              r.rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(x.code)}
                    </td>

                    <td>
                      ${esc(x.account_name)}
                    </td>

                    <td>
                      ${esc(x.type)}
                    </td>

                    <td>
                      ${money(x.debit)}
                    </td>

                    <td>
                      ${money(x.credit)}
                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td
                  colspan="5"
                  class="empty">
                  No entries.
                </td>
              </tr>
              `
            }

          </tbody>

          <tfoot>

            <tr>

              <th colspan="3">
                Totals
              </th>

              <th>
                ${money(r.total_debit)}
              </th>

              <th>
                ${money(r.total_credit)}
              </th>

            </tr>

          </tfoot>

        </table>

      </div>

    </div>
    `;
}


/* =========================================================
   INVOICES
========================================================= */

async function invoicePage() {

  $('content').innerHTML =

    reportHeader(
      'Invoice Centre'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          Invoice Centre
        </h1>

        <p class="muted">
          Filter invoices and print/download
          only the invoices you need.
        </p>

      </div>

      <button
        class="secondary"
        id="pdf">
        Print / PDF
      </button>

    </div>

    <div class="panel no-print">

      <div class="filters">

        <label>
          Search
          <input
            id="invQ"
            placeholder="Invoice/customer/product">
        </label>

        <label>
          From
          <input
            type="date"
            id="invFrom">
        </label>

        <label>
          To
          <input
            type="date"
            id="invTo">
        </label>

        <button id="loadInv">
          Filter
        </button>

      </div>

    </div>

    <div id="invResult"></div>
    `;

  $('pdf').onclick =
    printPage;

  $('loadInv').onclick =
    loadInvoices;

  await loadInvoices();
}


async function loadInvoices() {

  const rows =
    await api(
      'filterInvoices',
      {
        q: $('invQ').value,
        from: $('invFrom').value,
        to: $('invTo').value
      }
    );

  $('invResult').innerHTML =

    `
    <div class="panel">

      <div class="tablewrap">

        <table>

          <thead>

            <tr>

              <th>Invoice</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th class="no-print">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            ${
              rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(x.invoice)}
                    </td>

                    <td>
                      ${esc(fmtDate(x.date))}
                    </td>

                    <td>
                      ${esc(x.customer_id)}
                    </td>

                    <td>
                      ${money(x.total)}
                    </td>

                    <td>
                      ${esc(x.payment_status)}
                    </td>

                    <td class="no-print">

                      <button
                        onclick="printInvoice('${esc(x.id)}')">
                        PDF
                      </button>

                      ${
                        String(
                          x.payment_status
                        ).toUpperCase() !== 'PAID'

                          ?

                          `
                          <button
                            onclick="startPaystack('${esc(x.id)}')">
                            Pay
                          </button>

                          <button
                            onclick="syncSalePayment('${esc(x.id)}')">
                            Sync
                          </button>
                          `

                          : ''
                      }

                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td
                  colspan="6"
                  class="empty">
                  No invoices match.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>
    `;
}


/* =========================================================
   PAYSTACK
========================================================= */

async function startPaystack(id) {

  const email =
    prompt(
      'Customer email for Paystack checkout:'
    );

  if (!email) return;

  try {

    const p =
      await api(
        'initializePayment',
        {
          sale_id: id,
          email
        }
      );

    if (
      p?.authorization_url
    ) {

      window.open(
        p.authorization_url,
        '_blank'
      );

      toast(
        'Paystack checkout opened. After payment, use Sync Payment in the invoice record.'
      );

    } else {

      throw new Error(
        'Paystack did not return a checkout URL.'
      );
    }

  } catch (e) {

    toast(
      e.message
    );
  }
}


async function syncSalePayment(id) {

  const ref =
    prompt(
      'Enter the Paystack transaction reference:'
    );

  if (!ref) return;

  try {

    const r =
      await api(
        'syncPaystack',
        {
          reference: ref,
          sale_id: id
        }
      );

    toast(
      'Payment verified: ' +
      r.status
    );

    await loadInvoices();

  } catch (e) {

    toast(
      e.message
    );
  }
}


/* =========================================================
   PRINT INVOICE
========================================================= */

async function printInvoice(id) {

  try {

    const x =
      await api(
        'generateInvoice',
        {
          id
        }
      );

    const oldContent =
      $('content').innerHTML;

    $('content').innerHTML =

      `
      <div class="invoice-print">

        ${reportHeader(
          'Tax / Sales Invoice'
        )}

        <h2>
          Invoice
          ${esc(x.sale.invoice)}
        </h2>

        <p>
          Date:
          ${esc(fmtDate(x.sale.date))}
        </p>

        <hr>

        <p>
          <b>Customer:</b>
          ${esc(
            x.customer?.name ||
            'Walk-in'
          )}
        </p>

        <p>
          <b>Phone:</b>
          ${esc(
            x.customer?.phone ||
            ''
          )}
        </p>

        <table>

          <thead>

            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>

          </thead>

          <tbody>

            <tr>

              <td>
                ${esc(x.product?.sku || '')}
              </td>

              <td>
                ${esc(x.product?.name || '')}
              </td>

              <td>
                ${esc(x.sale.quantity)}
              </td>

              <td>
                ${money(x.sale.unit_price)}
              </td>

              <td>
                ${money(x.sale.total)}
              </td>

            </tr>

          </tbody>

        </table>

        <h2>
          Total:
          ${money(x.sale.total)}
        </h2>

        <p>
          Payment:
          ${esc(x.sale.payment_status)}
          ${
            x.sale.payment_reference
              ? ' · ' +
                esc(
                  x.sale.payment_reference
                )
              : ''
          }
        </p>

      </div>
      `;

    window.print();

    setTimeout(
      () => {
        if ($('content')) {
          $('content').innerHTML =
            oldContent;
        }

        show('Invoices');
      },
      700
    );

  } catch (err) {

    toast(
      err.message
    );
  }
}


/* =========================================================
   MY ACTIVITY
========================================================= */

async function activityPage() {

  const rows =
    await api(
      'myActivity'
    );

  $('content').innerHTML =

    reportHeader(
      'My Activity Report'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        My Activity
      </h1>

      <button
        class="secondary"
        onclick="printPage()">
        Print / PDF
      </button>

    </div>

    <div class="panel">

      <div class="tablewrap">

        <table>

          <thead>

            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Module</th>
              <th>Status</th>
              <th>Message</th>
            </tr>

          </thead>

          <tbody>

            ${
              rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(
                        fmtDateTime(
                          x.timestamp
                        )
                      )}
                    </td>

                    <td>
                      ${esc(x.action)}
                    </td>

                    <td>
                      ${esc(x.table_name)}
                    </td>

                    <td>
                      ${esc(x.status)}
                    </td>

                    <td>
                      ${esc(x.message)}
                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td colspan="5">
                  No activity.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>
    `;
}


/* =========================================================
   AUDIT LOG
========================================================= */

async function auditPage() {

  if (
    S.user.role !== 'ADMIN'
  ) {

    toast(
      'Admin only'
    );

    return;
  }

  $('content').innerHTML =

    reportHeader(
      'Audit Log'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        Audit Log
      </h1>

      <button
        class="secondary"
        onclick="printPage()">
        Print / PDF
      </button>

    </div>

    <div class="panel no-print">

      <div class="filters">

        <label>
          From
          <input
            type="date"
            id="af">
        </label>

        <label>
          To
          <input
            type="date"
            id="at">
        </label>

        <label>
          User ID
          <input id="au">
        </label>

        <label>
          Action
          <input id="aa">
        </label>

        <label>
          Module
          <input id="am">
        </label>

        <label>
          Status
          <input id="as">
        </label>

        <button
          id="loadAudit">
          Filter
        </button>

      </div>

    </div>

    <div id="auditResult"></div>
    `;

  $('loadAudit').onclick =
    loadAudit;

  await loadAudit();
}


async function loadAudit() {

  const rows =
    await api(
      'auditReport',
      {
        from: $('af').value,
        to: $('at').value,
        user_id: $('au').value,
        action: $('aa').value,
        table_name: $('am').value,
        status: $('as').value
      }
    );

  $('auditResult').innerHTML =

    `
    <div class="panel">

      <div class="tablewrap">

        <table>

          <thead>

            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Status</th>
              <th>Message</th>
            </tr>

          </thead>

          <tbody>

            ${
              rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(
                        fmtDateTime(
                          x.timestamp
                        )
                      )}
                    </td>

                    <td>
                      ${esc(x.username)}
                    </td>

                    <td>
                      ${esc(x.action)}
                    </td>

                    <td>
                      ${esc(x.table_name)}
                    </td>

                    <td>
                      ${esc(x.status)}
                    </td>

                    <td>
                      ${esc(x.message)}
                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td colspan="6">
                  No audit entries.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>
    `;
}


/* =========================================================
   SHARED FILES / MANAGEMENT FILES
========================================================= */

async function filesPage(t) {

  const links =
    await api(
      'folderLinks'
    );

  const rows =
    await api(
      'list',
      {
        table: t
      }
    );

  const isMgmt =
    t === 'Management_Files';

  const folderUrl =
    isMgmt
      ? links.management
      : links.production;

  $('content').innerHTML =

    reportHeader(
      isMgmt
        ? 'Management Shared Folder'
        : 'Production & Resources'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>

          ${
            isMgmt
              ? 'Management Documents'
              : 'Shared Production Resources'
          }

        </h1>

        <p class="muted">

          Shared Google Drive resources
          available to authorized portal users.

        </p>

      </div>

      <div>

        ${
          folderUrl
            ? `
              <a
                class="button"
                href="${esc(folderUrl)}"
                target="_blank"
                rel="noopener">
                Open Shared Folder
              </a>
              `
            : ''
        }

        <button id="add">
          + Add resource
        </button>

      </div>

    </div>

    <div class="panel">

      <div class="tablewrap">

        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Resource</th>
            </tr>

          </thead>

          <tbody>

            ${
              rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(x.name)}
                    </td>

                    <td>
                      ${esc(x.description)}
                    </td>

                    <td>
                      ${esc(x.category)}
                    </td>

                    <td>

                      <a
                        href="${esc(x.url)}"
                        target="_blank"
                        rel="noopener">
                        Open
                      </a>

                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td colspan="4">
                  No resources listed.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>
    `;

  $('add').onclick =
    () => form(t);
}


/* =========================================================
   PAYROLL CENTRE
========================================================= */

async function payrollPage() {

  const rows =
    await api(
      'list',
      {
        table:
          'Payroll'
      }
    );

  const emps =
    await api(
      'linkedOptions',
      {
        table:
          'Payroll',
        field:
          'employee_id'
      }
    );

  $('content').innerHTML =

    reportHeader(
      'Payroll Centre'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          Payroll Centre
        </h1>

        <p class="muted">

          Filter by employee and period,
          then print a personalised payroll report.

        </p>

      </div>

      <button
        class="secondary"
        onclick="printPage()">
        Print / PDF
      </button>

    </div>

    <div class="panel no-print">

      <div class="filters">

        <label>

          Employee

          <select id="payEmp">

            <option value="">
              All employees
            </option>

            ${
              emps
              .map(
                o =>
                  `
                  <option
                    value="${esc(o.id)}">
                    ${esc(o.label)}
                  </option>
                  `
              )
              .join('')
            }

          </select>

        </label>

        <label>

          From

          <input
            type="month"
            id="payFrom">

        </label>

        <label>

          To

          <input
            type="month"
            id="payTo">

        </label>

        <button id="payFilter">
          Filter
        </button>

        <button
          class="secondary"
          id="payPersonal">
          Personalised PDF
        </button>

      </div>

    </div>

    <div id="payResult"></div>
    `;


  $('payFilter').onclick =
    render;

  $('payPersonal').onclick =
    personal;


  /*
    FILTERING
  */

  function filtered() {

    const eid =
      $('payEmp').value;

    const from =
      $('payFrom').value;

    const to =
      $('payTo').value;

    return rows.filter(
      r => {

        const period =
          String(
            r.period || ''
          ).slice(0, 7);

        return (
          (
            !eid ||
            String(r.employee_id) ===
            String(eid)
          )

          &&

          (
            !from ||
            period >= from
          )

          &&

          (
            !to ||
            period <= to
          )
        );
      }
    );
  }


  /*
    RENDER PAYROLL
  */

  function render() {

    const data =
      filtered();

    $('payResult').innerHTML =

      `
      <div class="panel">

        <div class="tablewrap">

          <table>

            <thead>

              <tr>

                <th>Period</th>
                <th>Employee</th>
                <th>Basic</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net pay</th>
                <th>Status</th>

              </tr>

            </thead>

            <tbody>

              ${
                data
                .map(
                  x =>
                    `
                    <tr>

                      <td>
                        ${esc(x.period)}
                      </td>

                      <td>

                        ${esc(
                          emps.find(
                            o =>
                              String(o.id) ===
                              String(x.employee_id)
                          )?.label
                          ||
                          x.employee_id
                        )}

                      </td>

                      <td>
                        ${money(x.basic_salary)}
                      </td>

                      <td>
                        ${money(x.allowances)}
                      </td>

                      <td>
                        ${money(x.deductions)}
                      </td>

                      <td>
                        <b>
                          ${money(x.net_pay)}
                        </b>
                      </td>

                      <td>
                        ${esc(x.status)}
                      </td>

                    </tr>
                    `
                )
                .join('')
                ||
                `
                <tr>
                  <td
                    colspan="7">
                    No payroll records match.
                  </td>
                </tr>
                `
              }

            </tbody>

          </table>

        </div>

      </div>
      `;
  }


  /*
    PERSONALISED PAYROLL REPORT
  */

  function personal() {

    const data =
      filtered();

    if (!data.length) {

      toast(
        'No payroll record matches the selected filter.'
      );

      return;
    }

    const eid =
      $('payEmp').value;

    if (!eid) {

      toast(
        'Select one employee for a personalised report.'
      );

      return;
    }

    const employee =
      emps.find(
        o =>
          String(o.id) ===
          String(eid)
      );

    $('content').innerHTML =

      reportHeader(
        'Personalised Payroll Report'
      )

      +

      `
      <div class="panel">

        <h2>
          ${esc(
            employee?.label ||
            eid
          )}
        </h2>

        <p>
          Generated:
          ${esc(
            new Date()
              .toLocaleString()
          )}
        </p>

        <table>

          <thead>

            <tr>
              <th>Period</th>
              <th>Basic</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${
              data
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(x.period)}
                    </td>

                    <td>
                      ${money(x.basic_salary)}
                    </td>

                    <td>
                      ${money(x.allowances)}
                    </td>

                    <td>
                      ${money(x.deductions)}
                    </td>

                    <td>
                      <b>
                        ${money(x.net_pay)}
                      </b>
                    </td>

                    <td>
                      ${esc(x.status)}
                    </td>

                  </tr>
                  `
              )
              .join('')
            }

          </tbody>

        </table>

        <h2>

          Total Net Pay:
          ${money(
            data.reduce(
              (s, x) =>
                s + num(x.net_pay),
              0
            )
          )}

        </h2>

      </div>
      `;

    window.print();

    setTimeout(
      () => show('Payroll'),
      700
    );
  }


  render();
}


/* =========================================================
   CALENDAR
========================================================= */

async function calendarPage() {

  const rows =
    await api(
      'list',
      {
        table:
          'Calendar'
      }
    );

  $('content').innerHTML =

    reportHeader(
      'Shared Calendar'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          Calendar / Events / Projects
        </h1>

        <p class="muted">
          Events and shared schedules create
          inbox alerts when assigned.
        </p>

      </div>

      <button id="add">
        + Add event
      </button>

    </div>

    <div class="panel">

      <div class="calendar-list">

        ${
          rows
          .sort(
            (a, b) =>
              String(a.start_at)
                .localeCompare(
                  String(b.start_at)
                )
          )
          .map(
            x =>
              `
              <article
                class="calendar-item">

                <b>
                  ${esc(x.title)}
                </b>

                <span>

                  ${esc(
                    fmtDateTime(
                      x.start_at
                    )
                  )}

                  ${
                    x.end_at
                      ? ' → ' +
                        esc(
                          fmtDateTime(
                            x.end_at
                          )
                        )
                      : ''
                  }

                </span>

                <small>

                  ${esc(x.type)}
                  ·
                  ${esc(x.priority)}
                  ·
                  ${esc(x.status)}

                </small>

                <p>
                  ${esc(
                    x.description || ''
                  )}
                </p>

              </article>
              `
          )
          .join('')
          ||
          `
          <div class="empty">
            No scheduled items.
          </div>
          `
        }

      </div>

    </div>
    `;

  $('add').onclick =
    () => form('Calendar');
}


/* =========================================================
   TASKS
========================================================= */

async function tasksPage() {

  const rows =
    await api(
      'list',
      {
        table:
          'Tasks'
      }
    );

  $('content').innerHTML =

    reportHeader(
      'Tasks'
    )

    +

    `
    <div class="toolbar no-print">

      <h1>
        Tasks & Projects
      </h1>

      <button id="add">
        + Add task
      </button>

    </div>

    <div class="panel">

      <div class="tablewrap">

        <table>

          <thead>

            <tr>

              <th>Task</th>
              <th>Title</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Progress</th>

            </tr>

          </thead>

          <tbody>

            ${
              rows
              .map(
                x =>
                  `
                  <tr>

                    <td>
                      ${esc(x.task_no)}
                    </td>

                    <td>
                      ${esc(x.title)}
                    </td>

                    <td>
                      ${esc(
                        fmtDate(
                          x.due_date
                        )
                      )}
                    </td>

                    <td>
                      ${esc(x.priority)}
                    </td>

                    <td>
                      ${esc(x.status)}
                    </td>

                    <td>
                      ${esc(x.progress)}%
                    </td>

                  </tr>
                  `
              )
              .join('')
              ||
              `
              <tr>
                <td colspan="6">
                  No tasks.
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

      </div>

    </div>
    `;

  $('add').onclick =
    () => form('Tasks');
}


/* =========================================================
   SETTINGS
========================================================= */

async function settingsPage() {

  if (
    S.user.role !== 'ADMIN'
  ) {

    toast(
      'Admin only'
    );

    return;
  }

  const cfg =
    await api(
      'paystackConfig'
    );

  $('content').innerHTML =

    reportHeader(
      'Portal & System Settings'
    )

    +

    `
    <div class="toolbar no-print">

      <div>

        <h1>
          Custom Portal
        </h1>

        <p class="muted">

          Branding, business identity
          and payment integration.

        </p>

      </div>

    </div>

    <div class="panel">

      <form
        id="settingsForm"
        class="grid">

        <label>

          Business name

          <input
            name="business_name"
            value="${esc(
              BIZ.business_name || ''
            )}">

        </label>

        <label>

          Portal name

          <input
            name="portal_name"
            value="${esc(
              BIZ.portal_name || ''
            )}">

        </label>

        <label>

          Address

          <input
            name="address"
            value="${esc(
              BIZ.address || ''
            )}">

        </label>

        <label>

          Email

          <input
            name="email"
            value="${esc(
              BIZ.email || ''
            )}">

        </label>

        <label>

          Phone

          <input
            name="phone"
            value="${esc(
              BIZ.phone || ''
            )}">

        </label>

        <label>

          Currency

          <input
            name="currency"
            value="${esc(
              BIZ.currency || 'KES'
            )}">

        </label>

        <label>

          Logo URL

          <input
            name="logo_url"
            value="${esc(
              BIZ.logo_url || ''
            )}">

        </label>

        <label>

          Theme color

          <input
            type="color"
            name="theme_color"
            value="${esc(
              BIZ.theme_color ||
              '#b91c1c'
            )}">

        </label>

        <label>

          Portal description

          <textarea
            name="portal_description">
${esc(
  BIZ.portal_description || ''
)}
          </textarea>

        </label>

        <div class="modal-actions">

          <button>
            Save branding
          </button>

        </div>

      </form>

    </div>

    <div class="panel">

      <h2>
        Paystack Africa
      </h2>

      <p class="muted">

        The secret key is stored in Apps Script
        Properties and is never returned
        to the browser.

      </p>

      <form
        id="paystackForm"
        class="grid">

        <label>

          Public key

          <input
            name="publicKey"
            value="${esc(
              cfg.publicKey || ''
            )}"
            placeholder="pk_live_...">

        </label>

        <label>

          Secret key

          <input
            name="secretKey"
            type="password"
            placeholder="sk_live_...">

        </label>

        <div class="modal-actions">

          <button>
            Save Paystack settings
          </button>

        </div>

      </form>

    </div>
    `;


  $('settingsForm').onsubmit =
    async e => {

      e.preventDefault();

      try {

        BIZ =
          await api(
            'settings',
            {
              data:
                Object.fromEntries(
                  new FormData(
                    e.target
                  )
                )
            }
          );

        applyBrand();

        toast(
          'Branding saved'
        );

      } catch (err) {

        toast(
          err.message
        );
      }
    };


  $('paystackForm').onsubmit =
    async e => {

      e.preventDefault();

      try {

        await api(
          'savePaystackConfig',
          {
            data:
              Object.fromEntries(
                new FormData(
                  e.target
                )
              )
          }
        );

        toast(
          'Paystack configuration saved securely'
        );

      } catch (err) {

        toast(
          err.message
        );
      }
    };
}


/* =========================================================
   DELETE
========================================================= */

async function remove(t, id) {

  if (
    S.user.role !== 'ADMIN'
  ) {

    toast(
      'Only Admin can delete important records.'
    );

    return;
  }

  if (
    !confirm(
      'Delete this record? This action is permanently logged.'
    )
  ) {
    return;
  }

  try {

    await api(
      'delete',
      {
        table: t,
        id
      }
    );

    toast(
      'Deleted successfully'
    );

    await show(t);

  } catch (e) {

    toast(
      e.message
    );
  }
}


/* =========================================================
   PRINT
========================================================= */

function printPage() {

  const old =
    document.title;

  document.title =
    (
      BIZ?.business_name ||
      'Modaxoft Poultry'
    )
    +
    ' - '
    +
    label(page);

  window.print();

  setTimeout(
    () => {
      document.title = old;
    },
    1000
  );
}


/* =========================================================
   MODAL
========================================================= */

function closeModal() {

  if ($('modal')) {
    $('modal').hidden = true;
  }
}


if ($('close')) {

  $('close').onclick =
    closeModal;
}


if ($('modal')) {

  $('modal').onclick =
    e => {

      if (
        e.target ===
        $('modal')
      ) {
        closeModal();
      }
    };
}


/* =========================================================
   LOGOUT
========================================================= */

if ($('logout')) {

  $('logout').onclick =
    async () => {

      try {

        await api(
          'logout'
        );

      } catch (e) {

        console.warn(
          'Logout API failed',
          e
        );
      }

      localStorage.removeItem(
        'mp_v5'
      );

      S = null;

      closeSidebar();

      boot();
    };
}


/* =========================================================
   SIDEBAR
========================================================= */

if ($('menu')) {

  $('menu').onclick =
    toggleSidebar;
}


if ($('closeSidebar')) {

  $('closeSidebar').onclick =
    closeSidebar;
}


if ($('sidebarBackdrop')) {

  $('sidebarBackdrop').onclick =
    closeSidebar;
}


function toggleSidebar() {

  if (!$('sidebar')) return;

  $('sidebar')
    .classList
    .toggle('open');

  if ($('sidebarBackdrop')) {

    $('sidebarBackdrop')
      .classList
      .toggle('show');
  }
}


function closeSidebar() {

  if ($('sidebar')) {

    $('sidebar')
      .classList
      .remove('open');
  }

  if ($('sidebarBackdrop')) {

    $('sidebarBackdrop')
      .classList
      .remove('show');
  }
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  if (!$('toast')) {

    alert(message);

    return;
  }

  $('toast').textContent =
    message;

  $('toast')
    .classList
    .add('show');

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(
      () =>
        $('toast')
          .classList
          .remove('show'),
      3200
    );
}


/* =========================================================
   PASSWORD SHOW / HIDE
========================================================= */

const togglePassword =
  $('togglePassword');

if (togglePassword) {

  togglePassword.onclick =
    () => {

      const p =
        $('password');

      if (!p) return;

      const on =
        p.type === 'password';

      p.type =
        on
          ? 'text'
          : 'password';

      togglePassword.textContent =
        on
          ? 'Hide'
          : 'Show';
    };
}


/* =========================================================
   CLEAR LOGIN
========================================================= */

const clearLogin =
  $('clearLogin');

if (clearLogin) {

  clearLogin.onclick =
    () => {

      if ($('username')) {
        $('username').value = '';
      }

      if ($('password')) {
        $('password').value = '';
      }

      if ($('error')) {
        $('error').hidden = true;
      }

      if ($('username')) {
        $('username').focus();
      }
    };
}


/* =========================================================
   GLOBAL ESCAPE KEY
========================================================= */

document.addEventListener(
  'keydown',
  e => {

    if (
      e.key === 'Escape'
    ) {

      if (
        $('modal') &&
        !$('modal').hidden
      ) {

        closeModal();

      } else {

        closeSidebar();

      }
    }
  }
);


/* =========================================================
   START APPLICATION
========================================================= */

boot();