# Manual Técnico de Deployment e Operações — Matriz

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Ficha Prática Laboratorial 05 — Automação, Contentorização e CI/CD
* **Stack de Entrega:** Docker (Multi-Stage Build), Docker Compose, GitHub Actions, SQLite Persistente
* **Documentos de Referência:** [`AGENTS.md`](../AGENTS.md) | [`README.md`](../README.md) | [`docs/architecture.md`](architecture.md) | [`Dockerfile`](../Dockerfile) | [`compose.yaml`](../compose.yaml) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
* **Data:** 12 de Novembro de 2026
* **Versão:** 1.0 — Guia de Operações e Deployment

---

## 1. Visão Geral da Arquitetura de Entrega

A estratégia de entrega e execução da plataforma **Matriz** foi concebida para garantir **100% de reprodutibilidade** em qualquer ambiente (Windows, macOS, Linux, runners de CI/CD), eliminando o clássico problema *"funciona na minha máquina"*.

```mermaid
flowchart TD
    subgraph DOCKER_BUILD ["Construção da Imagem Docker Multi-Stage (Dockerfile)"]
        direction TB
        B1["1. Base (node:20-alpine + openssl)"]
        B2["2. Deps (npm ci determinístico)"]
        B3["3. Builder (prisma generate + standalone build)"]
        B4["4. Runner (Imagem minimalista ~250MB, user não-root)"]
        B1 --> B2 --> B3 --> B4
    end

    subgraph RUNTIME ["Ambiente de Execução (Docker Compose)"]
        direction TB
        C1["Contentor matriz-app (:3000)"]
        C2[("Volume Persistente\nmatriz_sqlite_data\n(/app/prisma/dev.db)")]
        C3["Healthcheck HTTP\n(GET / a cada 30s)"]
        C1 <--> C2
        C1 --> C3
    end

    subgraph CICD ["Pipeline de Integração Contínua (GitHub Actions)"]
        direction LR
        J1["Typecheck (tsc)"] --> J2["Testes Automatizados"] --> J3["Next.js Build"] --> J4["Docker Smoke Test"]
    end

    DOCKER_BUILD --> RUNTIME
    CICD -.->|Valida antes da entrega| DOCKER_BUILD
```

---

## 2. Contentorização com Docker (Multi-Stage Build)

O [`Dockerfile`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/Dockerfile) implementa o padrão multi-stage otimizado para Next.js 14 Standalone:

1. **Estágio `base`:** Imagem oficial `node:20-alpine` com os pacotes de sistema `libc6-compat` e `openssl` (necessários para os binários nativos do Prisma ORM no Alpine Linux).
2. **Estágio `deps`:** Instalação limpa de dependências com `npm ci --fetch-retries 5`.
3. **Estágio `builder`:**
   * Executa `npx prisma generate` para compilar os tipos do Prisma Client.
   * Compila o script de seed para JavaScript (`prisma/dist/seed.js`) compatível com qualquer versão do Node.js.
   * Compila o frontend e rotas de API com `npm run build` gerando a pasta `.next/standalone`.
4. **Estágio `runner`:**
   * Utilizador de sistema com privilégios reduzidos (`nextjs:nodejs` UID/GID 1001).
   * Cópia exclusiva dos artefactos necessários à execução (`.next/standalone`, `.next/static`, `public`, `prisma` e `node_modules`).
   * Configuração de `HEALTHCHECK` periódico validando resposta HTTP 200 na porta 3000.
   * Ponto de entrada gerido pelo script [`docker-entrypoint.sh`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docker-entrypoint.sh).

---

## 3. Orquestração com Docker Compose

O ficheiro [`compose.yaml`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/compose.yaml) (especificação canónica Compose v2) centraliza a orquestração do serviço, da rede dedicada e dos volumes:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: matriz:latest
    container_name: matriz-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/prisma/dev.db
      - AUTH_SECRET=matriz-poc-super-secret-key-2026-auth
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - matriz_sqlite_data:/app/prisma
    networks:
      - matriz_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

networks:
  matriz_network:
    name: matriz_network
    driver: bridge

volumes:
  matriz_sqlite_data:
    name: matriz_sqlite_data
    driver: local
```

### Persistência de Dados Relacionais
* O volume nomeado `matriz_sqlite_data` garante que o ficheiro da base de dados relacional SQLite (`dev.db`) e os ficheiros de journal persistem mesmo quando o contentor é parado (`docker compose down`) ou reiniciado (`docker compose restart`).
* No primeiro arranque, o script `docker-entrypoint.sh` executa automaticamente `prisma migrate deploy` e o povoamento idempotente `seed.js`.

---

## 4. Instruções de Execução Operacional

### 4.1 Comandos com Docker Compose

| Operação | Comando | Descrição |
|---|---|---|
| **Construir a Imagem** | `docker compose build` (ou `npm run docker:build`) | Compila a imagem Docker multi-stage localmente. |
| **Arrancar em Background** | `docker compose up -d` (ou `npm run docker:up`) | Inicia o contentor, aplica migrações e arranca o servidor na porta 3000. |
| **Inspecionar Estado & Saúde**| `docker compose ps` | Exibe o estado do contentor e a tag de saúde (`healthy`). |
| **Consultar Logs em Tempo Real** | `docker compose logs -f` (ou `npm run docker:logs`) | Mostra a saída da consola (migrações, seed e pedidos HTTP). |
| **Reiniciar Contentor** | `docker compose restart app` | Reinicia a aplicação preservando o volume da base de dados. |
| **Parar Serviço** | `docker compose down` (ou `npm run docker:down`) | Para e remove o contentor, mantendo o volume de dados intacto. |
| **Limpeza Total (Reset)** | `docker compose down -v` | Para o serviço e apaga os dados persistidos no volume. |

### 4.2 Contas de Demonstração Disponíveis no Contentor
Após o arranque do contentor, a aplicação fica disponível em **`http://localhost:3000`** com as seguintes credenciais pré-configuradas:

