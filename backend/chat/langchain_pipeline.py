import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from dotenv import load_dotenv

load_dotenv()

# Load your Google Gemini API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


class AskMyDocsPipeline:
    def __init__(self):
        """Initialize embeddings and model once to reuse."""
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
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
        Step 2: Load FAISS → Query → Get Gemini response
        """
        print(f"[INFO] Querying FAISS index: {pdf_index_path}")
        vectorstore = FAISS.load_local(pdf_index_path, self.embeddings, allow_dangerous_deserialization=True)

        qa = RetrievalQA.from_chain_type(
            llm=self.llm,
            retriever=vectorstore.as_retriever(),
            chain_type="stuff"
        )

        response = qa.invoke({"query": query})
        return response["result"]
