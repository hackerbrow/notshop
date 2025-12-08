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

    const { listing_id } = await req.json()

    if (!listing_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'İlan ID gerekli' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get listing
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ success: false, error: 'İlan bulunamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (listing.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Bu ilan aktif değil' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (listing.user_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kendi ilanınızı satın alamazsınız' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get buyer's wallet
    const { data: buyerWallet, error: buyerWalletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (buyerWalletError || !buyerWallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cüzdan bulunamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const listingPrice = Number(listing.price)
    const buyerBalance = Number(buyerWallet.balance || 0)

    if (buyerBalance < listingPrice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Yetersiz bakiye' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get seller's wallet
    const { data: sellerWallet, error: sellerWalletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', listing.user_id)
      .single()

    if (sellerWalletError || !sellerWallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Satıcı cüzdanı bulunamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.user_id,
        listing_id: listing.id,
        amount: listingPrice,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sipariş oluşturulamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Deduct from buyer
    const { error: deductError } = await supabaseClient
      .from('wallets')
      .update({ 
        balance: buyerBalance - listingPrice,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (deductError) {
      // Rollback order
      await supabaseClient.from('orders').delete().eq('id', order.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Bakiye düşürülemedi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Add to seller
    const sellerBalance = Number(sellerWallet.balance || 0)
    const { error: addError } = await supabaseClient
      .from('wallets')
      .update({ 
        balance: sellerBalance + listingPrice,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', listing.user_id)

    if (addError) {
      // Rollback
      await supabaseClient
        .from('wallets')
        .update({ balance: buyerBalance })
        .eq('user_id', user.id)
      await supabaseClient.from('orders').delete().eq('id', order.id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'Satıcı bakiyesi güncellenemedi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update listing status to sold
    await supabaseClient
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id)

    // Update seller's total sales
    const { data: sellerProfile } = await supabaseClient
      .from('profiles')
      .select('total_sales')
      .eq('id', listing.user_id)
      .single()

    if (sellerProfile) {
      await supabaseClient
        .from('profiles')
        .update({ total_sales: (sellerProfile.total_sales || 0) + 1 })
        .eq('id', listing.user_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Satın alma başarılı!',
        order_id: order.id
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