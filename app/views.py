from flask import Blueprint, current_app, g, render_template, request
from .search import SearchEngine
from .database import get_supabase

search_bp = Blueprint("search", __name__, template_folder="templates")

def _engine():
    if "engine" not in g:
        cfg = current_app.config
        g.engine = SearchEngine(model_dir=cfg["ST_MODEL_DIR"],
                                per_page=cfg["MAX_RESULTS"])
    return g.engine

@search_bp.route("/")
def home():
    return render_template("search.html")

@search_bp.route("/search")
def search():
    q    = request.args.get("q", "").strip()
    page = max(1, int(request.args.get("page", 1)))
    papers, total, has_next = _engine().search(q, page) if q else ([], 0, False)
    return render_template("search.html", query=q, results=papers,
                           total=total, page=page, has_next=has_next)

@search_bp.route("/ranking", methods=["POST"])
def ranking():
    α = float(request.form["alpha"])
    β = float(request.form["beta"])
    γ = float(request.form["gamma"])
    get_supabase().table("ranking_params").update(
        {"alpha": α, "beta": β, "gamma": γ}
    ).eq("id", 1).execute()
    return ("", 204)
