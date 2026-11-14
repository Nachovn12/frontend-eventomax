import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActiveProductionsStore } from './active-productions.store';
import { Production } from '../models/production.model';

describe('ActiveProductionsStore', () => {
  let store: ActiveProductionsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ActiveProductionsStore],
    });
    store = TestBed.inject(ActiveProductionsStore);
  });

  it('initializes with null activeCount and undefined sidebarBadge', () => {
    expect(store.activeCount()).toBeNull();
    expect(store.sidebarBadge()).toBeUndefined();
  });

  it('updates count and badge when productions are provided', () => {
    const list: Partial<Production>[] = [
      { id: 1, status: 'CERRADO' },
      { id: 2, status: 'CERRADO' },
      { id: 3, status: 'EN_MONTAJE' },
      { id: 4, status: 'CERRADO' },
      { id: 5, status: 'EN_MONTAJE' },
      { id: 6, status: 'SOLICITADO' },
      { id: 7, status: 'CONFIRMADO' },
    ];

    store.updateFromProductions(list as Production[]);
    expect(store.activeCount()).toBe(4);
    expect(store.sidebarBadge()).toBe('4');
  });

  it('omits badge when there are zero active productions (Apple silent UI)', () => {
    const list: Partial<Production>[] = [
      { id: 1, status: 'CERRADO' },
      { id: 2, status: 'CANCELADO' },
    ];

    store.updateFromProductions(list as Production[]);
    expect(store.activeCount()).toBe(0);
    expect(store.sidebarBadge()).toBeUndefined();
  });

  it('allows explicit setting of active count', () => {
    store.setActiveCount(5);
    expect(store.activeCount()).toBe(5);
    expect(store.sidebarBadge()).toBe('5');

    store.setActiveCount(0);
    expect(store.sidebarBadge()).toBeUndefined();
  });
});
