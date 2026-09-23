import { ClienteInput } from '../types/cliente';

export const SAMPLE_CLIENTES_CATALOG: ClienteInput[] = [
  {
    nome: 'Carlos Eduardo Silva',
    email: 'carlos.silva@empresa.com.br',
    telefone: '(11) 98765-4321',
    cidade: 'São Paulo',
  },
  {
    nome: 'Mariana Costa Oliveira',
    email: 'mariana.costa@techsolucoes.com',
    telefone: '(21) 99876-5432',
    cidade: 'Rio de Janeiro',
  },
  {
    nome: 'Rodrigo Ferreira Santos',
    email: 'rodrigo.santos@consultoria.com.br',
    telefone: '(31) 98712-3456',
    cidade: 'Belo Horizonte',
  },
  {
    nome: 'Fernanda Lima Rocha',
    email: 'fernanda.rocha@inovadigital.net',
    telefone: '(41) 99123-4567',
    cidade: 'Curitiba',
  },
  {
    nome: 'Lucas Gabriel Mendes',
    email: 'lucas.mendes@agenciacriativa.com',
    telefone: '(51) 98234-5678',
    cidade: 'Porto Alegre',
  },
  {
    nome: 'Juliana Beatriz Ramos',
    email: 'juliana.ramos@logistica.com.br',
    telefone: '(71) 99345-6789',
    cidade: 'Salvador',
  },
  {
    nome: 'Thiago Henrique Martins',
    email: 'thiago.martins@startup.io',
    telefone: '(85) 98456-7890',
    cidade: 'Fortaleza',
  },
  {
    nome: 'Camila Duarte Souza',
    email: 'camila.souza@gestaoempresarial.com.br',
    telefone: '(61) 99567-8901',
    cidade: 'Brasília',
  },
];

export function getRandomSampleCliente(existingEmails: string[] = []): ClienteInput {
  const unused = SAMPLE_CLIENTES_CATALOG.filter(
    (c) => !existingEmails.includes(c.email.toLowerCase())
  );

  if (unused.length > 0) {
    const randomIndex = Math.floor(Math.random() * unused.length);
    return unused[randomIndex];
  }

  // If all are used, generate with random suffix to avoid unique conflicts
  const base = SAMPLE_CLIENTES_CATALOG[Math.floor(Math.random() * SAMPLE_CLIENTES_CATALOG.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  const parts = base.email.split('@');
  return {
    ...base,
    nome: `${base.nome} ${randomNum}`,
    email: `${parts[0]}+${randomNum}@${parts[1]}`,
  };
}
