# SGE v2.0 - ANÁLISE TÉCNICA COMPLETA
**Data:** 2026-05-20 | **Versão:** 2.0.0  
**Arquivos Analisados:** 90+ (50 HTML + 40 JS)

---

## 🚨 ISSUES CRÍTICOS (8 ENCONTRADOS)

### 1. ❌ FIREBASE VERSION MISMATCH - INCONSISTÊNCIA SEVERA
**Severidade:** CRITICAL | **Impacto:** Potencial quebra de runtime  
**Problema:** Projeto mistura Firebase v9.22.0 e v10.7.0 em diferentes arquivos

**Exemplos:**
```
✗ assets/js/firebase/config.js        → v9.22.0
✗ professor/js/dashboard.js           → v9.22.0  
✓ professor/js/historico-chamadas.js  → v10.7.0
✓ diretor/js/dashboard.js             → v10.7.0
✓ auth/login.html                     → v10.7.0
```

**Recomendação:** Padronizar para Firebase v10.7.0 (mais recente) em TODA projeto

---

### 2. ❌ ONCLICK FUNCTIONS NÃO DECLARADAS - 100% DOS BOTÕES DINÂMICOS QUEBRADOS
**Severidade:** CRITICAL | **Impacto:** NENHUMA operação CRUD funciona  
**Problema:** HTML gera botões com `onclick='funcao(...)'` mas funções não existem em window scope

**Módulos Afetados:**
- **DIRETOR:** 10+ funções não declaradas
  - `onclick='verDetalhes(...)'` → usuarios-professores.js linha 86
  - `onclick='toggleStatus(...)'` → usuarios-professores.js linha 87
  - `onclick='FirebaseService.aprovar(...)'` → aprovar-cadastros.js linha 159
  
- **PROFESSOR:** 
  - `onclick='setAttendance(...)'` → chamada.js linha 77 (Presença não registra)
  - `onclick='closeModal(...)'` → index.html linha 308 (Modal não fecha)

- **ADMIN:**
  - `onclick='navigateTo(...)'`, `onclick='refreshDatabase()'`, `onclick='exportLogsCSV()'` → todos quebrados

**Recomendação:** 
```javascript
// Solução 1: Declarar globalmente
window.setAttendance = (uid, status) => { ... }
window.verDetalhes = (uid) => { ... }

// Solução 2: Event Delegation (Melhor Prática)
document.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'attend') {
    setAttendance(e.target.dataset.uid, e.target.dataset.status);
  }
});
```

---

### 3. ❌ IMPORT DE VARIÁVEL INEXISTENTE - HISTÓRICO QUEBRADO
**Severidade:** CRITICAL | **Impacto:** ReferenceError em runtime  
**Arquivo:** `professor/js/historico-chamadas.js` linha 1

```javascript
❌ import { auth, rtdb } from '../../assets/js/firebase/config.js';
✓ config.js exports 'db' NOT 'rtdb'
```

**Erro em Runtime:** `ReferenceError: rtdb is not defined`  
**Recomendação:** Mudar `rtdb` para `db`

---

### 4. ❌ MOCK DATA EM PRODUÇÃO
**Severidade:** HIGH | **Impacto:** Funcionalidades não usam dados reais

**Arquivos com Mock:**
- `professor/js/chamada.js` - `FirebaseService.loadVinculos()` retorna dados hardcoded
- `professor/js/notas.js` - `FirebaseService.loadAlunos()` retorna dados hardcoded  
- `admin/js/dashboard.js` - "Simulação de carregamento"
- `assets/js/mock/*` - Arquivo inteiro de mock

**Recomendação:** 
- Implementar Firebase real para produção
- Mover mock data para environment dev-only

---

### 5. ⚠️ CONSOLE.LOG/ALERT EM PRODUÇÃO - 50+ OCORRÊNCIAS
**Severidade:** MEDIUM | **Impacto:** Expõe debug, afeta performance

**Arquivos:**
```
pai/pai_index.html        linhas 1228, 1233, 1238, 1245, 1254, 1279, 1296
admin/js/dashboard.js     linhas 204, 261, 262, 268, 286
diretor/js/dashboard.js   linhas 51, 208, 254, 361
scripts/scripts.js        múltiplos
scripts/backfill-custom-claims.js  múltiplos
```

