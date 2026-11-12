-- Roleplay is practice-only; daily MCQ and exam control certification.
ALTER TABLE public.roleplay_sessions DROP CONSTRAINT roleplay_sessions_result_check;
ALTER TABLE public.roleplay_sessions ADD CONSTRAINT roleplay_sessions_result_check CHECK (result = ANY (ARRAY['pass'::text, 'fail'::text, 'practice'::text]));
