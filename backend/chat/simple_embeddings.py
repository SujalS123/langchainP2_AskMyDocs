"""
Simple TF-IDF based embeddings - No API needed, completely free
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import pickle

class SimpleTFIDFEmbeddings:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.vectors = None
        self.texts = None
    
    def embed_documents(self, texts):
        self.texts = texts
        self.vectors = self.vectorizer.fit_transform(texts)
        return self.vectors.toarray()
    
    def embed_query(self, query):
        return self.vectorizer.transform([query]).toarray()[0]
    
    def similarity_search(self, query, k=3):
        query_vec = self.embed_query(query)
        similarities = cosine_similarity([query_vec], self.vectors)[0]
        top_indices = np.argsort(similarities)[-k:][::-1]
        return [self.texts[i] for i in top_indices]