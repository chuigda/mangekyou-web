import type { LanguageSelector } from './chrs'

export interface LanguageConfig {
    name: string
    wordUnit: string
}

export const LanguageConfigs: Record<LanguageSelector, LanguageConfig> = {
    en: {
        name: 'English',
        wordUnit: 'words'
    },
    zh_CN: {
        name: 'Simplified Chinese (简体中文)',
        wordUnit: 'Chinese characters'
    }
}
