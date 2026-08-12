import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddItemPage from './AddItem';

vi.mock('@/components/inventory/ItemForm', () => ({ ItemForm: () => <div>ITEM FORM</div> }));
vi.mock('@/components/scanner/BarcodeScanner', () => ({ BarcodeScanner: () => null }));
vi.mock('@/components/scanner/ObjectScanner', () => ({ ObjectScanner: () => null }));

describe('AddItemPage', () => {
  it('renders the page heading and the item form', () => {
    render(
      <MemoryRouter initialEntries={['/add']}>
        <AddItemPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('ITEM FORM')).toBeInTheDocument();
  });
});
