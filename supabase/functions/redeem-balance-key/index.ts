import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { key_code } = await req.json()

    if (!key_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Key kodu gerekli' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find the balance key
    const { data: balanceKey, error: keyError } = await supabaseClient
      .from('balance_keys')
      .select('*')
      .eq('code', key_code.trim().toUpperCase())
      .single()

    if (keyError || !balanceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Geçersiz key kodu' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (balanceKey.is_used) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bu key daha önce kullanılmış' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cüzdan bulunamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update wallet balance
    const newBalance = (wallet.balance || 0) + balanceKey.amount
    const { error: updateWalletError } = await supabaseClient
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (updateWalletError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bakiye güncellenemedi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Mark key as used
    const { error: markUsedError } = await supabaseClient
      .from('balance_keys')
      .update({ 
        is_used: true, 
        used_by: user.id, 
        used_at: new Date().toISOString() 
      })
      .eq('id', balanceKey.id)

    if (markUsedError) {
      // Rollback wallet update
      await supabaseClient
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('user_id', user.id)

      return new Response(
        JSON.stringify({ success: false, error: 'Key kullanılamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `₺${balanceKey.amount} bakiyenize eklendi!`,
        new_balance: newBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Bir hata oluştu' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})