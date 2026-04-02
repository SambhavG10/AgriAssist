import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Make sure to create a .env file with your Supabase URL, Service Role Key, and OpenAI API Key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
  throw new Error("Supabase URL, Service Role Key, or OpenAI API Key is missing from .env file");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// A simple delay function to avoid hitting rate limits
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function generateAndStoreEmbeddings() {
  console.log("Starting to generate and store embeddings...");

  // Process knowledge base articles
  console.log("\nProcessing knowledge base articles...");
  const { data: articles, error: articlesError } = await supabase
    .from('knowledge_base_articles')
    .select('id, content')
    .is('embedding', null); // Only process articles without an embedding

  if (articlesError) {
    console.error("Error fetching articles:", articlesError);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log("No new knowledge base articles to process.");
  } else {
    for (const article of articles) {
      try {
        console.log(`Generating embedding for article ID: ${article.id}`);
        const { data: embeddingData, error: functionError } = await supabase.functions.invoke('generate-embeddings', {
          body: { text: article.content },
        });

        if (functionError) throw functionError;

        const { error: updateError } = await supabase
          .from('knowledge_base_articles')
          .update({ embedding: embeddingData.embedding })
          .eq('id', article.id);

        if (updateError) throw updateError;

        console.log(`Successfully stored embedding for article ID: ${article.id}`);
        await delay(500); // Wait half a second before the next request
      } catch (e) {
        console.error(`Failed to process article ID ${article.id}:`, e);
      }
    }
  }

  // Process FAQs
  console.log("\nProcessing FAQs...");
  const { data: faqs, error: faqsError } = await supabase
    .from('faqs')
    .select('id, question, answer')
    .is('embedding', null); // Only process FAQs without an embedding

  if (faqsError) {
    console.error("Error fetching FAQs:", faqsError);
    return;
  }

  if (!faqs || faqs.length === 0) {
    console.log("No new FAQs to process.");
  } else {
    for (const faq of faqs) {
      try {
        // Combine question and answer for a richer embedding
        const textToEmbed = `Question: ${faq.question}\nAnswer: ${faq.answer}`;
        
        console.log(`Generating embedding for FAQ ID: ${faq.id}`);
        const { data: embeddingData, error: functionError } = await supabase.functions.invoke('generate-embeddings', {
          body: { text: textToEmbed },
        });

        if (functionError) throw functionError;

        const { error: updateError } = await supabase
          .from('faqs')
          .update({ embedding: embeddingData.embedding })
          .eq('id', faq.id);

        if (updateError) throw updateError;

        console.log(`Successfully stored embedding for FAQ ID: ${faq.id}`);
        await delay(500); // Wait half a second before the next request
      } catch (e) {
        console.error(`Failed to process FAQ ID ${faq.id}:`, e);
      }
    }
  }

  console.log("\nFinished generating and storing embeddings.");
}

generateAndStoreEmbeddings();
