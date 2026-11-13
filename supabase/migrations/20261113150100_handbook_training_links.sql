-- Product handbook supplement to 20261113145300_product_handbook.sql.
-- Schema only; do not apply without Claude review.
-- Link required training courses to handbook sections. MCQ skill codes are unchanged.

alter table public.training_modules
  add column if not exists handbook_section public.handbook_section;

update public.training_modules
set handbook_section=case
  when code='CORE-BRAND' then 'story'::public.handbook_section
  when code in ('LEAD-FINDING','QUALIFY') then 'product_line'::public.handbook_section
  when code='REFERENCE' then 'service_rule'::public.handbook_section
  when code in ('OBJECTION','CLOSING') then 'script'::public.handbook_section
  when code='PAYMENT' then 'service_rule'::public.handbook_section
  else handbook_section
end
where required=true and active=true;

alter table public.training_modules
  add constraint training_modules_required_handbook_section
  check (not (required and active) or handbook_section is not null);

create index if not exists training_modules_handbook_section_idx
  on public.training_modules(handbook_section) where required=true and active=true;
