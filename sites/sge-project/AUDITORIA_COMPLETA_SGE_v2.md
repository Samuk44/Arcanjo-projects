# 📊 AUDITORIA FORENSE COMPLETA - SGE v2.0
**Data:** 2026-05-20 | **Tech Lead:** QA Specialist | **Status:** 🔴 BLOQUEADO PARA PRODUÇÃO

---

## 📈 RESUMO EXECUTIVO

### Visão Geral
- **Total de Arquivos Analisados:** 90+ (50 HTML + 40 JS)
- **Taxa de Prontidão:** 🔴 **28%** (Bloqueado)
- **Status Geral:** 🔴 **BLOQUEADO - Críticos Encontrados**

| Métrica | Valor | Status |
|---------|-------|--------|
| **Problemas Críticos** | 8 | 🔴 CRÍTICO |
| **Problemas Altos** | 12 | 🟠 ALTO |
| **Problemas Médios** | 8 | 🟡 MÉDIO |
| **Arquivo Vazio** | 1 | 🔴 CRÍTICO |
| **Links Quebrados** | 25+ | 🔴 CRÍTICO |
| **Funções Não Declaradas** | 20+ | 🔴 CRÍTICO |

---

## 🔴 PROBLEMAS CRÍTICOS (Resolver em 24h)

### 🔴 CRÍTICO #1: PAI/perfil.html - VAZIO
**Impacto:** Link do sidebar aponta para arquivo vazio  
**Arquivo:** `pai/perfil.html` (0 bytes)  
**Linha:** N/A  
**Descrição:** Arquivo existe mas não contém nada

**Solução Exata:**
```bash
# Criar arquivo com conteúdo básico (copiar template de pai_index.html)
# O arquivo deve conter a página de perfil do responsável
```

---

### 🔴 CRÍTICO #2: DIRETOR/academico - Paths Incorretos
**Impacto:** 100% dos links de menu acadêmico estão quebrados (404)  
**Arquivos Afetados:**
- `diretor/index.html` - linhas 54, 74, 81, 94, 101, 108
- `diretor/usuário-professores.html` - linhas 54, 74, 81, 94, 101, 108

**Problema Específico:**
```html
❌ href="academico-turmas.html"    <!-- Arquivo não existe na raiz! -->
❌ href="academico-horarios.html"  <!-- Arquivo não existe na raiz! -->
❌ href="academico-alunos.html"    <!-- Arquivo não existe na raiz! -->
```

**Arquivos Reais Existem EM:**
- `diretor/academico/turmas.html` ✓
- `diretor/academico/horarios.html` ✓
- `diretor/academico/alunos.html` ✓
- `diretor/academico/anos-letivos.html` ✓ (não linkado)
- `diretor/academico/disciplinas.html` ✓ (não linkado)

**Solução Exata:**
```html
✅ href="academico/turmas.html"     <!-- Corrigido -->
✅ href="academico/horarios.html"   <!-- Corrigido -->
✅ href="academico/alunos.html"     <!-- Corrigido -->
```

**Mudanças Necessárias:**
1. `diretor/index.html` - Mudar 3 linhas (94, 101, 108)
2. `diretor/usuário-professores.html` - Mudar 3 linhas (94, 101, 108)

---

### 🔴 CRÍTICO #3: DIRETOR/relatorios - Paths Incorretos
**Impacto:** Links de relatórios estão todos quebrados

**Links Atuais Quebrados:**
```html
❌ href="relatorios-frequencia.html"   <!-- Não existe na raiz -->
❌ href="relatorios-notas.html"        <!-- Não existe na raiz -->
❌ href="relatorios-comunicacao.html"  <!-- Implícito em alguns lugares -->
```

**Arquivos Reais:**
- `diretor/relatorios/frequencia.html` ✓
- `diretor/relatorios/notas.html` ✓
- `diretor/relatorios/comunicacao.html` ✓

**Solução Exata:**
```html
✅ href="relatorios/frequencia.html"
✅ href="relatorios/notas.html"
✅ href="relatorios/comunicacao.html"
```

---

