-- DMTech Security Hardening — Fase 3
-- RPC lockdown: revoke anon + search_path travado

-- ============================================================
-- 1. REVOKE de anon em todas as RPCs SECURITY DEFINER
--    (anon não usa nenhuma dessas diretamente)
-- ============================================================
revoke execute on function public.admin_delete_company(uuid)                                               from anon;
revoke execute on function public.admin_get_company(uuid)                                                  from anon;
revoke execute on function public.admin_get_company_members(uuid)                                          from anon;
revoke execute on function public.admin_list_companies()                                                   from anon;
revoke execute on function public.admin_list_upgrade_requests()                                            from anon;
revoke execute on function public.admin_update_company_config(uuid, jsonb, numeric, numeric, integer)      from anon;
revoke execute on function public.admin_update_plan(uuid, text, uuid)                                      from anon;
revoke execute on function public.create_company_with_owner(text, text)                                    from anon;
revoke execute on function public.dm_excluir_os(uuid, uuid)                                                from anon;
revoke execute on function public.dm_proximo_numero_os(uuid)                                               from anon;
revoke execute on function public.dm_recalcular_total_os(uuid, uuid)                                       from anon;
revoke execute on function public.dm_salvar_os_com_itens(uuid, uuid, jsonb, jsonb)                         from anon;
revoke execute on function public.rls_auto_enable()                                                        from anon;
revoke execute on function public.save_company_calc_params(jsonb, numeric, numeric, integer)               from anon;
revoke execute on function public.update_member_pix_key(uuid, text)                                        from anon;
revoke execute on function public.update_member_profile(uuid, text, text, numeric, numeric)                from anon;
revoke execute on function public.update_member_salary(uuid, numeric)                                      from anon;

-- Mantém anon nestas (usadas em RLS ou acesso público intencional):
-- auth_company_id(), get_my_company_id(), is_platform_admin() → helpers de RLS
-- tv_get_board(text) → TV pública (autenticada por token próprio)

-- ============================================================
-- 2. GRANT explícito para authenticated nas RPCs do front
-- ============================================================
grant execute on function public.admin_delete_company(uuid)                                                to authenticated;
grant execute on function public.admin_get_company(uuid)                                                   to authenticated;
grant execute on function public.admin_get_company_members(uuid)                                           to authenticated;
grant execute on function public.admin_list_companies()                                                    to authenticated;
grant execute on function public.admin_list_upgrade_requests()                                             to authenticated;
grant execute on function public.admin_update_company_config(uuid, jsonb, numeric, numeric, integer)       to authenticated;
grant execute on function public.admin_update_plan(uuid, text, uuid)                                       to authenticated;
grant execute on function public.create_company_with_owner(text, text)                                     to authenticated;
grant execute on function public.dm_excluir_os(uuid, uuid)                                                 to authenticated;
grant execute on function public.dm_proximo_numero_os(uuid)                                                to authenticated;
grant execute on function public.dm_recalcular_total_os(uuid, uuid)                                        to authenticated;
grant execute on function public.dm_salvar_os_com_itens(uuid, uuid, jsonb, jsonb)                          to authenticated;
grant execute on function public.rls_auto_enable()                                                         to authenticated;
grant execute on function public.save_company_calc_params(jsonb, numeric, numeric, integer)                to authenticated;
grant execute on function public.update_member_pix_key(uuid, text)                                         to authenticated;
grant execute on function public.update_member_profile(uuid, text, text, numeric, numeric)                 to authenticated;
grant execute on function public.update_member_salary(uuid, numeric)                                       to authenticated;

-- ============================================================
-- 3. Travar search_path nas RPCs mutáveis
-- ============================================================
alter function public.admin_delete_company(uuid)                                              set search_path = public, pg_temp;
alter function public.admin_list_companies()                                                  set search_path = public, pg_temp;
alter function public.admin_list_upgrade_requests()                                           set search_path = public, pg_temp;
alter function public.admin_update_plan(uuid, text, uuid)                                     set search_path = public, pg_temp;
alter function public.dm_excluir_os(uuid, uuid)                                               set search_path = public, pg_temp;
alter function public.dm_proximo_numero_os(uuid)                                              set search_path = public, pg_temp;
alter function public.dm_recalcular_total_os(uuid, uuid)                                      set search_path = public, pg_temp;
alter function public.dm_salvar_os_com_itens(uuid, uuid, jsonb, jsonb)                        set search_path = public, pg_temp;
alter function public.get_my_company_id()                                                     set search_path = public, pg_temp;
