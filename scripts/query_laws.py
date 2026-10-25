import sys
import json
import os
import chromadb
from chromadb.utils import embedding_functions

def query_laws(query_text, jurisdiction=None, n_results=3):
    CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_data")
    client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_PATH))
    
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    collection = client.get_collection(name="environmental_laws", embedding_function=ef)
    
    where_clause = None
    if jurisdiction and jurisdiction.lower() != 'all':
        where_clause = {"jurisdiction": jurisdiction}
        
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=where_clause
    )
    
    output = []
    if results and "documents" in results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            output.append({
                "document": doc,
                "metadata": meta
            })
            
    print(json.dumps(output))

if __name__ == "__main__":
    query_text = sys.argv[1] if len(sys.argv) > 1 else ""
    jurisdiction = sys.argv[2] if len(sys.argv) > 2 else None
    query_laws(query_text, jurisdiction)
