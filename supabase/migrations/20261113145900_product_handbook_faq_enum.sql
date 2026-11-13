-- Separate committed transaction: new enum label may only be used by later migrations.
alter type public.handbook_section add value if not exists 'faq';
