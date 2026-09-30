# Migrations pendentes (NÃO aplicadas)

Estas migrations saíram da auditoria de segurança (`SECURITY_AUDIT.md`). Elas ficam **fora** de
`supabase/migrations/` de propósito, para que nenhum sync da Lovable nem `supabase db push`
as aplique sem revisão.

Para aplicar: teste antes no projeto de TESTE, depois mova o arquivo para `supabase/migrations/`
(mantendo o nome) e aplique pelo fluxo normal. O passo a passo está no relatório.

| Arquivo | Achado | O que faz |
|---|---|---|
| `20260930120000_lock_profiles_premium.sql` | M2 | impede que o usuário mude `profiles.is_premium` |
| `20260930120100_harden_progress_bucket.sql` | M3 | bucket `progress` privado, até 15 MB, só imagens |
| `20260930120200_progress_photos_same_owner.sql` | B10 | foto só pode apontar para um `weight_log` do mesmo dono |
