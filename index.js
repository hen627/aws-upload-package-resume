import { config } from "dotenv";
import { supabase } from "./supabase.js";
config();
import OpenAI from 'openai';
import AWS from 'aws-sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});

// use this to split up the text that we want to store in vector DB into chunks
function createChunks(inputText, chunksize) {
  const chunks = [];
  let i = 0;
  while (i < inputText.length) {
    chunks.push(inputText.slice(i, i + chunksize));
    i += chunksize;
  }
  return chunks;
}

// turn chunks into vector data
function embedText(inputText) {
  try {
    var result = "";
    return new Promise((resolve) => {
      openai
        .embeddings.create({
          model: "text-embedding-ada-002",
          input: inputText,
        })
        .then((res) => {
          result = res.data[0].embedding; // custom
        });
      setTimeout(() => {
        resolve(result);
      }, 2000);
    });
  } catch (error) {
    console.error(error);
  }
}

async function searchVectorInSupabase(embedding) {
  try {
    // Construct the SQL query to search for vector
    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: embedding, // pass vector that I want to compare
      match_treshold: 0.85, // approximate comparison
      match_count: 1, // choose the number of matches to return.
    });

    console.log(documents);
    console.log("hello");
    return documents;
  } catch (error) {
    console.error("Error executing search query:", error);
  }
}

async function GetInputQueryAndSearchVectorDB(query) {
  try {
    console.log(query);
    // Embed query and convert to vector
    const embedding = await embedText(query);
    console.log("entered main function");
    // Search vector in Supabase
    const result = await searchVectorInSupabase(embedding);
    console.log("finished search");

    if (Array.isArray(result) && result.length === 0) {
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are pretending to be a virtual version of the human being named Henry Elias as you answer questions about as human-like as possible. Try to end your responses asking the user if there is anything else they want to know about you.' },
          {
            role: 'assistant',
            content: `This is the question asked: ${query}. If the question is in a language other than english answer them in the same language they asked and tell them in that language you only support english. Only If the question is in english let the user know that you do not know the answer to their question yet, but the real Henry Elias has been notified and will teach it to the virtual Henry Elias in the near future. A side note is that if the question is general and doesn't require any knowledge about Henry Elias's preferences you can answer it while skipping the part about letting the user know.`
          }
        ],
        model: 'gpt-3.5-turbo',
      });

      console.log(chatCompletion.choices);

      const snsTopicArn = process.env.SNS_TOPIC_ARN;

      await new AWS.SNS().publish({
        TopicArn: snsTopicArn,
        Message: query,
      }).promise();
      return chatCompletion.choices;
    } else {
      // Use the 'result' here or return it to the calling code
      // console.log("Search Result:", result);
      // return result;
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are pretending to be a virtual version of the human being named Henry Elias, as you answer questions as human-like as possible.' },
          {
            role: 'assistant',
            content: `answer ${query} with the following in a human-like way, do not ask the user any questions though and only use the answer part of the following when forming your answer: ${result[0].content}`
          }
        ],
        model: 'gpt-3.5-turbo',
      })
      return chatCompletion.choices;
    }
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error to propagate it further if needed
  }
}

const commonHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Origin': 'https://hen627.github.io',
  'Access-Control-Allow-Methods': '*',
};

export async function handler(event, context) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      // Handle preflight OPTIONS request
      return {
        statusCode: 200,
        headers: commonHeaders,
        body: '',
      };
    }
    // Handle the actual POST request
    const requestBody = JSON.parse(typeof event.body === 'string' ? event.body : '{}');
    const question = requestBody.question;
    const chatresult = await GetInputQueryAndSearchVectorDB(question);
    console.log(chatresult);
    return {
      statusCode: 200,
      headers: commonHeaders,
      body: JSON.stringify({ chatresult }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
