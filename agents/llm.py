from langchain_ollama import ChatOllama


llm = ChatOllama(
    model="llama3.2:3b",      # or qwen2.5:7b
    temperature=0,
)