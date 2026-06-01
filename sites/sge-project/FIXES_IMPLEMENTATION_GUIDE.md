# SGE v2.0 Navigation Audit - Fix Implementation Guide

## 🎯 Step-by-Step Fix Instructions

### FIX #1: Add Missing Admin Dashboard Functions

**File:** `admin/js/dashboard.js`  
**Location:** Add before the `init()` function (around line 260)  
**Priority:** 🔴 CRITICAL

#### Current State (Broken)
```javascript
// Lines 260+ in admin/index.html reference these:
// onclick="clearCache()"
// onclick="simulateError()"
// But functions don't exist!
```

#### Fix Implementation
Add these functions to `admin/js/dashboard.js`:

```javascript
// Add this code AFTER line 260 (after testFCM function)

window.clearCache = () => {
  console.log("[ADMIN] Clearing application cache...");
  try {
    // Clear localStorage
    localStorage.clear();
    console.log("[ADMIN] localStorage cleared");
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log("[ADMIN] sessionStorage cleared");
    
    // Clear IndexedDB (if used by Firebase)
    if (window.indexedDB) {
      const dbs = ["firebase", "firebase-cache"];
      dbs.forEach(db => {
        indexedDB.deleteDatabase(db).addEventListener('success', () => {
          console.log(`[ADMIN] IndexedDB '${db}' cleared`);
        });
      });
    }
    
    // Show success message
    alert("✅ Cache limpo com sucesso!\nA aplicação será recarregada.");
    location.reload();
  } catch (error) {
    console.error("[ADMIN] Cache clear failed:", error);
    alert("❌ Erro ao limpar cache: " + error.message);
  }
};

window.simulateError = () => {
  console.warn("[DEBUG] Simulating error for testing purposes...");
  const output = document.getElementById("debug-output");
  
  if (!output) {
    alert("❌ Debug output element not found");
    return;
  }
  
  output.style.display = "block";
  output.innerHTML = "<h3>Simulação de Erro</h3>";
  output.innerHTML += "<p style='color: var(--danger)'>❌ Erro simulado detectado</p>";
  output.innerHTML += "<p><strong>Stack Trace:</strong></p>";
  output.innerHTML += "<pre style='color: var(--text-secondary); overflow-x: auto;'>";
  output.innerHTML += "Error: Test error for debugging purposes\n";
  output.innerHTML += "  at window.simulateError (admin/js/dashboard.js)\n";
  output.innerHTML += "  at onclick (admin/index.html:576)\n";
  output.innerHTML += "</pre>";
  
  // Also throw in console
  console.error("Test error - check admin dashboard for details");
  
  alert("⚠️ Erro simulado criado. Verifique o console e o painel de debug.");
};
```

#### Verify Fix
1. Open `admin/index.html`
2. Click "🧹 Limpar Cache" button - should show success message
3. Click "⚠️ Simular Erro" button - should show error in debug panel

---

### FIX #2: Update Diretor Dashboard Navigation Paths

**File:** `diretor/index.html`  
**Lines:** 54-161  
**Priority:** 🟡 HIGH

#### Current State (Broken Navigation Map)
```
The diretor/index.html sidebar has links pointing to files in the wrong locations:
- usuarios-professores.html (doesn't exist)
- usuarios-pais.html (doesn't exist)
- academico-turmas.html (doesn't exist)
- academico-horarios.html (doesn't exist)
- academico-alunos.html (doesn't exist)

These files are actually in:
- usuarios/professores.html ✅
- usuarios/pais.html ✅
- academico/turmas.html ✅
- academico/horarios.html ✅
- academico/alunos.html ✅
```

#### Fix Implementation

**Search and Replace in `diretor/index.html`:**

