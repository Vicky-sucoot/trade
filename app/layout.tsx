import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './style.css';

export const metadata: Metadata = {
  title: '國貿自習室｜國貿丙級練習',
  description: '國貿丙級學科、術科與章節練習',
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