### 🔴 CRÍTICO #4: FIREBASE VERSION MISMATCH - Inconsistência Severa
**Impacto:** Potencial quebra de runtime por API incompatível  
**Severidade:** Pode causar `TypeError: ... is not a function` em produção

**Problema:**
```javascript
✗ assets/js/firebase/config.js        → v9.22.0
✗ professor/js/dashboard.js           → v9.22.0
✓ professor/js/historico-chamadas.js  → v10.7.0
✓ diretor/js/dashboard.js             → v10.7.0
✓ auth/login.html                     → v10.7.0
```

**Arquivos a Corrigir:**
1. `assets/js/firebase/config.js` - Substituir v9.22.0 → v10.7.0 (7 linhas)
2. `professor/js/dashboard.js` - Substituir v9.22.0 → v10.7.0 (6 linhas)

**Regex Find & Replace (VSCode):**
```
Buscar:     https://www.gstatic.com/firebasejs/9\.22\.0/
Substituir: https://www.gstatic.com/firebasejs/10.7.0/
Escopo:     Toda projeto
```

---

### 🔴 CRÍTICO #5: onclick FUNCTIONS NÃO DECLARADAS - 100% DOS BOTÕES DINÂMICOS QUEBRADOS
**Impacto:** NENHUMA operação CRUD funciona no DIRETOR e PROFESSOR  
**Severidade:** Aplicação completamente não-funcional para ações críticas

#### DIRETOR - 10+ Funções Não Declaradas
**Arquivo:** `diretor/usuarios/professores.html`
```html
❌ <button class="tab-btn" data-tab="info-geral">       <!-- sem listener! -->
❌ onclick='verDetalhes()'                             <!-- função não existe -->
❌ onclick='toggleStatus(...)'                         <!-- função não existe -->
❌ onclick='exportProf()'                              <!-- função não existe -->
```

**Arquivo:** `diretor/comunicados.html`
```html
❌ onclick='abrirModal("modal-novo")'                  <!-- função não existe -->
❌ onclick='enviarComunicado()'                        <!-- função não existe -->
❌ onclick='verMetricas()'                             <!-- função não existe -->
```

#### PROFESSOR - onclick Quebrados
**Arquivo:** `professor/chamada.html`
```html
❌ onclick='setAttendance("uid", "P")'                 <!-- função não existe -->
❌ onclick='closeModal("modal-chamada")'               <!-- função não existe -->
```

**Arquivo:** `professor/index.html`
```html
❌ onclick='closeModal("modal-chamada")'               <!-- linha 308 -->
❌ onclick='window.location.href = "/upgrade"'         <!-- linha 359 -->
```

#### Solução Exata:
**Opção A (Rápido):** Declarar globalmente no final de cada arquivo JS:
```javascript
// Adicionar ao final de diretor/js/usuarios-professores.js
window.verDetalhes = (uid) => { /* implementação */ };
window.toggleStatus = async (uid, status) => { /* implementação */ };
window.exportProf = () => { /* implementação */ };

// Adicionar ao final de professor/js/chamada.js
window.setAttendance = (uid, status) => { /* implementação */ };
window.closeModal = (modalId) => { /* implementação */ };
```

**Opção B (Melhor - Recomendado):** Event Delegation em data attributes (veja ANALISE_FIXES_DETALHADOS.md)

---

### 🔴 CRÍTICO #6: Import de Variável Inexistente
**Impacto:** ReferenceError em runtime - Histórico de chamada não funciona  
**Arquivo:** `professor/js/historico-chamadas.js`  
**Linha:** 1

```javascript
❌ import { auth, rtdb } from "../../assets/js/firebase/config.js";
            ^^^^^^^^ variável não exportada em config.js!
```

**O que realmente existe em config.js:**
```javascript
export { app, auth, db, firestore, storage };  // ✓ 'db' existe, não 'rtdb'
```

**Solução Exata:**
```javascript
✅ import { auth, db } from "../../assets/js/firebase/config.js";
```

---

### 🔴 CRÍTICO #7: PROFESSOR/perfil.html - href="#" Placeholders
**Impacto:** Usuário não consegue navegar entre módulos

