import numpy as np
from sentence_transformers import SentenceTransformer
from .database import get_supabase
from .models import Paper

class SearchEngine:
    def __init__(self, model_dir: str, per_page: int = 20):
        self.per_page = per_page
        self.model    = SentenceTransformer(model_dir, device="cpu")

    # ---------- helpers -------------------------------------------------- #
    def _embed_literal(self, text: str) -> str:
        vec = self.model.encode(text).astype(np.float32)
        return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"

    # ---------- API pubblico --------------------------------------------- #
    def search(self, query: str, page: int = 1):
        limit_n  = self.per_page + 1
        offset_n = (page - 1) * self.per_page

        rows = get_supabase().rpc("search_papers", {
            "q": query,
            "q_emb": self._embed_literal(query),
            "limit_n": limit_n,
            "offset_n": offset_n
        }).execute().data

        has_next = len(rows) > self.per_page
        if has_next:
            rows = rows[:-1]

        total = rows[0]["totale"] if rows else 0
        papers = [Paper(id=r["id"], title=r["title"], abstract=r["abstract"],
                        authors=r["authors"], published_date=r["published_date"],
                        score=r["score"]) for r in rows]
        return papers, total, has_next
