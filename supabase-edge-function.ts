// ============================================
// Supabase Edge Function: process-scheduled-dispatches
// Processa disparos agendados e envia para n8n
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Webhook do n8n
    const WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || 
      'https://n8n-perettasautomacoes.sj4zt4.easypanel.host/webhook/67ad9e32-16dc-4d57-9508-82cc9431f413'

    console.log('🔄 Iniciando processamento de disparos agendados...')

    // 1. Buscar disparos prontos para executar
    const { data: dispatches, error: fetchError } = await supabase
      .from('dispatches_ready_to_execute')
      .select('*')
      .limit(50) // Processar no máximo 50 por vez

    if (fetchError) {
      throw new Error(`Erro ao buscar disparos: ${fetchError.message}`)
    }

    if (!dispatches || dispatches.length === 0) {
      console.log('✅ Nenhum disparo pronto para executar')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum disparo pronto',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📦 ${dispatches.length} disparo(s) encontrado(s)`)

    const results = []

    // 2. Processar cada disparo
    for (const dispatch of dispatches) {
      console.log(`\n📤 Processando disparo: ${dispatch.id} - ${dispatch.nome}`)

      try {
        // 2.1 Tentar adquirir lock
        const { data: lockData, error: lockError } = await supabase
          .rpc('acquire_dispatch_lock', {
            dispatch_uuid: dispatch.id,
            executor_id: 'edge-function-scheduler'
          })

        if (lockError || !lockData) {
          console.log(`⚠️ Não foi possível adquirir lock para ${dispatch.id}`)
          results.push({
            id: dispatch.id,
            nome: dispatch.nome,
            status: 'skipped',
            reason: 'lock_failed'
          })
          continue
        }

        console.log(`🔒 Lock adquirido para ${dispatch.id}`)

        // 2.2 Montar payload para n8n
        const payload = {
          tipo: 'producao',
          disparo_id: dispatch.id,
          nome: dispatch.nome,
          mensagem: dispatch.mensagem,
          data: dispatch.data_agendamento,
          hora: dispatch.hora_agendamento,
          timestamp: new Date().toISOString(),
          tem_media: !!dispatch.media_url,
          scheduled_execution: true, // Flag para indicar que veio do agendamento
          executor: 'edge-function-scheduler'
        }

        // Adicionar mídia se existir
        if (dispatch.media_url) {
          payload.media = {
            url: dispatch.media_url,
            type: dispatch.media_type,
            caption: dispatch.media_caption || dispatch.mensagem
          }
        }

        console.log(`📡 Enviando para n8n:`, payload)

        // 2.3 Enviar para n8n
        const webhookResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const webhookSuccess = webhookResponse.ok

        console.log(`📥 Resposta do webhook: ${webhookResponse.status}`)

        // 2.4 Registrar log de execução
        await supabase
          .from('dispatch_execution_logs')
          .insert({
            dispatch_id: dispatch.id,
            execution_status: webhookSuccess ? 'completed' : 'failed',
            attempt_number: dispatch.execution_attempts || 1,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            success: webhookSuccess,
            error_message: webhookSuccess ? null : `HTTP ${webhookResponse.status}`,
            webhook_payload: payload,
            webhook_response: {
              status: webhookResponse.status,
              statusText: webhookResponse.statusText
            }
          })

        // 2.5 Marcar como concluído (não aguarda confirmação do n8n)
        await supabase
          .rpc('complete_dispatch_execution', {
            dispatch_uuid: dispatch.id,
            success_flag: webhookSuccess,
            error_msg: webhookSuccess ? null : `Webhook retornou ${webhookResponse.status}`
          })

        console.log(`✅ Disparo ${dispatch.id} processado com sucesso`)

        results.push({
          id: dispatch.id,
          nome: dispatch.nome,
          status: webhookSuccess ? 'sent' : 'failed',
          webhook_status: webhookResponse.status
        })

      } catch (error) {
        console.error(`❌ Erro ao processar ${dispatch.id}:`, error)

        // Marcar como falha
        await supabase
          .rpc('complete_dispatch_execution', {
            dispatch_uuid: dispatch.id,
            success_flag: false,
            error_msg: error.message
          })

        results.push({
          id: dispatch.id,
          nome: dispatch.nome,
          status: 'error',
          error: error.message
        })
      }
    }

    // 3. Limpar locks expirados (manutenção)
    const { data: cleanedCount } = await supabase
      .rpc('cleanup_expired_locks')

    if (cleanedCount && cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} lock(s) expirado(s) limpo(s)`)
    }

    console.log('\n✅ Processamento concluído!')

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: dispatches.length,
        results,
        cleaned_locks: cleanedCount || 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
