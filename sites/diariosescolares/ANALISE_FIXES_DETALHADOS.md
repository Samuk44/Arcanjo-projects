# SGE v2.0 - GUIA DE FIXES CRÍTICOS

## 🔧 FIX 1: Import Não Existente (CRITICAL)
**Arquivo:** `professor/js/historico-chamadas.js` linha 1  
**Problema:** Importa `rtdb` que não existe em config.js

### ❌ ANTES
```javascript
import app, { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { ref, onValue, off, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ❌ ERRO: rtdb não existe!
const state = {
  currentUser: null,
  children: [],
  ...
};
```

### ✅ DEPOIS
```javascript
// Remover rtdb, usar db
// Código permanece igual, rtdb era ignorado
```

---

## 🔧 FIX 2: Padronizar Firebase SDK (CRITICAL)
**Escopo:** Toda projeto  
**Problema:** Mistura v9.22.0 e v10.7.0

### Arquivos a Atualizar:
1. **assets/js/firebase/config.js** (v9.22.0 → v10.7.0)
2. **professor/js/dashboard.js** (v9.22.0 → v10.7.0)

### ❌ ANTES (config.js)
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";
```

### ✅ DEPOIS (config.js)
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";
```

### Comando Find & Replace (VSCode)
```
Buscar:     https://www.gstatic.com/firebasejs/9\.22\.0/
Substituir: https://www.gstatic.com/firebasejs/10.7.0/
Escopo:     Todos arquivos .js e .html
```

---

## 🔧 FIX 3: Declarar onclick Functions (CRITICAL)

### Solução A: Declarar Globalmente (Rápido)

**Arquivo:** professor/js/chamada.js - Adicionar no final:
```javascript
// ============ WINDOW GLOBAL FUNCTIONS (for onclick handlers) ============
window.setAttendance = (uid, status) => {
  state.chamadaAtual[uid] = status;
  UI.renderAlunos();
  UI.updateProgress();
};

window.closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
};
```

**Arquivo:** diretor/js/usuarios-professores.js - Adicionar no final:
```javascript
window.verDetalhes = (uid) => {
  const professor = state.usuarios.find(p => p.uid === uid);
  if (!professor) return;
  
  // Abre modal com detalhes
  const modal = document.getElementById("modal-detalhes");
  document.getElementById("detail-name").textContent = professor.nome;
  document.getElementById("detail-email").textContent = professor.email;
  document.getElementById("detail-status").textContent = professor.status;
  modal.style.display = "flex";
};

window.toggleStatus = async (uid, currentStatus) => {
  const newStatus = currentStatus === "ativo" ? "desativado" : "ativo";
  try {
    await updateData(`usuarios/${uid}`, { status: newStatus });
    showToast(`Professor ${newStatus}!`, "success");
    loadProfessores(); // reload
  } catch (error) {
    showToast("Erro ao atualizar", "error");
  }
};
```

### Solução B: Event Delegation (Melhor Prática - Recomendado)

**Arquivo:** professor/js/chamada.js - Substituir HTML dinâmico:
```javascript
// ❌ ANTES
UI.renderAlunos = () => {
  const container = document.getElementById("lista-alunos");
  container.innerHTML = alunosFiltrados
    .map((aluno) => {
      const status = state.chamadaAtual[aluno.uid] || "";
      return `
        <div class="student-row" data-uid="${aluno.uid}">
          ...
          <button class="btn-attendance p ${status === "P" ? "active" : ""}" 
                  onclick="setAttendance('${aluno.uid}', 'P')">P</button>
          ...
        </div>
      `;
    }).join("");
};

// ✅ DEPOIS - Usar data attributes
UI.renderAlunos = () => {
  const container = document.getElementById("lista-alunos");
  container.innerHTML = alunosFiltrados
    .map((aluno) => {
      const status = state.chamadaAtual[aluno.uid] || "";
      return `
        <div class="student-row" data-uid="${aluno.uid}">
          ...
          <button class="btn-attendance p ${status === "P" ? "active" : ""}" 
                  data-action="attend" 
                  data-uid="${aluno.uid}" 
                  data-status="P">P</button>
          ...
        </div>
      `;
    }).join("");
};

// Adicionar event listener FORA de renderAlunos (uma vez)
document.addEventListener("click", (e) => {
  if (e.target.dataset.action === "attend") {
    const uid = e.target.dataset.uid;
    const status = e.target.dataset.status;
    state.chamadaAtual[uid] = status;
    UI.renderAlunos();
    UI.updateProgress();
  }
});
```

---

## 🔧 FIX 4: Remover Console.log (MEDIUM)

### Solução Automática: Buscar & Remover em VSCode

**Regex para Buscar:**
```
^\s*(console\.(log|error|warn|info|debug|trace)|alert|debugger)\(.*\);\s*$
```

**Ações:**
1. Edit → Find and Replace (Ctrl+H)
2. Ativar "Use Regular Expression"
3. Buscar por regex acima
4. Remover manualmente ou substituir por logger

### Solução Melhor: Implementar Logger

