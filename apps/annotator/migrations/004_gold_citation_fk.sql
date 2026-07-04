alter table gold drop constraint if exists gold_citation_fk;
alter table gold add constraint gold_citation_fk
  foreign key (document_id, citation_id) references citations (document_id, id) on delete cascade;
