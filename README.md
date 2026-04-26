# A.T.A Gestão

Plataforma completa de gestão para estética automotiva — agendamentos, vendas, clientes e serviços.

## 🚀 Deploy no Render

### Pré-requisitos
- Conta no [Render](https://render.com)
- Projeto no GitHub
- Supabase configurado

### Passos para Deploy

1. **Configure as variáveis de ambiente no Render:**
   - `VITE_SUPABASE_URL` = URL do seu Supabase
   - `VITE_SUPABASE_ANON_KEY` = Chave anônima do Supabase

2. **Faça push para o GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

3. **No Render:**
   - Clique em "New +" → "Static Site"
   - Conecte seu repositório GitHub
   - Configure:
     - **Build Command**: `npm run build`
     - **Publish Directory**: `dist`
     - **Node Version**: `18` (ou superior)
   - Adicione as variáveis de ambiente
   - Clique em "Create Static Site"

### Deploy Automático
O Render irá:
- Instalar dependências (`npm install`)
- Compilar TypeScript (`tsc`)
- Buildar o app (`vite build`)
- Publicar na URL fornecida

## 🛠️ Desenvolvimento Local

1. **Instale as dependências:**
```bash
npm install
```

2. **Configure o ambiente:**
```bash
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

3. **Inicie o desenvolvimento:**
```bash
npm run dev
```

4. **Build para produção:**
```bash
npm run build
npm run preview
```

## 📁 Estrutura do Projeto

```
ata-gestao/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas principais
│   ├── contexts/       # React Context (Auth, Brand)
│   ├── types/          # Tipos TypeScript
│   └── lib/            # Utilitários (Supabase)
├── public/             # Arquivos estáticos
├── render.yaml         # Configuração do Render
├── vite.config.ts      # Configuração do Vite
└── package.json
```

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Roteamento**: React Router DOM
- **PDF**: jsPDF
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast

## ✅ Funcionalidades

- ✅ Autenticação de usuários
- ✅ Gestão de clientes
- ✅ Agendamentos com status
- ✅ Vendas e pré-vendas (PDF)
- ✅ Serviços cadastrados
- ✅ Checklists personalizados
- ✅ Financeiro (entradas/saídas)
- ✅ Dashboard com métricas
- ✅ Branding personalizado
- ✅ Design responsivo

## 🌐 URLs do Deploy

- **Render**: (configurar URL do deploy)
- **Supabase**: Configure no painel do Supabase

## 📝 Notas Importantes

- O app usa **localStorage** para dados locais (vendas, agendamentos)
- **Supabase** para serviços e autenticação
- **Render** faz deploy automático a cada push
- Build otimizado para produção sem sourcemaps
