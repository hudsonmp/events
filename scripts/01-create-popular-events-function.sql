CREATE OR REPLACE FUNCTION get_popular_events(limit_count integer DEFAULT 10)
RETURNS TABLE(
  event_id uuid,
  event_name text,
  start_datetime timestamptz,
  tag_count bigint,
  post_images jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    e.name as event_name,
    e.start_datetime,
    COUNT(et.tag) as tag_count,
    (
      SELECT jsonb_agg(jsonb_build_object('file_path', pi.file_path))
      FROM post_images pi
      WHERE pi.post_id = e.post_id
      LIMIT 1
    ) as post_images
  FROM events e
  LEFT JOIN event_tags et ON e.id = et."event-id"
  WHERE e.status = 'active'
    AND (e.start_datetime IS NULL OR e.start_datetime >= NOW())
  GROUP BY e.id, e.name, e.start_datetime
  ORDER BY tag_count DESC, e.start_datetime ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
