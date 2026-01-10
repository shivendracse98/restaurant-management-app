import { Injectable } from '@angular/core';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    OFF = 4
}

@Injectable({
    providedIn: 'root'
})
export class LoggerService {
    private level: LogLevel = LogLevel.DEBUG;

    debug(message: string, ...args: any[]): void {
        this.log(LogLevel.DEBUG, message, args);
    }

    info(message: string, ...args: any[]): void {
        this.log(LogLevel.INFO, message, args);
    }

    warn(message: string, ...args: any[]): void {
        this.log(LogLevel.WARN, message, args);
    }

    error(message: string, ...args: any[]): void {
        this.log(LogLevel.ERROR, message, args);
    }

    private log(level: LogLevel, message: string, args: any[]): void {
        if (level < this.level) {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${LogLevel[level]}]`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, message, ...args);
                break;
            case LogLevel.INFO:
                console.info(prefix, message, ...args);
                break;
            case LogLevel.WARN:
                console.warn(prefix, message, ...args);
                break;
            case LogLevel.ERROR:
                console.error(prefix, message, ...args);
                break;
        }
    }
}
