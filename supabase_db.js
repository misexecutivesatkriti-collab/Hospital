// ================================================================
//  supabase_db.js — Hospital Ops System
//  FIXED VERSION v3
//
//  Fix 1: sv() — agar Supabase ready nahi hai to queue mein rakh
//          aur ready hone par flush karo (task gayab hone ka fix)
//  Fix 2: runAutoCycleAndSync() — alreadyExists check fixed
//          (done task refresh pe pending nahi hoga)
// ================================================================

const SB_URL = 'https://jlltvarrtcgzsmqxlssb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbHR2YXJydGNnenNtcXhsc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDMsImV4cCI6MjA5NTM2MzcwM30.EAE4Cw-rhCyeiEjuXBmM77hIr6qqRTMnx3SnG5DKx3I';

let _sb    = null;
let _ready = false;

// ✅ FIX 1: Save queue — jab tak Supabase ready nahi, saves queue mein rakho
const _saveQueue = []; // {key, val}[]

// ================================================================
//  TABLE MAP
// ================================================================
const TABLES = {

  'hops-depts': {
    table: 'departments',
    pack:   o => ({ id: o.id, name: o.name||'', head: o.head||'', contact: o.contact||'' }),
    unpack: r => ({ id: r.id, name: r.name||'', head: r.head||'', contact: r.contact||'' }),
  },

  'hops-employees': {
    table: 'employees',
    pack:   o => ({
      id:          o.id,
      name:        o.name        || '',
      username:    o.username    || o.name || '',
      dept:        o.dept        || '',
      designation: o.designation || '',
      email:       o.email       || '',
      password:    o.password    || ''
    }),
    unpack: r => ({
      id:          r.id,
      name:        r.name        || '',
      username:    r.username    || r.name || '',
      dept:        r.dept        || '',
      designation: r.designation || '',
      email:       r.email       || '',
      password:    r.password    || ''
    }),
  },

  'hops-admins': {
    table: 'admins',
    pack:   o => ({
      id:         o.id,
      name:       o.name       || '',
      username:   o.username   || '',
      email:      o.email      || '',
      password:   o.password   || '',
      role:       o.role       || '',
      dept:       o.dept       || '',
      perms:      o.perms      || {},
      created_by: o.createdBy  || ''
    }),
    unpack: r => ({
      id:        r.id,
      name:      r.name      || '',
      username:  r.username  || '',
      email:     r.email     || '',
      password:  r.password  || '',
      role:      r.role      || '',
      dept:      r.dept      || '',
      perms:     r.perms     || {},
      createdBy: r.created_by || ''
    }),
  },

  'hops-tasks': {
    table: 'tasks',
    pack: o => ({
      id:              o.id,
      name:            o.name            || '',
      dept:            o.dept            || '',
      freq:            o.freq            || 'daily',
      assigned_to:     o.assignedTo      || [],
      assignee_emails: o.assigneeEmails  || [],
      time:            o.time            || '',
      sched_date:      o.schedDate       || '',
      priority:        o.priority        || 'medium',
      notes:           o.notes           || '',
      last_done:       o.lastDone        || '',
      status:          o.status          || 'pending',
      done_by:         o.doneBy          || '',
      done_time:       o.doneTime        || '',
      done_remark:     o.doneRemark      || '',
      delay_reason:    o.delayReason     || '',
      is_delayed:      o.isDelayed       || false,
      created:         o.created         || '',
      created_by:      o.createdBy       || '',
      activity_log:    o.activityLog     || [],
      completion_history: o.completionHistory || [],
      parent_task_id:  o.parentTaskId    || ''
    }),
    unpack: r => ({
      id:                 r.id,
      name:               r.name            || '',
      dept:               r.dept            || '',
      freq:               r.freq            || 'daily',
      assignedTo:         r.assigned_to     || [],
      assigneeEmails:     r.assignee_emails || [],
      time:               r.time            || '',
      schedDate:          r.sched_date      || '',
      priority:           r.priority        || 'medium',
      notes:              r.notes           || '',
      lastDone:           r.last_done       || '',
      status:             r.status          || 'pending',
      doneBy:             r.done_by         || '',
      doneTime:           r.done_time       || '',
      doneRemark:         r.done_remark     || '',
      delayReason:        r.delay_reason    || '',
      isDelayed:          r.is_delayed      || false,
      created:            r.created         || '',
      createdBy:          r.created_by      || '',
      activityLog:        r.activity_log    || [],
      completionHistory:  r.completion_history || [],
      parentTaskId:       r.parent_task_id  || ''
    }),
  },

  'hops-issues': {
    table: 'issues',
    pack: o => ({
      id:             o.id,
      title:          o.title          || '',
      dept:           o.dept           || '',
      priority:       o.priority       || 'medium',
      reporter:       o.reporter       || '',
      assigned:       o.assigned       || '',
      description:    o.desc           || '',
      status:         o.status         || 'open',
      date:           o.date           || '',
      resolve_remark: o.resolveRemark  || '',
      resolve_by:     o.resolveBy      || '',
      resolved_at:    o.resolvedAt     || null
    }),
    unpack: r => ({
      id:            r.id,
      title:         r.title          || '',
      dept:          r.dept           || '',
      priority:      r.priority       || 'medium',
      reporter:      r.reporter       || '',
      assigned:      r.assigned       || '',
      desc:          r.description    || '',
      status:        r.status         || 'open',
      date:          r.date           || '',
      resolveRemark: r.resolve_remark || '',
      resolveBy:     r.resolve_by     || '',
      resolvedAt:    r.resolved_at    || ''
    }),
  },

  'hops-handovers': {
    table: 'handovers',
    pack: o => ({
      id:           o.id,
      name:         o.name          || '',
      designation:  o.designation   || '',
      dept:         o.dept          || '',
      date:         o.date          || '',
      handover_to:  o.to            || '',
      tasks:        o.tasks         || '',
      pending:      o.pending       || '',
      supervisor:   o.sup || o.supervisor || '',
      status:       o.status        || 'pending',
      created_by:   o.createdBy     || ''
    }),
    unpack: r => ({
      id:          r.id,
      name:        r.name          || '',
      designation: r.designation   || '',
      dept:        r.dept          || '',
      date:        r.date          || '',
      to:          r.handover_to   || '',
      tasks:       r.tasks         || '',
      pending:     r.pending       || '',
      sup:         r.supervisor    || '',
      supervisor:  r.supervisor    || '',
      status:      r.status        || 'pending',
      createdBy:   r.created_by    || ''
    }),
  },

  'hops-delegations': {
    table: 'delegations',
    pack: o => ({
      id:            o.id,
      task_name:     o.taskName     || '',
      dept:          o.dept         || '',
      priority:      o.priority     || 'medium',
      doer_id:       o.doerId       || '',
      doer_name:     o.doerName     || '',
      delegated_by:  o.delegatedBy  || '',
      exp_date:      o.expDate      || '',
      exp_time:      o.expTime      || '',
      notes:         o.notes        || '',
      status:        o.status       || 'pending',
      created_date:  o.createdDate  || '',
      actual_date:   o.actualDate   || '',
      actual_time:   o.actualTime   || '',
      done_remark:   o.doneRemark   || '',
      delay_reason:  o.delayReason  || '',
      is_delayed:    o.isDelayed    || false,
      extensions:    o.extensions   || [],
      activity_log:  o.activityLog  || []
    }),
    unpack: r => ({
      id:           r.id,
      taskName:     r.task_name    || '',
      dept:         r.dept         || '',
      priority:     r.priority     || 'medium',
      doerId:       r.doer_id      || '',
      doerName:     r.doer_name    || '',
      delegatedBy:  r.delegated_by || '',
      expDate:      r.exp_date     || '',
      expTime:      r.exp_time     || '',
      notes:        r.notes        || '',
      status:       r.status       || 'pending',
      createdDate:  r.created_date || '',
      actualDate:   r.actual_date  || '',
      actualTime:   r.actual_time  || '',
      doneRemark:   r.done_remark  || '',
      delayReason:  r.delay_reason || '',
      isDelayed:    r.is_delayed   || false,
      extensions:   r.extensions   || [],
      activityLog:  r.activity_log || []
    }),
  },

  'hops-actlog': {
    table: 'activity_log',
    pack:   o => ({
      id:       o.id,
      by_user:  o.by      || '',
      role:     o.role    || '',
      action:   o.action  || '',
      details:  o.details || '',
      at_str:   o.atStr   || ''
    }),
    unpack: r => ({
      id:     r.id,
      by:     r.by_user   || '',
      role:   r.role      || '',
      action: r.action    || '',
      details:r.details   || '',
      at:     r.created_at|| '',
      atStr:  r.at_str    || ''
    }),
  },

  'hops-trash': {
    table: 'trash',
    pack:   o => ({
      id:             o.id,
      type:           o.type          || '',
      data:           o.data          || {},
      deleted_by:     o.deletedBy     || '',
      deleted_at:     o.deletedAt     || new Date().toISOString(),
      auto_delete_at: o.autoDeleteAt  || ''
    }),
    unpack: r => ({
      id:           r.id,
      type:         r.type           || '',
      data:         r.data           || {},
      deletedBy:    r.deleted_by     || '',
      deletedAt:    r.deleted_at     || '',
      autoDeleteAt: r.auto_delete_at || ''
    }),
  },

};