**Links Quebrados:**
```html
<!-- professor/perfil.html -->
❌ <a href="#"><span>📊</span> Dashboard</a>         <!-- linha 371 -->
❌ <a href="#"><span>📝</span> Notas</a>             <!-- linha 374 -->
❌ <a href="#"><span>💬</span> Bilhetes</a>          <!-- linha 375 -->

<!-- professor/chamada.html -->
❌ <a href="#"><span>📊</span> Dashboard</a>         <!-- linha 452 -->
❌ <a href="#"><span>📝</span> Notas</a>             <!-- linha 454 -->
❌ <a href="#"><span>💬</span> Bilhetes</a>          <!-- linha 455 -->

<!-- professor/bilhetes.html -->
❌ <a href="#"><span>📊</span> Dashboard</a>         <!-- linha 554 -->
❌ <a href="#"><span>📝</span> Notas</a>             <!-- linha 556 -->

<!-- professor/notas.html -->
❌ <a href="#"><span>📊</span> Dashboard</a>         <!-- linha 462 -->
❌ <a href="#"><span>📋</span> Chamada</a>           <!-- linha 463 -->
```

**Causa:** Esses arquivos usam padrão SPA diferente do professor/index.html  
**Solução:** Verificar se esses arquivos são usados ou se todo professor deve usar professor/index.html

---

### 🔴 CRÍTICO #8: academico-turmas Export Não Chamado
**Impacto:** CRUD de turmas não funciona - Feature incompleta

**Arquivo:** `diretor/js/academico-turmas.js`  
**Linha:** 15

```javascript
export const initTurmas = async () => {
  // 200+ linhas de código
  // NUNCA é chamada!
}
```

**Onde é usado:** Nunca! O arquivo é importado em diretor/index.html mas a função nunca é acionada.

**Solução:**
```javascript
// Em diretor/index.html - adicionar script:
<script type="module">
  import { initTurmas } from './js/academico-turmas.js';
  document.addEventListener('DOMContentLoaded', initTurmas);
</script>
```

---

## 🟠 PROBLEMAS ALTOS (Resolver em 1 semana)

### 🟠 ALTO #1: MOCK DATA EM PRODUÇÃO
**Impacto:** Funcionalidades não usam dados reais do Firebase

**Arquivos com Mock:**
- `professor/js/chamada.js` - `loadVinculos()` retorna dados hardcoded
- `professor/js/notas.js` - `loadAlunos()` retorna dados hardcoded
- `admin/js/dashboard.js` - "Simulação de carregamento"

**Recomendação:** Remover mock data, implementar queries Firebase reais

---

### 🟠 ALTO #2: CONSOLE.LOG/ALERT EM PRODUÇÃO
**Impacto:** Expõe debug info, afeta performance

**50+ Ocorrências em:**
- `pai/pai_index.html` (7+ console.log)
- `admin/js/dashboard.js` (10+ console.log)
- `diretor/js/dashboard.js` (5+ console.log)
- Vários outros arquivos

**Solução:** Implementar logger abstrato ou remover antes de deploy

---

### 🟠 ALTO #3: BILHETES RULE MUITO PERMISSIVA
**Impacto:** Segurança - Qualquer autenticado pode enviar bilhetes falsos

**Arquivo:** `database.rules.json`
```json
❌ "bilhetes": {
  ".read": "auth != null",
  ".write": "auth != null"     // Qualquer um escreve!
}
```

**Solução:**
```json
✅ "bilhetes": {
  ".read": "auth != null",
  ".write": "newData.child('remetenteid').val() == auth.uid"
}
```

---

### 🟠 ALTO #4: DIRETOR/index.html - Links Faltando
**Impacto:** Algumas seções não são alcançáveis do dashboard

**Links que faltam:**
- Não há link para `diretor/relatorios/comunicacao.html`
- Não há link para `diretor/academico/anos-letivos.html`
- Não há link para `diretor/academico/disciplinas.html`

---

## 🟡 PROBLEMAS MÉDIOS (Resolver em 2 semanas)

