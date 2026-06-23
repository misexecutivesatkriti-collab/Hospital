// ================================================================
//  supabase_db.js — Hospital Ops System — v4
//
//  Fix: loadFromSupabase() ab localStorage + Supabase ko MERGE
//       karta hai — jo records Supabase mein nahi hain (kyunki
//       save queued tha) unhe Supabase mein upsert kar deta hai
//       aur phir merged result use karta hai.
// ================================================================

const SB_URL = 'https://jlltvarrtcgzsmqxlssb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbHR2YXJydGNnenNtcXhsc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDMsImV4cCI6MjA5NTM2MzcwM30.EAE4Cw-rhCyeiEjuXBmM77hIr6qqRTMnx3SnG5DKx3I';

let _sb    = null;
let _ready = false;

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
      id: o.id, name: o.name||'', username: o.username||o.name||'',
      dept: o.dept||'', designation: o.designation||'',
      email: o.email||'', password: o.password||''
    }),
    unpack: r => ({
      id: r.id, name: r.name||'', username: r.username||r.name||'',
      dept: r.dept||'', designation: r.designation||'',
      email: r.email||'', password: r.password||''
    }),
  },

  'hops-admins': {
    table: 'admins',
    pack:   o => ({
      id: o.id, name: o.name||'', username: o.username||'',
      email: o.email||'', password: o.password||'',
      role: o.role||'', dept: o.dept||'',
      perms: o.perms||{}, created_by: o.createdBy||''
    }),
    unpack: r => ({
      id: r.id, name: r.name||'', username: r.username||'',
      email: r.email||'', password: r.password||'',
      role: r.role||'', dept: r.dept||'',
      perms: r.perms||{}, createdBy: r.created_by||''
    }),
  },

  'hops-tasks': {
    table: 'tasks',
    pack: o => ({
      id:                 o.id,
      name:               o.name            || '',
      dept:               o.dept            || '',
      freq:               o.freq            || 'daily',
      assigned_to:        o.assignedTo      || [],
      assignee_emails:    o.assigneeEmails  || [],
      time:               o.time            || '',
      sched_date:         o.schedDate       || '',
      priority:           o.priority        || 'medium',
      notes:              o.notes           || '',
      last_done:          o.lastDone        || '',
      status:             o.status          || 'pending',
      done_by:            o.doneBy          || '',
      done_time:          o.doneTime        || '',
      done_remark:        o.doneRemark      || '',
      delay_reason:       o.delayReason     || '',
      is_delayed:         o.isDelayed       || false,
      created:            o.created         || '',
      created_by:         o.createdBy       || '',
      activity_log:       o.activityLog     || [],
      completion_history: o.completionHistory || [],
      parent_task_id:     o.parentTaskId    || ''
    }),
    unpack: r => ({
      id:                r.id,
      name:              r.name            || '',
      dept:              r.dept            || '',
      freq:              r.freq            || 'daily',
      assignedTo:        r.assigned_to     || [],
      assigneeEmails:    r.assignee_emails || [],
      time:              r.time            || '',
      schedDate:         r.sched_date      || '',
      priority:          r.priority        || 'medium',
      notes:             r.notes           || '',
      lastDone:          r.last_done       || '',
      status:            r.status          || 'pending',
      doneBy:            r.done_by         || '',
      doneTime:          r.done_time       || '',
      doneRemark:        r.done_remark     || '',
      delayReason:       r.delay_reason    || '',
      isDelayed:         r.is_delayed      || false,
      created:           r.created         || '',
      createdBy:         r.created_by      || '',
      activityLog:       r.activity_log    || [],
      completionHistory: r.completion_history || [],
      parentTaskId:      r.parent_task_id  || ''
    }),
  },

  'hops-issues': {
    table: 'issues',
    pack: o => ({
      id: o.id, title: o.title||'', dept: o.dept||'',
      priority: o.priority||'medium', reporter: o.reporter||'',
      assigned: o.assigned||'', description: o.desc||'',
      status: o.status||'open', date: o.date||'',
      resolve_remark: o.resolveRemark||'', resolve_by: o.resolveBy||'',
      resolved_at: o.resolvedAt||null
    }),
    unpack: r => ({
      id: r.id, title: r.title||'', dept: r.dept||'',
      priority: r.priority||'medium', reporter: r.reporter||'',
      assigned: r.assigned||'', desc: r.description||'',
      status: r.status||'open', date: r.date||'',
      resolveRemark: r.resolve_remark||'', resolveBy: r.resolve_by||'',
      resolvedAt: r.resolved_at||''
    }),
  },

  'hops-handovers': {
    table: 'handovers',
    pack: o => ({
      id: o.id, name: o.name||'', designation: o.designation||'',
      dept: o.dept||'', date: o.date||'', handover_to: o.to||'',
      tasks: o.tasks||'', pending: o.pending||'',
      supervisor: o.sup||o.supervisor||'', status: o.status||'pending',
      created_by: o.createdBy||''
    }),
    unpack: r => ({
      id: r.id, name: r.name||'', designation: r.designation||'',
      dept: r.dept||'', date: r.date||'', to: r.handover_to||'',
      tasks: r.tasks||'', pending: r.pending||'',
      sup: r.supervisor||'', supervisor: r.supervisor||'',
      status: r.status||'pending', createdBy: r.created_by||''
    }),
  },

  'hops-delegations': {
    table: 'delegations',
    pack: o => ({
      id: o.id, task_name: o.taskName||'', dept: o.dept||'',
      priority: o.priority||'medium', doer_id: o.doerId||'',
      doer_name: o.doerName||'', delegated_by: o.delegatedBy||'',
      exp_date: o.expDate||'', exp_time: o.expTime||'',
      notes: o.notes||'', status: o.status||'pending',
      created_date: o.createdDate||'', actual_date: o.actualDate||'',
      actual_time: o.actualTime||'', done_remark: o.doneRemark||'',
      delay_reason: o.delayReason||'', is_delayed: o.isDelayed||false,
      extensions: o.extensions||[], activity_log: o.activityLog||[]
    }),
    unpack: r => ({
      id: r.id, taskName: r.task_name||'', dept: r.dept||'',
      priority: r.priority||'medium', doerId: r.doer_id||'',
      doerName: r.doer_name||'', delegatedBy: r.delegated_by||'',
      expDate: r.exp_date||'', expTime: r.exp_time||'',
      notes: r.notes||'', status: r.status||'pending',
      createdDate: r.created_date||'', actualDate: r.actual_date||'',
      actualTime: r.actual_time||'', doneRemark: r.done_remark||'',
      delayReason: r.delay_reason||'', isDelayed: r.is_delayed||false,
      extensions: r.extensions||[], activityLog: r.activity_log||[]
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

// ================================================================
//  updateAppVariable()
// ================================================================
function updateAppVariable(key, data) {
  const varMap = {
    'hops-depts':'depts','hops-employees':'employees','hops-admins':'admins',
    'hops-tasks':'tasks','hops-issues':'issues','hops-handovers':'handovers',
    'hops-delegations':'delegations','hops-actlog':'actLog','hops-trash':'trash',
  };
  const varName = varMap[key];
  if (!varName) return;
  if (typeof window[varName] !== 'undefined') { window[varName] = data; return; }
  let tries = 0;
  const retry = setInterval(() => {
    tries++;
    if (typeof window[varName] !== 'undefined') { window[varName] = data; clearInterval(retry); }
    else if (tries >= 20) { clearInterval(retry); window[varName] = data; }
  }, 100);
}

// ================================================================
//  ld() & sv()
// ================================================================
window.ld = function(key, defaultVal) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : defaultVal; }
  catch(e) { return defaultVal; }
};

window.sv = async function(key, val) {
  // localStorage mein turant save
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}

  // Supabase save
  if (!_ready || !_sb) return;
  await _saveToSupabase(key, val);
};

