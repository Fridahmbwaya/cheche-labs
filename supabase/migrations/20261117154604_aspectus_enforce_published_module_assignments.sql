CREATE OR REPLACE FUNCTION public.aspectus_submit_quiz(p_module_id uuid, p_answers jsonb)
 RETURNS TABLE(score integer, correct_count integer, question_count integer, passed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_module public.modules%rowtype;v_key int[];v_count int;v_correct int:=0;v_i int;v_val text;v_score int;v_pass boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into v_module from public.modules where id=p_module_id and org_id=public.my_org_id();
 if not found then raise exception 'Module unavailable';end if; if NOT v_module.is_active OR NOT exists (
  select 1 from public.aspectus_module_assignments a
  where a.org_id=v_module.org_id and a.learner_id=auth.uid() and a.module_id=v_module.id
 ) then raise exception 'This module is not currently assigned to your account' using errcode='42501'; end if;
 v_key:=case v_module.order_index when 1 then array[1,1,1]
when 2 then array[1,1,2]
when 3 then array[1,0,1]
when 4 then array[1,1,1]
when 5 then array[1,1,1]
when 6 then array[1,1,1]
when 7 then array[1,1,0]
when 8 then array[1,1,1,2] else null end;
 if v_key is null then raise exception 'Unrecognized module';end if;
 v_count:=array_length(v_key,1);
 if jsonb_typeof(p_answers)<>'object' or (select count(*) from jsonb_object_keys(p_answers))<>v_count then raise exception 'Complete all quiz questions';end if;
 for v_i in 0..v_count-1 loop
  v_val:=p_answers->>v_i::text;
  if v_val is null or v_val !~ '^[0-3]$' then raise exception 'Invalid quiz answer';end if;
  if v_val::integer=v_key[v_i+1] then v_correct:=v_correct+1;end if;
 end loop;
 v_score:=round(100.0*v_correct/v_count);v_pass:=v_score>=80;
 insert into public.aspectus_quiz_attempts(org_id,learner_id,module_id,score,correct_count,question_count,answers,passed) values(v_module.org_id,auth.uid(),p_module_id,v_score,v_correct,v_count,p_answers,v_pass);
 return query select v_score,v_correct,v_count,v_pass;
end $function$;
CREATE POLICY aspectus_lesson_assignment_insert_guard
 ON public.aspectus_lesson_progress AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.aspectus_module_assignments a JOIN public.modules m ON m.id=a.module_id WHERE a.learner_id=(select auth.uid()) AND a.org_id=aspectus_lesson_progress.org_id AND a.module_id=aspectus_lesson_progress.module_id AND m.is_active));
CREATE POLICY aspectus_lesson_assignment_update_guard
 ON public.aspectus_lesson_progress AS RESTRICTIVE
 FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.aspectus_module_assignments a JOIN public.modules m ON m.id=a.module_id WHERE a.learner_id=(select auth.uid()) AND a.org_id=aspectus_lesson_progress.org_id AND a.module_id=aspectus_lesson_progress.module_id AND m.is_active))
 WITH CHECK (EXISTS (SELECT 1 FROM public.aspectus_module_assignments a JOIN public.modules m ON m.id=a.module_id WHERE a.learner_id=(select auth.uid()) AND a.org_id=aspectus_lesson_progress.org_id AND a.module_id=aspectus_lesson_progress.module_id AND m.is_active));
CREATE POLICY aspectus_submissions_assignment_insert_guard
 ON public.learning_submissions AS RESTRICTIVE
 FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.aspectus_module_assignments a JOIN public.modules m ON m.id=a.module_id WHERE a.learner_id=(select auth.uid()) AND a.org_id=learning_submissions.org_id AND a.module_id=learning_submissions.module_id AND m.is_active));
