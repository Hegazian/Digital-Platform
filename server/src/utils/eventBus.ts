type EventHandler = (payload: any) => Promise<void> | void;

/**
 * EventDispatcher for decoupled, asynchronous background event processing.
 */
export class EventDispatcher {
  private static listeners = new Map<string, EventHandler[]>();

  static subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.listeners.get(eventName) || [];
    this.listeners.set(eventName, [...existing, handler]);
  }

  static async emit(eventName: string, payload: any): Promise<void> {
    const handlers = this.listeners.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`Error processing event '${eventName}':`, err);
      }
    }
  }

  static clear(): void {
    this.listeners.clear();
  }
}