async function _saveToSupabase(key, val) {
  if (isLinkKey(key)) {
    if (!Array.isArray(val) || val.length === 0) return;
    const username = linkUsernameFromKey(key);
    try {
      const rows = val.map(o => ({ id: o.id, username, name: o.name||'', url: o.url||'', emoji: o.emoji||'🔗', added_at: o.addedAt||new Date().toISOString() }));
      const { error } = await _sb.from(LINKS_TABLE).upsert(rows, { onConflict: 'id' });
      if (error) console.error('❌ Links save error:', error.message);
    } catch(e) { console.error('❌ Links exception:', e.message||e); }
    return;
  }
  if (!TABLES[key] || !Array.isArray(val) || val.length === 0) return;
  try {
    const rows = val.map(TABLES[key].pack);
    const { error } = await _sb.from(TABLES[key].table).upsert(rows, { onConflict: 'id' });
    if (error) console.error('❌ Upsert error ['+key+']:', error.message);
    else console.log('✅ Saved ['+key+'] —', val.length, 'records');
  } catch(e) { console.error('❌ sv() exception:', e.message||e); }
}

// ================================================================
//  ✅ MAIN FIX: loadAndMerge()
//
//  Problem: loadFromSupabase() seedha window.tasks = supabase_data
//  karta tha — isliye locally saved naye tasks (jo Supabase mein
//  abhi tak nahi pahunche the) overwrite ho jaate the.
//
//  Solution: Merge strategy —
//  1. Supabase se data fetch karo
//  2. localStorage mein jo bhi hai wo bhi lo
//  3. Dono ko merge karo — localStorage items jo Supabase mein
//     nahi hain unhe Supabase mein bhi upsert karo
//  4. Merged result use karo
// ================================================================
async function loadAndMerge(key) {
  const cfg = TABLES[key];
  if (!cfg) return;

  try {
    // Step 1: Supabase se fetch karo
    let query = _sb.from(cfg.table).select('*');
    if (cfg.table === 'activity_log') {
      query = query.order('created_at', { ascending: false }).limit(500);
    }
    const { data: sbData, error } = await query;
    if (error) { console.warn('⚠️ Load error ['+key+']:', error.message); return; }

    const fromSB = (sbData || []).map(cfg.unpack);
    const sbIds = new Set(fromSB.map(x => x.id));

    // Step 2: localStorage se fetch karo
    let fromLS = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) fromLS = JSON.parse(raw);
    } catch(e) {}

    // Step 3: Jo localStorage mein hain lekin Supabase mein nahi — unhe upsert karo
    const missingInSB = fromLS.filter(x => x.id && !sbIds.has(x.id));
    if (missingInSB.length > 0) {
      console.log('🔄 ['+key+'] LocalStorage mein', missingInSB.length, 'extra records hain — Supabase mein sync kar rahe hain...');
      try {
        const rows = missingInSB.map(cfg.pack);
        const { error: upErr } = await _sb.from(cfg.table).upsert(rows, { onConflict: 'id' });
        if (upErr) console.error('❌ Merge upsert error ['+key+']:', upErr.message);
        else console.log('✅ Merge sync ['+key+']:', missingInSB.length, 'records Supabase mein save ho gaye');
      } catch(e) { console.error('❌ Merge upsert exception:', e.message||e); }
    }

    // Step 4: Merged result — Supabase + missing localStorage items
    const merged = [...fromSB, ...missingInSB];

    // Step 5: Update localStorage + app variable
    localStorage.setItem(key, JSON.stringify(merged));
    updateAppVariable(key, merged);

  } catch(e) { console.warn('⚠️ loadAndMerge exception ['+key+']:', e.message||e); }
}

