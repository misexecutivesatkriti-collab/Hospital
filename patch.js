// ================================================================
// patch.js — index.html ke 3 bugs fix karta hai
// Is file ko index.html mein supabase_db.js se PEHLE include karo:
// <script src="patch.js"></script>
// <script src="supabase_db.js"></script>
// ================================================================

// FIX 1: sv override prevent karo
// index.html mein sv=(k,v)=>localStorage... line hai
// supabase_db.js load hone ke baad wo override ho jaati hai
// isliye kuch aur karne ki zaroorat nahi — supabase_db.js ka sv() hi use hoga

// FIX 2 & 3: Login functions override — Android/Mac/Windows fix
window.addEventListener('DOMContentLoaded', function() {
  // Short delay taaki original functions define ho jayein
  setTimeout(function() {

    // ADMIN LOGIN — cross-platform fix
    window.adminLogin = function() {
      const uRaw = document.getElementById('adm-user').value.trim();
      const pRaw = document.getElementById('adm-pass').value;
      const err  = document.getElementById('adm-err');
      if(!uRaw || !pRaw.trim()) {
        err.textContent = '❌ Username aur password daalein!';
        err.style.display = 'block';
        return;
      }
      // Android/Mac/Windows — trailing space fix
      const pV = [pRaw, pRaw.trim(), pRaw.trimEnd(), pRaw.trimStart()];
      // Main admin
      if(uRaw.toUpperCase() === MAIN_ADMIN_USER.toUpperCase()) {
        if(pV.some(function(p){ return p === MAIN_ADMIN_PASS; })) {
          err.style.display = 'none';
          currentRole = 'mainadmin';
          currentUser = {name:MAIN_ADMIN_USER, dept:'MAIN ADMIN', adminId:'mainadmin', perms:{}};
          if(typeof scheduleAllReminders === 'function') scheduleAllReminders();
          startApp();
          return;
        }
      }
      // Sub-admin — admins array Supabase se loaded
      const adm = admins.find(function(a) {
        if(!a.username) return false;
        if(a.username.toLowerCase() !== uRaw.toLowerCase()) return false;
        return pV.some(function(p){ return p === a.password; });
      });
      if(adm) {
        err.style.display = 'none';
        currentRole = 'admin';
        currentUser = {name:adm.name, dept:adm.dept||'ADMIN', adminId:adm.id, perms:adm.perms||{}};
        startApp();
        return;
      }
      err.textContent = '❌ Wrong Username or Password!';
      err.style.display = 'block';
      document.getElementById('adm-pass').value = '';
    };

    // STAFF LOGIN — cross-platform fix
    window.staffLogin = function() {
      const nRaw = document.getElementById('st-name').value.trim();
      const pRaw = document.getElementById('st-pass').value;
      const err  = document.getElementById('st-err');
      if(!nRaw || !pRaw.trim()) {
        err.textContent = '❌ Username aur password daalein!';
        err.style.display = 'block';
        return;
      }
      // Android/Mac/Windows — trailing space fix
      const pV = [pRaw, pRaw.trim(), pRaw.trimEnd(), pRaw.trimStart()];
      const nUp = nRaw.toUpperCase();
      // employees array Supabase se loaded
      const emp = employees.find(function(e) {
        const nameMatch = e.name === nUp || e.name === nRaw || e.name.toLowerCase() === nRaw.toLowerCase();
        const usernameMatch = e.username && (e.username === nRaw || e.username.toLowerCase() === nRaw.toLowerCase());
        if(!nameMatch && !usernameMatch) return false;
        return pV.some(function(p){ return p === e.password; });
      });
      if(!emp) {
        err.textContent = '❌ Username ya Password galat hai!';
        err.style.display = 'block';
        document.getElementById('st-pass').value = '';
        return;
      }
      err.style.display = 'none';
      savedStaffName = emp.name;
      if(typeof sv === 'function') sv('hops-saved-staff-name', savedStaffName);
      currentRole = 'staff';
      currentUser = {name:emp.name, dept:emp.dept, empId:emp.id, username:emp.username||emp.name, perms:{}};
      startApp();
    };

    console.log('✅ Login functions patched — cross-platform ready');
  }, 50);
});
