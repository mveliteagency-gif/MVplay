# 👑 Plataoplomo TV — Plataforma Premium de IPTV, Streaming VOD & Smart TV

Plataforma completa de streaming e IPTV inspirada e aprimorada a partir da referência pública [plataoplomo.com.br](https://plataoplomo.com.br/). Desenvolvida com arquitetura de alto desempenho, compatibilidade prioritária para televisões (Android TV, Google TV, Smart TVs Samsung Tizen e LG webOS, Fire TV Stick), celulares e computadores.

---

## 🌟 Principais Recursos e Diferenciais

### 1. 📺 Interface Prioritária para Smart TVs & Android TV (10-Foot UI)
- **Navegação Espacial por Controle Remoto (D-Pad):** Navegue fluidamente utilizando apenas as setas (`Cima`, `Baixo`, `Esquerda`, `Direita`), confirmação (`Enter/OK`) e retorno (`Esc/Backspace`).
- **Anel de Foco Dourado de Alta Visibilidade:** Efeito glow elegante (`#C9A96E`) com animação suave e scroll automático para centralizar o elemento focado.
- **Controle Remoto Virtual Integrado:** Widget flutuante com D-Pad virtual interativo na tela, permitindo testar a experiência de TV diretamente no navegador ou no celular.

### 2. ⚡ Player de Vídeo Profissional OTT (HLS & MP4)
- **Streaming Adaptativo (ABR) via HLS.js:** Seleção automática ou manual de qualidade (4K HDR, 1080p FHD, 720p HD).
- **Recuperação Automática de Erros:** Detecção inteligente de falhas de rede com retentativas automáticas e fallback para fontes redundantes.
- **Troca Rápida de Canais (Channel Surfing):** Menu lateral transparente dentro do player para trocar de canal sem interromper a navegação.
- **Guia EPG na Tela:** Pressione `I` ou o botão de Informações para exibir o programa atual e próximo com barra de progresso.
- **Controles de Aspecto e Fullscreen:** Alternância entre 16:9 original, preencher tela (fill) ou zoom.

### 3. 📡 Módulo Completo de Canais Ao Vivo
- Categorias dinâmicas: Esportes, TV Aberta, Filmes & Séries, Notícias 24h, Infantil, Documentários e Internacionais.
- Grade EPG com horários, sinopse da programação e barra de progresso em tempo real.
- Sistema de Favoritos (adicionar/remover com 1 clique ou atalho).

### 4. 🎬 Filmes & Séries Sob Demanda (VOD)
- Catálogo em 4K HDR com notas, ano, classificação indicativa e áudio Dolby Digital 5.1.
- Modal com sinopse, elenco, diretor e botão de reprodução direta.
- Gerenciamento de Séries: Seletor de temporadas e lista de episódios com sinopse individual e miniaturas.
- **Continue Assistindo:** Salvamento automático do timestamp e porcentagem assistida no histórico.

### 5. 🛡️ Painel Administrativo Centralizado
- **Autenticação Segura:** Login protegido com token de sessão.
- **Telemetria do Servidor:** Monitoramento de canais cadastrados, transmissões online, uptime e consumo de memória.
- **CRUD de Canais:** Adição, edição, remoção e teste de fontes.
- **Testador de Streams em Tempo Real (Live Ping):** Diagnóstico instantâneo de latência (ms), status HTTP e verificação de headers.
- **Sincronizador Automático de Catálogo:** Deduplicação inteligente de listas e logs de sincronização.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js v18+ (testado no Node.js v24)
- NPM v9+

### Instalação e Execução

```bash
# 1. Acessar a pasta do projeto
cd plataoplomo-tv

# 2. Instalar dependências (express, cors)
npm install

# 3. Iniciar o servidor
npm start
```

O servidor iniciará em: **`http://localhost:3000`**

### Execução dos Testes Automatizados

```bash
npm test
```

Bateria de 10 testes automatizados que validam:
- Endpoints de categorias, canais, filmes e séries
- Filtros por categoria e busca global
- Grade EPG
- Autenticação administrativa
- Sincronização e deduplicação de catálogo
- Telemetria de servidor

---

## 🔑 Credenciais do Painel Administrativo
- **Usuário:** `admin`
- **Senha:** `plataoplomo2026`

---

## 📱 Atalhos de Teclado & Controle Remoto

| Tecla / Ação | Função |
| :--- | :--- |
| **Setas (▲ ▼ ◀ ▶)** | Navegação espacial entre cards, menus e botões |
| **Enter / OK** | Abrir canal, filme, episódio ou selecionar |
| **Esc / Backspace** | Fechar player, fechar modal ou voltar à tela anterior |
| **Espaço** | Pausar / Reproduzir no player de vídeo |
| **F** | Alternar modo tela cheia |
| **I** | Exibir banner EPG com informações da transmissão |
| **🎮 Botão Flutuante** | Abre/fecha o controle remoto virtual na tela |

---

## 🏗️ Estrutura de Diretórios

```
plataoplomo-tv/
├── data/
│   ├── categories.json       # Categorias de canais, filmes e séries
│   ├── channels.json         # Canais ao vivo com logos, URLs e metadados EPG
│   ├── movies.json           # Catálogo de filmes 4K HDR
│   ├── series.json           # Séries, temporadas e episódios
│   ├── epg.json              # Grade de programação eletrônica
│   └── sync-logs.json        # Histórico de sincronizações de catálogo
├── public/
│   ├── index.html            # Estrutura principal da aplicação web
│   ├── css/
│   │   ├── main.css          # Design system de luxo (preto & dourado)
│   │   ├── tv.css            # Estilos 10-foot UI e controle remoto TV
│   │   ├── player.css        # Player OTT, OSD e troca rápida de canais
│   │   └── admin.css         # Painel administrativo e testador de streams
│   └── js/
│       ├── app.js            # Inicializador e roteador da aplicação
│       ├── remote.js         # Motor de navegação espacial para TV
│       ├── player.js         # Player HLS.js com recuperação de falhas
│       ├── live.js           # Guia de canais ao vivo e EPG
│       ├── vod.js            # Catálogo de filmes e séries
│       ├── search.js         # Busca instantânea multi-conteúdo
│       ├── admin.js          # Painel administrativo e diagnóstico
│       └── storage.js        # Gerenciador de favoritos, histórico e buffer
├── server.js                 # Servidor Express, API REST, Proxy de streams
├── tests/
│   └── test-suite.js         # Bateria de testes automatizados
└── package.json
```
