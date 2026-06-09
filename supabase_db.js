const SB_URL = 'https://jlltvarrtcgzsmqxlssb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbHR2YXJydGNnenNtcXhsc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDMsImV4cCI6MjA5NTM2MzcwM30.EAE4Cw-rhCyeiEjuXBmM77hIr6qqRTMnx3SnG5DKx3I';

let _sb    = null;
let _ready = false;

const TABLES = {
  'hops-depts': {
    table: 'departments',
    pack:   o => ({ id: o.id, name: o.name||'', head: o.head||'', contact: o.contact||'' }),
    unpack: r => ({ id: r.id, name: r.name||'', head: r.head||'', contact: r.contact||'' }),
  },
  'hops-employees': {
    table: 'employees',
    pack:   o => ({ id: o.id, name: o.name||'', dept: o.dept||'', designation: o.designation||'', email: o.email||'', password: o.password||'', username: o.username||'' }),
    unpack: r => ({ id: r.id, name: r.name||'', dept: r.dept||'', designation: r.designation||'', email: r.email||'', password: r.password||'', username: r.username||'' }),
  },
  'hops-admins': {
    table: 'admins',
    pack:   o => ({ id: o.id, name: o.name||'', username: o.username||'', email: o.email||'', password: o.password||'', role: o.role||'', dept: o.dept||'', perms: o.perms||{}, created_by: o.createdBy||'' }),
    unpack: r => ({ id: r.id, name: r.name||'', username: r.username||'', email: r.email||'', password: r.password||'', role: r.role||'', dept: r.dept||'', perms: r.perms||{}, createdBy: r.created_by||'' }),
  },
  'hops-tasks': {
    table: 'tasks',
    pack: o => ({
      id: o.id, name: o.name||'', dept: o.dept||'', freq: o.freq||'daily',
      assigned_to: o.assignedTo||[], assignee_emails: o.assigneeEmails||[],
      time: o.time||'', sched_date: o.schedDate||'', priority: o.priority||'medium',
      notes: o.notes||'', last_done: o.lastDone||'', status: o.status||'pending',
      done_by: o.doneBy||'', done_time: o.doneTime||'', done_remark: o.doneRemark||'',
      delay_reason: o.delayReason||'', is_delayed: o.isDelayed||false,
      created: o.created||'', created_by: o.createdBy||'', activity_log: o.activityLog||[]
    }),
    unpack: r => ({
      id: r.id, name: r.name||'', dept: r.dept||'', freq: r.freq||'daily',
      assignedTo: r.assigned_to||[], assigneeEmails: r.assignee_emails||[],
      time: r.time||'', schedDate: r.sched_date||'', priority: r.priority||'medium',
      notes: r.notes||'', lastDone: r.last_done||'', status: r.status||'pending',
      doneBy: r.done_by||'', doneTime: r.done_time||'', doneRemark: r.done_remark||'',
      delayReason: r.delay_reason||'', isDelayed: r.is_delayed||false,
      created: r.created||'', createdBy: r.created_by||'', activityLog: r.activity_log||[]
    }),
  },
  'hops-issues': {
    table: 'issues',
    pack: o => ({
      id: o.id, title: o.title||'', dept: o.dept||'', priority: o.priority||'medium',
      reporter: o.reporter||'', assigned: o.assigned||'', description: o.desc||'',
      status: o.status||'open', date: o.date||'',
      resolve_remark: o.resolveRemark||'', resolve_by: o.resolveBy||'', resolved_at: o.resolvedAt||null
    }),
    unpack: r => ({
      id: r.id, title: r.title||'', dept: r.dept||'', priority: r.priority||'medium',
      reporter: r.reporter||'', assigned: r.assigned||'', desc: r.description||'',
      status: r.status||'open', date: r.date||'',
      resolveRemark: r.resolve_remark||'', resolveBy: r.resolve_by||'', resolvedAt: r.resolved_at||''
    }),
  },
  'hops-handovers': {
    table: 'handovers',
    pack: o => ({
      id: o.id, name: o.name||'', designation: o.designation||'', dept: o.dept||'',
      date: o.date||'', handover_to: o.to||'', tasks: o.tasks||'',
      pending: o.pending||'', supervisor: o.sup||o.supervisor||'',
      status: o.status||'pending', created_by: o.createdBy||''
    }),
    unpack: r => ({
      id: r.id, name: r.name||'', designation: r.designation||'', dept: r.dept||'',
      date: r.date||'', to: r.handover_to||'', tasks: r.tasks||'',
      pending: r.pending||'', sup: r.supervisor||'', supervisor: r.supervisor||'',
      status: r.status||'pending', createdBy: r.created_by||''
    }),
  },
  'hops-delegations': {
    table: 'delegations',
    pack: o => ({
      id: o.id, task_name: o.taskName||'', dept: o.dept||'', priority: o.priority||'medium',
      doer_id: o.doerId||'', doer_name: o.doerName||'',
      delegated_by: o.delegatedBy||'', exp_date: o.expDate||'', exp_time: o.expTime||'',
      notes: o.notes||'', status: o.status||'pending', created_date: o.createdDate||'',
      actual_date: o.actualDate||'', actual_time: o.actualTime||'',
      done_remark: o.doneRemark||'', delay_reason: o.delayReason||'',
      is_delayed: o.isDelayed||false, extensions: o.extensions||[], activity_log: o.activityLog||[]
    }),
    unpack: r => ({
      id: r.id, taskName: r.task_name||'', dept: r.dept||'', priority: r.priority||'medium',
      doerId: r.doer_id||'', doerName: r.doer_name||'',
      delegatedBy: r.delegated_by||'', expDate: r.exp_date||'', expTime: r.exp_time||'',
      notes: r.notes||'', status: r.status||'pending', createdDate: r.created_date||'',
      actualDate: r.actual_date||'', actualTime: r.actual_time||'',
      doneRemark: r.done_remark||'', delayReason: r.delay_reason||'',
      isDelayed: r.is_delayed||false, extensions: r.extensions||[], activityLog: r.activity_log||[]
    }),
  },
  'hops-actlog': {
    table: 'activity_log',
    pack:   o => ({ id: o.id, by_user: o.by||'', role: o.role||'', action: o.action||'', details: o.details||'', at_str: o.atStr||'' }),
    unpack: r => ({ id: r.id, by: r.by_user||'', role: r.role||'', action: r.action||'', details: r.details||'', at: r.created_at||'', atStr: r.at_str||'' }),
  },
  'hops-trash': {
    table: 'trash',
    pack:   o => ({ id: o.id, type: o.type||'', data: o.data||{}, deleted_by: o.deletedBy||'', deleted_at: o.deletedAt||new Date().toISOString(), auto_delete_at: o.autoDeleteAt||'' }),
    unpack: r => ({ id: r.id, type: r.type||'', data: r.data||{}, deletedBy: r.deleted_by||'', deletedAt: r.deleted_at||'', autoDeleteAt: r.auto_delete_at||'' }),
  },
};

