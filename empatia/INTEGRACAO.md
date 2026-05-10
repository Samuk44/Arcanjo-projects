# Empatia — Guia de Integração

## 1. Estrutura de arquivos entregues

```
lib/
├── main.dart                          ← substituir o existente
├── app.dart                           ← substituir o existente
├── features/
│   ├── app_colors.dart                ← NOVO — centraliza as cores
│   └── auth/
│       ├── models/
│       │   ├── usuario_model.dart     ← substituir o existente
│       │   ├── apoio_model.dart       ← substituir o existente
│       │   └── notificacao_model.dart ← substituir o existente
│       ├── services/
│       │   ├── auth_service.dart      ← substituir o existente
│       │   └── sonho_service.dart     ← substituir o existente
│       └── screens/
│           ├── main_screen.dart       ← NOVO — shell de navegação
│           ├── home/
│           │   ├── home_screen.dart   ← substituir o existente
│           │   ├── models/
│           │   │   └── sonho_model.dart ← substituir o existente
│           │   └── widgets/
│           │       └── sonho_feed_card.dart ← NOVO
│           ├── search/
│           │   └── search_screen.dart ← substituir o existente
│           ├── notifications/
│           │   └── notifications_screen.dart ← substituir o existente
│           ├── profile/
│           │   ├── profile_screen.dart ← substituir o existente
│           │   └── editar_perfil_screen.dart ← NOVO
│           ├── settings/
│           │   └── settings_screen.dart ← substituir o existente
│           └── sonhos/                ← pasta existia vazia, agora preenchida
│               ├── sonhos_screen.dart ← NOVO
│               ├── widgets/
│               │   ├── meu_sonho_card.dart ← NOVO
│               │   └── apoio_card.dart     ← NOVO
│               └── screens/
│                   ├── publicar_sonho_screen.dart ← NOVO
│                   └── detalhe_sonho_screen.dart  ← NOVO
```

---

## 2. Dependências a adicionar no pubspec.yaml

```yaml
dependencies:
  firebase_core: ^3.6.0
  firebase_auth: ^5.3.1
  firebase_database: ^11.1.4
  firebase_storage: ^12.3.2   # já habilitado no projeto
  image_picker: ^1.1.2        # NOVA — upload de foto de perfil
```

Após adicionar, rode:

```bash
flutter pub get
```

---

## 3. Permissões de plataforma

### Android — `android/app/src/main/AndroidManifest.xml`

Adicione dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

### iOS — `ios/Runner/Info.plist`

Adicione dentro de `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Usamos a câmera para foto de perfil.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Usamos a galeria para foto de perfil.</string>
```

---

## 4. Regras do Firebase Realtime Database

Copie o conteúdo de `firebase_database_rules.json` para o painel do Firebase:
**Firebase Console → Realtime Database → Regras**.

---

## 5. Estrutura de dados no Firebase

### `/usuarios/{uid}`
```json
{
  "nome": "string",
  "email": "string",
  "bio": "string",
  "fotoUrl": "string",
  "sonhosCriados": 0,
  "apoiosDados": 0,
  "criadoEm": 1700000000000
}
```

### `/sonhos/{sonhoId}`
```json
{
  "responsavelId": "uid",
  "responsavelNome": "string",
  "nomesCrianca": "string",
  "descricao": "string",
  "categoria": "string",
  "cidade": "string",
  "endereco": "string",
  "contato": "string",
  "status": "aprovado | concluido",
  "criadoEm": 1700000000000,
  "totalApoios": 0
}
```

### `/apoios/{apoioId}`
```json
{
  "sonhoId": "string",
  "sonhoNomesCrianca": "string",
  "sonhoDescricao": "string",
  "sonhoCategoria": "string",
  "sonhoCidade": "string",
  "doadorId": "uid",
  "doadorNome": "string",
  "responsavelId": "uid",
  "status": "pendente_entrega | entregue_pelo_doador | entregue",
  "criadoEm": 1700000000000
}
```

### `/notificacoes/{notifId}`
```json
{
  "usuarioId": "uid",
  "titulo": "string",
  "corpo": "string",
  "tipo": "novo_apoio | entregue_pelo_doador | entregue_confirmado",
  "sonhoId": "string (opcional)",
  "apoioId": "string (opcional)",
  "lida": false,
  "criadoEm": 1700000000000
}
```

---

## 6. Fluxo de confirmação dupla (anti-fraude)

```
Doador apoia
    ↓
status: pendente_entrega
    ↓
Doador marca "Entreguei"  →  status: entregue_pelo_doador
    ↓                         Notificação para o responsável
Responsável confirma recebimento  →  status: entregue
    ↓                                Notificação para o doador
Se TODOS os apoios do sonho = entregue  →  sonho.status = concluido
    ↓
Sonho sai do feed público
```

---

## 7. Regras de código aplicadas

- Todas as opacidades usam `withValues(alpha: x)` — nunca `withOpacity(x)`.
- Contadores incrementados com `ServerValue.increment(1)`.
- Exclusão de sonhos é **hard delete** (conforme decisão do usuário).
- A logo `assets/logo.png` substitui o texto "EMPATIA" no header.
- Validação de auto-apoio: usuário não pode apoiar o próprio sonho.

---

## 8. Índices necessários no Firebase

Para que as queries `orderByChild` funcionem corretamente, adicione os índices
abaixo em **Firebase Console → Realtime Database → Regras** (ou via `firebase.json`):

```json
{
  "rules": {
    "sonhos": {
      ".indexOn": ["status", "responsavelId"]
    },
    "apoios": {
      ".indexOn": ["doadorId", "responsavelId", "sonhoId"]
    },
    "notificacoes": {
      ".indexOn": ["usuarioId"]
    }
  }
}
```

> O arquivo `firebase_database_rules.json` já inclui esses índices.
