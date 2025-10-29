# CRM-LRM-Frontend

## Visão geral

Este projeto é uma base de frontend Next.js (App Router) em TypeScript usada como template de design para um CRM. Ele foca em componentes UI reutilizáveis (primitives) e um dashboard demonstrativo. A intenção é servir como ponto de partida para construir funcionalidades de CRM reais.

## Começando rápido

1. **Instale as dependências**
   ```bash
   pnpm install
   ```
2. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```
   Atualize `NEXT_PUBLIC_API_BASE_URL` para o endereço correto da API antes de iniciar o projeto.
3. **Suba o ambiente de desenvolvimento**
   ```bash
   pnpm dev
   ```

> Caso não tenha `pnpm`, você pode usar `npm install --legacy-peer-deps` e os scripts equivalentes com `npm run ...`, mas o fluxo oficial do projeto utiliza `pnpm`.

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Inicia o servidor de desenvolvimento do Next.js. |
| `pnpm build` | Gera o build de produção. |
| `pnpm start` | Sobe o build de produção localmente. |
| `pnpm lint` | Executa o lint com ESLint. |
| `pnpm test` | Executa a suíte de testes unitários com Vitest e Testing Library. |
| `pnpm generate:openapi` | Gera os tipos TypeScript a partir do arquivo `Documentacao Backend/swagger.json`. |

## Testes automatizados

O projeto utiliza **Vitest** com **Testing Library** para validar componentes React.

- Execute `pnpm test` para rodar a suíte completa.
- Você pode passar flags extras do Vitest, por exemplo `pnpm test --run` para execução non-interativa em CI ou `pnpm test --watch` durante o desenvolvimento.
- Os testes utilizam um ambiente `jsdom` e incluem matchers do `@testing-library/jest-dom` configurados em `vitest.setup.ts`.

## Geração do client OpenAPI e uso do Swagger

1. O arquivo `Documentacao Backend/swagger.json` deve estar sincronizado com o backend. Baixe-o a partir do Swagger do serviço (ex.: `http://localhost:3333/docs` > botão **Download JSON**) e sobrescreva o arquivo local quando houver mudanças na API.
2. Gere os tipos TypeScript com:
   ```bash
   pnpm generate:openapi
   ```
   Os tipos são salvos em `src/types/openapi.ts` e podem ser importados em features que consomem a API.
3. Para explorar os contratos durante o desenvolvimento, abra o Swagger do backend no navegador (ex.: `http://localhost:3333/docs`). Use-o para validar payloads antes de implementar mutations e para manter o JSON atualizado.

## Estrutura principal

- `app/` — rotas do App Router, layout global (`app/layout.tsx`) e estilos globais (`app/globals.css`).
- `components/` — primitives UI compartilhadas (`components/ui/*`) e utilitários visuais.
- `src/features/` — módulos de domínio (clientes, faturas, contratos, etc.), cada um com componentes, hooks e APIs específicos.
- `src/lib/` — funções utilitárias (ex.: validações de CNPJ).
- `public/` — assets públicos, ícones e logos.

## Notas operacionais

- O projeto usa React 19 e alguns pacotes (ex.: `vaul`) ainda declaram peer-dependency em React 16/17/18. Se o `pnpm install` ou `npm install` falhar, use a flag `--legacy-peer-deps` ou mantenha o uso de `pnpm`.
- Tailwind CSS v4 está configurado em `app/globals.css` com tokens de tema. Ajustes globais de estilo devem ser centralizados ali.
- Os componentes client importantes, como `components/crm-dashboard.tsx`, dependem de hooks do lado do cliente. Evite movê-los para contextos server.

## Checklist de qualidade (obrigatório antes de abrir PR)

- [ ] `pnpm lint` sem erros ou warnings relevantes.
- [ ] `pnpm test` com todos os testes passando.
- [ ] `pnpm build` para garantir que o Next.js compila com sucesso.
- [ ] Documentação atualizada (README, comentários importantes e links para Swagger/OpenAPI).
- [ ] TODOs revisados: sinalize novos pontos no README ou no código com comentários claros.

## TODOs rastreados

- **Oportunidades (em construção)** — manter o menu lateral desativado até que o módulo esteja pronto. Ver comentários em `src/features/layout/sidebar.tsx` apontando onde o item deve ser reativado e qual rota (`/opportunities`) deverá ser criada quando o fluxo estiver implementado.

## Perguntas frequentes / troubleshooting

- *Instalação falhando por conflito de peer-deps?* Utilize `pnpm` ou rode `npm install --legacy-peer-deps`.
- *`pnpm dev` não encontra o comando `next`?* Confirme que as dependências foram instaladas.
- *Precisa trocar favicon, logo ou cores?* Ajuste `public/`, `app/layout.tsx` e as variáveis em `app/globals.css`.

---

Arquivo gerado automaticamente pelo assistente. Por favor revise e peça ajustes se desejar mais detalhes (ex.: fluxos de dados, diagramas, exemplos de componente).
