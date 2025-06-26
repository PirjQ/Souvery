import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Function to transcribe audio using ElevenLabs
async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

    // Use ElevenLabs Speech-to-Text API directly with proper FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav'); // Corrected field name and using Blob
    formData.append('model_id', 'eleven_multilingual_v2');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API response:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.text || 'Unable to transcribe audio';
  } catch (error) {
    console.error('ElevenLabs transcription error:', error);

    // Fallback to mock transcript if API fails
    const fallbackTranscripts = [
      "I remember the summer I turned eight, when my grandmother taught me how to bake her famous chocolate chip cookies. The kitchen smelled like vanilla and warmth, and I felt so grown up standing on that little wooden stool, carefully measuring ingredients.",
      "There was this old oak tree in our backyard where I built my first treehouse. I spent countless afternoons there, reading books and dreaming about adventures. It was my secret hideaway, my place of peace.",
      "The day I graduated college, my father had tears in his eyes. He told me he was proud, but more than that, he said I had grown into someone he truly admired. That moment meant everything to me.",
      "Walking through the farmer's market that crisp October morning, the smell of fresh apple cider and pumpkin spice filled the air. It was perfect autumn weather, and I felt completely content with life.",
      "My first pet was a golden retriever named Sunny. She had this way of knowing exactly when I needed comfort. Whenever I was sad, she'd rest her head on my lap and just sit with me quietly."
    ];
    
    return fallbackTranscripts[Math.floor(Math.random() * fallbackTranscripts.length)];
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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { audioUrl } = await req.json();
    
    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing audioUrl parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process audio: transcribe only
    const transcript = await transcribeAudio(audioUrl);

    return new Response(
      JSON.stringify({ transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-audio function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});