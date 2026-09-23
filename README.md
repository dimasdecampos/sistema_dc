# Sistema de Cadastro de Clientes (Supabase + React / Vite + TypeScript)

Sistema completo, moderno e responsivo para gestão e cadastro de clientes, integrado ao **Supabase (PostgreSQL)** com suporte a **Políticas RLS (Row Level Security)**.

---

## 🚀 Funcionalidades

- **CRUD Completo de Clientes**:
  - **Cadastrar**: Nome, E-mail, Telefone/WhatsApp (com máscara automática `(XX) XXXXX-XXXX`) e Cidade.
  - **Listar**: Visualização em tabela (desktop) e cartões dinâmicos (mobile).
  - **Editar**: Atualização de dados cadastrais.
  - **Excluir**: Diálogo de confirmação seguro.
- **Filtros e Busca em Tempo Real**:
  - Busca por nome, e-mail, telefone ou cidade.
  - Filtro por cidade.
  - Ordenação (Mais recentes, Mais antigos, Nome A-Z / Z-A, Cidade).
- **Exportação de Dados**:
  - Exportação instantânea para **CSV (Excel)** e **JSON**.
- **Conexão Dinâmica com Supabase**:
  - Permite configurar a URL do Projeto e a Chave Anon diretamente pela interface ou via variáveis de ambiente (`.env`).
  - Diagnóstico em tempo real da conexão com a tabela e políticas RLS.
  - Modo Demonstração interativo caso o Supabase ainda não tenha sido conectado.
- **Script SQL & RLS Integrado**:
  - Visualizador e botão de 1 clique para copiar o script SQL pronto para o SQL Editor do Supabase.

---

## 🗄️ Estrutura da Tabela no Supabase (`clientes`)

Execute o script abaixo no **SQL Editor** do seu painel do Supabase:

```sql
-- 1. Criar a tabela 'clientes'
create table if not exists public.clientes (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  email text not null,
  telefone text,
  cidade text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar a segurança a nível de linha (RLS)
alter table public.clientes enable row level security;

-- 3. Políticas RLS (Row Level Security)

-- Permitir leitura de todos os registros
create policy "Permitir leitura de clientes"
  on public.clientes for select
  using (true);

-- Permitir cadastro de novos clientes
create policy "Permitir cadastro de novos clientes"
  on public.clientes for insert
  with check (true);

-- Permitir atualização de clientes existentes
create policy "Permitir atualizacao de clientes"
  on public.clientes for update
  using (true)
  with check (true);

-- Permitir exclusão de clientes
create policy "Permitir exclusao de clientes"
  on public.clientes for delete
  using (true);
```

---

## ⚙️ Configuração das Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
```

> *Observação:* Você também pode inserir essas credenciais diretamente pelo botão **Conexão** na barra de navegação da aplicação.

---

## 💻 Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra no navegador em `http://localhost:3000`.

---

## 📦 Como Salvar no GitHub

O repositório Git local já está inicializado no branch `main`. Para publicar no seu GitHub:

1. Crie um novo repositório vazio no [GitHub](https://github.com/new).
2. Execute os seguintes comandos no terminal:

```bash
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git branch -M main
git push -u origin main
```

*(No Google AI Studio, você também pode utilizar o menu superior para exportar diretamente para o GitHub ou baixar o arquivo ZIP).*
