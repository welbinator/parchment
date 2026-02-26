
CREATE TABLE public.api_key_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  request_count integer NOT NULL DEFAULT 0,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  last_request_at timestamp with time zone DEFAULT now(),
  minute_requests integer NOT NULL DEFAULT 0,
  minute_window timestamp with time zone DEFAULT now(),
  UNIQUE(api_key_id, usage_date)
);

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

-- No direct user access needed - this is managed by the edge function via service role key

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_api_key_id uuid,
  p_max_per_minute integer DEFAULT 60,
  p_max_per_day integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record api_key_usage%ROWTYPE;
  v_now timestamp with time zone := now();
  v_today date := CURRENT_DATE;
  v_minute_ago timestamp with time zone := v_now - interval '1 minute';
BEGIN
  -- Upsert usage record for today
  INSERT INTO api_key_usage (api_key_id, usage_date, request_count, last_request_at, minute_requests, minute_window)
  VALUES (p_api_key_id, v_today, 0, v_now, 0, v_now)
  ON CONFLICT (api_key_id, usage_date)
  DO UPDATE SET last_request_at = v_now
  RETURNING * INTO v_record;

  -- Check daily limit
  IF v_record.request_count >= p_max_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily limit exceeded (' || p_max_per_day || ' requests/day)',
      'daily_count', v_record.request_count,
      'retry_after', 'tomorrow'
    );
  END IF;

  -- Check minute limit: reset counter if window has passed
  IF v_record.minute_window < v_minute_ago THEN
    UPDATE api_key_usage
    SET minute_requests = 1, minute_window = v_now, request_count = request_count + 1
    WHERE id = v_record.id;
  ELSE
    IF v_record.minute_requests >= p_max_per_minute THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Rate limit exceeded (' || p_max_per_minute || ' requests/minute)',
        'minute_count', v_record.minute_requests,
        'retry_after', '60 seconds'
      );
    END IF;
    UPDATE api_key_usage
    SET minute_requests = minute_requests + 1, request_count = request_count + 1
    WHERE id = v_record.id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'daily_count', v_record.request_count + 1,
    'minute_count', CASE WHEN v_record.minute_window < v_minute_ago THEN 1 ELSE v_record.minute_requests + 1 END
  );
END;
$function$;
