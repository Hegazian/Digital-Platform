"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDispatcher = void 0;
/**
 * EventDispatcher for decoupled, asynchronous background event processing.
 */
class EventDispatcher {
    static listeners = new Map();
    static subscribe(eventName, handler) {
        const existing = this.listeners.get(eventName) || [];
        this.listeners.set(eventName, [...existing, handler]);
    }
    static async emit(eventName, payload) {
        const handlers = this.listeners.get(eventName) || [];
        for (const handler of handlers) {
            try {
                await handler(payload);
            }
            catch (err) {
                console.error(`Error processing event '${eventName}':`, err);
            }
        }
    }
    static clear() {
        this.listeners.clear();
    }
}
exports.EventDispatcher = EventDispatcher;
