import { type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'stretch',
    height: 40,
    background: 'var(--surface-tertiary)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  } as React.CSSProperties,
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 16px',
    fontSize: 12,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: 'var(--text-secondary)',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  tabActive: {
    color: 'var(--text-bright)',
    borderBottomColor: 'var(--accent-blue)',
  } as React.CSSProperties,
  tabHover: {
    color: 'var(--text-primary)',
  } as React.CSSProperties,
};

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
