-- Auditoria de segurança (M3): garante que o bucket das fotos corporais é privado e só aceita
-- imagens de tamanho razoável. As policies de storage.objects (pasta = auth.uid()) já existem.
-- Se o bucket ainda não existir, ele é criado já privado.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress', 'progress', false, 15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Rollback (volta a aceitar qualquer tipo/tamanho, mantendo privado):
--   UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'progress';
