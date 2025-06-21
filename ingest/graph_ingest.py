#!/usr/bin/env python3
"""
graph_ingest.py
────────────────────────────────────────────────────────────
Calcola PageRank sul grafo delle citazioni e aggiorna papers.pr_score
– solo API REST Supabase, compatibile con supabase-py v2.x –
• scarica tutte le righe da `citations` con paging da 1 000 (limite PostgREST)
• nessun rischio di INSERT: esegue solo UPDATE per-riga
Prerequisiti:
    pip install networkx supabase requests tqdm python-dotenv
Variabili ambiente richieste:
    SUPABASE_URL  – es. https://<project>.supabase.co
    SUPABASE_KEY  – anon key o service key
Esegui quando hai già popolato `papers` e `citations`.
Puoi rilanciarlo in qualsiasi momento per ricalcolare pr_score.
"""
from __future__ import annotations

import os, sys, time, requests, networkx as nx
from tqdm import tqdm
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()                                     # .env → env vars

URL = os.getenv("SUPABASE_URL") or sys.exit("SUPABASE_URL mancante")
KEY = os.getenv("SUPABASE_KEY") or sys.exit("SUPABASE_KEY mancante")
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

STEP  = 1_000          # max rows che PostgREST restituisce per request
ALPHA = 0.85           # damping PageRank

sb = create_client(URL, KEY)

# ───────────────────────────────── helpers ──────────────────────────── #
def fetch_all(table: str, cols: str):
    """Generator che restituisce TUTTE le righe `cols` di `table`."""
    offset = 0
    while True:
        qs = f"select={cols}&limit={STEP}&offset={offset}"
        r  = requests.get(f"{URL}/rest/v1/{table}?{qs}", headers=HDR, timeout=60)
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        yield from batch
        offset += len(batch)          # avanza esattamente di quanto ricevuto

# ─────────────────────────── 1. edges → grafo ───────────────────────── #
print("[1] scarico citations …")
edges = [(int(e["citing"]), int(e["cited"]))
         for e in fetch_all("citations", "citing,cited")]
if not edges:
    sys.exit("✗ nessuna citazione trovata")
print(f"    archi totali : {len(edges):,}")

G = nx.DiGraph(edges)
print(f"[2] nodi unici   : {G.number_of_nodes():,}  – calcolo PageRank …")
t0 = time.time()
pr = nx.pagerank(G, alpha=ALPHA, tol=1e-6, max_iter=100)
print(f"    completato in {time.time()-t0:.1f}s")

# ─────────────────────────── 2. UPDATE per-riga ─────────────────────── #
print("[3] aggiorno papers.pr_score …")
updated = 0
for pid, score in tqdm(pr.items(), unit="row"):
    resp = (sb.table("papers")
              .update({"pr_score": score})
              .eq("id", pid)
              .execute())

    # supabase-py v2: resp.data è
    #   []            → nessuna riga con quell'id
    #   list[…]       → update riuscito
    #   dict{…}       → errore
    data = resp.data
    if isinstance(data, dict):
        sys.exit(f"✗ Supabase error: {data}")
    if data:                               # lista non vuota → riga aggiornata
        updated += 1

print(f"\n[✓] PageRank scritto per {updated:,} paper")

print("\nFacoltativo (performance):")
print("  REINDEX INDEX CONCURRENTLY idx_papers_embed;")

# --------------------------------------------------------------------- #
if __name__ == "__main__":
    print("\nEsegui questo script dopo la prima ingestione.")
