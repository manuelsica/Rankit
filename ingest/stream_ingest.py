# ingest/stream_ingest.py
from __future__ import annotations
from dotenv import load_dotenv; load_dotenv()

import argparse, gc, itertools, os, re, sys, xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Iterable, List

import requests
from requests.adapters import HTTPAdapter, Retry
from requests.exceptions import ReadTimeout                          # 💡
from sentence_transformers import SentenceTransformer
from supabase import create_client
from tqdm import tqdm

# --------------------------- CLI --------------------------------------- #
P = argparse.ArgumentParser()
P.add_argument("--query", default="cat:cs.LG")
P.add_argument("--max",   type=int, default=50_000)
P.add_argument("--batch", type=int, default=500)
P.add_argument("--page",  type=int, default=200)
args = P.parse_args()

ARXIV_QUERY, MAX_RESULTS, DB_BATCH_SIZE, ARXIV_PAGE = (
    args.query, args.max, args.batch, args.page
)

# -------------------------- MODEL & DB --------------------------------- #
ST_MODEL_DIR = Path(os.getenv("ST_MODEL_DIR", "")).expanduser()
if not ST_MODEL_DIR.exists():
    sys.exit(f"✗ ST_MODEL_DIR non trovato: {ST_MODEL_DIR}")

encoder = SentenceTransformer(str(ST_MODEL_DIR), device="cpu")
encoder.max_seq_length = 256

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ------------------------ HTTP SESSION --------------------------------- #
sess = requests.Session()
sess.mount("http://", HTTPAdapter(max_retries=Retry(
    total=5, backoff_factor=2,
    status_forcelist=[500, 502, 503, 504])))

num_re = re.compile(r"^\d{4}\.\d{4,5}$")        # 0704.12345

# ------------------------ Provider 1: OpenAlex ------------------------- #
OA            = "https://api.openalex.org/works/"
oa_id_cache, oa_refs_cache = {}, {}

def oa_id(arxiv_id: str) -> str | None:
    if arxiv_id in oa_id_cache: return oa_id_cache[arxiv_id]
    r = sess.get(f"{OA}ARXIV:{arxiv_id}", timeout=30)
    oa_id_cache[arxiv_id] = r.json().get("id","").split("/")[-1] if r.ok else None
    return oa_id_cache[arxiv_id]

def oa_refs(openalex_id: str) -> list[int]:
    if openalex_id in oa_refs_cache: return oa_refs_cache[openalex_id]
    d = sess.get(f"{OA}{openalex_id}?select=referenced_works", timeout=30).json()
    oa_refs_cache[openalex_id] = [int(w.split("/")[-1])
                                  for w in d.get("referenced_works", [])
                                  if w.split("/")[-1].isdigit()]
    return oa_refs_cache[openalex_id]

# ------------------------ Provider 2: Semantic Scholar ----------------- #
S2       = "https://api.semanticscholar.org/graph/v1/paper/"
s2_cache = {}

def s2_refs(arxiv_id: str) -> list[int]:
    """Restituisce le referenze (int) o [] se timeout/errore."""
    if arxiv_id in s2_cache: return s2_cache[arxiv_id]
    url = f"{S2}ARXIV:{arxiv_id}?fields=references.externalIds"
    try:                                                         # 💡
        r = sess.get(url, timeout=60)                            # 💡 timeout 60 s
        if not r.ok:
            s2_cache[arxiv_id] = []
            return []
    except ReadTimeout:                                          # 💡
        print("  ⚠︎  Timeout SemanticScholar, continuo senza citazioni")
        s2_cache[arxiv_id] = []
        return []

    refs = []
    for ref in r.json().get("references", []):
        ext = ref.get("externalIds") or {}
        aid = ext.get("ArXiv") or ext.get("arXiv")
        if not aid: continue
        if num_re.match(aid):
            refs.append(int(aid.replace(".","")))
        elif "/" in aid and aid.split("/")[-1].isdigit():
            refs.append(int(aid.split("/")[-1]))
    s2_cache[arxiv_id] = refs
    return refs

