export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null
}

export function isBlank(s: string): boolean {
    return /^\s*$/.test(s)
}