// ── USER LINKS ──
const LINKS_TABLE = 'user_links';
function isLinkKey(key) { return typeof key === 'string' && key.startsWith('hops-links-'); }
function linkUsernameFromKey(key) { return key.replace('hops-links-', ''); }

// ================================================================
//  updateAppVariable()
// ================================================================
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

// ================================================================
//  ld()
// ================================================================
window.ld = function(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

// ================================================================
//  _doSupabaseSave() — actual Supabase upsert
// ================================================================
async function _doSupabaseSave(key, val) {
  // USER LINKS
  if (isLinkKey(key)) {
    if (!Array.isArray(val)) return;
    const username = linkUsernameFromKey(key);
    try {
      if (val.length > 0) {
        const rows = val.map(o => ({
          id:       o.id,
          username,
          name:     o.name     || '',
          url:      o.url      || '',
          emoji:    o.emoji    || '🔗',
          added_at: o.addedAt  || new Date().toISOString()
        }));
        const { error } = await _sb.from(LINKS_TABLE).upsert(rows, { onConflict: 'id' });
        if (error) console.error('❌ Links save error:', error.message);
      }
    } catch(e) { console.error('❌ Links exception:', e.message||e); }
    return;
  }

  if (!TABLES[key]) return;
  const cfg = TABLES[key];
  if (!Array.isArray(val)) return;

  try {
    if (val.length > 0) {
      const rows = val.map(cfg.pack);
      const { error } = await _sb.from(cfg.table).upsert(rows, { onConflict: 'id' });
      if (error) console.error('❌ Upsert error ['+key+']:', error.message);
      else console.log('✅ Saved ['+key+'] —', val.length, 'records');
    }
  } catch(e) { console.error('❌ sv() exception:', e.message||e); }
}

// ================================================================
//  ✅ FIX 1: sv() — Queue support
//  Agar Supabase ready nahi to queue mein daalo
//  Ready hone par flushSaveQueue() sab ek saath save karega
// ================================================================
window.sv = async function(key, val) {
  // Step 1: localStorage mein turant save (hamesha)
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}

  // Step 2: Supabase ready hai to seedha save, warna queue mein
  if (!_ready || !_sb) {
    // Queue mein daalo — same key ki purani entry replace karo
    const existingIdx = _saveQueue.findIndex(q => q.key === key);
    if (existingIdx >= 0) {
      _saveQueue[existingIdx] = { key, val };
    } else {
      _saveQueue.push({ key, val });
    }
    console.log('⏳ Queued ['+key+'] — Supabase ready nahi hai abhi');
    return;
  }

  await _doSupabaseSave(key, val);
};

