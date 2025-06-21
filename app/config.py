import os

class Settings:
    SUPABASE_URL  = os.getenv("SUPABASE_URL")
    SUPABASE_KEY  = os.getenv("SUPABASE_KEY")
    ST_MODEL_DIR  = os.getenv("ST_MODEL_DIR")            # percorso locale modello embeddings
    EMBEDDING_DIM = 384
    MAX_RESULTS   = 20