# -------------------------- arXiv stream ------------------------------- #
def arxiv_stream() -> Iterable[Dict]:
    base = "http://export.arxiv.org/api/query"
    ns   = {"a":"http://www.w3.org/2005/Atom",
            "ar":"http://arxiv.org/schemas/atom"}

    for start in range(0, MAX_RESULTS, ARXIV_PAGE):
        print(f"\n[arXiv] Scarico {start}–{start+ARXIV_PAGE-1}")
        xml = sess.get(base, params=dict(search_query=ARXIV_QUERY,
                                         start=start, max_results=ARXIV_PAGE),
                       timeout=30).text
        root = ET.fromstring(xml)
        for e in root.findall("a:entry", ns):
            raw = e.find("a:id", ns).text.rsplit("/",1)[-1]
            num = raw.split("v")[0]
            group = ((e.find("ar:primary_category", ns) or
                      e.find("a:category", ns)).attrib["term"]).split(".")[0]

            if "." in num:
                arx_id, paper_id = num, int(num.replace(".",""))
            else:
                arx_id, paper_id = f"{group}/{num}", int(num) if num.isdigit() else 0

            print(f"\nPaper {arx_id}")

            refs, prov = [], "—"
            if (oid := oa_id(arx_id)):
                refs, prov = oa_refs(oid), "OpenAlex"
            if not refs:
                refs = s2_refs(arx_id)
                prov = "SemanticScholar" if refs else prov
            print(f"  Provider citazioni: {prov}\n  Citazioni valide : {len(refs)}")

            yield dict(
                id=paper_id,
                references=refs,
                title=e.find("a:title", ns).text.strip(),
                abstract=e.find("a:summary", ns).text.strip(),
                authors=[a.find("a:name", ns).text for a in e.findall("a:author", ns)],
                published_date=e.find("a:published", ns).text[:10],
            )

# ------------------------- Helpers ------------------------------------- #
def embed(txt:str)->List[float]:
    v = encoder.encode(txt, convert_to_numpy=True)
    print(f"  Embedding dim: {len(v)}")
    return v.tolist()

def batches(it:Iterable,size:int):
    it=iter(it)
    while (chunk:=list(itertools.islice(it,size))):
        yield chunk

def safe_upsert(table:str, payload:list, conflict:str)->bool:
    try:
        supabase.table(table).upsert(payload, on_conflict=conflict).execute()
        return True
    except Exception as e:
        print(f"  ✗ {table} upsert: {e}")
        return False

# ------------------------- Main ingest --------------------------------- #
def ingest():
    tot_p = tot_c = 0
    stream = (
        {**rec, "embedding": embed(f"{rec['title']} {rec['abstract']}")}
        for rec in arxiv_stream()
    )

    for batch in tqdm(batches(stream, DB_BATCH_SIZE), desc="upload", unit="batch"):
        ok_p = safe_upsert(
            "papers",
            [{k:v for k,v in rec.items() if k!="references"} for rec in batch],
            "id")
        if ok_p: tot_p += len(batch)

        edges = [{"citing": rec["id"], "cited": cid}
                 for rec in batch for cid in rec["references"]]
        ok_c = True
        if edges:
            ok_c = safe_upsert("citations", edges, "citing,cited")
            if ok_c: tot_c += len(edges)

        print(f"[batch] Paper {len(batch)} {'✓' if ok_p else '✗'} | "
              f"Citazioni {len(edges)} {'✓' if ok_c else '✗'}")
        gc.collect()

    print("\n--- FINE INGEST ---")
    print("Totale paper     :", tot_p)
    print("Totale citazioni :", tot_c)

# ----------------------------------------------------------------------- #
if __name__ == "__main__":
    ingest()
