/* Groq Provider — OpenAI-compatible API */
const axios = require('axios');
const id='groq',name='Groq API',envKeyName='GROQ_API_KEY';
const models=['llama-3.1-8b-instant','llama-3.3-70b-versatile','mixtral-8x7b-32768','gemma2-9b-it'];
function getEnvKey(){return process.env.GROQ_API_KEY||'';}
async function chat({message,systemPrompt,chatHistory=[],apiKey}){
  const model=process.env.GROQ_MODEL||'llama-3.1-8b-instant';
  const msgs=[];
  if(systemPrompt)msgs.push({role:'system',content:systemPrompt});
  for(const h of chatHistory.slice(-10))msgs.push({role:h.role,content:h.content});
  msgs.push({role:'user',content:message});
  const {data}=await axios.post('https://api.groq.com/openai/v1/chat/completions',
    {model,messages:msgs,max_tokens:4096,temperature:0.7},
    {headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:60000});
  return data.choices?.[0]?.message?.content||'';
}
async function testConnection(apiKey){
  const {data}=await axios.get('https://api.groq.com/openai/v1/models',{headers:{Authorization:`Bearer ${apiKey}`},timeout:10000});
  return{model:data.data?.[0]?.id||'llama3',message:`Connected. ${data.data?.length} models available.`};
}
module.exports={id,name,envKeyName,models,getEnvKey,chat,testConnection};
