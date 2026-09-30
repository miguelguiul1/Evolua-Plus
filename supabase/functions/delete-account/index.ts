import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!)
  const token = authHeader.replace('Bearer ', '')

  // getUser() verifica a assinatura do token no servidor de auth (não apenas decodifica).
  const { data, error: userError } = await anon.auth.getUser(token)
  if (userError || !data?.user?.id) return json({ error: 'Unauthorized' }, 401)

  // O ID vem SEMPRE do token verificado — nunca do corpo da requisição.
  const userId = data.user.id

  const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 1. Arquivos privados no Storage (pasta do próprio usuário).
    // Remove em lotes até esvaziar a pasta; qualquer erro aborta antes de apagar o banco,
    // para não sobrar foto no bucket sem conta dona.
    for (let batch = 0; batch < 100; batch++) {
      const { data: files, error: listError } = await admin.storage.from('progress').list(userId, { limit: 1000 })
      if (listError) throw new Error(`storage list: ${listError.message}`)
      if (!files?.length) break
      const { error: removeError } = await admin.storage.from('progress').remove(files.map((f) => `${userId}/${f.name}`))
      if (removeError) throw new Error(`storage remove: ${removeError.message}`)
    }

    // 2. Registros relacionados
    const tables = [
      'progress_photos', 'food_log', 'water_log', 'weight_log', 'scan_history',
      'chat_messages', 'ai_insights', 'ai_memory', 'food_favorites',
      'user_preferences', 'user_goals', 'meal_plans', 'global_favorites', 'user_routine_profile',
      'user_consents',
    ]
    for (const t of tables) {
      const { error } = await admin.from(t).delete().eq('user_id', userId)
      // Tabela ainda não criada (migration não aplicada) não deve abortar a exclusão.
      // Postgres responde 42P01; o PostgREST, PGRST205 ("schema cache").
      const missingTable = error && (error.code === 'PGRST205' || error.code === '42P01' ||
        /relation .* does not exist|schema cache/i.test(error.message))
      if (error && !missingTable) throw new Error(`${t}: ${error.message}`)
    }
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileError) throw new Error(`profiles: ${profileError.message}`)

    // 3. Usuário de autenticação (invalida todas as sessões)
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) throw new Error(`auth: ${authError.message}`)

    return json({ success: true })
  } catch (e) {
    console.error('delete-account failed', e)
    return json({ error: 'Falha ao excluir a conta' }, 500)
  }
})
