# Notas de Lançamento — Versão Final v1.1.0

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Versão:** `1.1.0` (Lançamento Oficial de Produção / Projeto Final)
* **Padrão de Versionamento:** [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/pt-BR/)
* **Data de Emissão:** 19 de Novembro de 2026
* **Ambiente de Referência:** Node.js 20 LTS / Docker 24+ / Docker Compose v2 / Render.com
* **Documentos de Referência:** [`README.md`](../README.md) | [`CHANGELOG.md`](../CHANGELOG.md) | [`docs/deployment.md`](deployment.md) | [`docs/presentation.html`](presentation.html) | [`compose.yaml`](../compose.yaml) | [`openapi.yaml`](../openapi.yaml)

---

## 1. Resumo Executivo da Release v1.1.0

A versão **`v1.1.0`** constitui o **lançamento oficial e estável** da plataforma **Matriz**, marcando a conclusão com distinção do projeto desenvolvido no âmbito da formação de *Agentic Software Development*.

Esta versão reúne a totalidade dos requisitos funcionais do MVP, esteiras automatizadas de garantia de qualidade (QA), contentorização multi-stage pronta para produção, e uma **identidade visual aeronáutica personalizada ("Torre de Operações Matriz")** com suporte a acessibilidade motora e contraste WCAG AA.

---

## 2. Destaques da Versão 1.1.0

### 2.1 Identidade Visual de Aviação ("Torre de Operações Matriz")
* **Design System & Tokens Semânticos:** Extensão do `tailwind.config.ts` com paleta temática de cockpit (`aero` azul-céu `#0284c7`, `navy` cinza-naval `#0f172a`, `runway` âmbar-sinalização `#d97706`, `hud` verde-cockpit `#059669` e `storm` alerta de turbulência `#e11d48`).
* **Cockpit Hero & Transponder Ativo:** Página de login redesenhada com ilustração vetorial de aviação (`Plane`, `Compass`, `Radar`, `Wind`), telemetria do transponder e cartões de credenciais táteis para Comandante e Piloto.
* **Micro-interações Acessíveis:** Keyframes CSS para rotação de turbinas (`animate-turbine-spin`) e sustentação de voo em botões (`animate-plane-takeoff`), em estrita conformidade com `prefers-reduced-motion`.
* **Centralização de Vocabulário:** Módulo [`src/lib/labels.ts`](../src/lib/labels.ts) com mapeamento consistente para Torre de Controlo, Esquadrão de Missões, Checklists de Voo & Hangar, Pilotos e Comandantes, preservando a imutabilidade das APIs REST e schemas Prisma.

### 2.2 Funcionalidades do MVP (100% Cobertas e Verificadas)
* **Gestão de Projetos (Missões):** Criação, edição, paginação e pesquisa textual instantânea, com eliminação em cascata controlada e proteção contra dados órfãos (RNF03).
* **Quadro Kanban de Tarefas:** Fluxo operacional de 3 estados (`TODO` Hangar, `IN_PROGRESS` Em Voo, `DONE` Aterrado) com transições visuais instantâneas e persistência relacional imediata.
* **Múltiplos Responsáveis (N:M):** Associação de múltiplos pilotos à mesma checklist com restrição relacional de unicidade (`@@unique([taskId, userId])`), prevenindo atribuições duplicadas.
* **Deteção Inteligente de Atrasos (RF11):** Identificação e badge contextual para prazos ultrapassados no fuso horário UTC (`isOverdue`).
* **Comunicações de Rádio (Comentários):** Histórico cronológico com inferência segura de autor e data no backend via sessão autenticada.
* **Dashboard Analítico (RF10/RF12):** Indicadores de progresso ponderado, distribuição por estados, tarefas críticas e série temporal de velocidade semanal com `recharts`.

### 2.3 Segurança & Controlo de Acessos (RBAC & Defesa em Profundidade)
* **Sessões HTTP-Only com HMAC-SHA256:** Proteção rigorosa contra adulteração de cookies (`matriz_session`).
* **Prevenção de Bypass de Identidade (SEC-01):** Rejeição estrita de cabeçalhos arbitrários externos (`X-User-Id`).
* **Proteção contra IDOR (SEC-02):** Bloqueio de alterações ou desassociações indevidas de tarefas alheias por membros de equipa comuns.
* **Perfis de Utilizador:** Distinção de autorizações entre Comandante (`PROJECT_MANAGER`) e Piloto Operacional (`TEAM_MEMBER`).

### 2.4 Qualidade, Testes & CI/CD
* **100% de Taxa de Sucesso nos Testes:**
  * 13 Testes Unitários de Regra de Negócio ([`tests/task-title-unit.test.ts`](../tests/task-title-unit.test.ts)).
  * 33 Testes de Integração de API & SQLite ([`tests/tasks-integration.test.ts`](../tests/tasks-integration.test.ts)).
  * 21 Testes de Regressão de Segurança & IDOR ([`tests/security-idor.test.ts`](../tests/security-idor.test.ts)).
  * 34 Testes de Verificação Formal do MVP ([`tests/mvp-verification.test.ts`](../tests/mvp-verification.test.ts)).
  * 15 Testes de Integração Frontend & Métricas ([`tests/frontend-integration.test.ts`](../tests/frontend-integration.test.ts)).
  * Teste End-to-End no navegador headless Chromium ([`tests/e2e/task-lifecycle.spec.ts`](../tests/e2e/task-lifecycle.spec.ts)).
* **Esteira GitHub Actions:** Validação contínua de tipos (`tsc`), testes automatizados, compilação de produção e testes de fumo em contentor Docker Alpine.

### 2.5 Prontidão para Apresentação & Demonstração Live
* **Deploy Cloud:** Aplicação configurada e pronta para execução em container standalone no [Render.com](https://render.com).
* **Deck de Apresentação Executiva:** Slides interativos em HTML ([`docs/presentation.html`](presentation.html)) estruturados para 5 minutos de demonstração com notas de orador, cronómetro e atalhos de teclado.
* **Capturas de Ecrã em Alta Resolução:** Documentação visual disponível em [`docs/ui/screenshots/`](ui/screenshots/).

---

## 3. Instruções de Verificação e Arranque

### Via Docker Compose
```bash
docker compose up -d
# Aceder em: http://localhost:3000
```

### Via Runtime Local
```bash
npm install
npm run build
npm run start
# Aceder em: http://localhost:3000
```

---

## 4. Contas de Demonstração

| Papel | Nome | E-mail | Palavra-passe |
|---|---|---|---|
| **Comandante da Torre** (Gestor) | Luís Ferreira | `luis.ferreira@matriz.local` | `password123` |
| **Piloto de Voo** (Membro) | Ana Silva | `ana.silva@matriz.local` | `password123` |
| **Piloto de Apoio** (Membro) | Carlos Ramos | `carlos.ramos@matriz.local` | `password123` |
