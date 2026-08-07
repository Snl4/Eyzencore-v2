import type { Metadata } from 'next';
import { KeywordPickerClient } from './KeywordPickerClient';

export const metadata: Metadata = {
  title: 'Keyword tracking',
  description: 'Pick keywords to track.',
};

export default function KeywordsPage() {
  return <KeywordPickerClient />;
}
