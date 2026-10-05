import { requireSession } from "@/lib/auth";
import { subscribeWorkspace } from "@/lib/events";
import { loadWorkspaceSnapshot } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { session } = await requireSession();
    const encoder = new TextEncoder();

    let cleanup = () => {};

    const stream = new ReadableStream({
      start(controller) {
        const push = async () => {
          try {
            const workspace = await loadWorkspaceSnapshot(session.workspaceId, session.userId);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ workspace })}\n\n`));
          } catch {
            /* ignore transient errors */
          }
        };

        void push();
        const unsub = subscribeWorkspace((workspaceId) => {
          if (workspaceId === session.workspaceId) void push();
        });
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            cleanup();
          }
        }, 25000);

        cleanup = () => {
          clearInterval(heartbeat);
          unsub();
        };
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}
