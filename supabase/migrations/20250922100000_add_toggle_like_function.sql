
create or replace function toggle_like(post_id_param uuid, user_id_param uuid)
returns table (new_likes_count int) as $$
declare
  liked boolean;
begin
  -- Check if the user has already liked the post
  select exists(
    select 1 from community_likes where post_id = post_id_param and user_id = user_id_param
  ) into liked;

  if liked then
    -- User has liked, so unlike
    delete from community_likes where post_id = post_id_param and user_id = user_id_param;
  else
    -- User has not liked, so like
    insert into community_likes (post_id, user_id) values (post_id_param, user_id_param);
  end if;

  -- Recalculate and update the likes_count in community_posts
  update community_posts
  set likes_count = (
    select count(*) from community_likes where post_id = post_id_param
  )
  where id = post_id_param;

  -- Return the new likes count
  return query
    select likes_count from community_posts where id = post_id_param;
end;
$$ language plpgsql;
