# Responsividade — A.T.A Gestão

Documento de referência sobre o padrão responsivo adotado no app, viewports
oficiais de teste e checklist de QA.

## Viewports oficiais

| Viewport | Largura  | Categoria |
|----------|----------|-----------|
| Mobile   | 375 px   | iPhone SE / 12 mini |
| Tablet   | 768 px   | iPad portrait |
| Desktop  | 1280 px  | Notebook / desktop |

Breakpoints Tailwind utilizados:

- `sm` = 640 px
- `md` = 768 px
- `lg` = 1024 px
- `xl` = 1280 px

## Princípios

1. **Mobile-first**: estilos base = mobile; `sm:` / `md:` adicionam ajustes.
2. **Touch targets ≥ 44×44 px** em qualquer botão clicável.
3. **Sem overflow horizontal** em 375 px.
4. **Texto mínimo**: `text-xs` (12 px) para metadata; `text-sm` (14 px) para conteúdo.
5. **Modais = bottom sheet em mobile / centered modal em desktop**.

## Padrão de modais

Todos os modais seguem este esqueleto:

```tsx
<div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={fechar}>
  <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[96vh] sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
    {/* Header sticky */}
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">Título</h2>
      <button onClick={fechar} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
        <X size={20} />
      </button>
    </div>
    {/* Conteúdo com scroll */}
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
      ...
    </div>
  </div>
</div>
```

Características:

- **Mobile (`< sm`)**: `items-end` + `rounded-t-2xl` + `p-0` → bottom sheet ocupando toda a largura.
- **Desktop (`≥ sm`)**: `items-center` + `sm:rounded-2xl` + `sm:p-4` → modal centralizado com largura máxima.
- **Header sticky** (`shrink-0`) + **conteúdo scrollável** (`flex-1 overflow-y-auto`).
- **Botão fechar** sempre 44×44 px com hit area ampla via `p-2 -mr-2`.

## Forms dentro de modais

Grids de 2 colunas devem empilhar em mobile:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

## Componentes utilitários disponíveis

- `src/hooks/useBreakpoint.ts` — `{ isMobile, isTablet, isDesktop, breakpoint }`.
- `src/components/ui/Sheet.tsx` — wrapper opcional para o padrão acima.
- `src/components/ui/TwoCol.tsx` — grid responsivo `1 → 2 colunas`.

## Header (Layout.tsx)

- Altura: `h-14 sm:h-16 md:h-20`.
- Logo: `w-8 sm:w-10 md:w-12`.
- Busca: input visível em `md+`; em mobile usa **ícone + overlay fullscreen**.
- Banner de suporte sticky com `top` ajustado ao header responsivo.

## Dashboard

- Métricas em **grid 2×2 em mobile** (decisão do produto), `4×1` em md+.
- Botões de ação com `flex-wrap` (não rolagem horizontal).
- Blocos do sistema de cards: alturas livres em mobile (sem `h-fixed`).
- Calendário: dias com `min-h-[44px]`.

## DateRangeFilter

- Mobile: chips em **scroll horizontal com snap** (`overflow-x-auto snap-x`).
- `sm+`: `flex-wrap` em múltiplas linhas.

## Checklist de QA

Em **375 / 768 / 1280**, verificar:

- [ ] Sem scroll horizontal em nenhuma página.
- [ ] Header não congestiona — logo, busca, perfil acessíveis.
- [ ] Todos os modais abrem como bottom sheet em mobile.
- [ ] Forms dentro de modais empilham em 1 coluna em mobile.
- [ ] Botões clicáveis ≥ 44×44 px.
- [ ] Bottom navigation não cobre conteúdo (uso de `pb-20 md:pb-6`).
- [ ] Dark mode preservado.
- [ ] PWA install funciona.

## Páginas migradas

- ✅ Layout (header + busca overlay)
- ✅ Dashboard (ações, métricas, calendário, blocos)
- ✅ DateRangeFilter (scroll snap)
- ✅ Vendas (6 modais)
- ✅ Agenda (modal detalhe)
- ✅ Clientes (Novo, CSV)
- ✅ Financeiro (Entrada/Saída, Conta Bancária)
- ✅ Usuarios (modal + actions 44px)
- ✅ Configuracoes (Preview PDF)
- N/A Servicos (form inline)
