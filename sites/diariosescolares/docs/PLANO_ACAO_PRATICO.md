# 🛠️ PLANO DE AÇÃO PRÁTICO - SGE v2.0
**Data:** 2026-05-20 | **Duração Total:** 4-5 dias (implementação)  
**Responsável:** Tech Lead | **Priority:** CRÍTICO

---

## 📋 TAREFA 1: Corrigir Paths DIRETOR/academico [15 min]

### 📍 Arquivo 1: `diretor/index.html`

**Procurar linhas com links acadêmico:**
```html
Linha 94:   href="academico-turmas.html"
Linha 101:  href="academico-horarios.html"  
Linha 108:  href="academico-alunos.html"
```

**Substituir por:**
```html
✅ href="academico/turmas.html"
✅ href="academico/horarios.html"
✅ href="academico/alunos.html"
```

---

### 📍 Arquivo 2: `diretor/usuário-professores.html`

**Procurar:**
```html
Linha 94:   href="academico-turmas.html"
Linha 101:  href="academico-horarios.html"
Linha 108:  href="academico-alunos.html"
```

**Substituir por:**
```html
✅ href="academico/turmas.html"
✅ href="academico/horarios.html"
✅ href="academico/alunos.html"
```

**✓ Validação:** Clicar no link deve abrir o arquivo sem erro 404

---

## 📋 TAREFA 2: Corrigir Paths DIRETOR/relatorios [15 min]

### 📍 Arquivo: `diretor/index.html`

**Procurar:**
```html
Linha 134:  href="relatorios-frequencia.html"
Linha 141:  href="relatorios-notas.html"
```

**Substituir por:**
```html
✅ href="relatorios/frequencia.html"
✅ href="relatorios/notas.html"
```

### 📍 Arquivo: `diretor/usuário-professores.html`

**Idem acima**

**Nota adicional:** Procurar por referência a comunicacao.html - ADICIONAR se falta:
```html
✅ href="relatorios/comunicacao.html"
```

**✓ Validação:** Clicar nos links deve abrir sem erro 404

---

## 📋 TAREFA 3: Corrigir Firebase Version Mismatch [1 hora]

### 🔄 Operação: Find & Replace em TODA projeto

**VSCode:**
1. Pressionar `Ctrl+H` (Find & Replace)
2. Ativar "Use Regular Expression" (botão `.*`)
3. Buscar: `https://www.gstatic.com/firebasejs/9\.22\.0/`
4. Substituir por: `https://www.gstatic.com/firebasejs/10.7.0/`
5. Click "Replace All"

**Arquivos Específicos Afetados:**
- `assets/js/firebase/config.js` (7 linhas)
- `professor/js/dashboard.js` (6 linhas)

### ✓ Verificação Pós-Fix

**Comando Terminal:**
```bash
grep -r "9\.22\.0" . --include="*.js" --include="*.html"
# Deve retornar: (empty)

grep -r "10\.7\.0" . --include="*.js" --include="*.html"
# Deve retornar múltiplas linhas
```

---

## 📋 TAREFA 4: Corrigir Import rtdb [10 min]

### 📍 Arquivo: `professor/js/historico-chamadas.js`

**Linha 1 - Procurar:**
```javascript
❌ import { auth, rtdb } from "../../assets/js/firebase/config.js";
```

**Substituir por:**
```javascript
✅ import { auth, db } from "../../assets/js/firebase/config.js";
```

**Procurar qualquer uso de `rtdb` no arquivo:**
```javascript
// Se houver: rtdb.ref('...')
// Substituir por: ref(db, '...')
```

**✓ Validação:** Não deve ter erro `ReferenceError: rtdb is not defined` no console

---

## 📋 TAREFA 5: Criar pai/perfil.html [30 min]

### 📍 Arquivo: `pai/perfil.html`

**Passo 1:** Copiar conteúdo base de `pai/pai_index.html` (primeiras 1000 linhas)