// ================================================================
//  runAutoCycleAndSync() — Done task refresh pe pending nahi hoga
// ================================================================
async function runAutoCycleAndSync() {
  if (!_ready || !_sb) return;
  const today = new Date().toISOString().slice(0, 10);
  const currentTasks = window.tasks || [];

  function isTaskDueTodayLocal(task) {
    const now = new Date();
    const dd = now.getDate(), mm = now.getMonth(), yy = now.getFullYear();
    const freq = task.freq || 'daily';
    const orig = task.schedDate ? new Date(task.schedDate + 'T00:00:00') : null;
    const origDay = orig ? orig.getDate() : null, origMonth = orig ? orig.getMonth() : null;
    if (freq === 'daily') return true;
    if (freq === '15-day') { if (!orig||now<orig) return false; return Math.floor((now-orig)/(864e5))%15===0; }
    if (freq === 'monthly') { if (!orig||now<orig) return false; return dd===Math.min(origDay,new Date(yy,mm+1,0).getDate()); }
    if (freq === 'quarterly') { if (!orig||now<orig) return false; const md=(yy-orig.getFullYear())*12+(mm-origMonth); if(md%3!==0)return false; return dd===Math.min(origDay,new Date(yy,mm+1,0).getDate()); }
    if (freq === 'half-yearly') { if (!orig||now<orig) return false; const md=(yy-orig.getFullYear())*12+(mm-origMonth); if(md%6!==0)return false; return dd===Math.min(origDay,new Date(yy,mm+1,0).getDate()); }
    if (freq === 'yearly') { if (!orig||now<orig) return false; return mm===origMonth&&dd===Math.min(origDay,new Date(yy,origMonth+1,0).getDate()); }
    return false;
  }

  const fDT = () => new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true});
  const uid = () => 'id-'+Date.now()+Math.random().toString(36).slice(2,6);
  const newTasks = [];

  currentTasks.forEach(t => {
    if (t.status !== 'done') return;
    if (t.lastDone === today) return;      // aaj done kiya — cycle mat karo
    if (!isTaskDueTodayLocal(t)) return;

    // ✅ Sirf parentTaskId se check karo — x.id===t.id wali condition nahi
    const alreadyExists = currentTasks.some(
      x => x.parentTaskId === t.id && x.schedDate === today && x.status === 'pending'
    );
    if (alreadyExists) return;

    newTasks.push({
      id: uid(), name: t.name, dept: t.dept, freq: t.freq,
      assignedTo: [...(t.assignedTo||[])], assigneeEmails: [...(t.assigneeEmails||[])],
      time: t.time||'', schedDate: today, priority: t.priority,
      notes: t.notes||'', status: 'pending', doneBy: '', doneTime: '',
      doneRemark: '', delayReason: '', isDelayed: false, lastDone: '',
      completionHistory: [], created: today, createdBy: t.createdBy||'SYSTEM',
      activityLog: [{ by:'SYSTEM', action:'AUTO CYCLE', details:'Freq: '+t.freq+' from: '+t.name, at:fDT() }],
      parentTaskId: t.id
    });
  });

  if (newTasks.length === 0) { console.log('✅ Auto-cycle: Nothing to do.'); return; }

  console.log('🔄 Auto-cycle:', newTasks.length, 'new pending copies...');
  window.tasks = [...(window.tasks||[]), ...newTasks];
  try { localStorage.setItem('hops-tasks', JSON.stringify(window.tasks)); } catch(e) {}

  try {
    const rows = newTasks.map(TABLES['hops-tasks'].pack);
    const { error } = await _sb.from('tasks').upsert(rows, { onConflict: 'id' });
    if (error) console.error('❌ Auto-cycle upsert error:', error.message);
    else console.log('✅ Auto-cycle saved to Supabase:', newTasks.length);
  } catch(e) { console.error('❌ Auto-cycle exception:', e.message||e); }

  localStorage.setItem('hops-reset', today);
}