// ================================================================
//  flushSaveQueue() — Ready hone par queue flush karo
// ================================================================
async function flushSaveQueue() {
  if (_saveQueue.length === 0) return;
  console.log('🔄 Queue flush kar raha hai —', _saveQueue.length, 'pending saves...');
  const toFlush = [..._saveQueue];
  _saveQueue.length = 0; // clear queue
  for (const item of toFlush) {
    await _doSupabaseSave(item.key, item.val);
  }
  console.log('✅ Queue flush complete!');
}

// ================================================================
//  ✅ FIX 2: runAutoCycleAndSync() — alreadyExists check fixed
//
//  Bug tha: x.id === t.id condition match kar raha tha done task
//  ko hi — isliye alreadyExists = false rehta tha aur nayi copy
//  ban jaati thi even though task already done tha aaj ke liye.
//
//  Fix: Sirf PENDING copies check karo aur parentTaskId match karo
//  Done task ke liye lastDone === today check bhi add kiya
// ================================================================
async function runAutoCycleAndSync() {
  if (!_ready || !_sb) return;

  const today = new Date().toISOString().slice(0, 10);
  const currentTasks = window.tasks || [];

  function isTaskDueTodayLocal(task) {
    const todayDate = new Date();
    const dd = todayDate.getDate(), mm = todayDate.getMonth(), yy = todayDate.getFullYear();
    const freq = task.freq || 'daily';
    const orig = task.schedDate ? new Date(task.schedDate + 'T00:00:00') : null;
    const origDay   = orig ? orig.getDate()  : null;
    const origMonth = orig ? orig.getMonth() : null;

    if (freq === 'daily') return true;
    if (freq === '15-day') {
      if (!orig || todayDate < orig) return false;
      const diffDays = Math.floor((todayDate - orig) / (1000 * 60 * 60 * 24));
      return diffDays % 15 === 0;
    }
    if (freq === 'monthly') {
      if (!orig || todayDate < orig) return false;
      return dd === Math.min(origDay, new Date(yy, mm + 1, 0).getDate());
    }
    if (freq === 'quarterly') {
      if (!orig || todayDate < orig) return false;
      const mDiff = (yy - orig.getFullYear()) * 12 + (mm - origMonth);
      if (mDiff % 3 !== 0) return false;
      return dd === Math.min(origDay, new Date(yy, mm + 1, 0).getDate());
    }
    if (freq === 'half-yearly') {
      if (!orig || todayDate < orig) return false;
      const mDiff = (yy - orig.getFullYear()) * 12 + (mm - origMonth);
      if (mDiff % 6 !== 0) return false;
      return dd === Math.min(origDay, new Date(yy, mm + 1, 0).getDate());
    }
    if (freq === 'yearly') {
      if (!orig || todayDate < orig) return false;
      return mm === origMonth && dd === Math.min(origDay, new Date(yy, origMonth + 1, 0).getDate());
    }
    return false;
  }

  const fDateTime = () => new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
  });
  const uid = () => 'id-' + Date.now() + Math.random().toString(36).slice(2, 6);

  const newTasks = [];

  currentTasks.forEach(t => {
    // Sirf "done" tasks check karein
    if (t.status !== 'done') return;

    // ✅ FIX: Agar aaj ki date pe done hua hai to cycle nahi chahiye
    if (t.lastDone === today) return;

    // Agar aaj due nahi hai to skip
    if (!isTaskDueTodayLocal(t)) return;

    // ✅ FIX: alreadyExists — sirf PENDING copies check karo
    // x.id === t.id wali condition REMOVE kari — woh done task khud tha
    const alreadyExists = currentTasks.some(
      x => x.parentTaskId === t.id &&   // yeh t ki COPY hai
           x.schedDate === today &&      // aaj ke liye hai
           x.status === 'pending'        // abhi bhi pending hai
    );
    if (alreadyExists) return;

    // Nayi pending copy banao
    const copy = {
      id:                 uid(),
      name:               t.name,
      dept:               t.dept,
      freq:               t.freq,
      assignedTo:         [...(t.assignedTo || [])],
      assigneeEmails:     [...(t.assigneeEmails || [])],
      time:               t.time || '',
      schedDate:          today,
      priority:           t.priority,
      notes:              t.notes || '',
      status:             'pending',
      doneBy:             '',
      doneTime:           '',
      doneRemark:         '',
      delayReason:        '',
      isDelayed:          false,
      lastDone:           '',
      completionHistory:  [],
      created:            today,
      createdBy:          t.createdBy || 'SYSTEM',
      activityLog: [{
        by: 'SYSTEM',
        action: 'AUTO CYCLE',
        details: 'Frequency: ' + t.freq + ' — copied from: ' + t.name,
        at: fDateTime()
      }],
      parentTaskId: t.id
    };
    newTasks.push(copy);
  });

  if (newTasks.length === 0) {
    console.log('✅ Auto-cycle: Koi nayi copy banana zaroori nahi thi.');
    return;
  }

  console.log('🔄 Auto-cycle:', newTasks.length, 'nayi pending copies...');

  window.tasks = [...(window.tasks || []), ...newTasks];
  try { localStorage.setItem('hops-tasks', JSON.stringify(window.tasks)); } catch(e) {}

  try {
    const cfg = TABLES['hops-tasks'];
    const rows = newTasks.map(cfg.pack);
    const { error } = await _sb.from('tasks').upsert(rows, { onConflict: 'id' });
    if (error) console.error('❌ Auto-cycle upsert error:', error.message);
    else console.log('✅ Auto-cycle tasks Supabase mein save:', newTasks.length);
  } catch(e) {
    console.error('❌ Auto-cycle exception:', e.message || e);
  }

  localStorage.setItem('hops-reset', today);
}

