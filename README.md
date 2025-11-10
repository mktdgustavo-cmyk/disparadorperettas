# 🚀 Blackout Disparos

Sistema simplificado para agendamento de disparos de mensagens WhatsApp via UAZAPI.

## ✨ Funcionalidades

- ✅ Login/Cadastro simples (apenas email e senha)
- ✅ Criar disparos com mensagem, data e hora
- ✅ Salvar como rascunho
- ✅ Enviar teste (grupo específico)
- ✅ Agendar disparo (envia pro n8n)
- ✅ Listar todos os disparos
- ✅ Editar rascunhos e agendados
- ✅ Excluir disparos

---

## 📦 Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/blackout-disparos.git
cd blackout-disparos
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase/setup.sql`
3. Copie as credenciais:
   - Project URL
   - Anon/Public Key

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
```

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🔧 Build para Produção

```bash
npm run build
```

Os arquivos estarão em `dist/`

---

## 📡 Integração com n8n

### Webhook configurado:

```
URL: https://n8n-perettasautomacoes.sj4zt4.easypanel.host/webhook/67ad9e32-16dc-4d57-9508-82cc9431f413
```

### Payload enviado:

**Teste:**
```json
{
  "tipo": "teste",
  "disparo_id": "uuid",
  "nome": "Nome do Disparo",
  "mensagem": "Texto da mensagem",
  "data": "2025-01-15",
  "hora": "14:30",
  "timestamp": "2025-01-15T14:30:00Z",
  "grupo_teste": "120363422908639132@g.us"
}
```

**Produção:**
```json
{
  "tipo": "producao",
  "disparo_id": "uuid",
  "nome": "Nome do Disparo",
  "mensagem": "Texto da mensagem",
  "data": "2025-01-15",
  "hora": "14:30",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

---

## 🗂️ Estrutura do Projeto

```
blackout-disparos/
├── src/
│   ├── components/
│   │   ├── ui/                      # Componentes UI
│   │   ├── DisparoFormSimple.tsx    # Formulário
│   │   └── DisparoList.tsx          # Lista
│   ├── pages/
│   │   ├── LoginPage.tsx            # Login
│   │   └── DisparosPage.tsx         # Página principal
│   ├── contexts/
│   │   └── AuthContext.tsx          # Autenticação
│   ├── hooks/
│   │   └── use-toast.ts             # Notificações
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts            # Cliente Supabase
│   ├── lib/
│   │   └── utils.ts                 # Utilitários
│   ├── App.tsx                      # Router
│   └── main.tsx                     # Entry point
├── supabase/
│   └── setup.sql                    # SQL do banco
└── package.json
```

---

## 🎯 Como Usar

### Para a Ceci:

1. **Acessar o sistema:**
   - Faça login com email e senha

2. **Criar disparo:**
   - Clique em "Novo Disparo"
   - Preencha: Nome, Mensagem, Data e Hora
   - Escolha:
     - **Enviar Teste** → Envia pro grupo de teste
     - **Salvar Rascunho** → Apenas salva
     - **Agendar Disparo** → Envia pro n8n

3. **Gerenciar disparos:**
   - Ver todos na lista
   - Editar rascunhos/agendados
   - Excluir qualquer um

---

## 🔐 Tabela do Supabase

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | ID do usuário |
| nome | VARCHAR | Nome do disparo |
| mensagem | TEXT | Texto da mensagem |
| data_agendamento | DATE | Data do envio |
| hora_agendamento | TIME | Hora do envio |
| status | VARCHAR | rascunho \| agendado \| enviado |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Última atualização |

---

## 🚢 Deploy

### Opção 1: Vercel

```bash
npm install -g vercel
vercel
```

### Opção 2: Netlify

```bash
npm run build
# Faça upload da pasta dist/
```

### Opção 3: Easypanel (GitHub)

1. Push para o GitHub
2. No Easypanel:
   - Conecte o repositório
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Adicione as variáveis de ambiente

---

## 🆘 Troubleshooting

### "Faltam variáveis de ambiente do Supabase"
- Verifique se o arquivo `.env` existe
- Confirme se as variáveis começam com `VITE_`

### "Não foi possível carregar os disparos"
- Execute o SQL no Supabase
- Verifique se o RLS está habilitado
- Confirme que está logado

### "Webhook não funciona"
- Verifique a URL no arquivo `DisparoFormSimple.tsx`
- Teste manualmente com curl
- Verifique se o n8n está rodando

---

## 📝 Próximas Melhorias (Opcional)

- [ ] Confirmação de status do n8n
- [ ] Histórico detalhado de envios
- [ ] Templates de mensagens
- [ ] Variáveis nas mensagens ({{nome}})
- [ ] Upload de anexos
- [ ] Seletor de grupos (via UAZAPI)

---

## 👤 Desenvolvido por

**Blackout Automações**  
Gustavo Peretta

---

## 📄 Licença

MIT
