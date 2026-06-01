# SGE v2.0 - AUDIT ACTION PLAN & FIX CHECKLIST

## 🚨 CRITICAL BLOCKERS (Fix Immediately)

### BLOCKER #1: Mock Auth Prevents Login
**Status:** 🔴 BLOCKING ALL USERS  
**Affects:** Everyone - cannot log in  
**Fix Time:** 30 minutes

**Action Items:**
- [ ] Remove `../assets/js/mock/data.js` import from [auth/login.html](auth/login.html#L106)
- [ ] Remove `../assets/js/mock/auth.mock.js` import from [auth/login.html](auth/login.html#L107)
- [ ] Verify Firebase config is correct in [assets/js/firebase/config.js](assets/js/firebase/config.js)
- [ ] Test login with real Firebase credentials
- [ ] Verify role-based routing works

**Code Changes Required:**
```html
<!-- REMOVE these lines from auth/login.html -->
<script type="module" src="../assets/js/mock/data.js"></script>
<script type="module" src="../assets/js/mock/auth.mock.js"></script>
```

---

### BLOCKER #2: Path Mismatch - Director Pages Not Accessible
**Status:** 🔴 BLOCKING DIRECTOR USERS  
**Affects:** Diretor role - 17 pages affected  
**Fix Time:** 15 minutes

**Action Items:**
- [ ] Rename `diretor/usuário-professores.html` → `diretor/usuarios-professores.html` (remove unicode)
  OR
  Fix all links in `diretor/index.html` to use `usuário-professores.html`
- [ ] Update links in [diretor/index.html](diretor/index.html) for all nested pages:
  - [ ] Line 74: `usuarios-professores.html` → `usuarios/professores.html` (OR use root file)
  - [ ] Line 81: `usuarios-pais.html` → `usuarios/pais.html` (OR use root file)
  - [ ] Line 134: Check `relatorios-frequencia.html` vs `relatorios/frequencia.html`
  - [ ] Line 141: Check `relatorios-notas.html` vs `relatorios/notas.html`

**Quick Test:**
```bash
# In browser console
console.log(document.location.pathname)
// If gets 404, fix path mismatch
```

---

### BLOCKER #3: Undefined Admin Functions
**Status:** 🔴 BLOCKING ADMIN DEBUG  
**Affects:** Admin role - debug panel broken  
**Fix Time:** 20 minutes

**Action Items:**
- [ ] Add `window.clearCache` function to [admin/js/dashboard.js](admin/js/dashboard.js)
```javascript
window.clearCache = () => {
  sessionStorage.clear();
  localStorage.clear();
  alert("✅ Cache cleared successfully");
  location.reload();
};
```

- [ ] Add `window.simulateError` function to [admin/js/dashboard.js](admin/js/dashboard.js)
```javascript
window.simulateError = () => {
  const output = document.getElementById("debug-output");
  output.style.display = "block";
  output.innerHTML = "🔴 Error simulation:<br>";
  output.innerHTML += "Throwing error for testing...<br>";
  try {
    throw new Error("Test error from admin panel");
  } catch (e) {
    output.innerHTML += `Error: ${e.message}`;
  }
};
```

- [ ] Test both buttons in admin panel

---

## 🟠 HIGH PRIORITY (Fix This Week)

### Issue #4: Firebase SDK Version Conflicts
**Status:** 🟠 RISKY  
**Affects:** Random compatibility issues, unpredictable behavior  
**Fix Time:** 1 hour

**Action Items:**
- [ ] Audit all JS files for Firebase imports
- [ ] Standardize to version 10.7.0 in ALL files
- [ ] Create a list of affected files:
  - [ ] [diretor/js/diretor.js](diretor/js/diretor.js) - uses 9.6.1
  - [ ] [diretor/js/usuarios-professores.js](diretor/js/usuarios-professores.js) - uses 9.22.0
  - [ ] [diretor/js/dashboard.js](diretor/js/dashboard.js) - uses 10.7.0 ✅
  - [ ] [Other files] - check all

**Command to find and fix:**
```bash
# Find all Firebase imports
grep -r "firebasejs/" . --include="*.js" | grep -v node_modules

# Replace all versions with 10.7.0
find . -type f -name "*.js" -exec sed -i 's/firebasejs\/[0-9.]*\/firebase/firebasejs\/10.7.0\/firebase/g' {} \;
```

---

### Issue #5: Remove Hardcoded Admin Credentials
**Status:** 🟠 SECURITY RISK  
**Affects:** Source code now reveals `uid: admin_001`  
**Fix Time:** 30 minutes

**Action Items:**
- [ ] Remove hardcoded state from [admin/js/dashboard.js](admin/js/dashboard.js)
```javascript
// BEFORE:
const state = {
  admin: {
    uid: "admin_001",
    nome: "Super Admin",
    role: "admin",
  },
};

// AFTER:
let admin = null;
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const claims = await user.getIdTokenResult();
    admin = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName || "Admin",
      role: claims.claims.role,
    };
    updateAdminUI();
  }
});
```

- [ ] Update UI update functions to use real user data
- [ ] Test with real user login

---

### Issue #6: Fake Health Check Results
**Status:** 🟠 MISLEADING  
**Affects:** Admin cannot detect real problems  
**Fix Time:** 1.5 hours

**Action Items:**
- [ ] Implement real Firebase connection test
- [ ] Implement real DB latency test
- [ ] Implement real FCM gateway test
- [ ] Replace fake results in [admin/js/dashboard.js](admin/js/dashboard.js)

**Pseudo-code for real tests:**
```javascript
async function testFirebaseConnection() {
  try {
    const response = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword', {
      headers: { 'X-Goog-Api-Key': FIREBASE_CONFIG.apiKey }
    });
    return response.ok ? "OK" : "FAILED";
  } catch (error) {
    return "FAILED";
  }
}

async function testDatabaseLatency() {
  const start = Date.now();
  try {
    await get(ref(db, '.info/connected'));
    return `${Date.now() - start}ms`;
  } catch {
    return "FAILED";
  }
}
```

---

### Issue #7: Add PDF Export to Bilhetes
**Status:** 🟠 MISSING FEATURE  
**Affects:** Teachers cannot export  
**Fix Time:** 1 hour

**Action Items:**
- [ ] Add jsPDF library link to [professor/bilhetes.html](professor/bilhetes.html)
- [ ] Implement `window.exportBilhetesPDF()` in [professor/js/bilhetes.js](professor/js/bilhetes.js)
- [ ] Test PDF generation

---

### Issue #8: Fix XSS Vulnerability
**Status:** 🟠 SECURITY RISK  
**Affects:** Potential data injection attacks  
**Fix Time:** 30 minutes

**Action Items:**
- [ ] Sanitize URLs in [diretor/js/usuarios-professores.js](diretor/js/usuarios-professores.js#L79)
```javascript
// Create URL validation function
function isValidImageUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Use in template
const photoUrl = p.foto && isValidImageUrl(p.foto) 
  ? p.foto 
  : "../../assets/img/default-avatar.svg";
```

- [ ] Apply same fix to all HTML generation with user data
- [ ] Search for other innerHTML assignments with user data

---

### Issue #9: Add Server-Side Form Validation
**Status:** 🟠 SECURITY RISK  
**Affects:** Form submissions can be bypassed  
**Fix Time:** 2 hours

**Action Items:**
- [ ] Create Cloud Function for parent registration validation [functions/src/auth/validateParentReg.js]
- [ ] Create Cloud Function for teacher registration validation
- [ ] Create Cloud Function for director registration validation
- [ ] Update registration forms to call Cloud Functions instead of direct database writes
- [ ] Add error handling for validation failures

**Example Cloud Function:**
```javascript
// functions/src/auth/validateParentRegistration.js
exports.validateParentRegistration = functions.https.onCall(async (data, context) => {
  // Verify authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Validate inputs server-side
  if (!data.email || !data.email.match(/.+@.+\..+/)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
  }
  
  if (!data.nome || data.nome.length < 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Name must be at least 3 characters');
  }
  
  // Process registration
  return { success: true };
});
```

---

### Issue #10: Add Authorization Checks to Pages
**Status:** 🟠 SECURITY RISK  
**Affects:** Anyone can access any page with direct link  
**Fix Time:** 1.5 hours

**Action Items:**
- [ ] Add auth check BEFORE page renders in [admin/index.html](admin/index.html)
- [ ] Add auth check BEFORE page renders in [diretor/index.html](diretor/index.html)
- [ ] Add auth check BEFORE page renders in [professor/index.html](professor/index.html)
- [ ] Add auth check BEFORE page renders in [pai/pai_index.html](pai/pai_index.html)

**Pattern to use in each page:**
```html
<script type="module">
  import { auth } from '../assets/js/firebase/config.js';
  import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
  
  // Check auth BEFORE showing page
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '../auth/login.html';
      return;
    }
    
    const claims = await user.getIdTokenResult();
    const requiredRole = 'admin'; // Change per page
    
    if (claims.claims.role !== requiredRole) {
      window.location.href = '../errors/sem-permissao.html';
      return;
    }
    
    // Page can now safely load
    document.body.style.display = 'block';
  });
  
  // Hide page until auth check completes
  document.body.style.display = 'none';
</script>
```

---

## 🟡 MEDIUM PRIORITY (Fix This Month)

### Issue #11: Move Test Files Out of Production
**Status:** 🟡 HOUSEKEEPING  
**Fix Time:** 15 minutes

**Action Items:**
- [ ] Move [cadastro/teste-firebase.html](cadastro/teste-firebase.html) to dev/ folder
- [ ] Remove from deployment
- [ ] Document test procedures

---

### Issue #12: Incomplete Features - Reports Filtering
**Status:** 🟡 FEATURE INCOMPLETE  
**Fix Time:** 2 hours

**Action Items:**
- [ ] Implement date range filtering in [diretor/relatorios/frequencia.html](diretor/relatorios/frequencia.html)
- [ ] Implement class filtering in reports
- [ ] Implement student filtering in reports

---

### Issue #13: Add CSRF Protection to Forms
**Status:** 🟡 SECURITY  
**Fix Time:** 1 hour

**Action Items:**
- [ ] Implement CSRF token generation in Cloud Functions
- [ ] Add CSRF validation to form submissions
- [ ] Update all forms to include CSRF token

---

## 🟢 LOW PRIORITY (Nice to Have)

### Issue #14: Add Rate Limiting
**Status:** 🟢 NICE TO HAVE  
**Fix Time:** 1.5 hours

**Action Items:**
- [ ] Implement rate limiting in Cloud Functions for login
- [ ] Implement rate limiting for form submissions
- [ ] Add exponential backoff for failed attempts

---

### Issue #15: Encrypted Storage
**Status:** 🟢 NICE TO HAVE  
**Fix Time:** 2 hours

**Action Items:**
- [ ] Replace sessionStorage with encrypted storage
- [ ] Only store non-sensitive data locally

---

## ✅ VERIFICATION CHECKLIST

After implementing fixes, verify:

### Authentication Flow
- [ ] Can log in with real Firebase user
- [ ] Can log in as parent role
- [ ] Can log in as teacher role
- [ ] Can log in as director role
- [ ] Can log in as admin role
- [ ] Session persists across page refresh
- [ ] Can log out
- [ ] Cannot access other roles' pages after login
- [ ] Get redirected to login when not authenticated
- [ ] Cannot access admin page as non-admin

### Navigation
- [ ] All sidebar links work
- [ ] All navigation buttons work
- [ ] Breadcrumbs work (if present)
- [ ] Back buttons work
- [ ] Parent page navigation works
- [ ] Teacher page navigation works
- [ ] Director page navigation works
- [ ] Admin page navigation works

### Features
- [ ] Admin health check shows real results
- [ ] Admin cache clear works
- [ ] Admin error simulation works
- [ ] Teachers can export bilhetes as PDF
- [ ] Directors can filter reports by date
- [ ] Reports show correct data
- [ ] Registration wizard completes
- [ ] All form validations work (client AND server)

### Security
- [ ] No XSS when entering special characters
- [ ] Cannot access admin pages as regular user
- [ ] Cannot modify other users' data
- [ ] Hardcoded credentials removed from code
- [ ] No mock auth in production
- [ ] No sensitive data in localStorage/sessionStorage

### Performance
- [ ] Admin health check completes < 5 seconds
- [ ] Report generation completes < 10 seconds
- [ ] Pages load within acceptable time
- [ ] No console errors
- [ ] No memory leaks in dev tools

---

## ESTIMATED TIMELINE

**CRITICAL (This Week):**
- Mock auth removal: 1 hour
- Path fixes: 1 hour
- Admin functions: 1 hour
- **Total: 3 hours**

**HIGH (This Week):**
- Firebase versions: 1 hour
- Auth checks: 1.5 hours
- Security fixes: 2 hours
- **Total: 4.5 hours**

**MEDIUM (This Month):**
- Validation & CSRF: 2 hours
- Features: 3 hours
- **Total: 5 hours**

**Grand Total: ~12.5 hours of work**

---

## SIGN-OFF

- [ ] QA Lead: Review audit findings
- [ ] Dev Lead: Review fix recommendations
- [ ] Security Lead: Review security issues
- [ ] Manager: Approve timeline and priorities

**Audit Date:** 2026-05-19  
**Next Review:** After implementing critical fixes (2026-05-24)

