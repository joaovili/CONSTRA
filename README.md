# CONSTRA (PWA)

Logbook universal para anotar **carga × reps** de cada exercício e ver a progressão. Mobile-first, offline, instalável no iPhone via Safari.

- 📱 PWA: instala na home, abre fullscreen, funciona sem internet
- 📚 Biblioteca de exercícios (40 seed) + criar os seus
- 🏋️ Rotinas editáveis + treino livre
- ✅ Sessão com sugestão de carga, timer de descanso, badge de PR
- 📈 Gráfico carga máx / volume / 1RM estimado por exercício
- 💾 100% local (IndexedDB) + backup JSON/CSV (importante no iOS)

## Rodar local

```bash
cd logbook-treino
npm install
npm run dev
# abre http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

### GitHub

```bash
git init
git add -A
git commit -m "logbook MVP"
gh repo create logbook-treino --public --source=. --push
```

### Railway (tua VM)

O projeto já tem `Dockerfile` + `nginx.conf` (build estático servido via nginx, SPA fallback incluso).

1. Push no GitHub
2. Railway → New → GitHub Repo → seleciona `logbook-treino`
3. Railway detecta o `Dockerfile` e faz deploy (porta 80)
4. Abre a URL `https://xxx.up.railway.app` **no Safari do iPhone** → Compartilhar → Adicionar à Tela de Início

> PWA exige HTTPS — a Railway já entrega. O service worker só ativa em HTTPS ou localhost.

## iOS — instalar

1. Abrir a URL no **Safari** (Chrome no iOS não instala PWA)
2. **Compartilhar ⬆️ → Adicionar à Tela de Início**
3. Abrir pelo ícone CONSTRA (offline funciona)
4. Exportar backup JSON de tempos em tempos em **Ajustes** (o iOS pode limpar dados do site sem espaço)

## Stack

Vite + React + TS + Tailwind v4 + react-router + Dexie (IndexedDB) + vite-plugin-pwa + Recharts
