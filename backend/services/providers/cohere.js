/* Cohere Provider */
const axios = require('axios');
const id='cohere',name='Cohere API',envKeyName='COHERE_API_KEY';
const models=['command-r','command-r-plus','command','command-light'];
function getEnvKey(){return process.env.COHERE_API_KEY||'';}
async function chat({message,systemPrompt,chatHistory=[],apiKey}){
  const model=process.env.COHERE_MODEL||'command-r';
  const chatHist=chatHistory.slice(-10).map(h=>({role:h.role==='user'?'USER':'CHATBOT',message:h.content}));
  const {data}=await axios.post('https://api.cohere.ai/v1/chat',
    {model,message,preamble:systemPrompt||undefined,chat_history:chatHist,max_tokens:4096,temperature:0.7},
    {headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:60000});
  return data.text||'';
}
async function testConnection(apiKey){
  const {data}=await axios.post('https://api.cohere.ai/v1/chat',
    {model:'command-r',message:'Say "Connected" in one word.',max_tokens:10},
    {headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:10000});
  return{model:'command-r',message:'Connected to Cohere API'};
}
module.exports={id,name,envKeyName,models,getEnvKey,chat,testConnection};
