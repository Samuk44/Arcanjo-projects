const admin = require("firebase-admin");

const VALID_ROLES = new Set(["diretor", "professor", "pai", "admin"]);
const DATABASE_URL = "https://farolescolar-default-rtdb.firebaseio.com";

/**
 * Parse command line arguments in the form --key=value or --flag.
 * @returns {Record<string, string|boolean>}
 */
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 1) {
    const raw = process.argv[i];
    if (!raw.startsWith("--")) continue;
    const [key, value] = raw.slice(2).split("=");
    args[key] = value === undefined || value === "" ? true : value;
  }
  return args;
}

function showHelp() {
  console.log(`
Uso: node scripts/backfill-custom-claims.js [opções]

Opções:
  --help             Exibe esta mensagem de ajuda.
  --dry-run          Não atualiza claims; apenas imprime o que seria feito.
  --limit=<n>        Limita a quantidade de usuários processados.
  --role=<role>      Só processa usuários com essa role.
  --path=<path>      Caminho no Realtime Database (padrão: /usuarios).

Exemplos:
  node scripts/backfill-custom-claims.js --dry-run
  node scripts/backfill-custom-claims.js --limit=50
  node scripts/backfill-custom-claims.js --role=professor
`);
}

function createFirebaseAdmin() {
  const rawConfig = process.env.FIREBASE_CONFIG;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (rawConfig) {
    let firebaseConfig;
    try {
      firebaseConfig = JSON.parse(rawConfig);
    } catch (error) {
      console.error("Erro ao parsear FIREBASE_CONFIG. Certifique-se de que o JSON é válido.", error);
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: DATABASE_URL,
    });
  } else if (serviceAccountPath) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: DATABASE_URL,
    });
  } else {
    console.error(
      "Nenhuma configuração do Firebase encontrada. Defina FIREBASE_CONFIG ou GOOGLE_APPLICATION_CREDENTIALS.",
    );
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const dryRun = Boolean(args["dry-run"]);
  const limit = args.limit ? Number(args.limit) : Infinity;
  const onlyRole = typeof args.role === "string" ? args.role : null;
  const dbPath = typeof args.path === "string" ? args.path : "/usuarios";

  if (onlyRole && !VALID_ROLES.has(onlyRole)) {
    console.error(
      `Role inválida: ${onlyRole}. Valores aceitos: ${Array.from(VALID_ROLES).join(", ")}`,
    );
    process.exit(1);
  }

  createFirebaseAdmin();
  const db = admin.database();
  const auth = admin.auth();

  console.log(`Conectando no Realtime Database em ${DATABASE_URL}`);
  console.log(`Caminho alvo: ${dbPath}`);
  console.log(`Modo: ${dryRun ? "dry-run" : "exec"}`);
  if (onlyRole) console.log(`Filter role: ${onlyRole}`);
  if (limit !== Infinity) console.log(`Limite: ${limit}`);

  const snapshot = await db.ref(dbPath).once("value");
  if (!snapshot.exists()) {
    console.log(`Nenhum dado encontrado em ${dbPath}.`);
    process.exit(0);
  }

  const users = snapshot.val();
  const uids = Object.keys(users || {});
  console.log(`Encontrados ${uids.length} usuários em ${dbPath}.`);

  let processed = 0;
  let claimed = 0;
  let skipped = 0;

  for (const uid of uids) {
    if (processed >= limit) break;
    const user = users[uid];
    const role = user && user.role ? String(user.role).trim() : null;

    if (!role) {
      skipped += 1;
      console.warn(`[SKIP] ${uid}: role ausente.`);
      continue;
    }

    if (!VALID_ROLES.has(role)) {
      skipped += 1;
      console.warn(`[SKIP] ${uid}: role inválida (${role}).`);
      continue;
    }

    if (onlyRole && role !== onlyRole) {
      skipped += 1;
      continue;
    }

    processed += 1;
    let currentClaims = {};
    try {
      const userRecord = await auth.getUser(uid);
      currentClaims = userRecord.customClaims || {};
    } catch (error) {
      console.error(`[ERROR] Falha ao obter auth user ${uid}:`, error.message);
      continue;
    }

    if (currentClaims.role === role) {
      console.log(`[SKIP] ${uid}: claim já definido como '${role}'.`);
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] ${uid}: definir claim role='${role}' (atual: ${JSON.stringify(currentClaims)})`);
      claimed += 1;
      continue;
    }

    try {
      await auth.setCustomUserClaims(uid, { ...currentClaims, role });
      console.log(`[OK] ${uid}: claim role='${role}' definida.`);
      claimed += 1;
    } catch (error) {
      console.error(`[ERROR] Falha ao definir claim para ${uid}:`, error.message);
    }
  }

  console.log(`
Resumo:
  Usuários processados: ${processed}
  Claims atualizadas: ${claimed}
  Usuários ignorados: ${skipped}
`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Erro inesperado:", error);
  process.exit(1);
});
