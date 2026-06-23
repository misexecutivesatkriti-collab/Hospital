// ================================================================
//  supabase_db.js — Hospital Ops System — v6 FINAL
//
//  ROOT FIX:
//  1. sv() ab window.sv override nahi karta — balki window._sbSave
//     expose karta hai jo HTML ke sv() se call hota hai
//  2. HTML ke original sv() ko async banana hoga (patch mein)
//  3. loadAndMerge: localStorage+Supabase merge (gayab task fix)
//  4. Auto-cycle: done task refresh pe pending nahi hoga
//  5. _ready=true PEHLE set hota hai load se
// ================================================================

const SB_URL = 'https://jlltvarrtcgzsmqxlssb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbHR2YXJydGNnenNtcXhsc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc3MDMsImV4cCI6MjA5NTM2MzcwM30.EAE4Cw-rhCyeiEjuXBmM77hIr6qqRTMnx3SnG5DKx3I';

let _sb    = null;
let _ready = false;

const TABLES = {
  'hops-depts': {
    table: 'departments',
    pack:   o => ({ id:o.id, name:o.name||'', head:o.head||'', contact:o.contact||'' }),
    unpack: r => ({ id:r.id, name:r.name||'', head:r.head||'', contact:r.contact||'' }),
  },
  'hops-employees': {
    table: 'employees',
    pack:   o => ({ id:o.id, name:o.name||'', username:o.username||o.name||'', dept:o.dept||'', designation:o.designation||'', email:o.email||'', password:o.password||'' }),
    unpack: r => ({ id:r.id, name:r.name||'', username:r.username||r.name||'', dept:r.dept||'', designation:r.designation||'', email:r.email||'', password:r.password||'' }),
  },
  'hops-admins': {
    table: 'admins',
    pack:   o => ({ id:o.id, name:o.name||'', username:o.username||'', email:o.email||'', password:o.password||'', role:o.role||'', dept:o.dept||'', perms:o.perms||{}, created_by:o.createdBy||'' }),
    unpack: r => ({ id:r.id, name:r.name||'', username:r.username||'', email:r.email||'', password:r.password||'', role:r.role||'', dept:r.dept||'', perms:r.perms||{}, createdBy:r.created_by||'' }),
  },
  'hops-tasks': {
    table: 'tasks',
    pack: o => ({
      id:o.id, name:o.name||'', dept:o.dept||'', freq:o.freq||'daily',
      assigned_to:o.assignedTo||[], assignee_emails:o.assigneeEmails||[],
      time:o.time||'', sched_date:o.schedDate||'', priority:o.priority||'medium',
      notes:o.notes||'', last_done:o.lastDone||'', status:o.status||'pending',
      done_by:o.doneBy||'', done_time:o.doneTime||'', done_remark:o.doneRemark||'',
      delay_reason:o.delayReason||'', is_delayed:o.isDelayed||false,
      created:o.created||'', created_by:o.createdBy||'',
      activity_log:o.activityLog||[], completion_history:o.completionHistory||[],
      parent_task_id:o.parentTaskId||''
    }),
    unpack: r => ({
      id:r.id, name:r.name||'', dept:r.dept||'', freq:r.freq||'daily',
      assignedTo:r.assigned_to||[], assigneeEmails:r.assignee_emails||[],
      time:r.time||'', schedDate:r.sched_date||'', priority:r.priority||'medium',
      notes:r.notes||'', lastDone:r.last_done||'', status:r.status||'pending',
      doneBy:r.done_by||'', doneTime:r.done_time||'', doneRemark:r.done_remark||'',
      delayReason:r.delay_reason||'', isDelayed:r.is_delayed||false,
      created:r.created||'', createdBy:r.created_by||'',
      activityLog:r.activity_log||[], completionHistory:r.completion_history||[],
      parentTaskId:r.parent_task_id||''
    }),
  },
  'hops-issues': {
    table: 'issues',
    pack: o => ({ id:o.id, title:o.title||'', dept:o.dept||'', priority:o.priority||'medium', reporter:o.reporter||'', assigned:o.assigned||'', description:o.desc||'', status:o.status||'open', date:o.date||'', resolve_remark:o.resolveRemark||'', resolve_by:o.resolveBy||'', resolved_at:o.resolvedAt||null }),
    unpack: r => ({ id:r.id, title:r.title||'', dept:r.dept||'', priority:r.priority||'medium', reporter:r.reporter||'', assigned:r.assigned||'', desc:r.description||'', status:r.status||'open', date:r.date||'', resolveRemark:r.resolve_remark||'', resolveBy:r.resolve_by||'', resolvedAt:r.resolved_at||'' }),
  },
  'hops-handovers': {
    table: 'handovers',
    pack: o => ({ id:o.id, name:o.name||'', designation:o.designation||'', dept:o.dept||'', date:o.date||'', handover_to:o.to||'', tasks:o.tasks||'', pending:o.pending||'', supervisor:o.sup||o.supervisor||'', status:o.status||'pending', created_by:o.createdBy||'' }),
    unpack: r => ({ id:r.id, name:r.name||'', designation:r.designation||'', dept:r.dept||'', date:r.date||'', to:r.handover_to||'', tasks:r.tasks||'', pending:r.pending||'', sup:r.supervisor||'', supervisor:r.supervisor||'', status:r.status||'pending', createdBy:r.created_by||'' }),
  },
  'hops-delegations': {
    table: 'delegations',
    pack: o => ({ id:o.id, task_name:o.taskName||'', dept:o.dept||'', priority:o.priority||'medium', doer_id:o.doerId||'', doer_name:o.doerName||'', delegated_by:o.delegatedBy||'', exp_date:o.expDate||'', exp_time:o.expTime||'', notes:o.notes||'', status:o.status||'pending', created_date:o.createdDate||'', actual_date:o.actualDate||'', actual_time:o.actualTime||'', done_remark:o.doneRemark||'', delay_reason:o.delayReason||'', is_delayed:o.isDelayed||false, extensions:o.extensions||[], activity_log:o.activityLog||[] }),
    unpack: r => ({ id:r.id, taskName:r.task_name||'', dept:r.dept||'', priority:r.priority||'medium', doerId:r.doer_id||'', doerName:r.doer_name||'', delegatedBy:r.delegated_by||'', expDate:r.exp_date||'', expTime:r.exp_time||'', notes:r.notes||'', status:r.status||'pending', createdDate:r.created_date||'', actualDate:r.actual_date||'', actualTime:r.actual_time||'', doneRemark:r.done_remark||'', delayReason:r.delay_reason||'', isDelayed:r.is_delayed||false, extensions:r.extensions||[], activityLog:r.activity_log||[] }),
  },
  'hops-actlog': {
    table: 'activity_log',
    pack:   o => ({ id:o.id, by_user:o.by||'', role:o.role||'', action:o.action||'', details:o.details||'', at_str:o.atStr||'' }),
    unpack: r => ({ id:r.id, by:r.by_user||'', role:r.role||'', action:r.action||'', details:r.details||'', at:r.created_at||'', atStr:r.at_str||'' }),
  },
  'hops-trash': {
    table: 'trash',
    pack:   o => ({ id:o.id, type:o.type||'', data:o.data||{}, deleted_by:o.deletedBy||'', deleted_at:o.deletedAt||new Date().toISOString(), auto_delete_at:o.autoDeleteAt||'' }),
    unpack: r => ({ id:r.id, type:r.type||'', data:r.data||{}, deletedBy:r.deleted_by||'', deletedAt:r.deleted_at||'', autoDeleteAt:r.auto_delete_at||'' }),
  },
};

