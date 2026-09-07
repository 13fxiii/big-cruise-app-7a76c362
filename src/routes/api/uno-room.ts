import { createFileRoute } from "@tanstack/react-router";
import { handleUnoRoomRequest } from "@/lib/multiplayer/authoritative/uno-api";

const handle = ({ request }: { request: Request }) => handleUnoRoomRequest(request);

export const Route = createFileRoute("/api/uno-room")({
  server: { handlers: { GET: handle, POST: handle } },
});
