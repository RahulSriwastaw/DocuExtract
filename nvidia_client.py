import openai

client = openai.OpenAI(
    api_key='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',
    base_url='https://integrate.api.nvidia.com/v1',
)
 
async def main():
    completion = await client.chat.completions.create(
        model="deepseek-ai/deepseek-v3.2",
        messages=[{"role":"user","content":"Hello! How can I help you today?"}],
        temperature=1,
        top_p=0.95,
        max_tokens=8192,
        chat_template_kwargs={"thinking":True},
        stream=True
    )
   
    async for chunk in completion:
        reasoning = chunk.choices[0]?.delta?.reasoning_content
        if reasoning:
            print(reasoning, end='', flush=True)
        content = chunk.choices[0]?.delta?.content or ''
        print(content, end='', flush=True)
  
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
