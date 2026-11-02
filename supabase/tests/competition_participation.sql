-- Run against a migrated local database with psql -v ON_ERROR_STOP=1.
-- Fixtures and assertions are rolled back; no existing records are modified.
begin;
do $$
declare c uuid; g public.competition_guest_participants; recovered record;
  u uuid := gen_random_uuid(); other_user uuid := gen_random_uuid();
begin
  insert into public.quran_competitions
    (slug,name,short_description,complete_description,start_date,registration_deadline,participation_terms)
  values ('participation-test-' || u,'اختبار','اختبار','اختبار',current_date + 5,current_date + 2,'اختبار') returning id into c;
  select * into g from private.submit_linked_competition_participant(c,'طالب اختبار','٠١٠٩٩٩٨٨٧٧٦','الأول');
  assert g.status = 'pending' and g.student_id is null, 'guest starts pending and unlinked';
  assert g.normalized_phone = '201099988776', 'Egyptian and Arabic-digit normalization';
  update public.competition_guest_participants set status='completed', final_rank=2 where id=g.id;
  insert into auth.users(id,email,raw_user_meta_data)
  values (u,'participation-test-' || u || '@example.com',
    jsonb_build_object('full_name','طالب اختبار','phone','201099988776'));
  -- The deployment auth trigger may require a student role claim. Create the
  -- profile explicitly if its auth trigger did not create one.
  insert into public.student_profiles(id,full_name,phone)
    values(u,'طالب اختبار','201099988776') on conflict(id) do nothing;
  select * into g from public.competition_guest_participants where id=g.id;
  assert g.student_id=u and g.status='completed' and g.final_rank=2, 'late signup preserves results';
  select * into recovered from public.recover_competition_guest_participant(c,'+20 109 998 8776');
  assert recovered.id=g.id and recovered.status='completed', 'phone recovery after linking';
  select * into recovered from public.submit_competition_guest_participant(c,'اسم آخر','01099988776','آخر');
  assert recovered.id=g.id and recovered.level='الأول' and recovered.status='completed', 'repeat does not reset state';
  perform set_config('request.jwt.claim.sub',u::text,true);
  select * into recovered from public.submit_competition_guest_participant(c,'طالب اختبار','01100000000','آخر');
  assert recovered.id=g.id, 'signed-in supplied phone cannot override account phone';
  perform set_config('request.jwt.claim.sub','',true);
  insert into auth.users(id,email,raw_user_meta_data)
  values (other_user,'participation-test-' || other_user || '@example.com',
    jsonb_build_object('full_name','طالب آخر','phone','201099988775'));
  insert into public.student_profiles(id,full_name,phone)
    values(other_user,'طالب آخر','201099988775') on conflict(id) do nothing;
  select * into g from private.submit_linked_competition_participant(c,'طالب آخر','01099988775','الثاني');
  assert g.student_id=other_user and g.status='pending', 'account first links immediately';
  update public.competition_guest_participants set status='rejected' where id=g.id;
  select * into recovered from public.submit_competition_guest_participant(c,'طالب آخر','+201099988775','آخر');
  assert recovered.id=g.id and recovered.status='rejected', 'rejected requests never reset';
  begin
    insert into public.competition_guest_participants
      (competition_id,student_name,student_phone,normalized_phone,level)
    values(c,'طالب مكرر','01099988775','01099988775','الأول');
    raise exception 'duplicate insert unexpectedly succeeded';
  exception when unique_violation then null;
  end;
  update public.quran_competitions set registration_deadline=current_date - 1 where id=c;
  select * into recovered from public.submit_competition_guest_participant(c,'طالب آخر','01099988775','آخر');
  assert recovered.id=g.id, 'existing requests remain accessible after deadline';
  begin
    perform public.submit_competition_guest_participant(c,'طالب جديد','01099988774','الأول');
    raise exception 'closed competition accepted a new application';
  exception when raise_exception then
    if sqlerrm <> 'المسابقة غير متاحة للتسجيل.' then raise; end if;
  end;
end $$;

-- RLS: a signed-in owner can read, but cannot alter approval or progress.
do $$
declare u uuid; participant uuid;
begin
  select id, student_id into participant,u from public.competition_guest_participants
    where normalized_phone='201099988776';
  perform set_config('request.jwt.claim.sub',u::text,true);
  execute 'set local role authenticated';
  assert (select count(*) from public.competition_guest_participants where id=participant)=1, 'owner reads participation';
  update public.competition_guest_participants set status='pending' where id=participant;
  assert (select status from public.competition_guest_participants where id=participant)='completed', 'owner cannot edit progress';
  delete from public.competition_guest_participants where id=participant;
  assert (select count(*) from public.competition_guest_participants where id=participant)=1, 'owner cannot delete';
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  assert (select count(*) from public.competition_guest_participants where id=participant)=0, 'stranger cannot read';
  begin
    insert into public.competition_guest_participants
      (competition_id,student_name,student_phone,normalized_phone,level)
    select id,'طلب غير مصرح','01099988771','01099988771','الأول'
    from public.quran_competitions where slug like 'participation-test-%';
    raise exception 'student direct insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end $$;

do $$
declare c uuid; g record;
begin
  select id into c from public.quran_competitions where slug like 'participation-test-%';
  execute 'set local role anon';
  select * into g from public.recover_competition_guest_participant(c,'01099988776');
  assert g.status='completed', 'anonymous phone recovery works';
  select * into g from public.get_competition_guest_participant_by_token(c,g.public_access_token);
  assert g.status='completed', 'anonymous token lookup works';
  assert not has_table_privilege('anon','public.competition_guest_participants','INSERT'), 'anonymous has no insert grant';
  assert not has_table_privilege('anon','public.competition_guest_participants','UPDATE'), 'anonymous has no update grant';
  assert not has_table_privilege('anon','public.competition_guest_participants','DELETE'), 'anonymous has no delete grant';
  begin
    perform * from public.competition_guest_participants;
    raise exception 'anonymous table select unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end $$;
rollback;
