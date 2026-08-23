-- ---------------------------------------------------------------------------
-- Trending / "what's happening now".
--
-- Run once in the Supabase SQL Editor. Idempotent and purely additive: it
-- creates one view and one function, and creates no tables, columns or
-- counters. Every metric is derived from timestamps that already exist on
-- completions and completion_likes, so nothing can drift out of step and
-- nothing has to be backfilled.
--
-- Reading it: there are two different questions, answered separately and then
-- combined.
--
--   recent_score   "is something happening here *now*"  — every event decays
--                  with a half-life, so a burst an hour ago outweighs a
--                  hundred interactions from last month.
--
--   popular_score  "has this ever mattered"             — undecayed totals,
--                  log-compressed so a runaway hit cannot dominate forever.
--
-- trending_score = recent_score + POPULAR_WEIGHT * popular_score
--
-- Recency is the loud term; lifetime popularity is a quiet tail that keeps a
-- genuinely good older sentence from vanishing entirely.
-- ---------------------------------------------------------------------------

-- Tuning constants, kept in one place. Inlined by the planner.
create or replace function public.trending_half_life_hours()
returns double precision language sql immutable parallel safe as $$ select 18.0 $$;

create or replace function public.trending_popular_weight()
returns double precision language sql immutable parallel safe as $$ select 0.6 $$;

/**
 * Exponential decay: 1.0 at the moment of the event, 0.5 after one half-life.
 * STABLE rather than IMMUTABLE because it reads now().
 */
create or replace function public.trending_decay(event_at timestamptz)
returns double precision
language sql
stable
parallel safe
as $$
  select pow(
    0.5,
    greatest(extract(epoch from (now() - event_at)), 0) / 3600.0
      / public.trending_half_life_hours()
  )
$$;

-- ---------------------------------------------------------------------------
-- sentence_metrics
--
-- One row per sentence, carrying everything the feed needs. The frontend never
-- downloads individual completions or likes to compute any of this.
--
-- Not security_invoker, so it aggregates across all rows — which is required
-- for a shared count to mean anything. That is safe here because it exposes
-- only columns already readable by any signed-in user (sentences are world
-- readable to `authenticated`) plus anonymous counts. No profile, name, email
-- or per-user like attribution leaves through it.
-- ---------------------------------------------------------------------------
create or replace view public.sentence_metrics as
with events as (
  -- A completion is a deeper interaction than a like, and is weighted as such.
  select c.sentence_id, c.author_id as user_id, c.created_at, 'completion'::text as kind, 3.0::double precision as weight
  from public.completions c
  union all
  select c.sentence_id, l.user_id, l.created_at, 'like'::text, 1.0::double precision
  from public.completion_likes l
  join public.completions c on c.id = l.completion_id
),
by_sentence as (
  select
    sentence_id,
    count(*) filter (where kind = 'completion')            as completion_count,
    count(*) filter (where kind = 'like')                  as like_count,
    sum(weight * public.trending_decay(created_at))        as recent_weighted,
    max(created_at)                                        as last_activity_at
  from events
  group by sentence_id
),
by_participant as (
  -- Each distinct person counts once, decayed by their most recent touch, and
  -- scored by the *deepest* thing they did: 2 for someone who completed, 1 for
  -- someone who only liked.
  --
  -- Counting every participant equally here was a mistake worth naming: it let
  -- a sentence with 25 likes and 2 completions outrank one with 12 completions,
  -- because 25 warm bodies beat 12 regardless of what they actually did. Depth
  -- weighting restores "a completion is worth more than a like" without losing
  -- the property that one person cannot inflate a sentence by acting twenty
  -- times — they are still a single row here.
  select
    sentence_id,
    count(*)                                                as participant_count,
    sum(depth * public.trending_decay(last_at))             as recent_participants
  from (
    select
      sentence_id,
      user_id,
      max(created_at) as last_at,
      case when bool_or(kind = 'completion') then 2.0 else 1.0 end as depth
    from events
    group by sentence_id, user_id
  ) p
  group by sentence_id
),
scored as (
  select
    s.id,
    s.text,
    s.author_id,
    s.created_at,
    coalesce(b.completion_count, 0)::int  as completion_count,
    coalesce(b.like_count, 0)::int        as like_count,
    coalesce(p.participant_count, 0)::int as participant_count,
    b.last_activity_at,
    coalesce(b.recent_weighted, 0) + coalesce(p.recent_participants, 0) as recent_score,
    ln(
      1
      + 3.0 * coalesce(b.completion_count, 0)
      + 1.0 * coalesce(b.like_count, 0)
      + 2.0 * coalesce(p.participant_count, 0)
    ) as popular_score
  from public.sentences s
  left join by_sentence   b on b.sentence_id = s.id
  left join by_participant p on p.sentence_id = s.id
)
select
  id,
  text,
  author_id,
  created_at,
  completion_count,
  like_count,
  participant_count,
  last_activity_at,
  round(recent_score::numeric, 4)::double precision  as recent_score,
  round(popular_score::numeric, 4)::double precision as popular_score,
  round(
    (recent_score + public.trending_popular_weight() * popular_score)::numeric, 4
  )::double precision as trending_score,
  -- Deliberately strict: a badge that appears on everything says nothing, so in
  -- a quiet week nothing is "hot", which is the honest answer. The participant
  -- floors matter as much as the score — without them a single user completing
  -- their own sentence lit up as "rising".
  (recent_score >= 12.0 and participant_count >= 3) as is_trending,
  (
    recent_score >= 5.0
    and participant_count >= 2
    and not (recent_score >= 12.0 and participant_count >= 3)
  ) as is_rising,
  (
    created_at > now() - interval '24 hours'
    and coalesce(completion_count, 0) = 0
    and coalesce(like_count, 0) = 0
  ) as is_new
