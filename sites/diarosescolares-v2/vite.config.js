import { defineConfig } from 'vite';

export default defineConfig({
  // Desabilita o diretório public/ padrão do Vite para evitar
  // conflito com o public/index.html legado que existe no projeto.
  publicDir: false,

  server: {
    port: 3000,
  },

  preview: {
    port: 3000,
  },

  build: {
    rollupOptions: {
      input: {
        index:            'index.html',
        login:            'auth/login.html',
        register:         'auth/register.html',
        professorIndex:   'app/professor/index.html',
        professorChamada: 'app/professor/chamada.html',
        directorIndex:    'app/director/index.html',
        guardianIndex:    'app/guardian/index.html',
      },
    },
  },
});