**Arquivo:** assets/js/core/logger.js (NOVO)
```javascript
// SGE v2.0 • Logger Utility
const isDev = process.env.NODE_ENV === 'development' || localStorage.getItem('DEBUG_MODE') === 'true';

export const logger = {
  debug: (label, ...args) => {
    if (isDev) console.log(`[DEBUG] ${label}`, ...args);
  },
  info: (label, ...args) => {
    if (isDev) console.info(`[INFO] ${label}`, ...args);
  },
  warn: (label, ...args) => {
    console.warn(`[WARN] ${label}`, ...args);
  },
  error: (label, ...args) => {
    console.error(`[ERROR] ${label}`, ...args);
  },
};
```

**Substituir console.log:**
```javascript
// ❌ ANTES
console.log("🔍 Buscando alunos para UID:", user.uid);

// ✅ DEPOIS
logger.debug("loadChildren", "Buscando alunos para UID:", user.uid);
```

---

## 🔧 FIX 5: Corrigir Bilhetes Rule (HIGH)

**Arquivo:** database.rules.json

### ❌ ANTES
```json
"bilhetes": {
  ".read": "auth != null",
  ".write": "auth != null"
}
```

### ✅ DEPOIS
```json
"bilhetes": {
  "$bilheteId": {
    ".read": "auth != null",
    ".write": "newData.child('remetenteid').val() == auth.uid || root.child('usuarios').child(auth.uid).child('role').val() == 'diretor'",
    ".validate": "newData.hasChildren(['titulo', 'mensagem', 'remetenteid', 'data', 'lido'])"
  }
}
```

---

## 🔧 FIX 6: Chamar initTurmas() (HIGH)

**Arquivo:** diretor/index.html

### Adicionar imports antes do closing `</body>`:
```html
<script type="module">
  import { initTurmas } from './js/academico-turmas.js';
  
  document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar módulos
    if (window.location.pathname.includes('academico-turmas')) {
      await initTurmas();
    }
  });
</script>
```

Ou no **diretor/js/dashboard.js**, adicionar na inicialização:
```javascript
async function initializeDashboard() {
  updateUserInfo();
  setupEventListeners();
  loadMetrics();
  loadActivities();
  loadTurmasComBaixaFrequencia();

  // ✅ NOVO - Inicializar módulos acadêmicos
  if (document.getElementById('academico-turmas-container')) {
    await initTurmas();
  }
  if (document.getElementById('academico-horarios-container')) {
    await initHorarios();
  }
  if (document.getElementById('academico-alunos-container')) {
    await initAlunos();
  }
  
  // ... resto do código
}
```

---

## 🔧 FIX 7: Implementar Toast Notifications (MEDIUM)

**Arquivo:** assets/js/core/notifications.js (NOVO ou MELHORADO)

```javascript
/* SGE v2.0 • Toast Notifications System */

const TOAST_TIMEOUT = 3000;

export function showToast(message, type = 'info', duration = TOAST_TIMEOUT) {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  
  toast.className = `toast toast-${type}`;
  toast.role = 'alert';
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${sanitizeHTML(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "slideInRight 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function sanitizeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**CSS para Toast:**
```css
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInRight 0.3s ease;
  word-break: break-word;
  max-width: 300px;
}

.toast-success {
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
}

.toast-error {
  border-color: var(--error);
  background: rgba(244, 63, 94, 0.1);
  color: var(--error);
}

.toast-warning {
  border-color: var(--warning);
  background: rgba(250, 204, 21, 0.1);
  color: var(--warning);
}

.toast-info {
  border-color: var(--info);
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

---

## 🔧 FIX 8: Remover Arquivo Órfão (LOW)

```bash
# Remover arquivo de teste não utilizado
rm cadastro/teste-firebase.html
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Priority 1 (Hoje - Bloqueadores)
- [ ] Fix import `rtdb` em professor/js/historico-chamadas.js
- [ ] Padronizar Firebase 10.7.0 em todo projeto
- [ ] Remover/substituir 50+ console.log/alert

### Priority 2 (Essa Semana)
- [ ] Implementar onclick functions globalmente
- [ ] Corrigir bilhetes rule
- [ ] Chamar initTurmas()
- [ ] Implementar event delegation (melhor prática)

### Priority 3 (Próximas 2 semanas)
- [ ] Implementar logger abstrato
- [ ] Trocar todos alert() por toast
- [ ] Remover mock data de produção
- [ ] Remover arquivo teste-firebase.html

### Priority 4 (Nice-to-have)
- [ ] Adicionar JSDoc comments
- [ ] Unit tests para funções críticas
- [ ] Documentar padrões de roteamento
- [ ] Code review completo

---

## 🚀 SCRIPT DE VALIDAÇÃO PÓS-FIX

Executar após aplicar fixes:

```bash
# Verificar se não há mais console.log
grep -r "console\." --include="*.js" --include="*.html" src/ | grep -v "// console\." && echo "⚠️ Ainda há console statements" || echo "✓ Sem console statements"

# Verificar Firebase version consistency
grep -r "firebasejs/9\." --include="*.js" --include="*.html" . && echo "⚠️ Ainda há Firebase v9" || echo "✓ Firebase v10.7.0 consistently"

# Verificar que onclick functions estão definidas
grep -r "onclick=" --include="*.js" --include="*.html" . | wc -l && echo "Funciona se window.funcao declarada"
```

---

**Próximos Passos:** Aplicar fixes em ordem de prioridade, fazer testes, e revalidar com este checklist.
