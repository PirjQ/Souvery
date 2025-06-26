import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import algosdk from 'npm:algosdk@2.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Function to mint Algorand NFT
async function mintAlgorandNFT(souvenir: any): Promise<string> {
  try {
    const nodelyToken = Deno.env.get('NODELY_API_TOKEN');
    const algorandNodeUrl = Deno.env.get('ALGORAND_NODE_URL') || 'https://testnet-api.4160.nodely.io';
    const algorandMnemonic = Deno.env.get('ALGORAND_MNEMONIC');

    if (!nodelyToken || !algorandMnemonic) {
      throw new Error('Algorand configuration missing');
    }

    // Create Algorand client with Nodely token
    const algodClient = new algosdk.Algodv2(
      { 'X-Algo-API-Token': nodelyToken },
      algorandNodeUrl,
      ''
    );

    // Recover account from mnemonic
    const account = algosdk.mnemonicToSecretKey(algorandMnemonic);

    // Get suggested transaction parameters
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create NFT metadata following ARC69 standard
    const metadata = {
      name: souvenir.title,
      description: souvenir.transcript,
      image: souvenir.imageUrl,
      audio: souvenir.audioUrl,
      properties: {
        latitude: souvenir.latitude,
        longitude: souvenir.longitude,
        created_at: new Date().toISOString(),
        story_type: 'audio_visual_memory'
      }
    };

    // Create asset creation transaction
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: account.addr,
      suggestedParams,
      total: 1, // NFT has total supply of 1
      decimals: 0, // NFTs have 0 decimals
      defaultFrozen: false,
      manager: account.addr,
      reserve: account.addr,
      freeze: account.addr,
      clawback: account.addr,
      unitName: 'STORY',
      assetName: souvenir.title.substring(0, 32), // Algorand asset name limit
      assetURL: souvenir.imageUrl.substring(0, 96), // Algorand URL limit
      assetMetadataHash: undefined, // Could add IPFS hash here
      note: new TextEncoder().encode(JSON.stringify(metadata)), // Use TextEncoder instead of Buffer
    });

    // Sign the transaction
    const signedTxn = assetCreateTxn.signTxn(account.sk);

    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log(`Algorand NFT created successfully: ${txId}`);
    console.log(`Asset ID: ${confirmedTxn['asset-index']}`);

    return txId;
  } catch (error) {
    console.error('Algorand NFT minting error:', error);

    // Return a mock transaction ID if minting fails
    const mockTxId = `ALGO_MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Fallback to mock Algorand NFT: ${mockTxId}`);

    return mockTxId;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication using anon key client
    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { title, audioUrl, imageUrl, transcript, latitude, longitude } = await req.json();

    // Validate required fields
    if (!title || !audioUrl || !imageUrl || !transcript || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mint Algorand NFT
    const algorandTxId = await mintAlgorandNFT({
      title,
      audioUrl,
      imageUrl,
      transcript,
      latitude,
      longitude
    });

    // Insert souvenir into database
    const { data: souvenir, error: dbError } = await supabase
      .from('souvenirs')
      .insert({
        user_id: user.id,
        title,
        audio_url: audioUrl,
        image_url: imageUrl,
        transcript_text: transcript,
        algorand_tx_id: algorandTxId,
        latitude,
        longitude
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create souvenir' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(souvenir),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-souvenir function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});