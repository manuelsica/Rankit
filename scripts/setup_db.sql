/* RESET IDEMPOTENTE ------------------------------------------------------ */
drop function  if exists search_papers(text,text,int,int);
drop table     if exists citations cascade;
drop table     if exists ranking_params cascade;
alter table papers add column if not exists pr_score real default 0;

/* TRIGGER FTS (italiano) ------------------------------------------------- */
create or replace function papers_fts_trigger() returns trigger as $$
begin
  new.fts :=
        setweight(to_tsvector('italian', coalesce(new.title,'')),   'A') ||
        setweight(to_tsvector('italian', coalesce(new.abstract,'')),'B');
  return new;
end;
$$ language plpgsql;

drop trigger if exists tsvectorupdate on papers;
create trigger tsvectorupdate
before insert or update on papers
for each row execute function papers_fts_trigger();

/* INDICI ----------------------------------------------------------------- */
create index if not exists idx_papers_fts   on papers using gin(fts);
create index if not exists idx_papers_embed on papers
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

/* TABELLE DI SUPPORTO ---------------------------------------------------- */
create table if not exists citations (
  citing bigint references papers(id) on delete cascade,
  cited  bigint references papers(id) on delete cascade,
  primary key (citing, cited)
);

create table if not exists ranking_params (
  id    int primary key check (id=1),
  alpha real default 0.6,
  beta  real default 0.3,
  gamma real default 0.1
);
insert into ranking_params(id) values (1)
on conflict (id) do nothing;

/* FUNZIONE SEARCH CON PAGINAZIONE + TOTALE ------------------------------- */
create or replace function search_papers(
    q        text,
    q_emb    text,
    limit_n  int  default 21,
    offset_n int  default 0
)
returns table (
  id             bigint,
  title          text,
  abstract       text,
  authors        text[],
  published_date date,
  score          real,
  totale         bigint
)
language sql stable as
$$
select  p.id,
        p.title,
        p.abstract,
        p.authors,
        p.published_date,
        ( rp.alpha*ts_rank_cd(p.fts, plainto_tsquery('italian', q))
        + rp.beta *(1 - (p.embedding <=> q_emb::vector))
        + rp.gamma*p.pr_score)               as score,
        count(*) over()                      as totale
from    papers p, ranking_params rp
where   p.fts @@ plainto_tsquery('italian', q)
order by score desc
limit   limit_n
offset  offset_n;
$$;

grant execute on function search_papers(text,text,int,int)
       to anon, authenticated;

/* Helper cache PostgREST ------------------------------------------------- */
create or replace function pgrst_reload() returns void
language sql as $$ notify pgrst, 'reload schema'; $$;
