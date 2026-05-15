/**
 * Priora — Auth UI  (auth-ui.js)
 * ─────────────────────────────────────────────────────────────────
 * Injects:
 *   • Login/Register modal  (#m-auth)
 *   • Logout button in sidebar action area
 *   • Sidebar avatar: Google photo  OR  initials fallback
 *   • Sync badge (delegated to storage.js)
 *
 * Drop-in: zero changes to index.html logic, just include this file.
 * ─────────────────────────────────────────────────────────────────
 */

import storage from './storage.js';

// ─────────────────────────────────────────────────────────────────
// ── Inject Auth Modal HTML ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
function _injectAuthModal() {
  if (document.getElementById('m-auth')) return;

  const el = document.createElement('div');
  el.innerHTML = /* html */`

<!-- ── AUTH MODAL ── -->
<div id="m-auth" class="mo" style="display:none" onclick="if(event.target===this)void 0">
  <div class="md" style="max-width:400px">

    <!-- Header -->
    <div class="mh" style="justify-content:center;flex-direction:column;gap:4px;padding:22px 20px 14px">
      <div style="display:flex;align-items:center;gap:8px;justify-content:center">
        <span style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:var(--text)">Priora</span>
        <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);margin-bottom:2px;flex-shrink:0"></span>
      </div>
      <p id="auth-subtitle" style="font-size:12px;color:var(--text3);text-align:center;margin-top:2px">Sign in to sync your data across devices</p>
    </div>

    <!-- Tab switcher -->
    <div style="display:flex;border-bottom:1px solid var(--border);padding:0 18px;gap:0">
      <button id="auth-tab-signin" onclick="authTabSwitch('signin')"
        style="flex:1;padding:9px 0;border:none;background:none;font-family:var(--font);font-size:13px;font-weight:600;
               color:var(--accent);border-bottom:2px solid var(--accent);cursor:pointer;transition:all .15s">Sign In</button>
      <button id="auth-tab-signup" onclick="authTabSwitch('signup')"
        style="flex:1;padding:9px 0;border:none;background:none;font-family:var(--font);font-size:13px;font-weight:500;
               color:var(--text3);border-bottom:2px solid transparent;cursor:pointer;transition:all .15s">Register</button>
    </div>

    <!-- Body -->
    <div class="mb" style="padding:18px">

      <!-- Sign-in form -->
      <div id="auth-form-signin">
        <div class="fg">
          <label class="fl">Email</label>
          <input class="fi2" id="auth-email" type="email" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="fg" style="position:relative">
          <label class="fl">Password</label>
          <input class="fi2" id="auth-pass" type="password" placeholder="••••••••" autocomplete="current-password"
            style="padding-inline-end:38px">
          <button onclick="authTogglePass('auth-pass',this)"
            style="position:absolute;inset-inline-end:10px;bottom:8px;background:none;border:none;
                   cursor:pointer;color:var(--text3);display:flex;padding:2px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div id="auth-err" style="font-size:12px;color:var(--red);margin-bottom:10px;display:none"></div>
        <button class="btn btn-p" style="width:100%;justify-content:center;margin-bottom:12px"
          onclick="authDoSignIn()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign In
        </button>
      </div>

      <!-- Register form (hidden initially) -->
      <div id="auth-form-signup" style="display:none">
        <div class="fg">
          <label class="fl">Display Name</label>
          <input class="fi2" id="auth-regname" type="text" placeholder="Your name" autocomplete="name">
        </div>
        <div class="fg">
          <label class="fl">Email</label>
          <input class="fi2" id="auth-regemail" type="email" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="fg" style="position:relative">
          <label class="fl">Password</label>
          <input class="fi2" id="auth-regpass" type="password" placeholder="Min 6 characters"
            autocomplete="new-password" style="padding-inline-end:38px">
          <button onclick="authTogglePass('auth-regpass',this)"
            style="position:absolute;inset-inline-end:10px;bottom:8px;background:none;border:none;
                   cursor:pointer;color:var(--text3);display:flex;padding:2px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div id="auth-reg-err" style="font-size:12px;color:var(--red);margin-bottom:10px;display:none"></div>
        <button class="btn btn-p" style="width:100%;justify-content:center;margin-bottom:12px"
          onclick="authDoSignUp()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Create Account
        </button>
      </div>

      <!-- Google divider -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:11px;color:var(--text3)">or continue with</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>

      <!-- Google button -->
      <button onclick="authDoGoogle()" style="
        width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
        padding:9px 14px;border-radius:var(--r-sm);border:1px solid var(--border);
        background:var(--surface);color:var(--text);font-family:var(--font);font-size:13px;
        font-weight:500;cursor:pointer;transition:all .15s">
        <!-- Google G logo -->
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.7 0 6.7 5.5 2.9 13.5l7.8 6C12.6 13.3 17.9 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
          <path fill="#FBBC05" d="M10.7 28.5A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.5L2.4 13.5A24 24 0 0 0 0 24c0 3.8.9 7.4 2.5 10.5l8.2-6z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.1 0-11.3-4-13.2-9.5l-8.2 6C6.7 42.5 14.7 48 24 48z"/>
        </svg>
        Sign in with Google
      </button>

      <!-- Skip / Guest note -->
      <div style="text-align:center;margin-top:14px">
        <button onclick="authClose()" style="
          background:none;border:none;font-family:var(--font);font-size:12px;
          color:var(--text3);cursor:pointer;text-decoration:underline;text-underline-offset:2px">
          Continue without signing in
        </button>
      </div>
    </div>

  </div>
</div>

<!-- ── LOGOUT CONFIRM MODAL ── -->
<div id="m-auth-logout" class="mo" style="display:none" onclick="if(event.target===this)authLogoutCancel()">
  <div class="md" style="max-width:340px">
    <div class="confirm-body" style="padding:24px 20px 10px">
      <div class="confirm-icon" style="color:var(--text3)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </div>
      <div class="confirm-msg">Sign out?</div>
      <div class="confirm-sub">Your data will remain saved in the cloud.</div>
    </div>
    <div class="mf" style="justify-content:center">
      <button class="btn btn-danger" onclick="authDoSignOut()">Sign Out</button>
      <button class="btn" onclick="authLogoutCancel()">Cancel</button>
    </div>
  </div>
</div>
`;
  document.body.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────
// ── Sidebar auth btn — handled by index.html directly
// ─────────────────────────────────────────────────────────────────
function _injectSidebarAuthBtn() {
  // No-op: sidebar user area is fully defined in index.html
}

// ─────────────────────────────────────────────────────────────────
// ── Update sidebar avatar + name after auth state change ─────────
// ─────────────────────────────────────────────────────────────────
function _updateSidebarUser(user) {
  // Guest area removed — auth is mandatory. Only handle signed-in user display.
  const userArea = document.getElementById('sb-user-area');
  const avatarEl = document.getElementById('sb-avatar');
  const nameEl   = document.getElementById('sb-uname');
  const uidEl    = document.getElementById('sb-uid');

  if (user) {
    // Always show user area
    if (userArea) { userArea.style.display = 'flex'; userArea.style.flexDirection = 'column'; }

    // Use Firebase data only — no local state.user to avoid duplicate
    const displayName = user.displayName || user.email?.split('@')[0] || 'User';
    const email       = user.email || '';
    const initials    = displayName.charAt(0).toUpperCase();

    if (nameEl) nameEl.textContent = displayName;
    if (uidEl)  uidEl.textContent  = email;

    // Avatar: Google photo → fallback initials
    if (avatarEl) {
      avatarEl.style.borderRadius = '50%';
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"
          onerror="this.parentElement.innerHTML='<span style=\'font-size:14px;font-weight:700;color:var(--accent-text)\'>${initials}</span>'">`;
      } else {
        avatarEl.innerHTML = `<span style="font-size:14px;font-weight:700;color:var(--accent-text)">${initials}</span>`;
      }
    }

    // Also update dropdown header if open
    const ddAvatar = document.getElementById('dd-avatar');
    const ddUname  = document.getElementById('dd-uname');
    const ddEmail  = document.getElementById('dd-email');
    const ddSince  = document.getElementById('dd-since-txt');
    if (ddAvatar) ddAvatar.innerHTML = avatarEl ? avatarEl.innerHTML : '';
    if (ddUname)  ddUname.textContent  = displayName;
    if (ddEmail)  ddEmail.textContent  = email;
    if (ddSince && user.metadata?.creationTime) {
      const d = new Date(user.metadata.creationTime);
      ddSince.textContent = 'Joined ' + d.toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' });
    }

  } else {
    // user is null → signout in progress, redirect handles the rest
    // Just close the dropdown to avoid flicker
    const dd = document.getElementById('sb-user-dropdown');
    if (dd) dd.style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────────
// ── Global functions (called from inline HTML) ────────────────────
// ─────────────────────────────────────────────────────────────────

window.authOpen = function() {
  // Reset to sign-in tab
  authTabSwitch('signin');
  _clearErrors();
  document.getElementById('m-auth').style.display = 'flex';
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
};

window.authClose = function() {
  document.getElementById('m-auth').style.display = 'none';
};

window.authTabSwitch = function(tab) {
  const signIn = document.getElementById('auth-tab-signin');
  const signUp = document.getElementById('auth-tab-signup');
  const formIn = document.getElementById('auth-form-signin');
  const formUp = document.getElementById('auth-form-signup');
  const sub    = document.getElementById('auth-subtitle');
  _clearErrors();
  if (tab === 'signin') {
    signIn.style.color = 'var(--accent)';
    signIn.style.borderBottomColor = 'var(--accent)';
    signIn.style.fontWeight = '600';
    signUp.style.color = 'var(--text3)';
    signUp.style.borderBottomColor = 'transparent';
    signUp.style.fontWeight = '500';
    formIn.style.display = 'block';
    formUp.style.display = 'none';
    if (sub) sub.textContent = 'Sign in to sync your data across devices';
  } else {
    signUp.style.color = 'var(--accent)';
    signUp.style.borderBottomColor = 'var(--accent)';
    signUp.style.fontWeight = '600';
    signIn.style.color = 'var(--text3)';
    signIn.style.borderBottomColor = 'transparent';
    signIn.style.fontWeight = '500';
    formIn.style.display = 'none';
    formUp.style.display = 'block';
    if (sub) sub.textContent = 'Create an account to get started';
  }
};

window.authTogglePass = function(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.color = inp.type === 'text' ? 'var(--accent)' : 'var(--text3)';
};

window.authDoSignIn = async function() {
  _clearErrors();
  const email = document.getElementById('auth-email')?.value.trim();
  const pass  = document.getElementById('auth-pass')?.value;
  if (!email || !pass) { _showError('auth-err', 'Please fill in all fields.'); return; }
  // Check if sample data exists — warn before proceeding
  const hasSamples = typeof isSampleData === 'function' && isSampleData();
  if (hasSamples) {
    const confirmed = await _showSampleWarning();
    if (!confirmed) return;
  }
  _setBusy(true);
  try {
    await storage.authSignInEmail(email, pass);
    authClose();
  } catch (err) {
    _showError('auth-err', _friendlyError(err.code));
  } finally {
    _setBusy(false);
  }
};

window.authDoSignUp = async function() {
  _clearErrors();
  const name  = document.getElementById('auth-regname')?.value.trim();
  const email = document.getElementById('auth-regemail')?.value.trim();
  const pass  = document.getElementById('auth-regpass')?.value;
  if (!email || !pass) { _showError('auth-reg-err', 'Please fill in all fields.'); return; }
  _setBusy(true);
  try {
    await storage.authSignUpEmail(email, pass, name);
    authClose();
  } catch (err) {
    _showError('auth-reg-err', _friendlyError(err.code));
  } finally {
    _setBusy(false);
  }
};

window.authDoGoogle = async function() {
  _clearErrors();
  const hasSamples = typeof isSampleData === 'function' && isSampleData();
  if (hasSamples) {
    const confirmed = await _showSampleWarning();
    if (!confirmed) return;
  }
  _setBusy(true);
  try {
    await storage.authSignInGoogle();
    authClose();
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      _showError('auth-err', _friendlyError(err.code));
    }
  } finally {
    _setBusy(false);
  }
};

window.authDoSignOut = async function() {
  document.getElementById('m-auth-logout').style.display = 'none';
  // Close dropdown
  const dd = document.getElementById('sb-user-dropdown');
  if (dd) dd.style.display = 'none';
  // Sign out
  await storage.authSignOut();
  // Clear local cache
  try { localStorage.removeItem('priora_v1_data'); } catch(e) {}
  // Reset state and reload
  if (typeof state !== 'undefined') {
    state.projects = [];
    state.requests = [];
    state.trash    = [];
    state.user     = { name:'', empId:'', avatar:'' };
    state._loaded  = false;
  }
  if (typeof rcv === 'function') rcv();
  if (typeof ubadges === 'function') ubadges();
  if (typeof checkOnboarding === 'function') checkOnboarding();
};

window.authLogoutCancel = function() {
  document.getElementById('m-auth-logout').style.display = 'none';
};

// ─────────────────────────────────────────────────────────────────
// ── Helper: error messages ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
function _showError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearErrors() {
  ['auth-err', 'auth-reg-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}
function _setBusy(busy) {
  // Disable submit buttons while processing
  document.querySelectorAll('#m-auth .btn-p, #m-auth button[onclick^="authDo"]')
    .forEach(b => b.disabled = busy);
}
function _showSampleWarning() {
  return new Promise(resolve => {
    // Remove existing if any
    const existing = document.getElementById('priora-sample-warn');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'priora-sample-warn';
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', zIndex:'100000',
      background:'rgba(0,0,0,.55)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
    });
    overlay.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);max-width:380px;width:100%;box-shadow:var(--shadow-lg);animation:su .15s ease;">
        <div style="padding:18px 18px 14px;border-bottom:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style="font-size:15px;font-weight:600;color:var(--text);">Sample data will be cleared</span>
          </div>
          <p style="font-size:13px;color:var(--text2);line-height:1.6;margin:0;">After signing in, the current sample data will be removed and replaced with your personal cloud data.</p>
        </div>
        <div style="padding:12px 18px;display:flex;gap:8px;background:var(--surface2);">
          <button id="psw-ok" style="flex:1;padding:8px;border-radius:var(--r-sm);border:1px solid var(--accent);background:var(--accent);color:#fff;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;">Continue & Sign In</button>
          <button id="psw-cancel" style="padding:8px 14px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--surface);color:var(--text2);font-family:var(--font);font-size:13px;cursor:pointer;">Keep Sample</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('psw-ok').onclick = () => { overlay.remove(); resolve(true); };
    document.getElementById('psw-cancel').onclick = () => { overlay.remove(); resolve(false); };
  });
}

function _friendlyError(code) {
  const msgs = {
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/email-already-in-use':  'This email is already registered.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/too-many-requests':     'Too many attempts. Please try again later.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/popup-blocked':         'Popup was blocked. Allow popups and try again.',
  };
  return msgs[code] || 'Something went wrong. Please try again.';
}

// ─────────────────────────────────────────────────────────────────
// ── Bootstrap ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
function initAuthUI() {
  _injectAuthModal();
  // Listen to auth state changes
  storage.onAuthChange(async (user) => {
    _updateSidebarUser(user);

    // Reload app data when user signs in
    if (user && typeof load === 'function') {
      // Show notice if sample data exists
      const hasSamples = typeof isSampleData === 'function' && isSampleData();
      if (hasSamples) {
        const notice = document.createElement('div');
        notice.id = 'priora-signin-notice';
        Object.assign(notice.style, {
          position:'fixed', top:'0', left:'0', right:'0', zIndex:'99999',
          background:'var(--surface)', border:'0 0 1px 0',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'12px',
          padding:'14px 20px', fontFamily:'var(--font)', fontSize:'13px',
          boxShadow:'var(--shadow-md)'
        });
        notice.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style="color:var(--text)">Sample data will be cleared — your cloud data will load instead.</span>
          <button onclick="document.getElementById('priora-signin-notice').remove()" style="padding:4px 14px;border-radius:99px;background:var(--accent);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);">OK</button>`;
        document.body.prepend(notice);
        setTimeout(() => notice?.remove(), 5000);
      }

      state = await storage.load();
      if (!state.projects) state.projects = [];
      if (!state.requests) state.requests = [];
      if (!state.trash)    state.trash    = [];
      if (!state.user)     state.user     = { name: '', empId: '', avatar: '' };
      if (user.displayName && !state.user.name) {
        state.user.name = user.displayName;
      }
      if (typeof applyUser === 'function') applyUser();
      if (typeof rcv === 'function') rcv();
      if (typeof ubadges === 'function') ubadges();
    }
  });
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
  initAuthUI();
}


// ── Bridge: directly expose all auth functions globally ──
window._authOpen         = (...a) => window.authOpen(...a);
window._authClose        = (...a) => window.authClose(...a);
window._authTabSwitch    = (...a) => window.authTabSwitch(...a);
window._authTogglePass   = (...a) => window.authTogglePass(...a);
window._authDoSignIn     = (...a) => window.authDoSignIn(...a);
window._authDoSignUp     = (...a) => window.authDoSignUp(...a);
window._authDoGoogle     = (...a) => window.authDoGoogle(...a);
window._authDoSignOut    = (...a) => window.authDoSignOut(...a);
window._authLogoutCancel = (...a) => window.authLogoutCancel(...a);

// Expose storage to non-module scripts in index.html
window._storage = storage;

export { initAuthUI };
