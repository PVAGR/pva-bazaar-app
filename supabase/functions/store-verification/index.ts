/**
 * Supabase Edge Function: store AI-verification result and return certificate ID.
 * Why (Anti-Druj): Optional alternative to the Express/Mongo verification API.
 *
 * Deploy: supabase functions deploy store-verification
 * Invoke: POST with body { artifactIdOrSlug, is_authentic, confidence_score, status, message?, ... }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCertificateId(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `PVA-CERT-${hex}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const {
      artifactIdOrSlug,
      is_authentic,
      confidence_score,
      computed_hash,
      status,
      message,
      source = 'ci',
      matched_entry,
    } = body;

    if (
      !artifactIdOrSlug ||
      typeof is_authentic !== 'boolean' ||
      typeof confidence_score !== 'number'
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'artifactIdOrSlug, is_authentic, and confidence_score are required.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!['verified', 'integrity_compromised', 'unknown', 'error'].includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid status.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const certificateId = generateCertificateId();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('verification_results').insert({
      certificate_id: certificateId,
      artifact_id_or_slug: String(artifactIdOrSlug),
      is_authentic,
      confidence_score,
      computed_hash: computed_hash || null,
      status,
      message: message || null,
      source,
      matched_entry: matched_entry || null,
      verified_at: new Date().toISOString(),
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        certificateId,
        verified_at: new Date().toISOString(),
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