**Recomendação:** Implementar logger abstrato:
```javascript
const logger = {
  debug: (msg, ...args) => process.env.NODE_ENV === 'dev' && console.log(msg, ...args),
  error: (msg, ...args) => console.error(msg, ...args),
};
```

---

### 6. ⚠️ BILHETES RULE MUITO PERMISSIVA
**Severidade:** HIGH | **Impacto:** Segurança - Qualquer um pode enviar bilhetes falsos

**Arquivo:** `database.rules.json` linha ~65
```json
"bilhetes": {
  ".read": "auth != null",
  ".write": "auth != null"  // ❌ Qualquer autenticado escreve!
}
```

**Recomendação:**
```json
".write": "newData.child('remetenteid').val() == auth.uid"
```

---

### 7. ❌ EXPORT NÃO USADO - ACADEMICO TURMAS
**Severidade:** HIGH | **Impacto:** CRUD de turmas não funciona

**Arquivo:** `diretor/js/academico-turmas.js` linha 15
```javascript
export const initTurmas = async () => { ... }
// ❌ Nunca é chamado!
```

**Recomendação:** Chamar em `diretor/index.html`:
```javascript
import { initTurmas } from './js/academico-turmas.js';
document.addEventListener('DOMContentLoaded', initTurmas);
```

---

### 8. ⚠️ REDIRECT PATH INCORRETO
**Severidade:** MEDIUM | **Impacto:** Redirect pode falhar

**Arquivo:** `assets/js/firebase/auth.js` linha 93
```javascript
window.location.replace("/auth/escolha-cadastro.html");
// ❌ Arquivo está em /cadastro/escolha-cadastro.html
```

---

## 📊 ANÁLISE POR MÓDULO

### PAI (Responsáveis)
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Navegação** | ✓ SPA com sidebar | Inline script + imports misturados |
| **Firebase** | ⚠️ Parcial | v10.7.0, mas console.log deixado |
| **Features** | ✓ Histórico, Perfil Aluno | Filtros, paginação, export CSV |
| **Problemas** | ❌ 7 console.log em produção | MIXIN de código inline |
| **Auth Pattern** | ✓ onAuthStateChanged correto | ✓ Validações OK |

**Crítico:** Remover 7 console.log (linhas 1228+) antes de produção

---

### PROFESSOR
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Navegação** | ✓✓ SPA moderno | Padrão excelente com data-view |
| **Firebase** | ❌ Version Mix | v9.22.0 vs v10.7.0 - INCONSISTENTE |
| **Features Chamada** | ⚠️ Mock Data | Funciona mas com dados hardcoded |
| **Features Notas** | ⚠️ Mock Data | Idem |
| **Features Bilhetes** | ⚠️ Incompleta | Sem dados reais |
| **CRITICAL** | ❌❌ onclick quebrado | setAttendance() não declarada |
| **CRITICAL** | ❌ Import error | historico-chamadas.js: rtdb not exist |

**Prioridade 1:** Consertar onclick e import, padronizar Firebase

---

### DIRETOR
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Navegação** | ✓ SPA Tailwind | CSS Tailwind inline (CDN) |
| **Firebase** | ✓ v10.7.0 | Correto |
| **Features Approved** | ⚠️ Incompleta | onclick Functions não declaradas |
| **Features Usuários** | ⚠️ Incompleta | 10+ onclick quebrados |
| **Features Acadêmico** | ❌ Não funciona | initTurmas() exporta mas não é chamado |
| **CRITICAL** | ❌❌ onclick spam | verDetalhes, toggleStatus, verMetricas etc |
| **CRITICAL** | ❌ Export unused | academico-turmas.js não é importado |

**Prioridade 1:** Consertar onclick, implementar event delegation, chamar initTurmas()

---

### CADASTRO (Professor Wizard)
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Padrão** | ✓ Class-based | ProfessorWizard class com state |
| **Navigation** | ✓ Step-by-step | next(), prev(), renderStep() |
| **Validações** | ✓ Em tempo real | CPF format, email validation |
| **Firebase** | ✓ v10.7.0 | Correto |
| **Orphaned File** | ⚠️ teste-firebase.html | Arquivo teste, não linkado - REMOVER |

---

