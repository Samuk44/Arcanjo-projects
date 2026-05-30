import re
from pathlib import Path
config = {
    'apiKey': 'AIzaSyCOug2MkZHwH5rzGXxzlPpVZEu4IHbt0Ck',
    'authDomain': 'farolescolar.firebaseapp.com',
    'databaseURL': 'https://farolescolar-default-rtdb.firebaseio.com',
    'projectId': 'farolescolar',
    'storageBucket': 'farolescolar.firebasestorage.app',
    'messagingSenderId': '31040592917',
    'appId': '1:31040592917:web:f90e2f0441c35ed92b421c',
    'measurementId': 'G-1B6HPZNFFJ',
}
files = [
    'auth/auth-status.html',
    'auth/recuperar-senha.html',
    'auth/redefinir-senha.html',
    'index.html',
    'diretor/js/wizard.js',
    'assets/js/firebase/config.js',
    'cadastro/js/professor.js',
    'pai/js/pai_perfil_aluno.js',
    'pai/js/pai_perfil.js',
    'pai/js/pai_historico.js',
    'pai/js/feed.js',
    'diretor/js/relatorios-notas.js',
    'diretor/js/relatorios-frequencia.js',
    'diretor/js/relatorios-comunicacao.js',
    'diretor/js/dashboard.js',
]
pattern = re.compile(r'(const firebaseConfig = (?:window\.__firebaseConfig \|\| )?\{)(.*?)(\};)', re.DOTALL)
new_body = '\n'.join(f'  {key}: "{value}",' for key, value in config.items())
for file in files:
    path = Path(file)
    text = path.read_text(encoding='utf-8')
    match = pattern.search(text)
    if not match:
        print(f'NO MATCH: {file}')
        continue
    replacement = match.group(1) + '\n' + new_body + '\n' + match.group(3)
    new_text = text[:match.start()] + replacement + text[match.end():]
    path.write_text(new_text, encoding='utf-8')
    print(f'UPDATED: {file}')