// ================================================================
//  loadFromSupabase() — Ab loadAndMerge() use karta hai
// ================================================================
async function loadFromSupabase() {
  for (const key of Object.keys(TABLES)) {
    await loadAndMerge(key);
  }
  console.log('✅ Supabase + LocalStorage merge complete!');
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
    const links = (data||[]).map(r => ({ id:r.id, name:r.name||'', url:r.url||'', emoji:r.emoji||'🔗', addedAt:r.added_at||'' }));
    localStorage.setItem('hops-links-'+username, JSON.stringify(links));
    console.log('✅ Links loaded ['+username+'] —', links.length);
  } catch(e) { console.warn('⚠️ loadUserLinks exception:', e.message||e); }
};

// ================================================================
//  setupRealtime()
// ================================================================
function setupRealtime() {
  ['tasks','issues','departments','employees','delegations','admins'].forEach(tbl => {
    _sb.channel('rt-'+tbl)
      .on('postgres_changes',{event:'*',schema:'public',table:tbl}, async()=>{
        const key = Object.keys(TABLES).find(k=>TABLES[k].table===tbl);
        if (!key) return;
        // Realtime mein bhi merge karo — overwrite nahi
        await loadAndMerge(key);
        if (typeof renderPage==='function') renderPage(currentPage);
        if (typeof updateBadges==='function') updateBadges();
      }).subscribe();
  });
  console.log('✅ Realtime active!');
}

