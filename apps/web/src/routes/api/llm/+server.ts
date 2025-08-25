import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

// Import environment variables server-side
import { 
  VITE_ANTHROPIC_API_KEY,
  VITE_OPENAI_API_KEY,
  VITE_FIREWORKS_API_KEY
} from '$env/static/private';

// Machine trim configuration
let machineTrimConfig: any = null;

async function loadMachineTrimConfig() {
  if (!machineTrimConfig) {
    try {
      const configPath = path.join(process.cwd(), '../..', 'aetherVault/config/machineTrim.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      machineTrimConfig = JSON.parse(configData);
    } catch (error) {
      console.warn('Failed to load machine trim config:', error);
      machineTrimConfig = { enabled: false };
    }
  }
  return machineTrimConfig;
}

function generateMachineTrimPrompt(config: any): string {
  if (!config.enabled) return '';
  
  return `

=== MACHINE TRIM INSTRUCTIONS ===

You must respond in JSON format with this exact structure:
{
  "fullResponse": "your detailed conversational response with full markdown formatting (use **bold**, *italic*, code blocks, lists, etc. as appropriate)",
  "trim": "compressed version following the format: Boss: [user message]\\nSamara: [your compressed response]",
  "metadata": {
    "hasDecisions": boolean,
    "isInferable": boolean, 
    "priority": "high|medium|low"
  }
}

COMPRESSION RULES:
- Preserve semantic meaning while removing redundancy
- Use proper punctuation and sentence structure
- Include both user message and your response in trim
- Mark pure acknowledgments as [INFERABLE - NOT STORED]
- Use [INFERABLE] for obvious connecting phrases only

ALWAYS PRESERVE (never mark inferable):
${config.alwaysPreserve?.map((rule: string) => `- ${rule}`).join('\n') || '- Decisions and conclusions\n- Factual information\n- Insights and realizations'}

INFERABILITY GUIDELINES:
${config.inferabilityGuidelines?.map((rule: string) => `- ${rule}`).join('\n') || '- When uncertain, preserve content'}

PRIORITY HIERARCHY: Life decisions (high) > Work decisions (medium) > Technical details (low) > Social pleasantries (low)

Example responses:
${JSON.stringify(config.examples?.[0]?.expectedOutput || {}, null, 2)}`;
}

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
    
    // Load machine trim configuration
    const config = await loadMachineTrimConfig();
    
    // Add machine trim instructions 
    let enhancedMessages = [...messages];
    let systemPrompt = '';
    
    if (config.enabled) {
      const machinePrompt = generateMachineTrimPrompt(config);
      
      // For Anthropic, extract system messages and combine them
      if (model.includes('claude')) {
        const systemMsgIndex = enhancedMessages.findIndex(m => m.role === 'system');
        if (systemMsgIndex !== -1) {
          systemPrompt = enhancedMessages[systemMsgIndex].content + machinePrompt;
          enhancedMessages.splice(systemMsgIndex, 1); // Remove system message from messages array
        } else {
          systemPrompt = machinePrompt.trim();
        }
      } else {
        // For OpenAI/Fireworks, add system message to messages array
        const systemMsgIndex = enhancedMessages.findIndex(m => m.role === 'system');
        if (systemMsgIndex !== -1) {
          enhancedMessages[systemMsgIndex].content += machinePrompt;
        } else {
          enhancedMessages.unshift({
            role: 'system',
            content: machinePrompt.trim()
          });
        }
      }
    }
    
    // Handle streaming requests
    if (stream) {
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let apiResponse;
            
            if (model.includes('claude')) {
              // Anthropic API streaming with machine trim
              const formattedMessages = formatAnthropicMessages(enhancedMessages, fileUrls);
              
              const requestBody: any = {
                model,
                messages: formattedMessages,
                max_tokens: 4096,
                stream: true
              };
              
              // Add system prompt if we have one
              if (systemPrompt) {
                requestBody.system = systemPrompt;
              }
              
              apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': VITE_ANTHROPIC_API_KEY,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
              });
            } else if (model.includes('gpt')) {
              // OpenAI API streaming with machine trim
              const formattedMessages = formatOpenAIMessages(enhancedMessages, fileUrls);
              
              // GPT-5 requires max_completion_tokens instead of max_tokens
              const useNewParam = model === 'gpt-5';
              
              apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${VITE_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model,
                  messages: formattedMessages,
                  ...(useNewParam ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
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
                  messages: enhancedMessages,
                  max_tokens: 4096,
                  stream: true
                })
              });
            }
            
            if (!apiResponse.ok) {
              const error = await apiResponse.text();
              // Properly escape the error message for JSON
              const escapedError = JSON.stringify(error);
              controller.enqueue(new TextEncoder().encode(`data: {"error": ${escapedError}}\n\n`));
              controller.close();
              return;
            }
            
            const reader = apiResponse.body?.getReader();
            if (!reader) {
              controller.enqueue(new TextEncoder().encode(`data: {"error": "No response body"}\n\n`));
              controller.close();
              return;
            }
            
            // Collect complete response for machine trim parsing
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const event = JSON.parse(data);
                    
                    if (event.type === 'content_block_delta') {
                      const delta = event.delta?.text || '';
                      fullContent += delta;
                    }
                  } catch (e) {
                    // Continue collecting content
                  }
                }
              }
            }
            
            // Parse machine trim JSON and stream fullResponse
            if (config.enabled && fullContent) {
              console.log('🔍 Attempting to parse machine trim JSON, content length:', fullContent.length);
              console.log('🔍 First 100 chars:', fullContent.substring(0, 100));
              try {
                const parsedResponse = JSON.parse(fullContent);
                console.log('✅ Successfully parsed machine trim JSON');
                if (parsedResponse.fullResponse && parsedResponse.trim && parsedResponse.metadata) {
                  console.log('✅ Valid machine trim structure found');
                  // Send message start event
                  controller.enqueue(new TextEncoder().encode(`data: {"type":"message_start","message":{"role":"assistant","content":[]}}\n\n`));
                  
                  // Send content block start
                  controller.enqueue(new TextEncoder().encode(`data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`));
                  
                  // Stream the fullResponse character by character for smooth effect
                  const responseText = parsedResponse.fullResponse;
                  
                  // Stream content in small character chunks
                  for (let i = 0; i < responseText.length; i += 3) {
                    const chunk = responseText.slice(i, i + 3);
                    const eventData = {
                      type: 'content_block_delta',
                      index: 0,
                      delta: {
                        type: 'text_delta', 
                        text: chunk
                      }
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`));
                  }
                  
                  // Send content block stop
                  controller.enqueue(new TextEncoder().encode(`data: {"type":"content_block_stop","index":0}\n\n`));
                  
                  // Send message stop with machine trim data embedded
                  controller.enqueue(new TextEncoder().encode(`data: {"type":"message_stop","machineTrim":${JSON.stringify(parsedResponse)}}\n\n`));
                  
                } else {
                  throw new Error('Invalid machine trim JSON structure');
                }
              } catch (error) {
                // Fallback: stream raw content if JSON parsing fails
                console.warn('Machine trim JSON parsing failed, streaming raw content:', error);
                controller.enqueue(new TextEncoder().encode(`data: {"type":"content_chunk","chunk":"${fullContent.replace(/"/g, '\\"')}"}\n\n`));
              }
            } else {
              // Stream raw content if machine trim disabled
              controller.enqueue(new TextEncoder().encode(`data: {"type":"content_chunk","chunk":"${fullContent.replace(/"/g, '\\"')}"}\n\n`));
            }
            
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
            
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
      const formattedMessages = formatAnthropicMessages(enhancedMessages, fileUrls);
      
      const requestBody: any = {
        model,
        messages: formattedMessages,
        max_tokens: 4096,
        stream: false
      };
      
      // Add system prompt if we have one
      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }
      
      apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`Anthropic API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      let content = data.content[0].text;
      
      // Parse machine trim JSON if enabled
      let parsedResponse = null;
      if (config.enabled) {
        try {
          parsedResponse = JSON.parse(content);
          // Validate structure
          if (!parsedResponse.fullResponse || !parsedResponse.trim || !parsedResponse.metadata) {
            throw new Error('Invalid machine trim JSON structure');
          }
          // Use the fullResponse as the content for the user
          content = parsedResponse.fullResponse;
        } catch (error) {
          console.warn('Failed to parse machine trim JSON, using raw response:', error);
          // Fallback to raw content if JSON parsing fails
        }
      }
      
      return json({
        content,
        model: data.model,
        machineTrim: parsedResponse
      });
      
    } else if (model.includes('gpt')) {
      // OpenAI API
      const formattedMessages = formatOpenAIMessages(enhancedMessages, fileUrls);
      
      // GPT-5 requires max_completion_tokens instead of max_tokens
      const useNewParam = model === 'gpt-5';
      
      apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          ...(useNewParam ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
          stream: false
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      let content = data.choices[0].message.content;
      
      // Parse machine trim JSON if enabled
      let parsedResponse = null;
      if (config.enabled) {
        try {
          parsedResponse = JSON.parse(content);
          if (!parsedResponse.fullResponse || !parsedResponse.trim || !parsedResponse.metadata) {
            throw new Error('Invalid machine trim JSON structure');
          }
          // Use the fullResponse as the content for the user
          content = parsedResponse.fullResponse;
        } catch (error) {
          console.warn('Failed to parse machine trim JSON, using raw response:', error);
        }
      }
      
      return json({
        content,
        model: data.model,
        machineTrim: parsedResponse
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
          messages: enhancedMessages,
          max_tokens: 4096,
          stream: false
        })
      });
      
      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`Fireworks API error: ${error}`);
      }
      
      const data = await apiResponse.json();
      let content = data.choices[0].message.content;
      
      // Parse machine trim JSON if enabled
      let parsedResponse = null;
      if (config.enabled) {
        try {
          parsedResponse = JSON.parse(content);
          if (!parsedResponse.fullResponse || !parsedResponse.trim || !parsedResponse.metadata) {
            throw new Error('Invalid machine trim JSON structure');
          }
          // Use the fullResponse as the content for the user
          content = parsedResponse.fullResponse;
        } catch (error) {
          console.warn('Failed to parse machine trim JSON, using raw response:', error);
        }
      }
      
      return json({
        content,
        model: data.model,
        machineTrim: parsedResponse
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