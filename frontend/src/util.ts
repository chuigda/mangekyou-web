export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null
}

export function isBlank(s: string): boolean {
    return /^\s*$/.test(s)
}

export function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
