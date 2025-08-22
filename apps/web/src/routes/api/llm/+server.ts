import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Import environment variables server-side
import { 
  VITE_ANTHROPIC_API_KEY,
  VITE_OPENAI_API_KEY,
  VITE_FIREWORKS_API_KEY
} from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { model, messages, stream } = await request.json();
    
    // Determine which API to call based on model
    let apiResponse;
    
    if (model.includes('claude')) {
      // Anthropic API
      apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          stream: false
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`Anthropic API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      return json({
        content: data.content[0].text,
        model: data.model
      });
      
    } else if (model.includes('gpt')) {
      // OpenAI API
      apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          stream: false
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      return json({
        content: data.choices[0].message.content,
        model: data.model
      });
      
    } else {
      // Fireworks API
      apiResponse = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VITE_FIREWORKS_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          stream: false
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`Fireworks API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      return json({
        content: data.choices[0].message.content,
        model: data.model
      });
    }
    
  } catch (error) {
    console.error('LLM API error:', error);
    return json(
      { error: error.message || 'Failed to process LLM request' },
      { status: 500 }
    );
  }
};