-- ========================================================
-- Anúncios de exemplo (DEMONSTRAÇÃO)
-- Rode no Supabase > SQL Editor (executa como postgres, ignora a RLS).
-- Pode ser rodado mais de uma vez: usa ids fixos e "on conflict do nothing".
--
-- Para remover tudo depois (anúncios, fotos e matches saem em cascata):
--   delete from public.profiles where id like 'demo-%';
-- ========================================================

-- Perfis fictícios donos dos anúncios (profiles.id é texto e não depende do Auth)
insert into public.profiles (id, nome, avatar_url, cidade) values
  ('demo-ana',    'Ana Ribeiro',   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80', 'São Luis do Paraitinga - SP'),
  ('demo-carlos', 'Carlos Mendes', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'São Luis do Paraitinga - SP'),
  ('demo-marina', 'Marina Alves',  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80', 'São Luis do Paraitinga - SP'),
  ('demo-joao',   'João Batista',  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80', 'São Luis do Paraitinga - SP')
on conflict (id) do nothing;

-- Anúncios: SALE = à venda, WANTED = procurando
insert into public.listings (id, user_id, type, title, description, category_id, price, condition, status, created_at, updated_at) values
  -- À venda
  ('00000000-0000-4000-8000-000000000001', 'demo-carlos', 'SALE', 'Bicicleta aro 29 com 21 marchas',
   'Quadro de alumínio, freios a disco, pneus novos. Usada pouco, só em passeios. Aceito proposta.',
   'cat-veiculos', 650, 'USED', 'ACTIVE', now() - interval '2 hours', now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000002', 'demo-ana', 'SALE', 'Sofá de 3 lugares cinza',
   'Tecido suede, muito confortável, sem rasgos nem manchas. Retirar no centro.',
   'cat-moveis', 480, 'USED', 'ACTIVE', now() - interval '5 hours', now() - interval '5 hours'),
  ('00000000-0000-4000-8000-000000000003', 'demo-marina', 'SALE', 'iPhone 11 128GB',
   'Bateria com 87% de saúde, tela sem riscos, acompanha carregador e capa. Desbloqueado.',
   'cat-eletronicos', 1350, 'USED', 'ACTIVE', now() - interval '9 hours', now() - interval '9 hours'),
  ('00000000-0000-4000-8000-000000000004', 'demo-joao', 'SALE', 'Violão acústico com capa',
   'Cordas de aço, afinação perfeita. Ótimo para quem está começando.',
   'cat-outros', 380, 'USED', 'ACTIVE', now() - interval '1 day', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000005', 'demo-carlos', 'SALE', 'Furadeira de impacto 650W',
   'Funcionando perfeitamente, com maleta e jogo de brocas. Uso doméstico.',
   'cat-ferramentas', 220, 'USED', 'ACTIVE', now() - interval '1 day 4 hours', now() - interval '1 day 4 hours'),
  ('00000000-0000-4000-8000-000000000006', 'demo-joao', 'SALE', 'Égua mangalarga marchador',
   'Mansa, vacinada e com documentação em dia. Ideal para passeio e cavalgada.',
   'cat-animais', 6800, 'USED', 'ACTIVE', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000007', 'demo-ana', 'SALE', 'Filhotes de labrador',
   'Ninhada de 6 filhotes, vermifugados e com primeira vacina. Pais no local.',
   'cat-animais', 900, 'NEW', 'ACTIVE', now() - interval '2 days 6 hours', now() - interval '2 days 6 hours'),
  ('00000000-0000-4000-8000-000000000008', 'demo-marina', 'SALE', 'Jaqueta de couro tamanho M',
   'Couro legítimo, forro interno impecável. Usada poucas vezes.',
   'cat-roupas', 180, 'USED', 'ACTIVE', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000009', 'demo-carlos', 'SALE', 'Bola de futsal oficial',
   'Nunca usada, ainda na embalagem.',
   'cat-esportes', 70, 'NEW', 'ACTIVE', now() - interval '3 days 8 hours', now() - interval '3 days 8 hours'),
  ('00000000-0000-4000-8000-000000000010', 'demo-ana', 'SALE', 'Notebook Core i5, 8GB, SSD 256GB',
   'Ótimo para estudo e trabalho. Bateria dura cerca de 4 horas. Acompanha carregador.',
   'cat-eletronicos', 1800, 'USED', 'ACTIVE', now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000011', 'demo-joao', 'SALE', 'Mesa de madeira maciça com 6 cadeiras',
   'Madeira de demolição, muito resistente. Retirada por conta do comprador.',
   'cat-moveis', 700, 'USED', 'ACTIVE', now() - interval '5 days', now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000012', 'demo-marina', 'SALE', 'Fiat Uno 1.0 2012, completo',
   'Único dono, revisões em dia, pneus novos. Documentação ok.',
   'cat-veiculos', 21500, 'USED', 'ACTIVE', now() - interval '6 days', now() - interval '6 days'),
  -- Procurando (geram matches com os anúncios acima)
  ('00000000-0000-4000-8000-000000000013', 'demo-marina', 'WANTED', 'Procuro violão para iniciante',
   'Pode ser usado, desde que esteja afinando bem.',
   'cat-outros', 300, 'ANY', 'ACTIVE', now() - interval '3 hours', now() - interval '3 hours'),
  ('00000000-0000-4000-8000-000000000014', 'demo-ana', 'WANTED', 'Procuro furadeira ou parafusadeira',
   'Preciso para pequenos reparos em casa.',
   'cat-ferramentas', 200, 'ANY', 'ACTIVE', now() - interval '7 hours', now() - interval '7 hours'),
  ('00000000-0000-4000-8000-000000000015', 'demo-joao', 'WANTED', 'Procuro geladeira em bom estado',
   'Duplex, de preferência branca. Retiro no local.',
   'cat-moveis', 600, 'ANY', 'ACTIVE', now() - interval '1 day 2 hours', now() - interval '1 day 2 hours'),
  ('00000000-0000-4000-8000-000000000016', 'demo-carlos', 'WANTED', 'Procuro celular Android até R$ 800',
   'Com boa câmera e bateria. Aceito usado.',
   'cat-eletronicos', 800, 'ANY', 'ACTIVE', now() - interval '2 days 3 hours', now() - interval '2 days 3 hours'),
  ('00000000-0000-4000-8000-000000000017', 'demo-ana', 'WANTED', 'Procuro bicicleta infantil aro 16',
   'Para criança de 5 anos. Pode ter marcas de uso.',
   'cat-esportes', 250, 'ANY', 'ACTIVE', now() - interval '4 days 5 hours', now() - interval '4 days 5 hours')
on conflict (id) do nothing;

-- Fotos dos anúncios à venda (URLs públicas do Unsplash)
insert into public.listing_images (listing_id, image_url)
select v.listing_id::uuid, v.image_url
from (values
  ('00000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=1000&auto=format&fit=crop&q=80'),
  ('00000000-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&auto=format&fit=crop&q=80')
) as v(listing_id, image_url)
where not exists (
  select 1 from public.listing_images li
  where li.listing_id = v.listing_id::uuid and li.image_url = v.image_url
);
