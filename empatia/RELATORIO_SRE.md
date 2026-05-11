# Relatório SRE — Refatoração Empatia (produção-ready)

## 1. Objetivo

Elevar consistência de **dados**, **UX**, **navegação**, **privacidade** e **manutenibilidade** do app Flutter + Firebase (Auth + Realtime Database), alinhado às regras de negócio do Empatia.

---

## 2. Causa raiz (RCA) — principais riscos tratados

| Área | Problema | Impacto |
|------|-----------|---------|
| **Privacidade** | Endereço/contato visíveis para qualquer apoiador, inclusive após fluxo concluído | Exposição além do necessário |
| **Integridade** | Apoio duplicado do mesmo utilizador no mesmo sonho | Contadores e UX incorretos |
| **Perfil** | `atualizarPerfil` ignorava `fotoUrl`; typo `apoyoId` em `NotificacaoModel.copyWith` | Foto não persistia; risco de build quebrado |
| **Navegação** | Abas não batiam com o produto (Notificações/Configs na barra) | Desvio de requisito e fluxo confuso |
| **Firebase rules** | `database.rules.json` aberto com TTL dev | Ambiente inseguro se deployado por engano |
| **Tipos RTDB** | `lida` e contadores como `int`/string mistos | Crashes intermitentes ao ler notificações |

---

## 3. Soluções implementadas

### 3.1 Privacidade (detalhe do sonho)

- Responsável continua a ver dados de entrega do **próprio** sonho.
- **Doador** só vê `endereco` e `contato` se o seu apoio estiver em `pendente_entrega` ou `entregue_pelo_doador` (não após `entregue`, alinhado à especificação).

### 3.2 Apoios duplicados

- `SonhoService.jaApoiou` + guarda em `apoiarSonho`.
- Mensagens na UI (Home, Pesquisa, Detalhe) se o utilizador já apoiou.

### 3.3 Conclusão do sonho

- Leitura defensiva dos estados em `confirmarRecebimentoPeloResponsavel` com `firebaseString` / mapas tipados.

### 3.4 Modelos e parsing

- `firebase_parse.dart` centralizado.
- `NotificacaoModel`: `lida` via `firebaseBool`; correção `copyWith` (`apoioId`).
- `SonhoModel`: campos opcionais de UI (`curtidas`, `curtido`, `apoiado`) + getters `nomeCrianca` / `apoios` para compatibilidade com `DreamCard`.

### 3.5 Perfil e utilizador

- `UsuarioModel` com `endereco`, `telefone`, `redeSocial` para cadastro completo.
- `AuthService.atualizarPerfil` aceita `fotoUrl` opcional.

### 3.6 Navegação e notificações

- `MainScreen`: 5 abas — Início, Pesquisa, **Publicar**, Sonhos, Perfil.
- `NotificationsAppBarButton` reutilizável (coração + badge).
- `PublicarTabScreen` encapsula `PublicarSonhoScreen`.

### 3.7 Proximidade

- `LocationService` + UI na Home e Pesquisa; permissões Android/iOS documentadas no manifesto/Info.plist.

### 3.8 Tema

- `ThemeData` claro reforçado com `inputDecorationTheme` e `cardTheme` (`CardThemeData`).

### 3.9 Regras RTDB

- `firebase_database_rules.json` e `database.rules.json` sincronizados com validação mínima compatível com **incrementos** em `sonhos/*` e **atualizações de estado** em `apoios/*` por responsável e doador.

---

## 4. Testes executados

- `flutter analyze` — sem issues.
- `flutter test` — smoke test do projeto.

### Testes manuais recomendados

1. Registo → dados pessoais → feed.
2. Publicar sonho → aparecer no feed (status `aprovado`).
3. Apoiar com A; tentar apoiar de novo com A → bloqueio com mensagem.
4. Doador: ver endereço em `pendente_entrega` / `entregue_pelo_doador`; após responsável confirmar `entregue`, endereço oculto para o doador.
5. Ícone de notificações: badge; abrir lista → badge zera.
6. GPS: conceder permissão → cidade preenchida nos filtros.

---

## 5. Lições e próximos passos

1. **Cloud Functions** para criar apoios/notificações e validar dono do sonho — reduz superfície de abuso mantendo regras RTDB simples.
2. **Índices** RTDB se as queries por `orderByChild` crescerem em volume.
3. **Testes de integração** (Firebase Emulator) para fluxo duplo de entrega.
4. **Modelagem geográfica** (coordenadas nos sonhos) se a proximidade real for requisito além de “cidade por GPS”.

---

## 6. Impacto

- **Segurança / privacidade:** menos exposição de dados sensíveis no ecrã de detalhe.
- **Integridade:** menos estados impossíveis (apoio duplicado).
- **Manutenibilidade:** widget de notificações, serviço de localização e parsing únicos.
- **Performance:** leituras inalteradas em ordem de grandeza; `jaApoiou` adiciona uma leitura por ação de apoio (aceitável; otimizável com índice composto ou CF).
