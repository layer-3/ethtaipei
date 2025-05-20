export const ErrorTypes = {
    Auth: 'AuthError',
    Transaction: 'TransactionError',
    Fetch: 'FetchError',
    App: 'AppError',
    Validation: 'ValidationError',
    DB: 'DBError',
    Session: 'SessionError',
    Global: 'GlobalError',
    Redirection: 'RedirectionError',
    SmartAccount: 'SmartAccountError',
    Initialization: 'InitializationError',
    UserOp: 'UserOperationError',
    RPC: 'RPCError',
    API: 'APIError',
    Swap: 'SwapError',
    OpenAI: 'OpenAIError',
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];

const MAX_LOOKUP_DEPTH = 7;

export class AppError extends Error {
    name = 'AppError';

    public readonly type: ErrorType;
    public readonly context?: Record<string, unknown>;

    constructor(type: ErrorType, message: string, context?: Record<string, unknown>) {
        super(message);
        this.type = type;
        this.context = context;

        Object.setPrototypeOf(this, AppError.prototype);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    messageIncludesRecursive(message: string): boolean {
        let currError: AppError | Error = this;

        for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth++) {
            if (currError.message.includes(message)) {
                return true;
            }

            if (currError instanceof AppError && currError.context && currError.context.originalError) {
                currError = currError.context.originalError as AppError;
            } else {
                return false;
            }
        }

        return false;
    }
}