// ================================================================
//  loadFromSupabase()
// ================================================================
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
      if (error) { console.warn('⚠️ Load error ['+key+']:', error.message); continue; }

      const parsed = (data || []).map(cfg.unpack);
      localStorage.setItem(key, JSON.stringify(parsed));
      updateAppVariable(key, parsed);
    } catch(e) { console.warn('⚠️ Load exception ['+key+']:', e.message||e); }
  }

  console.log('✅ Supabase se saara data load ho gaya!');
  await runAutoCycleAndSync();
}

// ================================================================
//  loadUserLinks()
// ================================================================
window.loadUserLinks = async function() {
  if (!_ready || !_sb) return;
  const username = (typeof currentUser !== 'undefined' && currentUser.name) ? currentUser.name : '';
  if (!username) return;
  try {
    const { data, error } = await _sb.from(LINKS_TABLE).select('*').eq('username', username);
    if (error) { console.warn('⚠️ Links load error:', error.message); return; }
    const links = (data||[]).map(r => ({
      id:      r.id,
      name:    r.name    || '',
      url:     r.url     || '',
      emoji:   r.emoji   || '🔗',
      addedAt: r.added_at|| ''
    }));
    localStorage.setItem('hops-links-'+username, JSON.stringify(links));
    console.log('✅ Links loaded ['+username+'] —', links.length);
  } catch(e) { console.warn('⚠️ loadUserLinks exception:', e.message||e); }
};

