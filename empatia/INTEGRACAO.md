# Empatia — Guia de Integração

## 1. Fotos de perfil (sem Firebase Storage)

As fotos são gravadas em **Base64** no Realtime Database (`usuarios/{uid}/fotoUrl`), com compressão na seleção (**400×400**, qualidade **40%**) em `editar_perfil_screen.dart`.

---

## 2. Dependências (`pubspec.yaml`)

Incluem: `firebase_core`, `firebase_auth`, `firebase_database`, `image_picker`, `geolocator`, `geocoding`.

Após alterar o manifesto: `flutter pub get`.

---

## 3. Imports de modelos

- **Search / Sonhos (lista):** `import '../home/models/sonho_model.dart';` (a partir de `screens/search` ou `screens/sonhos`).
- **Detalhe / Publicar / Meu sonho:** `import '../../home/models/sonho_model.dart';` (a partir de `screens/sonhos/screens` ou `widgets` sob `sonhos`).

---

## 4. AuthService

- `login`, `criarConta`, `logout`
- `salvarDadosPessoais` (uid, nome, email, opcional: endereco, telefone, redeSocial)
- `atualizarPerfil` (nome, bio, opcional: `fotoUrl` Base64)
- `salvarFotoBase64`

---

## 5. Navegação principal (5 abas)

`MainScreen`: **Início** | **Pesquisa** | **Publicar** | **Sonhos** | **Perfil**.

Notificações **não** são aba inferior: acesso pelo **ícone de coração** no AppBar (Home e Pesquisa), com badge de não lidas. Ao abrir a tela de notificações, todas são marcadas como lidas (`SonhoService.marcarTodasComoLidas`).

Configurações permanecem acessíveis pelo menu **⋮** no `ProfileScreen`.

---

## 6. Proximidade (GPS)

- `LocationService.cidadeDaLocalizacaoAtual()` usa Geolocator + Geocoding (cidade aproximada).
- **Home:** preenche o filtro de cidade; botão **“minha localização”** no campo de cidade.
- **Pesquisa:** preenche o campo de busca com a cidade detectada.

### Android (`AndroidManifest.xml`)

Já incluídos: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, câmera e leitura de mídia para fotos.

### iOS (`Info.plist`)

Chaves: `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`.

---

## 7. Regras do Realtime Database

Arquivos alinhados: `firebase_database_rules.json` e `database.rules.json` (usuários só escrevem o próprio nó; sonhos/apoios/notificações exigem autenticação e validação mínima de nós).

**Nota de produção:** regras permissivas com `auth != null` não substituem validação server-side para integridade financeira ou anti-fraude; para ambientes críticos, avalie **Cloud Functions** para criação de apoios e incrementos.

---

## 8. Contadores atômicos

`SonhoService` usa `ServerValue.increment` para `sonhosCriados`, `apoiosDados`, `totalApoios` (ver código em `lib/features/auth/services/sonho_service.dart`).

---

## 9. Parsing defensivo

Utilitário `lib/features/auth/utils/firebase_parse.dart` (`firebaseInt`, `firebaseBool`, `firebaseString`) usado em modelos/serviços onde o RTDB devolve tipos dinâmicos.