const LINKS_TABLE = 'user_links';
function isLinkKey(k){ return typeof k==='string'&&k.startsWith('hops-links-'); }
function linkUser(k){ return k.replace('hops-links-',''); }

function updateAppVariable(key, data) {
  const map = {'hops-depts':'depts','hops-employees':'employees','hops-admins':'admins','hops-tasks':'tasks','hops-issues':'issues','hops-handovers':'handovers','hops-delegations':'delegations','hops-actlog':'actLog','hops-trash':'trash'};
  const v = map[key]; if(!v) return;
  if(typeof window[v]!=='undefined'){window[v]=data;return;}
  let t=0; const r=setInterval(()=>{t++;if(typeof window[v]!=='undefined'){window[v]=data;clearInterval(r);}else if(t>=20){clearInterval(r);window[v]=data;}},100);
}

// ================================================================
//  ld() — unchanged
// ================================================================
window.ld = function(key, def) {
  try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch(e){return def;}
};

// ================================================================
//  _upsertToSupabase() — core save function
// ================================================================
async function _upsertToSupabase(key, val) {
  if(isLinkKey(key)){
    if(!Array.isArray(val)||val.length===0) return;
    const u=linkUser(key);
    try{
      const rows=val.map(o=>({id:o.id,username:u,name:o.name||'',url:o.url||'',emoji:o.emoji||'🔗',added_at:o.addedAt||new Date().toISOString()}));
      const{error}=await _sb.from(LINKS_TABLE).upsert(rows,{onConflict:'id'});
      if(error) console.error('❌ Links upsert:',error.message);
    }catch(e){console.error('❌ Links exception:',e.message);}
    return;
  }
  if(!TABLES[key]||!Array.isArray(val)||val.length===0) return;
  try{
    const rows=val.map(TABLES[key].pack);
    const{error}=await _sb.from(TABLES[key].table).upsert(rows,{onConflict:'id'});
    if(error) console.error('❌ Upsert ['+key+']:',error.message);
    else console.log('✅ Saved ['+key+']',val.length,'records');
  }catch(e){console.error('❌ _upsertToSupabase exception ['+key+']:',e.message);}
}

