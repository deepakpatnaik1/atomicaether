import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Import environment variables server-side
import { 
  VITE_ANTHROPIC_API_KEY,
  VITE_OPENAI_API_KEY,
  VITE_FIREWORKS_API_KEY
} from '$env/static/private';

/**
 * Format messages with images for Anthropic API
 */
function formatAnthropicMessages(messages: any[], fileUrls: string[]) {
  const formattedMessages = [...messages];
  
  // If there are images, update the last user message to include them
  if (fileUrls && fileUrls.length > 0) {
    const lastUserMsgIndex = formattedMessages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex !== -1) {
      const content = [];
      
      // Add the text content
      content.push({
        type: 'text',
        text: formattedMessages[lastUserMsgIndex].content
      });
      
      // Add each image
      for (const url of fileUrls) {
        // Check if it's a base64 URL or regular URL
        if (url.startsWith('data:')) {
          // Extract base64 data and media type
          const matches = url.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mediaType = matches[1];
            const data = matches[2];
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: data
              }
            });
          }
        } else {
          // Regular URL
          content.push({
            type: 'image',
            source: {
              type: 'url',
              url: url
            }
          });
        }
      }
      
      // Replace the message content with the structured content
      formattedMessages[lastUserMsgIndex] = {
        ...formattedMessages[lastUserMsgIndex],
        content
      };
    }
  }
  
  return formattedMessages;
}

/**
 * Format messages with images for OpenAI API
 */
function formatOpenAIMessages(messages: any[], fileUrls: string[]) {
  const formattedMessages = [...messages];
  
  // If there are images, update the last user message to include them
  if (fileUrls && fileUrls.length > 0) {
    const lastUserMsgIndex = formattedMessages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex !== -1) {
      const content = [];
      
      // Add the text content
      content.push({
        type: 'text',
        text: formattedMessages[lastUserMsgIndex].content
      });
      
      // Add each image
      for (const url of fileUrls) {
        content.push({
          type: 'image_url',
          image_url: {
            url: url
          }
        });
      }
      
      // Replace the message content with the structured content
      formattedMessages[lastUserMsgIndex] = {
        ...formattedMessages[lastUserMsgIndex],
        content
      };
    }
  }
  
  return formattedMessages;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { model, messages, stream, fileUrls } = await request.json();
    
    // Handle streaming requests
    if (stream) {
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let apiResponse;
            
            if (model.includes('claude')) {
              // Anthropic API streaming
              const formattedMessages = formatAnthropicMessages(messages, fileUrls);
              
              apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': VITE_ANTHROPIC_API_KEY,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model,
                  messages: formattedMessages,
                  max_tokens: 4096,
                  stream: true
                })
              });
            } else if (model.includes('gpt')) {
              // OpenAI API streaming
              const formattedMessages = formatOpenAIMessages(messages, fileUrls);
              
              apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${VITE_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model,
                  messages: formattedMessages,
                  max_tokens: 4096,
                  stream: true
                })
              });
            } else {
              // Fireworks API streaming
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
                  stream: true
                })
              });
            }
            
            if (!apiResponse.ok) {
              const error = await apiResponse.text();
              controller.enqueue(new TextEncoder().encode(`data: {"error": "${error}"}\n\n`));
              controller.close();
              return;
            }
            
            const reader = apiResponse.body?.getReader();
            if (!reader) {
              controller.enqueue(new TextEncoder().encode(`data: {"error": "No response body"}\n\n`));
              controller.close();
              return;
            }
            
            // Forward the SSE stream
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Forward the raw SSE data
              controller.enqueue(value);
            }
            
            controller.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Stream failed';
            controller.enqueue(new TextEncoder().encode(`data: {"error": "${errorMessage}"}\n\n`));
            controller.close();
          }
        }
      });
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    
    // Non-streaming requests (existing code)
    let apiResponse;
    
    if (model.includes('claude')) {
      // Anthropic API
      const formattedMessages = formatAnthropicMessages(messages, fileUrls);
      
      apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
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
      const formattedMessages = formatOpenAIMessages(messages, fileUrls);
      
      apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
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
      // Fireworks API (usually doesn't support images directly)
      // Just send text messages for now
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to process LLM request';
    return json(
      { error: errorMessage },
      { status: 500 }
    );
  }
};