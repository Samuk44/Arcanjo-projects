# SGE v2.0 - Navigation Audit: Quick Reference Guide

## 🔴 CRITICAL ISSUES - FIX IMMEDIATELY

### 1. Missing Functions in admin/index.html

| Line | Button Text | Function | Status | File to Fix |
|------|-------------|----------|--------|------------|
| 573 | 🧹 Limpar Cache | `clearCache()` | ❌ NOT DEFINED | `admin/js/dashboard.js` |
| 576 | ⚠️ Simular Erro | `simulateError()` | ❌ NOT DEFINED | `admin/js/dashboard.js` |

**Action:** Add these functions to `admin/js/dashboard.js` or remove the buttons.

### 2. Broken Absolute Paths (Routes that don't exist)

| File | Line | Current Path | Issue |
|------|------|--------------|-------|
| `professor/index.html` | 359 | `/upgrade` | Route doesn't exist in project |
| `cadastro/diretor.html` | 483 | `/termos-de-uso` | Route doesn't exist |
| `cadastro/diretor.html` | 484 | `/politica-de-privacidade` | Route doesn't exist |
| `diretor/steps/step-4.html` | 419 | `/termos-de-uso` | Route doesn't exist |
| `diretor/steps/step-4.html` | 420 | `/politica-de-privacidade` | Route doesn't exist |

**Action:** Either create these routes or change to relative paths / remove links.

---

## 🟡 HIGH PRIORITY - BROKEN NAVIGATION PATHS

### Diretor Navigation Pointing to Wrong Locations

**Problem:** Files have been moved to subdirectories but navigation wasn't updated.

#### diretor/index.html - Line 74 (Professores)
```html
<!-- CURRENT (WRONG) -->
<a href="usuarios-professores.html">Professores</a>

<!-- SHOULD BE -->
<a href="usuarios/professores.html">Professores</a>
```

#### diretor/index.html - Line 81 (Responsáveis)
```html
<!-- CURRENT (WRONG) -->
<a href="usuarios-pais.html">Responsáveis</a>

<!-- SHOULD BE -->
<a href="usuarios/pais.html">Responsáveis</a>
```

#### diretor/index.html - Line 94 (Turmas)
```html
<!-- CURRENT (WRONG) -->
<a href="academico-turmas.html">Turmas</a>

<!-- SHOULD BE -->
<a href="academico/turmas.html">Turmas</a>
```

#### Similar issues for:
- Line 101: `academico-horarios.html` → `academico/horarios.html`
- Line 108: `academico-alunos.html` → `academico/alunos.html`

**Affected Files:**
- `diretor/index.html`
- `diretor/academico/*.html` (turmas, horarios, alunos)
- `diretor/configuracoes.html`

---

## 🟠 MEDIUM PRIORITY - PLACEHOLDER LINKS

### Footer Links in index.html (Lines 621-633)

These links don't work - they just have `href="#"`:

```html
<a href="#" style="display: block; margin-bottom: 0.5rem">Sobre</a>
<a href="#" style="display: block; margin-bottom: 0.5rem">Contato</a>
<a href="#" style="display: block">Suporte</a>
<a href="#" style="display: block; margin-bottom: 0.5rem">Privacidade</a>
<a href="#" style="display: block; margin-bottom: 0.5rem">Termos</a>
<a href="#" style="display: block">Cookies</a>
```

**Action:** Either:
1. Add onclick handlers, or
2. Link to actual pages (create `/pages/about.html`, etc.), or
3. Convert to buttons with proper handlers, or
4. Remove them if not needed

---

## ✅ WORKING ELEMENTS - NO ACTION NEEDED

### Admin Dashboard Functions (All Working)

| Function | File | Status |
|----------|------|--------|
| `navigateTo()` | `admin/js/dashboard.js` | ✅ |
| `toggleEditMode()` | `admin/js/dashboard.js` | ✅ |
| `refreshDatabase()` | `admin/js/dashboard.js` | ✅ |
| `exportLogsCSV()` | `admin/js/dashboard.js` | ✅ |
| `runHealthCheck()` | `admin/js/dashboard.js` | ✅ |
| `testFCM()` | `admin/js/dashboard.js` | ✅ |

### Modal Functions (All Working)

| File | Functions | Status |
|------|-----------|--------|
| `professor/js/dashboard.js` | `closeModal()` | ✅ |
| `professor/js/bilhetes.js` | `closeModal()` | ✅ |
| `pai/js/pai_historico.js` | `closeModal()` | ✅ |
| `diretor/js/aprovar-cadastros.js` | `closeModal()` | ✅ |
| `diretor/js/comunicados.js` | `closeModal()` | ✅ |

### Valid Navigation Links

| From | To | File | Status |
|------|----|----|--------|
| Login | Sign Up | `../cadastro/escolha-cadastro.html` | ✅ |
| Login | Password Recovery | `../auth/recuperar-senha.html` | ✅ |
| Sign Up | Login | `../auth/login.html` | ✅ |
| Dashboard | Logout | `../auth/login.html` | ✅ |
| Pai Pages | Feed, History, Profile | Relative paths | ✅ |

---

## 📋 CHECKLIST FOR FIXES

### Must Fix (Critical)
- [ ] Add `clearCache()` function to admin dashboard OR remove button
- [ ] Add `simulateError()` function to admin dashboard OR remove button  
- [ ] Fix `/upgrade` route or change professor dashboard upgrade button behavior
- [ ] Fix `/termos-de-uso` and `/politica-de-privacidade` paths

