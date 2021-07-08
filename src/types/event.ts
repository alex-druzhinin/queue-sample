export interface Event {
    id: number;
    user: number;
    payload: string;
}

// Сообщение в рамках системы.
export interface Message<T extends Event> {
    errors: string[];
    retry: number;
    event: T;
}

// Интерфейс сообщения которое будет отправлено в хранилище ошибок
export interface FailEvent extends Message<Event> {
    exchange: string;
    routingKey: string;
}
