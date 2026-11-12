# Restrições, Pressupostos e Decisões Técnicas — Matriz

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Curso de Desenvolvimento de Software com *Agentic Approach* 
* **Documentos de Referência:** [requirements.md](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docs/requirements.md) | [user-stories.md](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docs/user-stories.md)
* **Versão:** 1.0
* **Data:** 29 de Outubro de 2026

---

## 1. Restrições Conhecidas (Constraints)

As restrições representam limitações incontornáveis de tempo, recursos, tecnologia ou ambiente que balizam o desenvolvimento do projeto:

1. **Restrição Temporal e Académica:**
   * O projeto destina-se a ser desenvolvido como uma Prova de Conceito (PoC) no decorrer das sessões práticas do curso. O design de arquitetura deve privilegiar simplicidade de implementação e arranque rápido face a soluções com overhead de configuração.
2. **Ambiente Local e Portabilidade:**
   * A aplicação deve correr em qualquer máquina de desenvolvimento (Windows, macOS, Linux) sem necessidade de subscrições em serviços de cloud comerciais (ex: AWS, GCP, Vercel Pro).
3. **Restrição de Dependências Externas:**
   * O PoC não deve depender de gateways de pagamento, serviços de envio de email transacional (SendGrid, Mailgun) ou serviços externos proprietários de autenticação (Auth0, Okta) para as suas funções primordiais.
4. **Alinhamento com Fluxos de IA Agêntica:**
   * A base de código deve ser estritamente tipada, modular e conter definições declarativas de schemas para que ferramentas agênticas (ex: Antigravity CLI, Gemini) consigam inspecionar o código, gerar testes e propor alterações sem perda de contexto semântico.

---

## 2. Pressupostos Assumidos (Assumptions)

Dado que o cliente/patrocinador real não está presente de forma contínua, os seguintes pressupostos foram formalmente assumidos pela equipa de engenharia:

1. **Autenticação e Sessão Simplificada:**
   * Assume-se que um seletor de utilizadores (*Mock Switcher*) ou autenticação local com tokens pré-definidos (JWT ou Cookies de sessão com dados de seed) é suficiente para demonstrar a alternância entre os papéis de *Gestor de Projeto* e *Membro de Equipa*.
2. **Topologia Mono-Tenant (Simplificação Deliberada para PoC):**
   * Assume-se que todas as equipas e projetos pertencem a uma única empresa fictícia, dispensando o particionamento rigoroso de bases de dados entre múltiplos clientes (*Multi-tenancy*). O modelo relacional deve preservar compatibilidade para futura adição de chave de organização (`organization_id`).
3. **Comunicação Cliente-Servidor Baseada em REST:**
   * Assume-se que a sincronização em tempo real via WebSockets não é mandatória para a validação do conceito; mutações imediatas no cliente (*Optimistic UI*) combinadas com chamadas REST são suficientes para uma experiência de utilizador fluida.
4. **Volume de Dados Moderado:**
   * O PoC é dimensionado para gerir até dezenas de projetos e centenas de tarefas ativas em simultâneo, não sendo necessária otimização prematura para milhões de registos (ex: sharding, caching Redis distribuído).
5. **Idioma e Internacionalização:**
   * A aplicação funcionará com interface e mensagens de validação em Português, adotando terminologia ágil amplamente reconhecida (como *Kanban*, *Backlog*, *TODO*, *In Progress*, *Done*).
6. **Padronização Temporal em UTC (ISO 8601):**
   * Todas as datas e timestamps (`created_at`, `updated_at`, `due_date`) são persistidos e calculados em formato UTC no backend. As tarefas são consideradas em atraso se não concluídas até às 23:59:59 UTC da data limite estipulada.

---

## 3. Requisitos de Segurança e Privacidade

Mesmo tratando-se de um PoC, a aplicação deve seguir princípios fundamentais de engenharia de software segura:

1. **Validação Estrita de Inputs (Defesa em Profundidade):**
   * Todos os dados recebidos via API devem ser validados e higienizados através de schemas rigorosos (ex: Zod em TypeScript ou Pydantic em Python), limitando o tamanho dos textos (título: 3-100 carateres, descrição: 0-2000 carateres) e prevenindo ataques de injeção (SQL Injection, XSS).
2. **Autorização por Papel (RBAC com Validação no Backend):**
   * O backend deve validar e aplicar ativamente as permissões associadas ao papel do utilizador em cada endpoint de mutação sensível (`POST /projects`, alteração de `due_date`, `DELETE /tasks`), recusando confiar apenas em parâmetros ou cabeçalhos enviados pelo cliente sem verificação na base de dados.
3. **Integridade Referencial e Proteção de Dados:**
   * Chaves estrangeiras e integridade relacional devem ser asseguradas ao nível da base de dados, prevenindo registos órfãos e acessos a dados corrompidos.
4. **Privacidade de Dados:**
   * Não devem ser recolhidos nem armazenados dados pessoais sensíveis; apenas nome de utilizador, identificador único e endereço de email profissional para associação às tarefas.

---

## 4. Decisões Técnicas Consolidadas (Stack Tecnológica do PoC)

Em conformidade com o início da Ficha 3, as opções técnicas foram fechadas para maximizar a portabilidade local e a produtividade no desenvolvimento agêntico:

| Componente Técnico | Tecnologia Escolhida | Justificação da Seleção |
|---|---|---|
| **Arquitetura Fullstack** | **Next.js 14+ (App Router, TypeScript)** | Monólito Modular unificado: frontend React e rotas de API REST no mesmo processo, sem problemas de CORS ou portas múltiplas. |
| **Camada de Acesso a Dados (ORM)** | **Prisma ORM** | Schemas declarativos tipados (`schema.prisma`), migrações automáticas e tipagem ponta a ponta perfeitamente interpretável por agentes de IA. |
| **Motor de Base de Dados Local** | **SQLite (`prisma/dev.db`)** | Portabilidade total e zero-setup (RNF05). Corre diretamente em qualquer máquina sem dependência de Docker ou serviços externos. |
| **Validação de Contratos** | **Zod** | Schemas de validação estritos partilhados entre as rotas da API (backend) e formulários (frontend). |
| **Biblioteca de Drag-and-Drop** | **`@hello-pangea/dnd`** | Fork moderno e estável de `react-beautiful-dnd`, fiável e de rápida implementação para quadros Kanban. |
| **Estilização e Ícones** | **Tailwind CSS + Lucide React** | Produtividade acelerada de UI e componentes visuais com classes utilitárias e ícones vetoriais leves. |
| **Gráficos do Dashboard** | **Recharts** | Biblioteca declarativa em React para renderização do gráfico de barras de velocidade semanal dos últimos 7 dias. |

---

## 5. Limitações Conhecidas do Âmbito (Scope Boundaries)

Para salvaguardar o prazo e foco do projeto nas sessões de desenvolvimento com agentes, as seguintes capacidades estão explicitamente **fora do âmbito do PoC**:

* **Não suporte a sub-tarefas aninhadas:** As tarefas têm estrutura plana dentro do projeto.
* **Não suporte a gestão de orçamentos e custos:** A ferramenta foca-se exclusivamente na gestão de fluxo e tempo/prazos.
* **Não suporte a dependências complexas (Gantt):** Não há bloqueio sequencial obrigatório entre tarefas (ex: Tarefa B só inicia se Tarefa A estiver concluída).
* **Sem upload de anexos binários:** Evita configuração de buckets S3 ou sistemas de ficheiros complexos.
* **Sem suporte móvel nativo:** Interface desenhada para Web responsiva em desktop/laptop e tablet.
