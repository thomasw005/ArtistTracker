// Extends Express's Request type with the fields our middleware adds.
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

export {};