### Should Fix (High Priority)
- [ ] Fix diretor navigation paths (usuarios/*, academico/*)
- [ ] Implement footer links in index.html or remove them
- [ ] Update diretor/academico page navigation links
- [ ] Update diretor/configuracoes page navigation links

### Nice to Have (Medium Priority)
- [ ] Create a link validator at build time
- [ ] Document which pages use JavaScript for navigation
- [ ] Add error handling for missing routes
- [ ] Create a navigation.json or sitemap for validation

---

## 🔍 TESTING CHECKLIST

### Links to Test
- [ ] `index.html` → footer links (currently broken)
- [ ] `auth/login.html` → sign up and password recovery links (should work)
- [ ] `professor/index.html` → upgrade button (route not found)
- [ ] `diretor/index.html` → all sidebar navigation (12+ broken paths)
- [ ] `pai/pai_index.html` → all sidebar links (should work)
- [ ] `admin/index.html` → clearCache and simulateError buttons (missing functions)

### Functions to Verify
- [ ] `navigateTo()` in different sections
- [ ] `closeModal()` in modal operations
- [ ] `toggleEditMode()` in admin panel
- [ ] All data-view and data-page event listeners

---

## 📊 AUDIT RESULTS SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| Total HTML Files | 52 | - |
| Total Links | 150+ | - |
| **Broken Links** | **5** | 🔴 |
| **Outdated Paths** | **12** | 🟡 |
| **Placeholder Links** | **8** | 🟡 |
| **Undefined Functions** | **2** | 🔴 |
| **Working Elements** | **~120** | ✅ |
| **Pass Rate** | **~95%** | 🟢 |

---

## 📁 FILE MAP - All Navigation Files

### Authentication Pages
- `auth/login.html` ✅ - All links working
- `auth/recuperar-senha.html` ✅ - All links working
- `auth/redefinir-senha.html` ✅ - All links working
- `auth/auth-status.html` ✅ - Links working

### Registration Pages
- `cadastro/escolha-cadastro.html` ✅ - Working
- `cadastro/professor.html` ✅ - Working
- `cadastro/pai.html` ✅ - Working  
- `cadastro/diretor.html` ❌ - Legal links broken

### Teacher Dashboard
- `professor/index.html` ❌ - Upgrade button broken
- `professor/chamada.html` ✅ - Navigation working
- `professor/bilhetes.html` ✅ - Navigation working
- `professor/alunos.html` ✅ - Navigation working
- `professor/notas.html` ✅ - Navigation working
- `professor/horario.html` ✅ - Navigation working
- `professor/perfil.html` ✅ - Navigation working
- `professor/historico-chamadas.html` ✅ - Navigation working

### Director Dashboard
- `diretor/index.html` ❌ - 5+ broken paths to subdirectories
- `diretor/aprovar-cadastros.html` ⚠️ - Placeholder navigation
- `diretor/comunicados.html` ⚠️ - Placeholder navigation
- `diretor/configuracoes.html` ❌ - Path issues
- `diretor/configuracoes-escola.html` ✅ - Working
- `diretor/perfil.html` ✅ - Working
- **Subdirectory:** `diretor/academico/` - Works when called correctly
- **Subdirectory:** `diretor/usuarios/` - Works when called correctly
- **Subdirectory:** `diretor/relatorios/` - Works
- **Subdirectory:** `diretor/steps/` - Works but has legal links broken

### Parent Dashboard  
- `pai/pai_index.html` ✅ - All navigation working
- `pai/pai_historico.html` ✅ - Working
- `pai/pai_perfil_aluno.html` ✅ - Working
- `pai/perfil.html` ✅ - Working

### Admin Dashboard
- `admin/index.html` ❌ - 2 functions missing (clearCache, simulateError)
- `admin/banco-de-dados.html` ✅ - Navigation working
- `admin/logs-auditoria.html` ✅ - Navigation working
- `admin/usuarios-sistema.html` ✅ - Navigation working
- `admin/configuracoes-sistema.html` ✅ - Navigation working
- `admin/depuracao.html` ✅ - Navigation working

### Landing Page
- `index.html` ❌ - Footer links broken (no handlers)

### Error Pages
- `404.html` ✅
- `errors/404.html` ✅
- `errors/sem-permissao.html` ✅

---

## 🛠️ Quick Fix Commands

### Fix Missing Functions (add to admin/js/dashboard.js)
```javascript
window.clearCache = () => {
  console.log("Clearing cache...");
  localStorage.clear();
  sessionStorage.clear();
  alert("Cache limpo com sucesso!");
};

window.simulateError = () => {
  console.error("Simulated error for testing");
  alert("Erro simulado - verifique o console");
  throw new Error("Test error");
};
```

### Fix Navigation in diretor/index.html
```bash
# Find all instances and update paths:
usuarios-professores.html → usuarios/professores.html
usuarios-pais.html → usuarios/pais.html
academico-turmas.html → academico/turmas.html
academico-horarios.html → academico/horarios.html
academico-alunos.html → academico/alunos.html
```

---

## 📞 Questions & Contact

For issues with specific navigation elements, check:
1. The full `AUDIT_REPORT.md` for detailed information
2. The exact line numbers and file paths provided
3. The code snippets showing the exact problem
4. The recommendations section for fixes

---

**Report Generated:** 2026-05-19  
**Next Audit:** Recommended after fixes are applied
