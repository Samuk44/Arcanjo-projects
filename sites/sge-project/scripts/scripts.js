const admin = require("firebase-admin");
const readline = require("readline");

// --- Configuração do Firebase Admin SDK ---
// Use variáveis de ambiente para a configuração do Firebase
// Ex: FIREBASE_CONFIG='{"projectId":"your-project-id","privateKey":"...","clientEmail":"..."}'
// Ou aponte para um arquivo serviceAccountKey.json

let firebaseConfig;
if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (e) {
    console.error(
      "Erro ao parsear FIREBASE_CONFIG. Certifique-se de que é um JSON válido.",
    );
    process.exit(1);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Se GOOGLE_APPLICATION_CREDENTIALS estiver definido, o Admin SDK o usará automaticamente.
  // Não precisamos fazer nada aqui além de garantir que o initializeApp seja chamado.
  firebaseConfig = {}; // Objeto vazio para initializeApp
} else {
  console.error(
    "Nenhuma configuração do Firebase encontrada. Defina FIREBASE_CONFIG ou GOOGLE_APPLICATION_CREDENTIALS.",
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: "https://sge-v2-default-rtdb.firebaseio.com", // Substitua pela URL do seu DB
});

const db = admin.database();

// --- Funções Auxiliares ---

/**
 * @function parseArgs
 * @description Analisa os argumentos da linha de comando.
 * @returns {object} Objeto contendo os argumentos parseados.
 */
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      args[key] = value || true; // Se não houver valor, assume true (ex: --dry-run)
    }
  }
  return args;
}

/**
 * @function showHelp
 * @description Exibe as instruções de uso do script.
 */
function showHelp() {
  console.log(`
Uso: node scripts/gerar-turmas.js [opções]

Opções:
  --help              Exibe esta mensagem de ajuda.
  --dry-run           Apenas imprime o JSON das turmas no console, sem gravar no banco de dados.
  --segmento=<valor>  Filtra por segmento (ex: FundII, Medio).
  --turno=<valor>     Filtra por turno (ex: M, T, N, I).
  --anoLetivo=<valor> Define o ano letivo para as turmas (padrão: ${new Date().getFullYear()}).

Exemplos:
  node scripts/gerar-turmas.js
  node scripts/gerar-turmas.js --dry-run
  node scripts/gerar-turmas.js --segmento=FundII --turno=M
  node scripts/gerar-turmas.js --anoLetivo=2027
`);
  process.exit(0);
}

/**
 * @function generateTurmas
 * @description Gera um array de objetos de turmas com base nos critérios definidos.
 * @param {object} options - Opções de filtragem (segmento, turno, anoLetivo).
 * @returns {Array<object>} Array de objetos de turmas.
 */
function generateTurmas(options) {
  const turmas = [];
  const anoLetivo = options.anoLetivo || new Date().getFullYear();
  const capacidadePadrao = 40;

  const segmentos = {
    FundII: { anos: [6, 7, 8, 9], letras: ["A", "B", "C", "D", "E", "F"] },
    Medio: { anos: [1, 2, 3], letras: ["A", "B", "C", "D", "E", "F"] },
  };
  const turnos = ["M", "T", "N", "I"]; // Manhã, Tarde, Noite, Integral

  for (const segKey in segmentos) {
    if (options.segmento && options.segmento !== segKey) continue;

    const seg = segmentos[segKey];
    for (const ano of seg.anos) {
      for (const letra of seg.letras) {
        for (const turno of turnos) {
          if (options.turno && options.turno !== turno) continue;

          const nome = `${ano}${segKey === "FundII" ? "º Ano" : "º EM"} ${letra} - ${turno}`;
          const turmaId =
            `${segKey.toLowerCase()}-${ano}-${letra}-${turno}`.replace(
              / /g,
              ".",
            );

          turmas.push({
            id: turmaId,
            nome: nome,
            segmento: segKey,
            ano: ano,
            letra: letra,
            turno: turno,
            sala: "", // Pode ser preenchido posteriormente
            capacidade: capacidadePadrao,
            anoLetivo: anoLetivo,
            ativa: true,
            metricas: { freq: 0, alunos: 0 },
          });
        }
      }
    }
  }
  return turmas;
}

/**
 * @function confirmOverwrite
 * @description Pergunta ao usuário se deseja sobrescrever os dados existentes.
 * @param {string} path - Caminho no banco de dados a ser verificado.
 * @returns {Promise<boolean>} True se o usuário confirmar, false caso contrário.
 */
async function confirmOverwrite(path) {
  const snapshot = await db.ref(path).once("value");
  if (snapshot.exists()) {
    console.warn(`
⚠️ O caminho '${path}' já existe no banco de dados e contém dados.
   Continuar irá sobrescrever os dados existentes.
`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("Deseja continuar e sobrescrever? (y/N): ", (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y");
      });
    });
  }
  return true;
}

/**
 * @function writeTurmasToDB
 * @description Escreve as turmas geradas no Firebase Realtime Database com retry e barra de progresso.
 * @param {Array<object>} turmas - Array de objetos de turmas a serem gravadas.
 */
async function writeTurmasToDB(turmas) {
  console.log(`
🚀 Iniciando gravação de ${turmas.length} turmas no Firebase Realtime Database...
`);
  const batchSize = 10;
  let createdCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < turmas.length; i += batchSize) {
    const batch = turmas.slice(i, i + batchSize);
    const promises = batch.map(async (turma) => {
      const maxRetries = 5;
      let retries = 0;
      while (retries < maxRetries) {
        try {
          await db.ref(`/turmas/${turma.id}`).set(turma);
          createdCount++;
          return;
        } catch (error) {
          retries++;
          const delay = Math.pow(2, retries) * 100; // Exponential backoff
          console.warn(`
⚠️ Erro ao gravar turma ${turma.id} (tentativa ${retries}/${maxRetries}): ${error.message}. Tentando novamente em ${delay}ms.`);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      console.error(`
❌ Falha persistente ao gravar turma ${turma.id} após ${maxRetries} tentativas.`);
      throw new Error(`Falha ao gravar turma ${turma.id}`);
    });

    try {
      await Promise.all(promises);
    } catch (batchError) {
      console.error(`
❌ Erro no lote de gravação: ${batchError.message}`);
      process.exit(1);
    }

    // Barra de progresso ASCII
    const progress = Math.floor((createdCount / turmas.length) * 20);
    const progressBar = "█".repeat(progress) + "░".repeat(20 - progress);
    process.stdout.write(
      `\r[${progressBar}] ${createdCount}/${turmas.length} turmas criadas.`,
    );
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`

✅ Todas as ${createdCount} turmas foram criadas com sucesso em ${totalTime} segundos.`);
}

// --- Execução Principal ---

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
  }

  const turmas = generateTurmas(args);

  if (args["dry-run"]) {
    console.log("\n--- MODO DRY-RUN ATIVADO ---");
    console.log("JSON das turmas geradas (não gravado no DB):");
    console.log(JSON.stringify(turmas, null, 2));
    console.log("\n--- FIM DO DRY-RUN ---");
    process.exit(0);
  }

  const shouldContinue = await confirmOverwrite("/turmas");
  if (!shouldContinue) {
    console.log("Operação cancelada pelo usuário.");
    process.exit(0);
  }

  try {
    await writeTurmasToDB(turmas);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Erro fatal durante a gravação: ${error.message}`);
    process.exit(1);
  }
}

main();

/**
 * BUILD: 2026-05-14 19:00:00
 * STATUS: PRODUCTION READY
 */
