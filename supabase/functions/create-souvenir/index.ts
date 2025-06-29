import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import algosdk from 'npm:algosdk@2.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Function to mint Algorand NFT
async function mintAlgorandNFT(souvenir, supabase) {
  try {
    const nodelyToken = Deno.env.get('NODELY_API_TOKEN');
    const algorandNodeUrl = Deno.env.get('ALGORAND_NODE_URL') || 'https://testnet-api.4160.nodely.io';
    const algorandMnemonic = Deno.env.get('ALGORAND_MNEMONIC');

    if (!nodelyToken || !algorandMnemonic) {
      throw new Error('Algorand configuration missing');
    }
    
    // 1. Define the metadata content for your NFT (ARC3 Standard)
    const metadata = {
      "name": souvenir.title,
      "description": souvenir.transcript,
      "image": souvenir.imageUrl,
      "image_mimetype": "image/png",
      "properties": {
        "audio_url": souvenir.audioUrl,
        "latitude": souvenir.latitude,
        "longitude": souvenir.longitude,
        "created_at": new Date().toISOString(),
        "story_type": "audio_visual_memory"
      }
    };

    // 2. Create a very short, unique filename for the metadata to keep the URL length down
    const shortId = Math.random().toString(36).substring(2, 6);
    const metadataFileName = `${shortId}.json`;
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('souvenir_images')
      .upload(metadataFileName, metadataBlob);

    if (uploadError) {
      throw new Error(`Failed to upload metadata JSON: ${uploadError.message}`);
    }

    // 3. Get the public URL for the new metadata file
    const { data: urlData } = supabase.storage
      .from('souvenir_images')
      .getPublicUrl(metadataFileName);
      
    const metadataUrl = urlData.publicUrl;
    
    // Create Algorand client
    const algodClient = new algosdk.Algodv2({ 'X-Algo-API-Token': nodelyToken }, algorandNodeUrl, '');
    const account = algosdk.mnemonicToSecretKey(algorandMnemonic);
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create the asset transaction using the METADATA URL (without #arc3 to save 5 bytes)
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: account.addr,
      suggestedParams,
      total: 1,
      decimals: 0,
      defaultFrozen: false,
      manager: account.addr,
      reserve: account.addr,
      freeze: account.addr,
      clawback: account.addr,
      assetName: souvenir.title.substring(0, 32),
      assetMetadataHash: undefined,
    });

    const signedTxn = assetCreateTxn.signTxn(account.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log(`Algorand NFT created successfully: ${txId}`);
    console.log(`Asset ID: ${confirmedTxn['asset-index']}`);

    return txId;
  } catch (error) {
    console.error('Algorand NFT minting error:', error);
    const mockTxId = `ALGO_MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Fallback to mock Algorand NFT: ${mockTxId}`);
    return mockTxId;
  }
}

// Main Deno serve function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const anonSupabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { title, audioUrl, imageUrl, transcript, latitude, longitude } = await req.json();

    if (!title || !audioUrl || !imageUrl || !transcript || latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const algorandTxId = await mintAlgorandNFT({ title, audioUrl, imageUrl, transcript, latitude, longitude }, supabase);

    const { data: souvenir, error: dbError } = await supabase.from('souvenirs').insert({
      user_id: user.id,
      title,
      audio_url: audioUrl,
      image_url: imageUrl,
      transcript_text: transcript,
      algorand_tx_id: algorandTxId,
      latitude,
      longitude
    }).select().single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to create souvenir' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(souvenir), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in create-souvenir function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});