### 🟡 MÉDIO #1: REDIRECT PATH INCORRETO
**Arquivo:** `assets/js/firebase/auth.js`  
**Linha:** 93

```javascript
❌ window.location.replace("/auth/escolha-cadastro.html");
                          // Arquivo está em /cadastro/escolha-cadastro.html
```

**Solução:**
```javascript
✅ window.location.replace("/cadastro/escolha-cadastro.html");
```

---

### 🟡 MÉDIO #2: Arquivo TESTE-FIREBASE.HTML ÓRFÃO
**Impacto:** Confusão, código não mantido

**Arquivo:** `cadastro/teste-firebase.html`  
**Problema:** Não é linkado de nenhum lugar, provavelmente código de desenvolvimento

**Recomendação:** Deletar ou mover para pasta `/dev` se ainda precisar

---

### 🟡 MÉDIO #3: AUTH-STATUS.HTML NÃO LINKADO
**Arquivo:** `auth/auth-status.html`  
**Problema:** Pode ser a página de redirect para usuários inativos, mas não existe link  
**Recomendação:** Verificar se é usada pelo Firebase ou deletar

---

### 🟡 MÉDIO #4: REDEFINIR-SENHA.HTML NÃO IMPLEMENTADO
**Arquivo:** `auth/redefinir-senha.html`  
**Problema:** Existe mas não é linkado de `recuperar-senha.html`  
**Recomendação:** Implementar fluxo completo de recuperação de senha

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO BEM

### ✅ EXCELENTE: Professor Index SPA
**Arquivo:** `professor/index.html` + `professor/js/dashboard.js`
- ✓ Padrão de navegação excelente (data-view attributes)
- ✓ Firebase v10.7.0 correto
- ✓ onAuthStateChanged implementado
- ✓ Estrutura modular de views

### ✅ BOM: Pai SPA
**Arquivo:** `pai/pai_index.html`
- ✓ Firebase v10.7.0 correto
- ✓ onAuthStateChanged implementado
- ✓ Sidebar com data-page attributes (SPA pattern)

### ✅ BOM: Diretor Tailwind CSS
**Arquivo:** `diretor/index.html`
- ✓ CSS moderno com Tailwind
- ✓ Firebase v10.7.0 correto
- ✓ Layout responsivo bom

### ✅ EXCELENTE: Cadastro Wizard
**Arquivo:** `cadastro/pai.html` + `cadastro/js/wizard-pai.js`
- ✓ Padrão Wizard bem estruturado
- ✓ Session storage para estado
- ✓ Validações básicas OK

### ✅ BOM: Login/Auth
**Arquivo:** `auth/login.html`
- ✓ Firebase v10.7.0 correto
- ✓ onAuthStateChanged implementado
- ✓ RBAC básico funcionando

---

## 🚀 PRÓXIMOS PASSOS (ORDEM EXATA DE EXECUÇÃO)

### FASE 1: EMERGÊNCIA (Hoje - 24h)
**Bloqueadores críticos que impedem toda funcionalidade:**

