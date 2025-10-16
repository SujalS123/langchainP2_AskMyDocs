import os
from langchain.text_splitter import RecursiveCharacterTextSplitter
import PyPDF2
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import re
from collections import Counter
import math
import pickle

load_dotenv()

# Load API keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


class AskMyDocsPipeline:
    def __init__(self):
        """Initialize embeddings and model once to reuse."""
        # Use simple text matching - no ML dependencies
        self.chunks = None
        self.chunk_texts = None
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            temperature=0.2,
            google_api_key=GOOGLE_API_KEY
        )

    def process_pdf(self, pdf_path: str):
        """
        Step 1: Load PDF → Split → Embed → Store in TF-IDF
        """
        print(f"[INFO] Loading PDF: {pdf_path}")
        # Use PyPDF2 directly to avoid langchain-community issues
        documents = []
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                documents.append(type('Document', (), {
                    'page_content': text,
                    'metadata': {'source': pdf_path, 'page': i}
                })())

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_documents(documents)
        print(f"[INFO] Split into {len(chunks)} chunks")

        # Save chunks for simple text search
        chunk_texts = [chunk.page_content for chunk in chunks]
        self.chunks = chunks
        self.chunk_texts = chunk_texts
        
        # Save locally for reuse
        index_path = f"{pdf_path}_simple.pkl"
        with open(index_path, 'wb') as f:
            pickle.dump({
                'chunks': chunks,
                'chunk_texts': chunk_texts
            }, f)
        print(f"[INFO] Saved simple index at: {index_path}")
        return index_path

    def query_pdf(self, pdf_index_path: str, query: str):
        """
        Step 2: Load TF-IDF → Query → Get Gemini response with citations
        """
        print(f"[INFO] Querying simple index: {pdf_index_path}")
        
        # Load data
        with open(pdf_index_path, 'rb') as f:
            data = pickle.load(f)
        
        chunks = data['chunks']
        chunk_texts = data['chunk_texts']
        
        # Simple keyword matching
        query_words = set(query.lower().split())
        scores = []
        for i, text in enumerate(chunk_texts):
            text_words = set(text.lower().split())
            score = len(query_words.intersection(text_words))
            scores.append((score, i))
        
        # Get top 3 matches
        scores.sort(reverse=True)
        docs = [chunks[i] for _, i in scores[:3]]
        
        # Create context with page numbers
        context = ""
        sources = []
        for i, doc in enumerate(docs):
            page_num = doc.metadata.get('page', 'Unknown')
            context += f"[Source {i+1} - Page {page_num}]: {doc.page_content}\n\n"
            sources.append({"page": page_num, "content": doc.page_content[:200] + "..."})
        
        # Create prompt with citations
        prompt = f"""
        Based on the following context, answer the question and include citations in your response.
        Use [Source X] format to cite your sources.
        
        Context:
        {context}
        
        Question: {query}
        
        Answer with citations:
        """
        
        response = self.llm.invoke(prompt)
        
        return {
            "answer": response.content,
            "sources": sources
        }