**Passo 2:** Criar arquivo novo com:
```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meu Perfil - SGE Responsáveis</title>
  
  <!-- CSS -->
  <link rel="stylesheet" href="../assets/css/global.css" />
  <link rel="stylesheet" href="../assets/css/components.css" />
  <link rel="stylesheet" href="../assets/css/sidebar.css" />
  <link rel="stylesheet" href="../assets/css/forms.css" />
</head>
<body>
  <!-- SIDEBAR (copiar de pai_index.html) -->
  
  <!-- MAIN CONTENT -->
  <main class="main-content">
    <!-- TOPBAR -->
    
    <!-- CONTENT AREA -->
    <div class="content">
      <div class="content-header">
        <h1 class="content-title">Meu Perfil</h1>
      </div>
      
      <!-- FORM de perfil aqui -->
      <div class="card">
        <h2>Dados Pessoais</h2>
        <form id="form-perfil">
          <div class="form-group">
            <label>Nome</label>
            <input type="text" id="name" disabled />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" disabled />
          </div>
          <button type="button" class="btn" id="btn-edit">Editar</button>
        </form>
      </div>
    </div>
  </main>
  
  <!-- SCRIPTS -->
  <script type="module" src="./js/pai_perfil.js"></script>
</body>
</html>
```

**Passo 3:** Verificar se existe `pai/js/pai_perfil.js` - se não existir, criar:
```javascript
// pai/js/pai_perfil.js
import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', async () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace('../auth/login.html');
      return;
    }
    
    // Carregar dados do usuário
    const snapshot = await get(ref(db, `usuarios/${user.uid}`));
    const userData = snapshot.val();
    
    document.getElementById('name').value = userData?.nome || '';
    document.getElementById('email').value = userData?.email || '';
  });
});
```

**✓ Validação:** Arquivo deve existir e exibir dados do usuário logado

---

## 📋 TAREFA 6: Declarar onclick Functions [2-3 horas]

### 🔴 CRÍTICO: Existem 20+ funções não declaradas

**Solução Recomendada: Opção B - Event Delegation (Melhor Prática)**

Ao invés de usar `onclick='funcao()'` no HTML, usar data attributes + event listener centralizado.

### Exemplo: DIRETOR/usuarios/professores.html

**❌ ANTES (Quebrado):**
```html
<button onclick="verDetalhes('${prof.uid}')">Ver Detalhes</button>
```

**✅ DEPOIS (Correto):**
```html
<button data-action="view-details" data-uid="${prof.uid}">Ver Detalhes</button>
```

**Em `diretor/js/usuarios-professores.js` - Adicionar Event Listener:**
```javascript
// No final do arquivo, adicionar:
document.addEventListener('click', async (e) => {
  const action = e.target.dataset.action;
  const uid = e.target.dataset.uid;
  
  switch(action) {
    case 'view-details':
      verDetalhes(uid);
      break;
    case 'toggle-status':
      await toggleStatus(uid);
      break;
    case 'export':
      exportProf(uid);
      break;
    // ... mais cases
  }
});

// Implementar funções
async function verDetalhes(uid) {
  const prof = state.usuarios.find(p => p.uid === uid);
  if (!prof) return;
  
  const modal = document.getElementById("modal-detalhes");
  document.getElementById("detail-name").textContent = prof.nome;
  document.getElementById("detail-email").textContent = prof.email;
  modal.style.display = "flex";
}

async function toggleStatus(uid) {
  const prof = state.usuarios.find(p => p.uid === uid);
  const newStatus = prof.status === "ativo" ? "desativado" : "ativo";
  
  try {
    await updateData(`usuarios/${uid}`, { status: newStatus });
    showToast(`Professor ${newStatus}!`, "success");
    loadProfessores();
  } catch (error) {
    console.error('Erro:', error);
    showToast("Erro ao atualizar", "error");
  }
}
```

**Arquivos com Muitas onclick:**
1. `diretor/js/usuarios-professores.js` - 10+ funções
2. `diretor/js/usuarios-pais.js` - 5+ funções
3. `diretor/js/comunicados.js` - 8+ funções
4. `professor/js/chamada.js` - 3+ funções
5. `professor/js/notas.js` - 2+ funções
6. `professor/js/bilhetes.js` - 3+ funções

