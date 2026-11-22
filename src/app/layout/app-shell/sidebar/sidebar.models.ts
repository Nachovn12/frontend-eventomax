export type SidebarIconName =
  | 'dashboard'
  | 'productions'
  | 'catalog'
  | 'reports'
  | 'audit';

export interface SidebarNavItem {
  readonly id: SidebarIconName;
  readonly label: string;
  readonly route: string;
  readonly icon: SidebarIconName;
  readonly badge?: string | number;
  readonly badgeLabel?: string;
  readonly statusDot?: boolean;
  readonly statusLabel?: string;
}
