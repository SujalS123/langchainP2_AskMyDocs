import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
# Lightweight embedding alternative
try:
    from sentence_transformers import SentenceTransformer
    USE_SENTENCE_TRANSFORMERS = True
except ImportError:
    from langchain_huggingface import HuggingFaceEmbeddings
    USE_SENTENCE_TRANSFORMERS = False
from langchain.chains import RetrievalQA
from dotenv import load_dotenv

load_dotenv()

# Load your Google Gemini API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


class AskMyDocsPipeline:
    def __init__(self):
        """Initialize embeddings and model once to reuse."""
        # Use lighter embedding model for deployment
        if USE_SENTENCE_TRANSFORMERS:
            self.embeddings = SentenceTransformer('all-MiniLM-L6-v2')
        else:
            self.embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2"
            )
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            temperature=0.2,
            google_api_key=GOOGLE_API_KEY
        )

    def process_pdf(self, pdf_path: str):
        """
        Step 1: Load PDF → Split → Embed → Store in FAISS
        """
        print(f"[INFO] Loading PDF: {pdf_path}")
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_documents(documents)
        print(f"[INFO] Split into {len(chunks)} chunks")

        # Create FAISS vector store
        vectorstore = FAISS.from_documents(chunks, self.embeddings)

        # Save locally for reuse
        index_path = f"{pdf_path}_faiss"
        vectorstore.save_local(index_path)
        print(f"[INFO] Saved FAISS index at: {index_path}")
        return index_path

    def query_pdf(self, pdf_index_path: str, query: str):
        """
        Step 2: Load FAISS → Query → Get Gemini response with citations
        """
        print(f"[INFO] Querying FAISS index: {pdf_index_path}")
        vectorstore = FAISS.load_local(pdf_index_path, self.embeddings, allow_dangerous_deserialization=True)
        
        # Get relevant documents with similarity search
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        docs = retriever.get_relevant_documents(query)
        
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