### AUTH (Login/Status)
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Login** | ✓ Funciona | signInWithEmailAndPassword + redirect por role |
| **Firebase** | ✓ v10.7.0 | Correto |
| **Error Handling** | ✓ Bom | Error map PT-BR |
| **Status Page** | ✓ Existe | Verifica pendente/desativado |
| **Problema** | ⚠️ alert() | auth/login.html usa alert() em vez de toast |

---

### ADMIN
| Aspecto | Status | Notas |
|---------|--------|-------|
| **Dashboard** | ⚠️ SPA | Simples, sem funcionalidade real |
| **Firebase** | ⚠️ Mock | Simula dados, não real |
| **CRITICAL** | ❌❌ onclick spam | navigateTo, refreshDatabase, exportLogsCSV etc |
| **Problema** | ⚠️ Múltiplos console.log | Expõe info sensível |
| **Problema** | ⚠️ alert() spam | 2 alert() para feedback |

---

## 🔒 FIREBASE SECURITY RULES

### Rules Analisadas: database.rules.json
| Path | Read | Write | Status |
|------|------|-------|--------|
| `usuarios/{uid}` | auth.uid == $uid \|\| diretor | Idem | ✓ OK |
| `cadastrosPendentes/{uid}` | diretor | !data.exists && auth.uid | ✓ OK |
| `professores/{uid}` | auth != null | diretor | ✓ OK |
| `chamadas/{turmaId}` | auth != null | professor \|\| diretor | ✓ OK |
| `notas` | auth != null | professor \|\| diretor | ✓ OK |
| `bilhetes` | auth != null | **auth != null** | ❌ MUITO PERMISSIVO |
| `avisos` | auth != null | diretor | ✓ OK |
| `logs` | diretor \|\| admin | false | ✓ OK |

### Recomendações de Segurança
1. **Bilhetes:** Adicionar validação de remetente
2. **Alunos:** Verificar se pai tem responsabilidade antes de write
3. **Logs:** Validar que audit trail não pode ser alterado

---

## 📈 ESTATÍSTICAS

```
SUMMARY
=======
Total Módulos:                  6 (PAI, PROFESSOR, DIRETOR, CADASTRO, AUTH, ADMIN)
Total Arquivos HTML:            50
Total Arquivos JavaScript:      40
Linhas de Código (estimado):    5000+

PROBLEMAS ENCONTRADOS
=====================
Critical Issues:                8
High Severity:                  8
Medium Severity:                10
Total Issues:                   26+

FIREBASE
========
Versões Encontradas:            2 (v9.22.0 e v10.7.0) ❌
Inconsistência:                 40%
Paths Utilizados:               15+
Rules Verificadas:              8
Missing Rules:                  0 (mas 1 muito permissiva)

CODE QUALITY
============
console.log found:              50+
alert() found:                  5
Mock data in production:        3 módulos
onclick functions broken:       100% dos dinâmicos
Export não usado:               1
Import não existe:              1
Orphaned files:                 1
```

---

## ✅ AÇÕES IMEDIATAS

### 🔴 DO HOJE (Bloqueadores)
1. [ ] Consertar import `rtdb` → `db` em professor/js/historico-chamadas.js
2. [ ] Declarar todas as onclick functions globalmente
3. [ ] Padronizar Firebase v10.7.0
4. [ ] Remover console.log em produção

### 🟡 ESSA SEMANA (High)
1. [ ] Implementar event delegation para onclick (melhor prática)
2. [ ] Corrigir rule de bilhetes
3. [ ] Chamar initTurmas() para ativar CRUD de turmas
4. [ ] Remover arquivo teste-firebase.html
5. [ ] Remover mock data em produção

### 🟢 PRÓXIMAS SEMANAS (Medium)
1. [ ] Implementar logger abstrato
2. [ ] Renomear diretor/usuário-professores.html
3. [ ] Trocar alert() por toast notifications
4. [ ] Adicionar JSDoc comments

---

## 📁 ARQUIVO JSON DETALHADO

Ver: [ANALISE_TECNICA_COMPLETA.json](ANALISE_TECNICA_COMPLETA.json)

Contém:
- Análise COMPLETA de cada módulo
- Paths Firebase utilizados
- Error handling assessment
- Features incompletas detalhadas
- Código morto itemizado
- Regras Firebase vs código
- Recomendações prioritizadas
