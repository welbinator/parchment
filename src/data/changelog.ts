import { Sparkles, Bug, Tag } from 'lucide-react';
import changelogData from './changelog.json';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = changelogData as ChangelogEntry[];

export const typeConfig = {
  feature: { label: 'New', icon: Sparkles, className: 'bg-primary/15 text-primary' },
  fix: { label: 'Fix', icon: Bug, className: 'bg-destructive/15 text-destructive' },
  improvement: { label: 'Improved', icon: Tag, className: 'bg-accent text-accent-foreground' },
};
