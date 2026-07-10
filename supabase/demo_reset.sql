-- Reset demo interactions while keeping auth users and profiles intact.
-- Run this before re-testing swipes, matching, and chat from a clean state.

truncate table messages restart identity cascade;
truncate table matches restart identity cascade;
truncate table swipes restart identity cascade;
truncate table reports restart identity cascade;
truncate table blocks restart identity cascade;
