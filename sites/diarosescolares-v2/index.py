from pathlib import Path

PROJETO = Path(".")
SAIDA = "projeto_completo.txt"

IGNORAR = {
    "node_modules",
    ".git",
    ".firebase",
    "dist",
    "build",
    ".dart_tool",
    ".idea",
    ".vscode",
    "__pycache__"
}

EXTENSOES = {
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".html",
    ".css",
    ".scss",
    ".md",
    ".txt",
    ".rules",
    ".yaml",
    ".yml"
}

with open(SAIDA, "w", encoding="utf-8") as out:

    for arquivo in PROJETO.rglob("*"):

        if not arquivo.is_file():
            continue

        if any(parte in IGNORAR for parte in arquivo.parts):
            continue

        if arquivo.suffix.lower() not in EXTENSOES:
            continue

        try:
            conteudo = arquivo.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            out.write("\n")
            out.write("=" * 100 + "\n")
            out.write(f"ARQUIVO: {arquivo}\n")
            out.write("=" * 100 + "\n\n")
            out.write(conteudo)
            out.write("\n\n")

        except Exception:
            pass

print(f"Gerado: {SAIDA}")