import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    
    const { message, enhancementType = 'improve' } = await request.json();
    console.log('Received message:', message);
    console.log('Enhancement type:', enhancementType);

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use the correct model name format
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    let prompt = '';
    
    switch (enhancementType) {
      case 'grammar':
        prompt = `Fix grammar and spelling errors in this message while keeping the same tone and meaning. Only return the corrected message, nothing else:

"${message}"`;
        break;
      case 'professional':
        prompt = `Make this message more professional and polished while keeping the same meaning. Only return the enhanced message, nothing else:

"${message}"`;
        break;
      case 'casual':
        prompt = `Make this message more casual and friendly while keeping the same meaning. Only return the enhanced message, nothing else:

"${message}"`;
        break;
      case 'clear':
        prompt = `Make this message clearer and more concise while keeping the same meaning. Only return the enhanced message, nothing else:

"${message}"`;
        break;
      default: // 'improve'
        prompt = `Improve this message by fixing grammar, making it clearer, and enhancing readability while keeping the same tone and meaning. Only return the enhanced message, nothing else:

"${message}"`;
    }

    console.log('Using model: gemini-flash-latest');
    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const enhancedMessage = result.response.text().trim();
    console.log('Received response:', enhancedMessage);

    // Remove quotes if the AI added them
    const cleanedMessage = enhancedMessage.replace(/^["']|["']$/g, '');

    return NextResponse.json({ 
      original: message,
      enhanced: cleanedMessage,
      enhancementType
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    return NextResponse.json(
      { error: `Failed to enhance message: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}