```diff
<!-- Line 74: Professores -->
- <a href="usuarios-professores.html" ...>
+ <a href="usuarios/professores.html" ...>

<!-- Line 81: Responsáveis -->
- <a href="usuarios-pais.html" ...>
+ <a href="usuarios/pais.html" ...>

<!-- Line 94: Turmas -->
- <a href="academico-turmas.html" ...>
+ <a href="academico/turmas.html" ...>

<!-- Line 101: Horários -->
- <a href="academico-horarios.html" ...>
+ <a href="academico/horarios.html" ...>

<!-- Line 108: Alunos -->
- <a href="academico-alunos.html" ...>
+ <a href="academico/alunos.html" ...>
```

#### Complete Corrected Navigation Section

Replace lines 54-108 in `diretor/index.html` with:

```html
<nav class="flex-1 overflow-y-auto py-4">
  <ul class="space-y-1 px-3">
    <li>
      <a
        href="index.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Dashboard</a
      >
    </li>
    <li>
      <a
        href="aprovar-cadastros.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Aprovar Cadastros</a
      >
    </li>

    <li
      class="pt-4 pb-2 px-4 text-xs font-bold text-muted uppercase tracking-wider"
    >
      Usuários
    </li>
    <li>
      <a
        href="usuarios/professores.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Professores</a
      >
    </li>
    <li>
      <a
        href="usuarios/pais.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Responsáveis</a
      >
    </li>

    <li
      class="pt-4 pb-2 px-4 text-xs font-bold text-muted uppercase tracking-wider"
    >
      Acadêmico
    </li>
    <li>
      <a
        href="academico/turmas.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Turmas</a
      >
    </li>
    <li>
      <a
        href="academico/horarios.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Horários</a
      >
    </li>
    <li>
      <a
        href="academico/alunos.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Alunos</a
      >
    </li>

    <li
      class="pt-4 pb-2 px-4 text-xs font-bold text-muted uppercase tracking-wider"
    >
      Comunicação
    </li>
    <li>
      <a
        href="comunicados.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Comunicados</a
      >
    </li>

    <li
      class="pt-4 pb-2 px-4 text-xs font-bold text-muted uppercase tracking-wider"
    >
      Relatórios
    </li>
    <li>
      <a
        href="relatorios-frequencia.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Frequência</a
      >
    </li>
    <li>
      <a
        href="relatorios-notas.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Notas</a
      >
    </li>

    <li
      class="pt-4 pb-2 px-4 text-xs font-bold text-muted uppercase tracking-wider"
    >
      Sistema
    </li>
    <li>
      <a
        href="configuracoes.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Configurações</a
      >
    </li>
    <li>
      <a
        href="perfil.html"
        class="nav-link block px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
        >Meu Perfil</a
      >
    </li>
  </ul>
</nav>
```

#### Also Fix in Other Diretor Pages:

1. **`diretor/configuracoes.html`** - Lines 54-108 (same fixes)
2. **`diretor/academico/turmas.html`** - Lines 54-108 (same fixes)
3. **`diretor/academico/horarios.html`** - Lines 54-108 (same fixes)
4. **`diretor/academico/alunos.html`** - Lines 41-62 (already uses relative paths, verify they work)
5. **`diretor/comunicados.html`** - Check if navigation paths need updating
6. **`diretor/aprovar-cadastros.html`** - Check if navigation paths need updating

---

### FIX #3: Handle Missing Legal Pages Routes

**Files:** 
- `cadastro/diretor.html` (Lines 483-484)
- `diretor/steps/step-4.html` (Lines 419-420)

**Priority:** 🔴 CRITICAL

#### Current State (Broken Links)
```html
<a href="/termos-de-uso" target="_blank">Termos de Uso</a>
<a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a>
```

#### Option A: Create Legal Pages (Recommended)

1. **Create `termos-de-uso.html` at root:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termos de Uso - SGE</title>
  <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
  <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
    <h1>Termos de Uso</h1>
    <p>Conteúdo dos termos de uso do SGE v2.0...</p>
    <a href="javascript:history.back()">← Voltar</a>
  </div>
</body>
</html>
```

2. **Create `politica-de-privacidade.html` at root:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidade - SGE</title>
  <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
  <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
    <h1>Política de Privacidade</h1>
    <p>Conteúdo da política de privacidade do SGE v2.0...</p>
    <a href="javascript:history.back()">← Voltar</a>
  </div>
</body>
</html>
```

