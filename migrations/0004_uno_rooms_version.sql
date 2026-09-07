-- Optimistic concurrency for serverless UNO room snapshots.
ALTER TABLE uno_rooms
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS uno_rooms_version_idx ON uno_rooms (room_id, version);
