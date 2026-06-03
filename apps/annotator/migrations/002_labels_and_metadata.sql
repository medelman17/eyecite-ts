alter table documents add column if not exists caption text;
alter table documents add column if not exists docket text;

alter table labels add column if not exists ambiguous_citation_ids jsonb;

-- data-integrity for the antecedent pick; citation_id is nullable, so MATCH SIMPLE
-- skips the check for abstain/flag/ambiguous labels (citation_id null).
alter table labels drop constraint if exists labels_citation_fk;
alter table labels add constraint labels_citation_fk
  foreign key (document_id, citation_id) references citations (document_id, id) on delete cascade;

create table if not exists gold (
  document_id text not null,
  backref_id  text not null,
  type        text not null check (type in ('antecedent','abstain','ambiguous','none')),
  citation_id text,
  ambiguous_citation_ids jsonb,
  rationale   text,
  decided_by  text,
  decided_at  timestamptz not null default now(),
  primary key (document_id, backref_id),
  foreign key (document_id, backref_id) references backrefs (document_id, id) on delete cascade
);

create index if not exists labels_doc_backref on labels (document_id, backref_id);
