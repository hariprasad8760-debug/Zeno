/* OpenRouter Provider */
const axios = require('axios');
const id='openrouter',name='OpenRouter API',envKeyName='OPENROUTER_API_KEY';
const models=['mistralai/mistral-7b-instruct','meta-llama/llama-3-8b-instruct','anthropic/claude-3-haiku','google/gemma-7b-it'];
function getEnvKey(){return process.env.OPENROUTER_API_KEY||'';}
async function chat({message,systemPrompt,chatHistory=[],apiKey}){
  const model=process.env.OPENROUTER_MODEL||'mistralai/mistral-7b-instruct';
  const msgs=[];
  if(systemPrompt)msgs.push({role:'system',content:systemPrompt});
  for(const h of chatHistory.slice(-10))msgs.push({role:h.role,content:h.content});
  msgs.push({role:'user',content:message});
  const {data}=await axios.post('https://openrouter.ai/api/v1/chat/completions',
    {model,messages:msgs,max_tokens:4096},
    {headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','HTTP-Referer':'http://localhost:3000','X-Title':'Zeno AI'},timeout:60000});
  return data.choices?.[0]?.message?.content||'';
}
async function testConnection(apiKey){
  const {data}=await axios.get('https://openrouter.ai/api/v1/models',{headers:{Authorization:`Bearer ${apiKey}`},timeout:10000});
  return{model:'mistral-7b',message:`Connected. ${data.data?.length} models available.`};
}
module.exports={id,name,envKeyName,models,getEnvKey,chat,testConnection};
