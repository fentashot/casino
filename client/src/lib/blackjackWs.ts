/* ============================================================================
   Blackjack WebSocket Client
   Manages a single persistent connection to /api/blackjack/ws.
   Auto-reconnects with exponential backoff.
   ============================================================================ */

import type {
	ClientMessage,
	ServerMessage,
} from "@server/games/blackjack/wsTypes";

export type { ClientMessage, ServerMessage };

type MessageHandler = (msg: ServerMessage) => void;

const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/blackjack/ws`;
const MAX_BACKOFF_MS = 16_000;

export class BlackjackSocket {
	private ws: WebSocket | null = null;
	private handlers = new Set<MessageHandler>();
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private backoff = 500;
	private destroyed = false;
	private queue: string[] = [];

	constructor() {
		this.connect();
	}

	private connect() {
		if (this.destroyed) return;

		this.ws = new WebSocket(WS_URL);

		this.ws.onopen = () => {
			this.backoff = 500;
			// Flush queued messages
			for (const raw of this.queue) {
				this.ws?.send(raw);
			}
			this.queue = [];
		};

		this.ws.onmessage = (ev) => {
			let msg: ServerMessage;
			try {
				msg = JSON.parse(ev.data as string) as ServerMessage;
			} catch {
				return;
			}
			for (const handler of this.handlers) {
				handler(msg);
			}
		};

		this.ws.onclose = () => {
			if (this.destroyed) return;
			this.reconnectTimer = setTimeout(() => {
				this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
				this.connect();
			}, this.backoff);
		};

		this.ws.onerror = () => {
			this.ws?.close();
		};
	}

	send(msg: ClientMessage) {
		const raw = JSON.stringify(msg);
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(raw);
		} else {
			this.queue.push(raw);
		}
	}

	onMessage(handler: MessageHandler): () => void {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}

	destroy() {
		this.destroyed = true;
		if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
		this.ws?.close();
		this.handlers.clear();
	}

	get connected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	get isDestroyed(): boolean {
		return this.destroyed;
	}
}

// Singleton per session — one connection shared across the blackjack page
let instance: BlackjackSocket | null = null;

export function getBlackjackSocket(): BlackjackSocket {
	if (!instance || instance.isDestroyed) {
		instance = new BlackjackSocket();
	}
	return instance;
}

export function destroyBlackjackSocket() {
	instance?.destroy();
	instance = null;
}