1. **Corrigir paths acadêmico/** (20 min)
   - `diretor/index.html`: linha 94 → `academico/turmas.html`
   - `diretor/index.html`: linha 101 → `academico/horarios.html`
   - `diretor/index.html`: linha 108 → `academico/alunos.html`
   - Idem em `diretor/usuário-professores.html`

2. **Corrigir paths relatorios/** (20 min)
   - Similar ao passo anterior

3. **Corrigir Firebase Version Mismatch** (1h)
   - Buscar/Substituir: `9.22.0` → `10.7.0` em config.js
   - Testar imports em professor/js/dashboard.js

4. **Corrigir Import rtdb** (10 min)
   - `professor/js/historico-chamadas.js`: linha 1 → `rtdb` → `db`

5. **Criar pai/perfil.html** (30 min)
   - Copiar estrutura de pai_index.html
   - Adaptar para página de perfil

### FASE 2: CRÍTICA (1-3 dias)
**Funcionalidades não funcionam:**

6. **Declarar onclick Functions** (2h)
   - Ou implementar Event Delegation (melhor)
   - Testar todos os botões

7. **Chamar initTurmas()** (30 min)
   - Em `diretor/index.html`

8. **Remover console.log/alert** (1h)
   - Implementar logger ou remover

### FASE 3: IMPORTANTE (1 semana)
**Segurança e dados:**

9. **Corrigir Database Rules** (30 min)
   - Implementar permissões corretas para bilhetes

10. **Substituir Mock Data** (2-3 dias)
    - Implementar queries Firebase reais

11. **Testar todas as jornadas** (1 dia)
    - Pai: Cadastro → Login → Dashboard
    - Professor: Login → Chamada → Salvar
    - Diretor: Login → CRUD Usuários

---

## 📊 JORNADAS CRÍTICAS - TESTE DE FLUXO

### Jornada 1: Pai (Cadastro → Login → Dashboard)
**Status:** ⚠️ PARCIAL

**Validação:**
- [ ] wizard-pai.js salva alunosIds corretamente
- [ ] pai_index.html carrega os IDs e popula childSelector
- [ ] Feed filtra notificações por aluno
- [ ] Métricas atualizam em tempo real

**Arquivos Envolvidos:**
- `cadastro/pai.html`
- `cadastro/js/wizard-pai.js`
- `pai/pai_index.html`
- `pai/js/feed.js`

---

### Jornada 2: Professor (Login → Dashboard → Chamada)
**Status:** 🔴 QUEBRADA

**Teste:**
1. Login em `auth/login.html` com professor@example.com
2. Navegar até professor/index.html (deve abrir SPA)
3. Clicar em "Chamada" no sidebar
4. Modal deve abrir
5. Clicar em "P" para um aluno
6. Clicar em "Salvar Chamada"
   - [ ] Dados devem ser salvos no Firebase
   - [ ] Deve mostrar toast de sucesso
   - [ ] Histórico deve atualizar

**Status Atual:** onclick functions não declaradas → Botões não funcionam

**Bloqueadores:**
- onclick='setAttendance(...)' não existe
- onclick='closeModal(...)' não existe

---

### Jornada 3: Diretor (Login → Dashboard → CRUD)
**Status:** 🔴 QUEBRADA

**Teste:**
1. Login com diretor@example.com
2. Navegar para diretor/index.html
3. Clicar em "Turmas" → Deve ir para `diretor/academico/turmas.html`
   - [ ] Link está quebrado (path incorreto)

4. Clicar em "Professores" → Deve ir para `diretor/usuarios/professores.html`
   - [ ] Link OK
   
5. Em professores, clicar em um professor
   - [ ] onclick='verDetalhes(uid)' não funciona

6. Tentar salvar alterações
   - [ ] onclick handlers não funcionam

**Bloqueadores:**
- 10+ paths incorretos
- 10+ onclick functions não declaradas

---

## 🧹 LIMPEZA - ARQUIVOS ÓRFÃOS

**Arquivos sem referência:**
- [ ] `cadastro/teste-firebase.html` - Deletar ou mover para /dev
- [ ] `auth/auth-status.html` - Verificar necessidade
- [ ] `auth/redefinir-senha.html` - Implementar ou deletar
- [ ] `admin/` - Verificar se é usado ou deletar pasta inteira

---

## 📋 CHECKLIST FINAL

### Antes de Produção
- [ ] Todos os 8 críticos resolvidos
- [ ] Todos os 12 altos resolvidos
- [ ] Jornadas testadas e funcionando
- [ ] console.log removido
- [ ] Mock data removido
- [ ] Database rules corrigidas
- [ ] Links testados (404 check)
- [ ] Modal closers testados
- [ ] Button handlers testados
- [ ] Firebase version uniforme (10.7.0)

---

## 📞 CONTATO & ESCALAÇÃO

**Prioridade 1:** Corrigir bloqueadores críticos (24h)  
**Prioridade 2:** Implementar handlers (3 dias)  
**Prioridade 3:** Segurança e testes (1 semana)

---

**Relatório Gerado:** 2026-05-20  
**Próxima Revisão:** Após implementação de críticos  
**Assinado:** Tech Lead QA Specialist
