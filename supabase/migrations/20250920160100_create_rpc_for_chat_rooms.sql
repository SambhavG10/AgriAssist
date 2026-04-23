CREATE OR REPLACE FUNCTION get_chat_rooms_with_details()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ,
    participant_count BIGINT,
    last_message JSON
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cr.id,
        cr.name,
        cr.description,
        cr.category,
        cr.created_at,
        (SELECT COUNT(*) FROM public.chat_room_participants crp WHERE crp.room_id = cr.id) as participant_count,
        (
            SELECT json_build_object(
                'content', cm.content,
                'created_at', cm.created_at
            )
            FROM public.chat_messages cm
            WHERE cm.room_id = cr.id
            ORDER BY cm.created_at DESC
            LIMIT 1
        ) as last_message
    FROM
        public.chat_rooms cr
    ORDER BY
        (
            SELECT cm.created_at
            FROM public.chat_messages cm
            WHERE cm.room_id = cr.id
            ORDER BY cm.created_at DESC
            LIMIT 1
        ) DESC NULLS LAST,
        cr.created_at DESC;
END;
$$ LANGUAGE plpgsql;