**⏰ Tempo por arquivo:** 15-20 min

**✓ Validação:** Testar cada botão deve executar ação (não erro em console)

---

## 📋 TAREFA 7: Chamar initTurmas() [15 min]

### 📍 Arquivo: `diretor/index.html`

**Procurar fim do arquivo, antes de `</body>` - Adicionar:**

```html
<script type="module">
  import { initTurmas } from './js/academico-turmas.js';
  import { initHorarios } from './js/academico-horarios.js';
  import { initAlunos } from './js/academico-alunos.js';
  
  // Inicializar quando página carrega
  document.addEventListener('DOMContentLoaded', async () => {
    // Opcional: aguardar auth antes de inicializar
    await initTurmas();
    await initHorarios();
    await initAlunos();
  });
</script>
```

**✓ Validação:** Verificar console.log - não deve ter erro de função não declarada

---

## 📋 TAREFA 8: Remover console.log em Produção [1 hora]

### 📝 Encontrados 50+ console.log em:

1. `pai/js/feed.js` - 7 ocorrências
2. `admin/js/dashboard.js` - 10 ocorrências  
3. `diretor/js/dashboard.js` - 5 ocorrências
4. `professor/js/dashboard.js` - 8 ocorrências
5. Vários outros

### 🛠️ Solução Rápida: Regex Find & Replace

**VSCode - Find & Replace:**
```
Buscar: console\.log\([^)]*\);?\n?
Substituir: (deixar vazio)
```

**OU Mais Específico:**
```
Buscar: ^\s*console\.log\(.*\);?$
Substituir: (deixar vazio)
Ativar "Use Regular Expression" + "Multiline"
```

### 📋 Checklist Específico:

- [ ] `pai/js/feed.js` - Remover 7 console.log
- [ ] `admin/js/dashboard.js` - Remover 10 console.log
- [ ] `diretor/js/dashboard.js` - Remover 5 console.log
- [ ] `professor/js/dashboard.js` - Remover 8 console.log
- [ ] Procurar `alert(` - Remover ou substituir por toast()

**✓ Validação:**
```bash
grep -r "console\.log" . --include="*.js"
# Não deve retornar nada
```

---

## 📋 TAREFA 9: Testar Jornadas Críticas [2 horas]

### 🧪 Jornada 1: Pai

**Pré-requisito:** Ter conta PAI no Firebase

**Passos:**
1. [ ] Abrir `index.html`
2. [ ] Clicar em "Cadastro de Responsável"
3. [ ] Preencher wizard pai.html (3 steps)
4. [ ] Submit → Deve redirecionar para login
5. [ ] Login com email criado
6. [ ] Deve abrir `pai/pai_index.html`
7. [ ] Verificar feed de notificações
8. [ ] Clicar em "Perfil do Aluno" - deve abrir `pai/pai_perfil_aluno.html`
9. [ ] Clicar em "Histórico" - deve abrir `pai/pai_historico.html`
10. [ ] Clicar em "Meu Perfil" - deve abrir `pai/perfil.html` ✅ (NOVO)

**Expected Result:** Todos os links funcionam, nenhum 404

---

### 🧪 Jornada 2: Professor

**Pré-requisito:** Ter conta PROFESSOR no Firebase

**Passos:**
1. [ ] Abrir `index.html`
2. [ ] Clicar em "Cadastro de Professor"
3. [ ] Preencher wizard
4. [ ] Submit → Redirecionar para login
5. [ ] Login com email criado
6. [ ] Deve abrir `professor/index.html` (SPA)
7. [ ] Clicar em "Chamada" no sidebar
8. [ ] Modal deve abrir
9. [ ] Clicar "P" para um aluno - deve mudar cor
10. [ ] Clicar "Salvar Chamada" - deve salvar e mostrar toast
11. [ ] Clicar em "Histórico de Chamadas"
12. [ ] Deve listar chamadas anteriores
13. [ ] Clicar "Exportar PDF"

**Expected Result:** 
- [ ] Sem erro de console
- [ ] Chamada salva no Firebase
- [ ] Toast de sucesso aparece

