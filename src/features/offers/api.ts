import { supabase } from '../../lib/supabase';

export type CreateOfferInput = {
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  message?: string;
};

export async function createOrGetConversationWith(targetUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_or_get_private_conversation', {
    p_target_user: targetUserId,
  });
  if (error) throw error;
  if (!data) throw new Error('Failed to create chat conversation');
  return data as string;
}

export async function createOffer(input: CreateOfferInput) {
  const conversationId = await createOrGetConversationWith(input.sellerId);

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      listing_id: input.listingId,
      buyer_id: input.buyerId,
      farmer_id: input.sellerId,
      offer_price: input.price,
      quantity: input.quantity,
      message: input.message?.trim() || `Offer for quantity ${input.quantity}`,
      status: 'pending',
      conversation_id: conversationId,
    } as any)
    .select('*')
    .single();

  if (offerError) throw offerError;

  const messageText = `Offer: Rs ${input.price} | Qty: ${input.quantity}`;

  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: input.buyerId,
    content: messageText,
    message_type: 'offer',
    offer_id: offer.id,
  } as any);

  if (messageError) throw messageError;

  return offer;
}

export async function updateOfferStatus(offerId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed') {
  const { data, error } = await supabase
    .from('offers')
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq('id', offerId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getOfferById(offerId: string) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function recordPayment(params: {
  offerId: string;
  payerId: string;
  amount: number;
  transactionRef?: string;
  screenshotUrl?: string;
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      offer_id: params.offerId,
      payer_id: params.payerId,
      amount: params.amount,
      status: 'submitted',
      transaction_ref: params.transactionRef || null,
      screenshot_url: params.screenshotUrl || null,
    } as any)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function buildUpiLink(amount: number, note: string) {
  const upiId = import.meta.env.VITE_UPI_ID || 'merchantupi@bank';
  const appName = import.meta.env.VITE_APP_NAME || 'KisanMandi';
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(appName)}&am=${encodeURIComponent(
    amount.toFixed(2)
  )}&cu=INR&tn=${encodeURIComponent(note)}`;
}

