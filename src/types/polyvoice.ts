export type LanguageCode = 'en' | 'kn' | 'hi';

export interface LanguageOption {
  value: LanguageCode;
  label: string;
}

export const languageOptions: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];