const LINKS_TABLE = 'user_links';
function isLinkKey(key) { return typeof key === 'string' && key.startsWith('hops-links-'); }
function linkUsernameFromKey(key) { return key.replace('hops-links-', ''); }

function updateAppVariable(key, data) {
  const varMap = {
    'hops-depts':       'depts',
    'hops-employees':   'employees',
    'hops-admins':      'admins',
    'hops-tasks':       'tasks',
    'hops-issues':      'issues',
    'hops-handovers':   'handovers',
    'hops-delegations': 'delegations',
    'hops-actlog':      'actLog',
    'hops-trash':       'trash',
  };
  const varName = varMap[key];
  if (!varName) return;
  if (typeof window[varName] !== 'undefined') {
    window[varName] = data;
    return;
  }
  let tries = 0;
  const retry = setInterval(() => {
    tries++;
    if (typeof window[varName] !== 'undefined') {
      window[varName] = data;
      clearInterval(retry);
    } else if (tries >= 20) {
      clearInterval(retry);
      window[varName] = data;
    }
  }, 100);
}

window.ld = function(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

// ================================================================
// MAIN FIX: sv() function — Supabase + localStorage dono mein save
// window._supabaseSv set karta hai taaki index.html ka var sv
// automatically is function ko call kare
// ================================================================
async function _svImpl(key, val) {
  // localStorage mein turant save
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}

  // Supabase mein save
  if (!_ready || !_sb) return;

  if (isLinkKey(key)) {
    if (!Array.isArray(val)) return;
    const username = linkUsernameFromKey(key);
    try {
      if (val.length > 0) {
        const rows = val.map(o => ({
          id: o.id, username, name: o.name||'',
          url: o.url||'', emoji: o.emoji||'🔗',
          added_at: o.addedAt||new Date().toISOString()
        }));
        const { error } = await _sb.from(LINKS_TABLE).upsert(rows, { onConflict: 'id' });
        if (error) console.error('Links save error:', error.message);
      }
    } catch(e) { console.error('Links exception:', e.message||e); }
    return;
  }

  if (!TABLES[key]) return;
  const cfg = TABLES[key];
  if (!Array.isArray(val)) return;
  try {
    if (val.length > 0) {
      const rows = val.map(cfg.pack);
      const { error: upsertErr } = await _sb.from(cfg.table).upsert(rows, { onConflict: 'id' });
      if (upsertErr) console.error('Upsert error ['+key+']:', upsertErr.message);
      else console.log('Saved ['+key+'] —', val.length, 'records');
    }
  } catch(e) { console.error('sv() exception:', e.message||e); }
}

// window.sv AND window._supabaseSv dono set karo
window.sv = _svImpl;
window._supabaseSv = _svImpl;