// ================================================================
//  setupRealtime()
// ================================================================
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

        if (typeof renderPage === 'function' && typeof currentPage !== 'undefined') {
          renderPage(currentPage);
        }
        if (typeof updateBadges === 'function') updateBadges();
      })
      .subscribe();
  });

  console.log('✅ Realtime active!');
}

// ================================================================
//  dbDelete()
// ================================================================
window.dbDelete = async function(type, id) {
  const tableMap = {
    'task':       'tasks',
    'issue':      'issues',
    'employee':   'employees',
    'dept':       'departments',
    'admin':      'admins',
    'handover':   'handovers',
    'delegation': 'delegations',
    'trash':      'trash',
    'link':       'user_links',
  };

  const tableName = tableMap[type];
  if (!tableName) return { ok: false, reason: 'unknown_type' };
  if (!_ready || !_sb) return { ok: false, reason: 'not_ready' };

  try {
    const { data, error } = await _sb.from(tableName).delete().eq('id', id).select('id');
    if (error) return { ok: false, reason: 'error', message: error.message };
    if (!data || data.length === 0) return { ok: false, reason: 'no_rows', table: tableName };
    console.log('✅ DB se delete ho gaya ['+type+'] id:', id);
    return { ok: true };
  } catch(e) {
    return { ok: false, reason: 'exception', message: e.message || String(e) };
  }
};

// ================================================================
//  INIT
// ================================================================
(async function startDB() {

  const bar = document.createElement('div');
  bar.id = 'db-loading-bar';
  Object.assign(bar.style, {
    position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
    background: '#0b4d6b', color: '#fff', textAlign: 'center',
    padding: '11px', fontFamily: 'Inter,sans-serif',
    fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px'
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

    // ✅ FIX 1: Ready hone par queue flush karo
    _ready = true;
    await flushSaveQueue();

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
    console.error('❌ DB Error:', err.message);
    bar.style.background = '#7a1a1a';
    bar.textContent = '❌ Database Error: ' + err.message + ' — Offline mode mein chal raha hai';
    setTimeout(() => bar.remove(), 7000);
  }

})();