// ================================================================
//  dbDelete()
// ================================================================
window.dbDelete = async function(type, id) {
  const tableMap = {
    'task':'tasks','issue':'issues','employee':'employees','dept':'departments',
    'admin':'admins','handover':'handovers','delegation':'delegations',
    'trash':'trash','link':'user_links',
  };
  const tableName = tableMap[type];
  if (!tableName) return { ok:false, reason:'unknown_type' };
  if (!_ready||!_sb) return { ok:false, reason:'not_ready' };
  try {
    const { data, error } = await _sb.from(tableName).delete().eq('id',id).select('id');
    if (error) return { ok:false, reason:'error', message:error.message };
    if (!data||data.length===0) return { ok:false, reason:'no_rows', table:tableName };
    console.log('✅ DB delete ['+type+']:', id);
    return { ok:true };
  } catch(e) { return { ok:false, reason:'exception', message:e.message||String(e) }; }
};

// ================================================================
//  INIT
// ================================================================
(async function startDB() {
  const bar = document.createElement('div');
  bar.id = 'db-loading-bar';
  Object.assign(bar.style, {
    position:'fixed',top:'0',left:'0',right:'0',zIndex:'99999',
    background:'#0b4d6b',color:'#fff',textAlign:'center',
    padding:'11px',fontFamily:'Inter,sans-serif',fontSize:'13px',fontWeight:'700'
  });
  bar.textContent = '⏳ Database se connect ho raha hai...';
  document.body.appendChild(bar);

  try {
    if (!window.supabase) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = res; s.onerror = ()=>rej(new Error('Supabase SDK load nahi hua'));
        document.head.appendChild(s);
      });
    }

    _sb = window.supabase.createClient(SB_URL, SB_KEY);
    const { error: testErr } = await _sb.from('departments').select('id').limit(1);
    if (testErr) throw new Error('Connection failed: ' + testErr.message);

    bar.textContent = '⏳ Data load aur sync ho raha hai...';

    // ✅ KEY: Pehle _ready = true karo, PHIR load karo
    // Isliye agar koi sv() call pending hai woh bhi properly chalegi
    _ready = true;

    await loadFromSupabase();
    setupRealtime();

    bar.style.background = '#1a5c3a';
    bar.textContent = '✅ Database connected! Data sync ho gaya.';
    setTimeout(()=>bar.remove(), 2500);

    if (typeof currentRole !== 'undefined' && currentRole) {
      if (typeof renderPage==='function') renderPage(currentPage);
      if (typeof updateBadges==='function') updateBadges();
      if (typeof buildSidebar==='function') buildSidebar();
    } else {
      if (typeof loadSession==='function' && loadSession()) {
        if (currentRole==='mainadmin' && typeof scheduleAllReminders==='function') scheduleAllReminders();
        if (typeof startApp==='function') startApp();
      }
    }

  } catch(err) {
    console.error('❌ DB Error:', err.message);
    bar.style.background = '#7a1a1a';
    bar.textContent = '❌ Database Error: ' + err.message + ' — Offline mode mein chal raha hai';
    setTimeout(()=>bar.remove(), 7000);
  }
})();
