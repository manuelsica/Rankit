from flask import current_app, g
from supabase import create_client, Client

def get_supabase() -> Client:
    if "supabase" not in g:
        g.supabase = create_client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_KEY"]
        )
    return g.supabase

def _close(_=None):
    g.pop("supabase", None)

def init_app(app):
    app.teardown_appcontext(_close)
