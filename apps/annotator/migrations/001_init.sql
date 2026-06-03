create table if not exists documents (
  id          text primary key,
  source      text not null check (source in ('ocr','native')),
  court       text,
  year        int,
  text        text not null,
  created_at  timestamptz not null default now()
);
create table if not exists citations (
  document_id text not null references documents(id) on delete cascade,
  id          text not null,
  kind        text not null check (kind in ('full','id','supra','shortFormCase')),
  span_start  int not null,
  span_end    int not null,
  display_text text not null,
  plaintiff   text,
  defendant   text,
  year        int,
  primary key (document_id, id)
);
create table if not exists backrefs (
  document_id text not null references documents(id) on delete cascade,
  id          text not null,
  kind        text not null check (kind in ('id','supra','shortFormCase')),
  span_start  int not null,
  span_end    int not null,
  engine_guess      text,
  engine_confidence double precision,
  engine_warning    text,
  candidates  jsonb not null,
  primary key (document_id, id)
);
create table if not exists annotators (
  id   text primary key,
  name text not null
);
create table if not exists batches (
  id         text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);
create table if not exists batch_items (
  batch_id    text not null references batches(id) on delete cascade,
  document_id text not null references documents(id) on delete cascade,
  primary key (batch_id, document_id)
);
create table if not exists labels (
  id           bigserial primary key,
  document_id  text not null,
  backref_id   text not null,
  annotator_id text not null references annotators(id),
  decision_type text not null check (decision_type in ('antecedent','abstain','ambiguous','flag')),
  citation_id  text,
  agreed_with_engine boolean not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (document_id, backref_id, annotator_id),
  foreign key (document_id, backref_id) references backrefs(document_id, id) on delete cascade
);
