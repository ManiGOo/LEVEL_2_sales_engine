import chromadb
from app.config import get_settings

settings = get_settings()

_client = None


def get_client() -> chromadb.HttpClient:
    global _client
    if _client is None:
        _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    return _client


def _get_collection():
    client = get_client()
    return client.get_or_create_collection(
        name="conversations",
        metadata={"hnsw:space": "cosine"},
    )


def store_message(
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
):
    collection = _get_collection()
    doc_id = f"{user_id}:{conversation_id}:{role}:{hash(content)}"

    # Truncate very long messages for embedding
    text = content[:2000] if len(content) > 2000 else content

    collection.upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[{
            "user_id": user_id,
            "conversation_id": conversation_id,
            "role": role,
        }],
    )


def retrieve_context(user_id: str, query: str, n_results: int = 5) -> str:
    collection = _get_collection()

    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"user_id": user_id},
        )
    except Exception:
        return ""

    if not results or not results.get("documents"):
        return ""

    docs = results["documents"][0]
    metas = results["metadatas"][0] if results.get("metadatas") else []

    lines = []
    for doc, meta in zip(docs, metas):
        role = meta.get("role", "unknown")
        lines.append(f"[{role}]: {doc}")

    return "\n".join(lines)
