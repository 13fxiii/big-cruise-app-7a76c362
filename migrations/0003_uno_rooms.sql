CREATE TABLE IF NOT EXISTS uno_rooms (
  room_id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS uno_rooms_updated_at_idx ON uno_rooms (updated_at);
