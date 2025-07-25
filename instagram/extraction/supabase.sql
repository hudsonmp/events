-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.event_attendees (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT event_attendees_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_categories (
  event_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT event_categories_pkey PRIMARY KEY (event_id, category_id),
  CONSTRAINT event_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT event_categories_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_hosts (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT event_hosts_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_hosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT event_hosts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_images (
  event_id uuid NOT NULL,
  image_id uuid NOT NULL,
  CONSTRAINT event_images_pkey PRIMARY KEY (event_id, image_id),
  CONSTRAINT event_images_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id)
);
CREATE TABLE public.events (
  name text NOT NULL,
  start_datetime timestamp with time zone NOT NULL,
  end_datetime timestamp with time zone,
  school_id uuid NOT NULL,
  address text,
  location_name text,
  description text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_all_day boolean DEFAULT false,
  type USER-DEFINED DEFAULT 'in-person'::event_type,
  status USER-DEFINED DEFAULT 'draft'::event_status,
  profile_id uuid,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT events_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.images (
  storage_path text NOT NULL,
  url text,
  event_id uuid,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT fk_images_event FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.post_images (
  post_id uuid NOT NULL,
  file_path text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_images_pkey PRIMARY KEY (id),
  CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.posts (
  shortcode text NOT NULL UNIQUE,
  username_id uuid NOT NULL,
  caption_path text,
  posted_at timestamp with time zone NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_username_id_fkey FOREIGN KEY (username_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  bio_file_path text,
  profile_pic_url text,
  last_updated timestamp with time zone DEFAULT now(),
  last_seen_shortcode text,
  bio text,
  followers integer DEFAULT 0,
  full_name text,
  is_verified boolean DEFAULT false,
  is_private boolean DEFAULT false,
  mediacount integer DEFAULT 0,
  school_id uuid NOT NULL,
  username text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT usernames_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.schools (
  name text NOT NULL,
  address text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  school_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);