| Perfil | Email | Palavra-passe | Permissões |
|---|---|:---:|---|
| **Gestor de Projeto** | `luis.ferreira@matriz.local` | `password123` | Acesso total: criação/edição/eliminação de projetos e prazos de tarefas. |
| **Membro de Equipa** | `ana.silva@matriz.local` | `password123` | Movimentação no Kanban, execução de tarefas e comentários. |
| **Membro de Equipa** | `carlos.ramos@matriz.local` | `password123` | Colaboração e atribuição em tarefas de equipa. |

---

## 5. Pipeline de CI/CD com GitHub Actions

O repositório inclui a automação de Integração Contínua em [`.github/workflows/ci.yml`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/.github/workflows/ci.yml). O pipeline executa 4 etapas sequenciais a cada `push` ou `pull_request` nas branches `master` e `main`:

* **Princípio de Menor Privilégio (*Least Privilege*):** O workflow define explicitamente `permissions: contents: read`, impedindo escrita em repositório ou elevação de privilégios.
* **Segurança e Higienização de Segredos:** Nenhuma credencial de produção é exposta. O ambiente de teste e build utiliza variáveis fictícias e seguras para a base de dados SQLite e tokens de sessão (`DATABASE_URL: "file:./dev.db"`, `AUTH_SECRET: "matriz-poc-super-secret-key-2026-auth"`).

### Etapas do Pipeline (Jobs):
1. **Job `typecheck`:**
   * Executa `npm ci`, `npx prisma generate` e valida rigorosamente a tipagem estática sem emissão (`npx tsc --noEmit`).
2. **Job `test` (depende de `typecheck`):**
   * Aplica migrações em ambiente isolado (`npx prisma migrate deploy`).
   * Executa o povoamento inicial (`seed`).
   * Executa a suite completa de testes automatizados:
     - Testes Unitários de Validação de Título ([`tests/task-title-unit.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/task-title-unit.test.ts))
     - Testes de Integração de API & Persistência ([`tests/tasks-integration.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/tasks-integration.test.ts))
     - Testes de Regressão de Segurança & IDOR ([`tests/security-idor.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/security-idor.test.ts))
     - Suite Formal de Verificação do MVP ([`tests/mvp-verification.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/mvp-verification.test.ts))
3. **Job `build` (depende de `test`):**
   * Valida a compilação completa de produção do Next.js Standalone (`npm run build`).
4. **Job `docker-smoke-test` (depende estritamente de `[test, build]`):**
   * Constrói a imagem Docker oficial com caching do Buildx.
   * Realiza um teste de fumo (*smoke test*): instancia o contentor, aguarda a inicialização e valida a resposta HTTP com `curl -f http://localhost:3000/`.
   * **Garantia de Integridade:** Se qualquer teste unitário ou de integração falhar no job `test`, os jobs subsequentes `build` e `docker-smoke-test` são imediatamente cancelados, impedindo a geração ou promoção de imagens defeituosas.

---

### 5.1 Validação Experimental de Falha Controlada (*Chaos / Fault Injection*)
De acordo com os requisitos da Ficha 05 Exercício 04, foi realizada uma validação adicional através da introdução temporária de uma falha controlada num teste para comprovar que a pipeline e os comandos bloqueiam a entrega:

1. **Injeção da Falha:** No teste unitário `TC-VAL-01` de [`tests/task-title-unit.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/task-title-unit.test.ts), foi forçada a asserção `assert.equal(result.success, false)`.
2. **Resultado Obtido (Falha com Código de Saída 1):**
   ```text
   ❌ [FAIL] TC-VAL-01: Título nominal comum de tamanho padrão é aceite
      └─ Erro: FALHA CONTROLADA CI: Forçando asserção errada para validar paragem do CI
   true !== false
   RESUMO DA SUITE UNITÁRIA: 12 Passaram, 1 Falharam.
   Process exited with code 1
   ```
3. **Comportamento no CI:** O runner do GitHub Actions deteta o código de saída diferente de zero (`exit code 1`), marcando o job `test` como **Failed** e cancelando a execução dos jobs dependentes `build` e `docker-smoke-test`.
4. **Recuperação e Reposição:** A asserção defeituosa foi removida e o teste reexecutado, confirmando o restabelecimento imediato:
   ```text
   RESUMO DA SUITE UNITÁRIA: 13 Passaram, 0 Falharam.
   Process exited with code 0
   ```

---

## 6. Procedimentos de Diagnóstico e Resolução de Problemas (Troubleshooting)

### Problema 1: Conflito de Porta 3000 (`bind: address already in use`)
* **Causa:** Outro processo ou servidor Next.js local está a escutar na porta 3000.
* **Diagnóstico (Windows):** `netstat -ano | findstr :3000`
* **Solução:** Parar o processo local ou alterar a porta de mapeamento no `docker-compose.yml` (ex: `"3001:3000"`).

### Problema 2: Falha no Arranque do Contentor por Permissões do SQLite
* **Causa:** O utilizador não-root `nextjs` não tem permissão para criar o ficheiro `dev.db-journal` no volume montado.
* **Solução:** O `Dockerfile` inclui `chown -R nextjs:nodejs /app/prisma`. Para volumes pré-existentes corrompidos, execute `docker compose down -v` e reinicie.

### Problema 3: Reiniciar a Base de Dados do Contentor
* Para repor o estado inicial dos dados de demonstração sem recompilar a imagem:
```bash
docker compose exec app node /app/prisma/dist/seed.js
```
