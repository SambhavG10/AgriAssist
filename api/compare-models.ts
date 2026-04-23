import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import stringSimilarity from 'string-similarity';

// Initialize AI Clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    const tasks = [];

    // 1. OpenAI (GPT-4o)
    if (openai) {
      tasks.push(
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }).then(res => ({ model: "GPT-4o", output: res.choices[0].message.content || "" }))
          .catch(err => ({ model: "GPT-4o", error: err.message }))
      );
    }

    // 2. Gemini (1.5 Flash)
    if (genAI) {
      tasks.push(
        genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
          .generateContent(prompt)
          .then(res => ({ model: "Gemini Flash", output: res.response.text() }))
          .catch(err => ({ model: "Gemini Flash", error: err.message }))
      );
    }

    // 3. Anthropic (Claude 3.5 Sonnet)
    if (anthropic) {
      tasks.push(
        anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }).then(res => ({ model: "Claude 3.5", output: (res.content[0] as any).text }))
          .catch(err => ({ model: "Claude 3.5", error: err.message }))
      );
    }

    if (tasks.length === 0) {
      res.status(500).json({ error: 'No AI models configured. Please check server API keys.' });
      return;
    }

    const results = await Promise.allSettled(tasks);
    const outputs = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .filter(r => !r.error && r.output);

    // Calculate Metrics
    const metrics = [];
    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        const score = stringSimilarity.compareTwoStrings(outputs[i].output, outputs[j].output);
        metrics.push({
          pair: `${outputs[i].model} vs ${outputs[j].model}`,
          similarity: score.toFixed(2)
        });
      }
    }

    // Judge (using OpenAI if available)
    let judgeResult = null;
    const judgeClient = openai;

    if (judgeClient && outputs.length > 0) {
        const formattedOutputs = outputs.map((m, i) => 
            `[Model ${i+1} (${m.model})]:\n${m.output}\n---`
        ).join('\n');

        const judgePrompt = `
            You are an expert evaluator. I will provide a User Prompt and multiple Model Outputs.
            
            Your task is to:
            1. Evaluate each output for Accuracy, Clarity, and Completeness.
            2. Rank them from best (1) to worst.
            3. Provide a short reason for the winner.
            
            USER PROMPT: "${prompt}"
            
            ${formattedOutputs}
            
            Return your response in pure JSON format like this:
            {
            "rankings": [
                { "rank": 1, "model": "Model Name", "score": 9.5, "reason": "..." },
                { "rank": 2, "model": "Model Name", "score": 8.0, "reason": "..." }
            ],
            "best_model": "Model Name",
            "summary": "Brief comparison summary."
            }
        `;

        try {
            const response = await judgeClient.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: "You are a helpful AI judge. Output JSON only." }, { role: "user", content: judgePrompt }],
                response_format: { type: "json_object" }
            });
            judgeResult = JSON.parse(response.choices[0].message.content || "{}");
        } catch (e) {
            console.error("Judge failed:", e);
        }
    }

    res.json({
        outputs,
        metrics,
        judgeResult
    });

  } catch (error) {
    console.error('Comparison Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