// ================================================================
//  ✅ KEY FIX: sv() — SYNC localStorage + ASYNC Supabase
//
//  HTML mein original sv() tha:
//    var sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
//
//  Hum usse replace karte hain is version se jo:
//  1. TURANT localStorage mein save karta hai (sync)
//  2. BACKGROUND mein Supabase mein bhi save karta hai (async)
//  3. Agar Supabase ready nahi — 100ms baad retry karta hai (max 30s)
// ================================================================
window.sv = function(key, val) {
  // Step 1: localStorage — TURANT (synchronous)
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}

  // Step 2: Supabase — background mein (fire and forget with retry)
  (async () => {
    let waited = 0;
    // Agar Supabase ready nahi — wait karo (max 30 seconds)
    while((!_ready || !_sb) && waited < 30000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }
    if(!_sb) {
      console.warn('⚠️ sv(): Supabase never ready, skipping cloud save for', key);
      return;
    }
    await _upsertToSupabase(key, val);
  })();

  // Return undefined (original sv() bhi kuch return nahi karta tha)
};

// ================================================================
//  loadAndMerge() — Supabase + localStorage merge
// ================================================================
async function loadAndMerge(key) {
  const cfg = TABLES[key]; if(!cfg) return;
  try{
    let query = _sb.from(cfg.table).select('*');
    if(cfg.table==='activity_log') query=query.order('created_at',{ascending:false}).limit(500);
    const{data:sbData,error}=await query;
    if(error){console.warn('⚠️ Load ['+key+']:',error.message);return;}

    const fromSB=(sbData||[]).map(cfg.unpack);
    const sbIds=new Set(fromSB.map(x=>x.id));

    let fromLS=[];
    try{const r=localStorage.getItem(key);if(r)fromLS=JSON.parse(r);}catch(e){}

    // Jo LS mein hai lekin SB mein nahi — upsert karo
    const missing=fromLS.filter(x=>x.id&&!sbIds.has(x.id));
    if(missing.length>0){
      console.log('🔄 Merge ['+key+']: Saving',missing.length,'missing records to Supabase...');
      try{
        const rows=missing.map(cfg.pack);
        const{error:upErr}=await _sb.from(cfg.table).upsert(rows,{onConflict:'id'});
        if(upErr) console.error('❌ Merge upsert ['+key+']:',upErr.message);
        else console.log('✅ Merge saved ['+key+']:',missing.length);
      }catch(e){console.error('❌ Merge exception:',e.message);}
    }

    const merged=[...fromSB,...missing];
    localStorage.setItem(key,JSON.stringify(merged));
    updateAppVariable(key,merged);
  }catch(e){console.warn('⚠️ loadAndMerge ['+key+']:',e.message);}
}