---

### 🧪 Jornada 3: Diretor

**Pré-requisito:** Ter conta DIRETOR no Firebase

**Passos:**
1. [ ] Abrir `index.html`
2. [ ] Clicar em "Cadastro de Diretor"
3. [ ] Preencher wizard (4 steps)
4. [ ] Submit
5. [ ] Login com email criado
6. [ ] Deve abrir `diretor/index.html` (SPA)
7. [ ] Clicar em "Turmas" - deve ir para `diretor/academico/turmas.html` ✅ (PATH CORRIGIDO)
8. [ ] Voltar, clicar em "Horários" - deve ir para `diretor/academico/horarios.html` ✅
9. [ ] Voltar, clicar em "Professores"
10. [ ] Clicar em professor da lista - modal deve abrir
11. [ ] Clicar "Editar Status" - botão deve funcionar
12. [ ] Clicar em "Relatórios" → "Frequência" - deve ir para `diretor/relatorios/frequencia.html` ✅

**Expected Result:**
- [ ] Sem erro 404
- [ ] Sem erro de console
- [ ] Botões funcionam

---

## 📋 TAREFA 10: Corrigir Database Rules [30 min]

### 📍 Arquivo: `database.rules.json`

**Procurar secção de bilhetes:**

**❌ ANTES (Inseguro):**
```json
"bilhetes": {
  ".read": "auth != null",
  ".write": "auth != null"
}
```

**✅ DEPOIS (Seguro):**
```json
"bilhetes": {
  ".read": "auth != null",
  ".write": "newData.child('remetenteid').val() == auth.uid || 
           newData.child('destinatarioid').val() == auth.uid",
  "$bilheteId": {
    ".read": "data.child('remetenteid').val() == auth.uid || 
             data.child('destinatarioid').val() == auth.uid",
    ".write": "newData.child('remetenteid').val() == auth.uid"
  }
}
```

**✓ Validação:** Deploy rules e testar se professor consegue enviar bilhete para si mesmo, mas não para outro

---

## ✅ CHECKLIST FINAL DE IMPLEMENTAÇÃO

### Dia 1 (4-5 horas)
- [ ] TAREFA 1: Paths acadêmico [15 min]
- [ ] TAREFA 2: Paths relatorios [15 min]
- [ ] TAREFA 3: Firebase version [1h]
- [ ] TAREFA 4: Import rtdb [10 min]
- [ ] TAREFA 5: Criar pai/perfil.html [30 min]
- [ ] TAREFA 6: onclick Functions [2-3h]

### Dia 2 (2 horas)
- [ ] TAREFA 7: initTurmas [15 min]
- [ ] TAREFA 8: console.log [1h]
- [ ] TAREFA 9: Testar jornadas [2h]

### Dia 3 (30 min)
- [ ] TAREFA 10: Database rules [30 min]
- [ ] Deploy para staging
- [ ] E2E test final

---

## 📊 ANTES e DEPOIS

```
ANTES:
┌─────────────────────────────────────────┐
│ Prontidão: 28%  🔴 BLOQUEADO            │
│ Críticos: 8     ❌ BLOQUEADOR           │
│ Links Quebrados: 25+                    │
│ onclick Functions: 0/20 declaradas      │
└─────────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────────┐
│ Prontidão: 92%  ✅ PRONTO               │
│ Críticos: 0     ✅ RESOLVIDOS           │
│ Links Quebrados: 0                      │
│ onclick Functions: 20/20 declaradas     │
└─────────────────────────────────────────┘
```

---

## 📞 SUPORTE

**Dúvidas durante implementação?**
- Verificar `AUDITORIA_COMPLETA_SGE_v2.md` para detalhes
- Verificar `ANALISE_FIXES_DETALHADOS.md` para código completo
- Testar cada tarefa isoladamente
- Commit após cada tarefa

---

**Plano de Ação Criado:** 2026-05-20  
**Estimativa Total:** 4-5 dias  
**Complexidade:** ALTA  
**Sucesso esperado:** 95%+

*Tech Lead QA - SGE v2.0*
