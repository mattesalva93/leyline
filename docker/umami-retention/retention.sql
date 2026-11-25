-- Umami keeps what visitors did for at most 25 months (ADR 0027): every row older is deleted, in
-- each table that records an event, a session or what came with them. The tables Umami's own
-- configuration lives in (users, websites, reports, segments, annotations) are kept.
-- `pnpm check:staging` runs this on sample rows, and fails on a table of visitors' data this
-- list misses. Umami keeps no foreign keys in the database (its Prisma schema's
-- `relationMode = "prisma"`), so the order does not matter.
\set cutoff 'now() - interval ''25 months'''
delete from website_event where created_at < :cutoff;
delete from event_data where created_at < :cutoff;
delete from session where created_at < :cutoff;
delete from session_data where created_at < :cutoff;
delete from session_link where created_at < :cutoff;
delete from revenue where created_at < :cutoff;
delete from heatmap_event where created_at < :cutoff;
delete from session_replay where created_at < :cutoff;
delete from session_replay_saved where created_at < :cutoff;
delete from error_event where created_at < :cutoff;
delete from error_issue where created_at < :cutoff;
