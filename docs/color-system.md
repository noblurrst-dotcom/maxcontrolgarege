# Sistema de cores — A.T.A Gestão

Documento de referência para os tokens de cor, regras de uso e como
adicionar novos componentes preservando contraste.

## Filosofia

1. **Marca é configurável**, semântica é fixa. O usuário escolhe
   `cor_primaria` e `cor_secundaria`; cores de status (sucesso, erro,
   aviso, info) NUNCA mudam.
2. **Contraste é responsabilidade do sistema**, não do componente. Em
   vez de usar `text-white` ou `text-dark-900` em cima de cor de marca,
   use `text-on-primary` / `text-on-secondary` — o token é recalculado
   automaticamente para passar WCAG AA (4.5:1).
3. **Superfícies em camadas**: 0 (página), 1 (cards), 2 (modais), 3
   (hover). Trocam automaticamente entre claro e escuro.

## Categorias de tokens

### Marca (derivados)
| Token | O que é | Exemplo de uso |
|-------|---------|----------------|
| `primary-50…900` | Paleta gerada do `cor_primaria` | `bg-primary-500` |
| `primary-hover` | Versão hover (auto: ±8% L) | `hover:bg-primary-hover` |
| `primary-active` | Pressed | `active:bg-primary-active` |
| `primary-disabled` | Misturado com surface | `disabled:bg-primary-disabled` |
| `primary-contrast` | Variante ajustada se < AA com surface | borda/uso decorativo |
| `secondary-50…900` | Paleta de `cor_secundaria` | header, badge dark |
| `text-on-primary` | Texto sobre primary-500 (auto preto/branco/ajustado) | `bg-primary-500 text-on-primary` |
| `text-on-secondary` | Idem para secondary | `bg-secondary-500 text-on-secondary` |

### Superfícies (light/dark sensitive)
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `surface-0` | `#f5f5f5` | `#0f0f1a` | fundo da página |
| `surface-1` | `#ffffff` | `#1a1a2e` | cards |
| `surface-2` | `#ffffff` | `#232340` | modais, dropdowns |
| `surface-3` | `#f8fafc` | `#2a2a4a` | hover/elevation |
| `text-on-surface` | `#0f172a` | `#f1f5f9` | texto principal |
| `text-on-surface-muted` | `#475569` | `#94a3b8` | metadata |
| `border-token` | `#e5e7eb` | `#2a2a4a` | divisores |

### Semânticos (FIXOS — mesmos hex em todos modos)
| Token | Família Tailwind | Uso típico |
|-------|------------------|------------|
| `success-*` | green | pago, receita, confirmação |
| `warning-*` | amber | pendência, alerta, baixo contraste |
| `danger-*` | red | erro, cancelado, exclusão |
| `info-*` | blue | parcial, dica, informativo |
| `neutral-*` | slate | cortesia, neutro, divisor |

**Regra de shade por modo:**
- Light: texto/ícone usa `*-600` ou `*-700`; fundo de badge usa `*-50` ou `*-100`.
- Dark: texto/ícone usa `*-400`; fundo de badge usa `*-900/30`.

Exemplo de status-badge robusto:
```tsx
<span className="bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 px-2 py-1 rounded-full">
  Pago
</span>
```

## Receitas comuns

### Botão primário
```tsx
<button className="bg-primary-500 hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled text-on-primary px-4 py-2 rounded-xl">
  Confirmar
</button>
```

### Header escuro
```tsx
<header className="bg-secondary-500 text-on-secondary">…</header>
```

### Badge de status
```tsx
const STATUS = {
  pago:      'bg-success-50 text-success-700',
  pendente:  'bg-warning-50 text-warning-700',
  cancelado: 'bg-danger-50 text-danger-700',
  parcial:   'bg-info-50 text-info-700',
  cortesia:  'bg-neutral-100 text-neutral-700',
}
```

### Card
```tsx
<div className="bg-surface-1 text-on-surface border border-token rounded-2xl p-4">
  <h3 className="text-on-surface">Título</h3>
  <p className="text-on-surface-muted">Subtítulo</p>
</div>
```

## Garantias de contraste (WCAG)

A função `applyBrandColors` em `src/contexts/BrandContext.tsx`:

1. Gera palette `primary-50…900` e `secondary-50…900` mantendo matiz/saturação.
2. Calcula `--color-on-primary` via `getReadableTextColor(primary-500)` que escolhe entre `#000` e `#fff` priorizando ratio ≥ 4.5.
3. Se a melhor escolha não atinge AA, chama `adjustForContrast` (escurece/clareia em passos de 5%) até passar.
4. Calcula `hover` (escurece 8% se primary é claro; clareia se é escuro), `active` (escurece +4% adicional), `disabled` (mistura 60% com surface).
5. Repete o ciclo para `secondary` e para o par `primary ↔ surface-1` (gera `--color-primary-contrast`).
6. Em dark mode, recalcula tudo contra surfaces escuras.

## Quando NÃO usar tokens de marca

- Logos / SVGs do brand book — manter hex.
- PDFs gerados (jsPDF) — manter hex direto a partir de `brand.cor_*`.
- Estados puramente decorativos sem texto em cima.

## Adicionando uma nova cor semântica

Não fazer ad-hoc. Se precisar de nova categoria (ex: `accent`), adicionar:
1. Paleta em `src/styles/semantic-colors.css` (50→900).
2. Token em `tailwind.config.js`.
3. Documentar regra de uso aqui.

## Verificação automatizada

```bash
# Listar usos hardcoded sobre fundos de marca
grep -rn "bg-primary.*text-(white|black|dark-900)" src/

# Listar text-white / text-black sem aura semântica
grep -rn "text-white\|text-black\|text-dark-900" src/
```

Resultado esperado pós-refactor: zero ocorrências em cima de
`bg-primary-*` ou `style={{ backgroundColor: brand.cor_* }}`.