// ================================================================
//  runAutoCycleAndSync() — done task refresh pe pending nahi hoga
// ================================================================
async function runAutoCycleAndSync() {
  if(!_sb) return;
  const today=new Date().toISOString().slice(0,10);
  const cur=window.tasks||[];

  function isDueToday(t){
    const n=new Date(),dd=n.getDate(),mm=n.getMonth(),yy=n.getFullYear();
    const f=t.freq||'daily',o=t.schedDate?new Date(t.schedDate+'T00:00:00'):null;
    const od=o?o.getDate():null,om=o?o.getMonth():null;
    if(f==='daily')return true;
    if(f==='15-day'){if(!o||n<o)return false;return Math.floor((n-o)/864e5)%15===0;}
    if(f==='monthly'){if(!o||n<o)return false;return dd===Math.min(od,new Date(yy,mm+1,0).getDate());}
    if(f==='quarterly'){if(!o||n<o)return false;const md=(yy-o.getFullYear())*12+(mm-om);if(md%3!==0)return false;return dd===Math.min(od,new Date(yy,mm+1,0).getDate());}
    if(f==='half-yearly'){if(!o||n<o)return false;const md=(yy-o.getFullYear())*12+(mm-om);if(md%6!==0)return false;return dd===Math.min(od,new Date(yy,mm+1,0).getDate());}
    if(f==='yearly'){if(!o||n<o)return false;return mm===om&&dd===Math.min(od,new Date(yy,om+1,0).getDate());}
    return false;
  }

  const fDT=()=>new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true});
  const uid=()=>'id-'+Date.now()+Math.random().toString(36).slice(2,6);
  const newT=[];

  cur.forEach(t=>{
    if(t.status!=='done')return;
    if(t.lastDone===today)return; // aaj done kiya — skip
    if(!isDueToday(t))return;
    // FIXED: sirf parentTaskId se check karo
    const exists=cur.some(x=>x.parentTaskId===t.id&&x.schedDate===today&&x.status==='pending');
    if(exists)return;
    newT.push({
      id:uid(),name:t.name,dept:t.dept,freq:t.freq,
      assignedTo:[...(t.assignedTo||[])],assigneeEmails:[...(t.assigneeEmails||[])],
      time:t.time||'',schedDate:today,priority:t.priority,notes:t.notes||'',
      status:'pending',doneBy:'',doneTime:'',doneRemark:'',delayReason:'',
      isDelayed:false,lastDone:'',completionHistory:[],created:today,
      createdBy:t.createdBy||'SYSTEM',
      activityLog:[{by:'SYSTEM',action:'AUTO CYCLE',details:'Freq:'+t.freq,at:fDT()}],
      parentTaskId:t.id
    });
  });

  if(!newT.length){console.log('✅ Auto-cycle: nothing to do.');return;}
  console.log('🔄 Auto-cycle:',newT.length,'new copies');
  window.tasks=[...(window.tasks||[]),...newT];
  try{localStorage.setItem('hops-tasks',JSON.stringify(window.tasks));}catch(e){}
  try{
    const rows=newT.map(TABLES['hops-tasks'].pack);
    const{error}=await _sb.from('tasks').upsert(rows,{onConflict:'id'});
    if(error) console.error('❌ Auto-cycle upsert:',error.message);
    else console.log('✅ Auto-cycle saved:',newT.length);
  }catch(e){console.error('❌ Auto-cycle exception:',e.message);}
  localStorage.setItem('hops-reset',today);
}

// ================================================================
//  loadFromSupabase()
// ================================================================
async function loadFromSupabase() {
  for(const key of Object.keys(TABLES)){
    await loadAndMerge(key);
  }
  console.log('✅ All data loaded & merged!');
  await runAutoCycleAndSync();
}

