# SGE v2.0 DEEP AUDIT - DETAILED FINDINGS & CODE EXAMPLES

## DETAILED ISSUE BREAKDOWNS

---

### Issue #1: Undefined Functions in Admin Panel

#### `clearCache()` - UNDEFINED

**Location:** [admin/index.html](admin/index.html#L573)

**Current HTML:**
```html
<section class="section" id="section-debug" style="display: none">
  <div class="section-title">🐛 Ferramentas de Depuração</div>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    <!-- ... -->
    <button class="btn btn-primary" onclick="clearCache()">
      Limpar Cache
    </button>
    <!-- ... -->
  </div>
</section>
```

**What happens now:** When admin clicks button → JavaScript error in console → No function found

**What should happen:** Cache should be cleared from sessionStorage or localStorage

**Recommended implementation:**
```javascript
window.clearCache = () => {
  try {
    sessionStorage.clear();
    localStorage.clear();
    const output = document.getElementById("debug-output");
    output.innerHTML = "✅ Cache limpo com sucesso<br>";
    output.style.display = "block";
  } catch (error) {
    console.error("Erro ao limpar cache:", error);
  }
};
```

---

#### `simulateError()` - UNDEFINED

**Location:** [admin/index.html](admin/index.html#L576)

**Current HTML:**
```html
<button class="btn btn-primary" onclick="simulateError()">
  Simular Erro
</button>
```

**Issue:** Button exists but function never implemented

**Recommended implementation:**
```javascript
window.simulateError = () => {
  const output = document.getElementById("debug-output");
  output.style.display = "block";
  output.innerHTML = "🔴 Simulando erro crítico...<br>";
  
  try {
    // Simulate error
    throw new Error("Erro simulado para teste de monitoramento");
  } catch (error) {
    output.innerHTML += `Error: ${error.message}<br>`;
    output.innerHTML += `Stack: ${error.stack}<br>`;
    // Would log to error tracking service in real implementation
  }
};
```

---

### Issue #2: Mock Authentication in Production

#### Problem Location: [auth/login.html](auth/login.html#L106-L107)

**Current Code:**
```html
<!doctype html>
<html lang="pt-BR">
  <!-- ... -->
  <script type="module" src="../assets/js/mock/data.js"></script>
  <script type="module" src="../assets/js/mock/auth.mock.js"></script>
```

**What's in these files:**

[assets/js/mock/auth.mock.js](assets/js/mock/auth.mock.js):
```javascript
export const mockAuthService = {
  async signInWithEmailAndPassword(email, password) {
    console.log(`🔑 [MOCK AUTH] Tentativa de login: ${email}`);
    // Returns mock user instead of real Firebase user
    return { uid: "user_001", email };
  },
  
  async logout() {
    console.log(`🚪 [MOCK AUTH] Logout realizado`);
    // Doesn't actually disconnect from Firebase
  }
};
```

**The Problem:**
1. Mock auth intercepts all authentication calls
2. Users receive mock user objects
3. Real Firebase never gets called
4. Authentication is fake in production

**Security Risk:**
- Anyone can log in with any credentials
- No real access control
- Test data exposed

**Fix Required:**
```javascript
// Add environment detection
const USE_MOCK = process.env.NODE_ENV === 'development';

if (!USE_MOCK) {
  // Remove mock imports from production build
}
```

---

### Issue #3: Path Mismatch - Navigation Breaks

#### Problem: Filename with Unicode Character

**Files Involved:**
- [diretor/usuário-professores.html](diretor/usuário-professores.html) - Contains Unicode 'ú'
- [diretor/usuarios/professores.html](diretor/usuarios/professores.html) - Regular 'u'

**Navigation in [diretor/index.html](diretor/index.html#L74):**
```html
<li>
  <a href="usuarios-professores.html" class="nav-link">
    👥 Professores
  </a>
</li>
```

**What happens:**
1. User clicks "Professores" link
2. Browser looks for `usuarios-professores.html`
3. File exists as `usuário-professores.html` (unicode)
4. On Windows: file lookup is case-insensitive but encoding-sensitive
5. **Result: 404 Not Found or wrong file served**

**Test this:**
```bash
# Check actual filenames
ls -la diretor/ | grep professor
# Output should show:
# - usuário-professores.html (unicode)
# - usuarios/ (directory)
```

**Fix:**
Option A: Rename file to remove unicode
```bash
mv diretor/usuário-professores.html diretor/usuarios-professores.html
```

Option B: Fix all links to use unicode
```html
<a href="usuário-professores.html">Professores</a>
```

Option C: Use nested path
```html
<a href="usuarios/professores.html">Professores</a>
```

---

### Issue #4: Import Version Inconsistencies

#### Problem: Multiple Firebase SDK Versions

Different files import from different Firebase versions:

**File: [diretor/js/diretor.js](diretor/js/diretor.js#L9)**
```javascript
import { onAuthStateChanged } from 
  "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
```

**File: [diretor/js/dashboard.js](diretor/js/dashboard.js#L5)**
```javascript
import { onAuthStateChanged } from 
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
```

**File: [diretor/js/usuarios-professores.js](diretor/js/usuarios-professores.js#L2)**
```javascript
import { onAuthStateChanged } from 
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
```

**Issue Severity:** HIGH
- Different versions may have API differences
- Module resolution conflicts
- Unpredictable behavior

**Recommended Fix:**
Standardize to one version (10.7.0 recommended):
```bash
# In all JS files, replace:
# 9.6.1 → 10.7.0
# 9.22.0 → 10.7.0
# 10.7.0 → 10.7.0 (already correct)
```

---

### Issue #5: Hardcoded Admin Credentials

#### Problem: Test Data in Production Code

**Location: [admin/js/dashboard.js](admin/js/dashboard.js#L7)**

```javascript
const state = {
  admin: {
    uid: "admin_001",        // ← Hardcoded UID
    nome: "Super Admin",     // ← Hardcoded name
    role: "admin",           // ← Hardcoded role
    status: "ativo",         // ← Hardcoded status
  },
  metrics: {
    usuarios: 0,
    requests: 1250,
    fcm: 4,
    errors: 2,
    uptime: "99.98%",
  },
  // ...
};
```

**Security Risk:**
- Anyone reading source code knows: `uid: admin_001`
- Credentials exposed in network traffic (JavaScript file)
- Test data used instead of real user data

**Better Approach:**
```javascript
// Get from authenticated user, not hardcoded
let admin = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    admin = {
      uid: user.uid,      // From Firebase Auth
      email: user.email,  // From Firebase Auth
      role: user.customClaims?.role,  // From custom claims
    };
  }
});
```

---

### Issue #6: Fake Health Check Results

#### Problem: Health Check Shows Hardcoded Results

**Location: [admin/js/dashboard.js](admin/js/dashboard.js#L237)**

```javascript
window.runHealthCheck = () => {
  const output = document.getElementById("debug-output");
  output.style.display = "block";
  output.innerHTML = "Iniciando Health Check...<br>";

  const tests = [
    { name: "Firebase Connection", status: "OK" },      // ← Hardcoded
    { name: "Realtime DB Latency", status: "45ms" },   // ← Hardcoded
    { name: "FCM Gateway", status: "ONLINE" },         // ← Hardcoded
    { name: "Auth Service", status: "OK" },            // ← Hardcoded
    { name: "Storage Quota", status: "12% used" },     // ← Hardcoded
  ];

  tests.forEach((t, i) => {
    setTimeout(() => {
      output.innerHTML += `[${t.name}] ................. <span style="color: var(--success)">${t.status}</span><br>`;
    }, (i + 1) * 300);
  });
};
```

**Problem:**
- Results are never actually tested
- Always shows "OK" even if services are down
- Admin can't detect real problems
- Misleading status information

**Correct Implementation:**
```javascript
window.runHealthCheck = async () => {
  const results = [];
  
  // Test Firebase Connection
  try {
    const response = await fetch('/.well-known/goog-identity');
    results.push({ name: "Firebase Connection", status: response.ok ? "OK" : "FAILED" });
  } catch (error) {
    results.push({ name: "Firebase Connection", status: "FAILED" });
  }
  
  // Test Realtime DB
  const startTime = Date.now();
  try {
    const dbRef = ref(db, '.info/connected');
    const snapshot = await get(dbRef);
    const latency = Date.now() - startTime;
    results.push({ name: "Realtime DB Latency", status: `${latency}ms` });
  } catch (error) {
    results.push({ name: "Realtime DB Latency", status: "ERROR" });
  }
  
  // ... display actual results
};
```

---

### Issue #7: Missing PDF Export Function

#### Problem: Button Exists But No Implementation

**Location: [professor/bilhetes.html](professor/bilhetes.html) (approximate)**

**What exists:**
- UI button "📥 Exportar" exists in HTML
- Button triggers onclick handler (need to verify which)

**What's missing:**
- No `exportPDF()` function in [professor/js/bilhetes.js](professor/js/bilhetes.js)
- No jsPDF library imported
- No export logic implemented

**Solution Required:**
```html
<!-- In professor/bilhetes.html, add script -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

```javascript
// In professor/js/bilhetes.js
window.exportBilhetesPDF = () => {
  const element = document.getElementById("bilhetes-table");
  const opt = {
    margin: 10,
    filename: `bilhetes_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };
  
  html2pdf().set(opt).from(element).save();
};
```

---

### Issue #8: Potential XSS Vulnerability

#### Location: [diretor/js/usuarios-professores.js](diretor/js/usuarios-professores.js#L79)

**Vulnerable Code:**
```javascript
<td><img src="${p.foto || "../../assets/img/default-avatar.svg"}" class="prof-photo" loading="lazy"></td>
```

**Risk:**
If `p.foto` contains: `javascript:alert('xss')` or similar malicious content

**Attack Example:**
```javascript
// If attacker stores this in database:
p.foto = "' onerror='alert(\"XSS Vulnerability\")' src='"

// HTML becomes:
<img src="' onerror='alert("XSS Vulnerability")' src=''" ...>
```

**Fix - Sanitize URLs:**
```javascript
function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

const photoUrl = p.foto && isValidImageUrl(p.foto) 
  ? p.foto 
  : "../../assets/img/default-avatar.svg";

html += `<td><img src="${photoUrl}" class="prof-photo" loading="lazy"></td>`;
```

---

### Issue #9: Missing Server-Side Validation

#### Problem: Only Client-Side Validation Exists

**Example: [cadastro/pai.html](cadastro/pai.html) - Parent Registration**

**Current validation:**
```html
<input 
  type="email" 
  required 
  placeholder="seu@email.com"
/>

<input 
  type="text" 
  minlength="3" 
  required 
  placeholder="Ex: Maria Silva"
/>
```

**Problem:**
- HTML5 validation (`required`, `minlength`) is client-side only
- User can bypass with developer tools
- No server/Cloud Function validation

**Attack Example:**
```javascript
// Attacker opens console and does:
document.querySelector('input[type="email"]').value = "not-an-email";
document.querySelector('form').submit();
// Form submits without validation!
```

**Required Fix:**
Add Cloud Function validation:
```javascript
// In Firebase Cloud Functions
exports.validateParentRegistration = functions.https.onCall((data, context) => {
  // Server-side validation
  if (!data.email || !data.email.match(/@/)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
  }
  
  if (!data.nome || data.nome.length < 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid name');
  }
  
  // Process if valid
  return { success: true };
});
```

---

### Issue #10: Missing Authorization Checks

#### Problem: Pages Don't Verify User Role

**Example: Anyone with direct link can access admin dashboard**

**Current: [admin/index.html](admin/index.html#L265)**
```javascript
async function init() {
  // RBAC: Simula onAuthStateChanged
  if (state.admin.role !== "admin" || state.admin.status !== "ativo") {
    console.error("[SECURITY] Acesso não autorizado detectado.");
    document.body.innerHTML = '<div>Acesso Negado</div>';
    return;
  }
  // ...
}
```

**Problems:**
1. Uses hardcoded `state.admin` role (not real user)
2. Check happens AFTER page loads (visible momentarily)
3. Anyone can comment out the check

**Better Approach:**
```javascript
// Check BEFORE page renders
async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '../auth/login.html';
        resolve(false);
        return;
      }
      
      // Get custom claims
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims.role;
      
      if (role !== 'admin') {
        window.location.href = '../errors/sem-permissao.html';
        resolve(false);
        return;
      }
      
      resolve(true);
    });
  });
}

// Call BEFORE init()
if (await checkAuth()) {
  init();
}
```

---

## Summary of Code Quality Issues

| Issue | File | Line | Severity |
|-------|------|------|----------|
| Undefined `clearCache()` | admin/js/dashboard.js | N/A | 🔴 CRITICAL |
| Undefined `simulateError()` | admin/js/dashboard.js | N/A | 🔴 CRITICAL |
| Mock auth imported | auth/login.html | 106-107 | 🔴 CRITICAL |
| Path mismatch | diretor/index.html | 74 | 🔴 CRITICAL |
| Firebase SDK versions | Multiple | Various | 🟠 HIGH |
| Hardcoded credentials | admin/js/dashboard.js | 7-15 | 🟠 HIGH |
| Fake health check | admin/js/dashboard.js | 237-260 | 🟠 HIGH |
| XSS vulnerability | diretor/js/usuarios-professores.js | 79 | 🟠 HIGH |
| No server validation | cadastro/**/*.html | Various | 🟠 HIGH |
| No auth checks | All admin pages | Various | 🟠 HIGH |

---

**Total Issues Found:** 40+  
**Critical:** 8  
**High:** 12  
**Medium:** 15+  

