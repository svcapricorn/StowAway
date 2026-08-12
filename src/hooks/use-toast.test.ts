import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { reducer, useToast, toast } from './use-toast';

describe('toast reducer', () => {
  const baseToast = { id: '1', open: true } as any;

  it('ADD_TOAST prepends and enforces the toast limit of 1', () => {
    const state = reducer({ toasts: [baseToast] }, { type: 'ADD_TOAST', toast: { id: '2', open: true } as any });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST merges changes into the matching toast', () => {
    const state = reducer(
      { toasts: [baseToast] },
      { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } as any },
    );
    expect(state.toasts[0].title).toBe('Updated');
  });

  it('DISMISS_TOAST with an id sets that toast open to false', () => {
    const state = reducer({ toasts: [baseToast] }, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(state.toasts[0].open).toBe(false);
  });

  it('DISMISS_TOAST with no id closes every toast', () => {
    const state = reducer(
      { toasts: [{ id: '1', open: true } as any, { id: '2', open: true } as any] },
      { type: 'DISMISS_TOAST' },
    );
    expect(state.toasts.every((t) => t.open === false)).toBe(true);
  });

  it('REMOVE_TOAST with an id removes only that toast', () => {
    const state = reducer(
      { toasts: [{ id: '1' } as any, { id: '2' } as any] },
      { type: 'REMOVE_TOAST', toastId: '1' },
    );
    expect(state.toasts.map((t) => t.id)).toEqual(['2']);
  });

  it('REMOVE_TOAST with no id clears every toast', () => {
    const state = reducer({ toasts: [{ id: '1' } as any] }, { type: 'REMOVE_TOAST' });
    expect(state.toasts).toEqual([]);
  });
});

describe('useToast / toast', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach((t) => result.current.dismiss(t.id));
    });
  });

  it('adds a toast that becomes visible to useToast consumers', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Saved' });
    });

    expect(result.current.toasts[0].title).toBe('Saved');
  });

  it('dismiss() marks the toast as closed', () => {
    const { result } = renderHook(() => useToast());

    let id = '';
    act(() => {
      id = toast({ title: 'Dismiss me' }).id;
    });
    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