// ================================================================
//  loadUserLinks()
// ================================================================
window.loadUserLinks = async function() {
  if(!_sb) return;
  const u=(typeof currentUser!=='undefined'&&currentUser.name)?currentUser.name:'';
  if(!u) return;
  try{
    const{data,error}=await _sb.from(LINKS_TABLE).select('*').eq('username',u);
    if(error){console.warn('⚠️ Links load:',error.message);return;}
    const links=(data||[]).map(r=>({id:r.id,name:r.name||'',url:r.url||'',emoji:r.emoji||'🔗',addedAt:r.added_at||''}));
    localStorage.setItem('hops-links-'+u,JSON.stringify(links));
    console.log('✅ Links ['+u+']',links.length);
  }catch(e){console.warn('⚠️ loadUserLinks:',e.message);}
};

// ================================================================
//  setupRealtime()
// ================================================================
function setupRealtime() {
  ['tasks','issues','departments','employees','delegations','admins'].forEach(tbl=>{
    _sb.channel('rt-'+tbl)
      .on('postgres_changes',{event:'*',schema:'public',table:tbl},async()=>{
        const key=Object.keys(TABLES).find(k=>TABLES[k].table===tbl);
        if(!key)return;
        await loadAndMerge(key);
        if(typeof renderPage==='function')renderPage(currentPage);
        if(typeof updateBadges==='function')updateBadges();
      }).subscribe();
  });
  console.log('✅ Realtime active!');
}

// ================================================================
//  dbDelete()
// ================================================================
window.dbDelete = async function(type,id) {
  const tmap={'task':'tasks','issue':'issues','employee':'employees','dept':'departments','admin':'admins','handover':'handovers','delegation':'delegations','trash':'trash','link':'user_links'};
  const tbl=tmap[type];
  if(!tbl)return{ok:false,reason:'unknown_type'};
  if(!_sb)return{ok:false,reason:'not_ready'};
  try{
    const{data,error}=await _sb.from(tbl).delete().eq('id',id).select('id');
    if(error)return{ok:false,reason:'error',message:error.message};
    if(!data||!data.length)return{ok:false,reason:'no_rows',table:tbl};
    console.log('✅ Deleted ['+type+']',id);
    return{ok:true};
  }catch(e){return{ok:false,reason:'exception',message:e.message||String(e)};}
};

// ================================================================
//  INIT
// ================================================================
(async function startDB(){
  const bar=document.createElement('div');
  bar.id='db-loading-bar';
  Object.assign(bar.style,{position:'fixed',top:'0',left:'0',right:'0',zIndex:'99999',background:'#0b4d6b',color:'#fff',textAlign:'center',padding:'11px',fontFamily:'Inter,sans-serif',fontSize:'13px',fontWeight:'700'});
  bar.textContent='⏳ Database se connect ho raha hai...';
  document.body.appendChild(bar);

  try{
    if(!window.supabase){
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload=res;s.onerror=()=>rej(new Error('Supabase SDK load nahi hua'));
        document.head.appendChild(s);
      });
    }

    _sb=window.supabase.createClient(SB_URL,SB_KEY);
    const{error:testErr}=await _sb.from('departments').select('id').limit(1);
    if(testErr) throw new Error('Connection failed: '+testErr.message);

    bar.textContent='⏳ Data sync ho raha hai...';

    // ✅ _ready=true PEHLE — ab sv() calls immediately save ho sakti hain
    _ready=true;

    await loadFromSupabase();
    setupRealtime();

    bar.style.background='#1a5c3a';
    bar.textContent='✅ Database connected! Data sync ho gaya.';
    setTimeout(()=>bar.remove(),2500);

    if(typeof currentRole!=='undefined'&&currentRole){
      if(typeof renderPage==='function')renderPage(currentPage);
      if(typeof updateBadges==='function')updateBadges();
      if(typeof buildSidebar==='function')buildSidebar();
    }else{
      if(typeof loadSession==='function'&&loadSession()){
        if(currentRole==='mainadmin'&&typeof scheduleAllReminders==='function')scheduleAllReminders();
        if(typeof startApp==='function')startApp();
      }
    }
  }catch(err){
    console.error('❌ DB Error:',err.message);
    bar.style.background='#7a1a1a';
    bar.textContent='❌ DB Error: '+err.message+' — Offline mode';
    setTimeout(()=>bar.remove(),7000);
  }
})();