from scored;

grant select on public.sentence_metrics to authenticated;

-- ---------------------------------------------------------------------------
-- feed_ranked
--
-- The home feed, already ordered. Roughly three ranked sentences to every one
-- exploration slot, so a new sentence with no activity at all still surfaces
-- near the top instead of waiting behind every historical hit.
--
-- Exploration is done here rather than inside trending_score on purpose: it
-- keeps the score an honest measure of activity, and makes the amount of
-- exploration a single number to tune rather than a fudge factor buried in a
-- formula.
--
-- The result always contains min(p_limit, total sentences) rows. A database
-- with no engagement data at all still returns a full feed, newest first,
-- because every sentence falls through to the filler pass.
-- ---------------------------------------------------------------------------
create or replace function public.feed_ranked(p_limit integer default 60)
returns setof public.sentence_metrics
language sql
stable
as $$
  with bounds as (
    select
      least(greatest(coalesce(p_limit, 60), 1),
            (select count(*) from public.sentences))::int as returned
  ),
  quota as (
    -- Exploration is a share of the rows actually returned, not of p_limit.
    -- Taking it from p_limit meant that whenever the table was smaller than the
    -- limit — the cold-start case this exists for — the ranked pool swallowed
    -- every row and no exploration happened at all.
    select
      returned,
      (returned * 3) / 10           as explore_n,
      returned - (returned * 3) / 10 as hot_n
    from bounds
  ),
  ranked as (
    select m.*,
           row_number() over (order by m.trending_score desc, m.created_at desc) as score_rank
    from public.sentence_metrics m
  ),
  -- Chosen first, so a genuinely hot new sentence keeps rank 1 instead of being
  -- demoted into an exploration slot.
  hot as (
    select r.id, row_number() over (order by r.score_rank) as n
    from ranked r, quota q
    where r.score_rank <= q.hot_n
  ),
  -- The newest sentences the score alone would have buried.
  fresh as (
    select r.id, row_number() over (order by r.created_at desc) as n
    from ranked r
    where r.id not in (select id from hot)
    order by r.created_at desc
    limit (select explore_n from quota)
  ),
  -- Anything still unplaced, best-scoring first, so the feed is never short.
  filler as (
    select r.id, row_number() over (order by r.score_rank) as n
    from ranked r
    where r.id not in (select id from hot)
      and r.id not in (select id from fresh)
  ),
  -- Three ranked to one exploration: slots 1,2,3 hot, 4 fresh, 5,6,7 hot, 8 …
  placed as (
    select id, (n + ((n - 1) / 3))::numeric as slot from hot
    union all
    select id, (n * 4)::numeric             as slot from fresh
    union all
    select id, 1000000 + n                  as slot from filler
  )
  select m.*
  from placed pl
  join public.sentence_metrics m on m.id = pl.id
  order by pl.slot, m.trending_score desc
  limit (select returned from bounds);
$$;

grant execute on function public.feed_ranked(integer) to authenticated;