3. **Update links in cadastro/diretor.html and diretor/steps/step-4.html:**
```html
<!-- FROM: -->
<a href="/termos-de-uso" target="_blank">Termos de Uso</a>
<a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a>

<!-- TO: (if pages are at root) -->
<a href="../../termos-de-uso.html" target="_blank">Termos de Uso</a>
<a href="../../politica-de-privacidade.html" target="_blank">Política de Privacidade</a>

<!-- OR (if using subdirectory) -->
<a href="../../pages/termos-de-uso.html" target="_blank">Termos de Uso</a>
<a href="../../pages/politica-de-privacidade.html" target="_blank">Política de Privacidade</a>
```

#### Option B: Link to External Documents (Alternative)

If you have external legal documents, update the links:

```html
<!-- Example for external links -->
<a href="https://yourschool.edu.br/termos-de-uso" target="_blank">Termos de Uso</a>
<a href="https://yourschool.edu.br/politica-de-privacidade" target="_blank">Política de Privacidade</a>
```

#### Option C: Remove Links (If Not Needed)

If legal pages aren't ready, remove the links:

```html
<!-- Delete these lines: -->
<!-- <a href="/termos-de-uso" target="_blank">Termos de Uso</a> -->
<!-- <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a> -->
```

---

### FIX #4: Handle /upgrade Route

**File:** `professor/index.html`  
**Line:** 359  
**Priority:** 🔴 CRITICAL

#### Current State (Broken Route)
```html
<button
  class="btn btn-secondary"
  style="width: 100%"
  onclick="window.location.href = '/upgrade'"
>
  Fazer Upgrade
</button>
```

#### Option A: Create Upgrade Page

1. **Create `upgrade.html` at root:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upgrade de Plano - SGE</title>
  <link rel="stylesheet" href="assets/css/global.css">
  <link rel="stylesheet" href="assets/css/components.css">
</head>
<body>
  <div class="app-layout" style="display: grid; place-items: center; min-height: 100vh;">
    <div class="card" style="max-width: 600px; padding: 2rem; text-align: center;">
      <h1>Planos de Upgrade</h1>
      <p>Faça upgrade para acessar funcionalidades premium.</p>
      <!-- Add your upgrade/pricing content here -->
      <a href="javascript:history.back()" class="btn btn-primary">← Voltar</a>
    </div>
  </div>
</body>
</html>
```

2. **Update link in professor/index.html:**
```html
<!-- FROM: -->
onclick="window.location.href = '/upgrade'"

<!-- TO: -->
onclick="window.location.href = '../../upgrade.html'"
```

#### Option B: Show Modal Instead

Replace the button with JavaScript that shows a modal:

```html
<!-- Replace the button with: -->
<button
  class="btn btn-secondary"
  style="width: 100%"
  onclick="showUpgradeModal()"
>
  Fazer Upgrade
</button>

<!-- Add to professor/js/dashboard.js: -->
<script>
window.showUpgradeModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="padding: 2rem;">
      <h2>Upgrade de Plano</h2>
      <p>Este recurso está disponível apenas no plano completo.</p>
      <p>Faça upgrade para desbloquear todas as funcionalidades!</p>
      <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">
        Fechar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
};
</script>
```

#### Option C: Disable Button

If not ready for now:

```html
<!-- Replace with: -->
<button
  class="btn btn-secondary"
  style="width: 100%"
  disabled
  title="Recurso em desenvolvimento"
>
  Fazer Upgrade (em breve)
</button>
```

---

### FIX #5: Implement Footer Links

**File:** `index.html`  
**Lines:** 621-633  
**Priority:** 🟡 MEDIUM

#### Current State (Placeholder Links)
```html
<a href="#" style="display: block; margin-bottom: 0.5rem">Sobre</a>
<a href="#" style="display: block; margin-bottom: 0.5rem">Contato</a>
<a href="#" style="display: block">Suporte</a>
<!-- ... and 3 more legal links -->
```

#### Option A: Create Pages and Link to Them

1. Create pages:
   - `pages/about.html`
   - `pages/contact.html`
   - `pages/support.html`

2. Update footer in index.html:

```html
<!-- Replace: -->
<a href="#" style="display: block; margin-bottom: 0.5rem">Sobre</a>

