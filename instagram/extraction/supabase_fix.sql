-- Fix for event_tags table column naming
-- The original schema uses "event-id" with a hyphen which can cause issues
-- This migration renames it to "event_id" for consistency

-- First, drop the foreign key constraint
ALTER TABLE public.event_tags DROP CONSTRAINT IF EXISTS "event_tags_event-id_fkey";

-- Rename the column from "event-id" to "event_id"
ALTER TABLE public.event_tags RENAME COLUMN "event-id" TO event_id;

-- Recreate the foreign key constraint with the new column name
ALTER TABLE public.event_tags 
ADD CONSTRAINT event_tags_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id); 