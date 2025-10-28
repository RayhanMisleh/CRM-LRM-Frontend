# Copilot / AI Agent instructions — CRM-LRM-Frontend

Breve contexto
- Projeto Next.js (App Router) em TypeScript. Código principal sob `app/` (App Router), UI e widgets em `components/` e `components/ui/`.
- TailwindCSS para estilos (configurado via `app/globals.css`). Fonte padrão via `next/font` (Figtree) em `app/layout.tsx`.
- Public assets colocados em `public/` (ex.: `favico.svg`, `LRM Solutions Logo.png`).
- package.json contém scripts padrão: `dev` (`next dev`), `build`, `lint`.

Arquitetura e pontos-chave
- App Router: altere as páginas em `app/`.
  - `app/layout.tsx` — layout global, metadata (título, ícones), carregamento de fonte e estilos. Ex.: favicon está configurado aqui (`icons.icon` apontando para `/favico.svg`).
  - `app/page.tsx` — homepage inicial.
- UI primitives: `components/ui/*` contém componentes reutilizáveis (Button, Card, Input, Avatar, etc.). Quando criar novos elementos visuais, preferir compor estes primitives.
- Área de negócio/feature: `components/crm-dashboard.tsx` implementa a UI do dashboard que serve de base para o CRM. Nota: este arquivo usa `"use client"` e Tailwind utilitário.
- Hooks e utilitários: `hooks/` (ex.: `use-mobile.ts`) e `lib/utils.ts` para helpers compartilhados.

Comandos e workflows (rápido)
- Instalar dependências:
  - Preferência: `pnpm install` (há `pnpm-lock.yaml`), mas se pnpm não estiver disponível o método observado no repo foi:
    - `npm install --legacy-peer-deps` (usado para contornar conflito de peer-deps com React 19)
- Desenvolver localmente: `npm run dev` (ou `pnpm dev` se usar pnpm)
- Build de produção: `npm run build` e `npm start`
- Lint: `npm run lint` (ESLint configurado)

Dependências e quirks observados
- Next.js versão no package.json: `next` (versão presente no lockfile/manifest). O projeto está alinhado com a App Router (pasta `app/`).
- React 19 está especificado (`react: ^19`) — em uma instalação prévia houve conflito de peer-deps com `vaul@0.9.9`. Solução de contorno usada: `npm install --legacy-peer-deps` ou usar pnpm (se disponível) para preservar lockfile.

Padrões do projeto (convenções específicas)
- Componentes UI:
  - `components/ui/*` exporta primitives (Button, Card, Input...) — ao adicionar novos padrões visuais, aumente esse diretório e reutilize os primitives para consistência.
  - Os componentes de página compõem primitives e usam classes Tailwind diretamente (não há CSS-modules por componente).
- Internationalização / localização:
  - `app/layout.tsx` define `lang="pt-BR"` — preferir conteúdo em português quando for aplicável.
- Fonts/variáveis:
  - `app/layout.tsx` injeta `--font-figtree` e `app/globals.css` mapeia `--font-sans` para essa variável; manter essa variável quando adicionar estilos globais.
- Estilos:
  - Tudo com Tailwind utilitário; `app/globals.css` declara variáveis CSS para temas e `@layer base` com ajustes. Respeitar essas variáveis (ex.: `--color-...`, `--font-figtree`) ao criar novos estilos.

Onde o agente AI deve olhar primeiro (rápido de load)
- `app/layout.tsx` — metadata, idioma, fontes, ícone/favico
- `app/page.tsx` — homepage
- `components/crm-dashboard.tsx` — componente central do design do CRM (muito útil para UX/UI)
- `components/ui/` — primitives reutilizáveis
- `app/globals.css` — tokens de tema e configuração do Tailwind
- `package.json` — scripts e dependências

Regras práticas e exemplos (para PRs/edits automáticos)
- Alterações visuais: compor `components/ui/*` em vez de duplicar markup. Ex.: use `<Card>` e `<Button>` em vez de classes novas quando possível.
- Ícones/Assets: usar arquivos em `public/` (ex.: `/favico.svg`, `/LRM Solutions Logo.png`) — referenciar com caminhos absolutos começando por `/`.
- Background / tema: o dashboard atual aplica gradientes em `components/crm-dashboard.tsx` — para alterar a cor principal, atualize as classes Tailwind que definem `from[...]`/`via[...]`/`to[...]` nesse arquivo.
- Server vs Client: siga os comentários `"use client"` quando o componente precisar de estado/efeitos (ex.: `crm-dashboard.tsx` é client). Evitar adicionar hooks de client em componentes de servidor.
- Instalação de dependências: prefira `pnpm` para manter lockfile, mas se não houver pnpm no ambiente use `npm install --legacy-peer-deps`.

Operações de manutenção que o agente pode executar com segurança
- Limpeza de assets não usados: procurar `public/` para imagens referenciadas (ex.: remoção de imagens não referenciadas) e atualizar referências em `components/`.
- Simplificação de mocks: reduzir arrays de demo em `components/crm-dashboard.tsx` para exemplos menores.
- Atualizar metadata (título/ícone) em `app/layout.tsx` — o campo `icons.icon` aponta para `/favico.svg`.

O que NÃO fazer automaticamente
- Alterar a versão do Next.js / React sem checar compatibilidade (builds podem falhar).
- Remover dependências do `package.json` sem validar impact scope (várias bibliotecas Radix e primitives UI presentes).

Perguntas que o agente deve pedir ao humano antes de grandes mudanças
- Deseja que eu converta a base para outra versão do Next/React? (requer testes e upgrades manuais)
- Trocar `pnpm` por `npm` como gerenciador padrão? (há `pnpm-lock.yaml` no repo)
- Preferência de idioma do conteúdo (PT-BR está setado no layout; confirmar)

Solicito feedback
- Revise este arquivo e diga se quer mais exemplos (snippets) ou regras mais rígidas (ex.: nomenclatura de arquivos, testes obrigatórios por PR).

Última observação rápida
- Arquivos/paths importantes: `app/layout.tsx`, `app/page.tsx`, `components/crm-dashboard.tsx`, `components/ui/*`, `app/globals.css`, `public/favico.svg`, `public/LRM Solutions Logo.png`, `package.json`.

---
Se concordar, vou gravar isto como `.github/copilot-instructions.md`. Deseja que eu acrescente um pequeno checklist de verificação para PRs (ex.: rodar `npm run lint`, checar build)?