<!-- With: -->
<a href="pages/about.html" style="display: block; margin-bottom: 0.5rem">Sobre</a>
```

#### Option B: Link to External Sites

```html
<a href="https://yourschool.edu.br/about" target="_blank" style="display: block; margin-bottom: 0.5rem">Sobre</a>
<a href="mailto:contato@escola.edu.br" style="display: block; margin-bottom: 0.5rem">Contato</a>
<a href="https://support.yourschool.edu.br" target="_blank" style="display: block">Suporte</a>
```

#### Option C: Convert to Buttons with Onclick

```html
<button onclick="alert('Página em desenvolvimento')" style="background: none; border: none; color: inherit; cursor: pointer; display: block; margin-bottom: 0.5rem; text-decoration: underline;">Sobre</button>
<button onclick="alert('Entre em contato conosco: contato@escola.edu.br')" style="background: none; border: none; color: inherit; cursor: pointer; display: block; margin-bottom: 0.5rem; text-decoration: underline;">Contato</button>
<button onclick="window.open('https://support.school.edu.br')" style="background: none; border: none; color: inherit; cursor: pointer; display: block; text-decoration: underline;">Suporte</button>
```

---

## 📋 Implementation Checklist

### Priority 1 (Today)
- [ ] Add `clearCache()` and `simulateError()` to `admin/js/dashboard.js`
- [ ] Test admin buttons work
- [ ] Fix legal page links or create pages
- [ ] Fix `/upgrade` route

### Priority 2 (This Week)
- [ ] Update diretor navigation paths in all affected files
- [ ] Test all diretor dashboard navigation
- [ ] Update footer links in index.html
- [ ] Test all links work

### Priority 3 (Quality Assurance)
- [ ] Test on mobile devices
- [ ] Test all pages after being fixed
- [ ] Verify no console errors
- [ ] Create browser compatibility test

---

## 🧪 Testing After Fixes

### Test Cases

```
TEST 1: Admin Dashboard Functions
✓ Click "Limpar Cache" → Should show success message and reload
✓ Click "Simular Erro" → Should show error in debug panel

TEST 2: Diretor Navigation
✓ Click "Professores" → Load usuarios/professores.html
✓ Click "Responsáveis" → Load usuarios/pais.html
✓ Click "Turmas" → Load academico/turmas.html
✓ Click "Horários" → Load academico/horarios.html
✓ Click "Alunos" → Load academico/alunos.html

TEST 3: Legal Links
✓ Click "Termos de Uso" → Open/load termos page
✓ Click "Política de Privacidade" → Open/load policy page

TEST 4: Footer Links (index.html)
✓ Click each footer link → Should do something (not blank)

TEST 5: Professor Upgrade
✓ Click "Fazer Upgrade" → Navigate to upgrade page or show modal
```

---

## 📞 Troubleshooting

### If Links Still Don't Work After Fixes:

1. **Clear browser cache:**
   - Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Clear cached images/files

2. **Check relative paths:**
   - Verify you're using correct number of `../`
   - From: `professor/index.html`
   - To: `upgrade.html` at root
   - Use: `../../upgrade.html` (2 levels up)

3. **Check console for errors:**
   - F12 → Console tab
   - Look for 404 errors or JavaScript errors

4. **Verify file names:**
   - Watch for typos in filenames
   - File names are case-sensitive on Linux servers
   - Use lowercase with hyphens (kebab-case)

---

## 📞 Support

If you need help:
1. Reference the exact line numbers in this guide
2. Check the full `AUDIT_REPORT.md` for details
3. Use the `AUDIT_QUICK_REFERENCE.md` for quick lookup

---

**Fix Implementation Guide v1.0**  
**Last Updated:** 2026-05-19
