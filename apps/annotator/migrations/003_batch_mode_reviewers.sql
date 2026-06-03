alter table batches add column if not exists mode text not null default 'single' check (mode in ('single','double'));
create table if not exists batch_reviewers (
  batch_id     text not null references batches (id) on delete cascade,
  annotator_id text not null references annotators (id) on delete cascade,
  primary key (batch_id, annotator_id)
);
