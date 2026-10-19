-- ========================================================
-- Fecha o que sobrou aberto no Storage e na função de admin.
--
-- 1) Políticas antigas do bucket 'img' (criadas pelo script antigo do app) deixavam
--    QUALQUER pessoa, mesmo sem login, enviar, alterar e apagar fotos. As políticas
--    novas (img_select, img_insert, img_update, img_delete) já cobrem tudo:
--    leitura pública, upload só logado, alterar/apagar só o dono ou admin.
-- 2) is_admin() só precisa ser chamável por quem está logado.
-- ========================================================
drop policy if exists "Permitir upload publico de fotos" on storage.objects;
drop policy if exists "Permitir update publico de fotos" on storage.objects;
drop policy if exists "Permitir delete publico de fotos" on storage.objects;
drop policy if exists "Permitir leitura publica de fotos" on storage.objects;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