async function loadFromSupabase() {
  const keys = Object.keys(TABLES);
  for (const key of keys) {
    const cfg = TABLES[key];
    try {
      let query = _sb.from(cfg.table).select('*');
      if (cfg.table === 'activity_log') {
        query = query.order('created_at', { ascending: false }).limit(500);
      }
      const { data, error } = await query;
      if (error) { console.warn('Load error ['+key+']:', error.message); continue; }
      const parsed = (data||[]).map(cfg.unpack);
      localStorage.setItem(key, JSON.stringify(parsed));
      updateAppVariable(key, parsed);
    } catch(e) { console.warn('Load exception ['+key+']:', e.message||e); }
  }
  console.log('Supabase se saara data load ho gaya!');
}

window.loadUserLinks = async function() {
  if (!_ready || !_sb) return;
  const username = (typeof currentUser !== 'undefined' && currentUser.name) ? currentUser.name : '';
  if (!username) return;
  try {
    const { data, error } = await _sb.from(LINKS_TABLE).select('*').eq('username', username);
    if (error) { console.warn('Links load error:', error.message); return; }
    const links = (data||[]).map(r => ({
      id: r.id, name: r.name||'', url: r.url||'',
      emoji: r.emoji||'🔗', addedAt: r.added_at||''
    }));
    localStorage.setItem('hops-links-'+username, JSON.stringify(links));
  } catch(e) { console.warn('loadUserLinks exception:', e.message||e); }
};

function setupRealtime() {
  const realtimeTables = ['tasks', 'issues', 'departments', 'employees', 'delegations', 'admins'];
  realtimeTables.forEach(tableName => {
    _sb.channel('rt-' + tableName)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async () => {
        const key = Object.keys(TABLES).find(k => TABLES[k].table === tableName);
        if (!key) return;
        const { data } = await _sb.from(tableName).select('*');
        if (!data) return;
        const parsed = data.map(TABLES[key].unpack);
        localStorage.setItem(key, JSON.stringify(parsed));
        updateAppVariable(key, parsed);
        if (typeof renderPage === 'function' && typeof currentPage !== 'undefined') renderPage(currentPage);
        if (typeof updateBadges === 'function') updateBadges();
      })
      .subscribe();
  });
  console.log('Realtime active!');
}

// dbDelete — startDB ke BAHAR (bug fix)
window.dbDelete = async function(type, id) {
  if (!_ready || !_sb) return;
  const tableMap = {
    'task': 'tasks', 'issue': 'issues', 'employee': 'employees',
    'dept': 'departments', 'admin': 'admins', 'handover': 'handovers', 'delegation': 'delegations',
  };
  const tableName = tableMap[type];
  if (!tableName) return;
  try {
    const { error } = await _sb.from(tableName).delete().eq('id', id);
    if (error) console.error('DB Delete error ['+type+']:', error.message);
    else console.log('DB se delete ho gaya ['+type+'] id:', id);
  } catch(e) { console.error('dbDelete exception:', e.message || e); }
};

(async function startDB() {
  const bar = document.createElement('div');
  bar.id = 'db-loading-bar';
  Object.assign(bar.style, {
    position:'fixed', top:'0', left:'0', right:'0', zIndex:'99999',
    background:'#0b4d6b', color:'#fff', textAlign:'center',
    padding:'11px', fontFamily:'Inter,sans-serif',
    fontSize:'13px', fontWeight:'700', letterSpacing:'0.3px'
  });
  bar.textContent = '⏳ Database se connect ho raha hai...';
  document.body.appendChild(bar);

  try {
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload  = resolve;
        script.onerror = () => reject(new Error('Supabase SDK load nahi hua'));
        document.head.appendChild(script);
      });
    }

    _sb = window.supabase.createClient(SB_URL, SB_KEY);

    const { error: testErr } = await _sb.from('departments').select('id').limit(1);
    if (testErr) throw new Error('Connection failed: ' + testErr.message);

    bar.textContent = '⏳ Data load ho raha hai...';
    await loadFromSupabase();

    setupRealtime();
    _ready = true;

    // sv function update karo ab ki _ready = true hai
    window.sv = _svImpl;
    window._supabaseSv = _svImpl;

    bar.style.background = '#1a5c3a';
    bar.textContent = '✅ Database connected! Data load ho gaya.';
    setTimeout(() => bar.remove(), 2500);

    if (typeof currentRole !== 'undefined' && currentRole) {
      if (typeof renderPage === 'function') renderPage(currentPage);
      if (typeof updateBadges === 'function') updateBadges();
      if (typeof buildSidebar === 'function') buildSidebar();
    } else {
      if (typeof loadSession === 'function' && loadSession()) {
        if (currentRole === 'mainadmin' && typeof scheduleAllReminders === 'function') {
          scheduleAllReminders();
        }
        if (typeof startApp === 'function') startApp();
      }
    }

  } catch(err) {
    console.error('DB Error:', err.message);
    bar.style.background = '#7a1a1a';
    bar.textContent = '❌ Database Error: ' + err.message + ' — Offline mode mein chal raha hai';
    setTimeout(() => bar.remove(), 7000);
  }
})();
