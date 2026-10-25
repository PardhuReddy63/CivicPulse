// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../src/services/store';
import { DEPARTMENTS } from '../../src/constants';
import { LodgeComplaintModal } from '../../src/components/LodgeComplaintModal';

vi.mock('../../src/components/GrievanceMap', () => ({
  GrievanceMap: ({ onLocationSelect }) => (
    <button
      type="button"
      onClick={() => onLocationSelect(12.345678, 77.123456)}
    >
      Set map coordinates
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LodgeComplaintModal', () => {
  const getSelects = () => screen.getAllByRole('combobox');

  it('shows standard category options when the database has no active departments', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect] = getSelects();
    expect(categorySelect.querySelectorAll('option')).toHaveLength(DEPARTMENTS.length);
    expect(categorySelect.textContent).toContain('Roads & Infrastructure');
    expect(categorySelect.textContent).toContain('Public Health & Safety');
    expect(screen.getByRole('status').textContent).toContain('Department records are not configured');
    expect(screen.queryByLabelText(/complaint.?id/i)).toBeNull();
  });

  it('uses safe department fallback and shows field-specific errors for missing values', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue(undefined);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const form = document.querySelector('form');
    expect(() => fireEvent.submit(form)).not.toThrow();
    expect(screen.getByText('Grievance heading is required.')).toBeTruthy();
    expect(screen.getByText('Detailed description must contain at least 10 characters.')).toBeTruthy();
    expect(screen.getByText('Street address or landmark is required.')).toBeTruthy();
    expect(screen.getByText('Select a valid map location with latitude and longitude.')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Please correct the highlighted fields');
    expect(getSelects()[0].querySelectorAll('option')).toHaveLength(DEPARTMENTS.length);
  });

  it('shows the correct subcategories for every standard category', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    const expectedSubcategories = {
      'Roads & Infrastructure': ['Pothole', 'Damaged Footpath', 'Missing Manhole Cover', 'Traffic Sign Broken', 'Road Cave-in'],
      'Water Works & Drainage': ['Water Contamination', 'Low Pressure', 'Main Pipeline Burst', 'Open Sewage Drain', 'Water Meter Leak'],
      'Electricity & Power': ['Streetlight Out', 'Transformer Sparking', 'Hanging Low Wire', 'Frequent Power Surge', 'Uncovered Feeder Box'],
      'Sanitation & Solid Waste': ['Garbage Dump Overflow', 'Illegal Debris Dumping', 'Bio-waste Hazard', 'Uncleaned Public Toilet', 'Dead Animal Disposal'],
      'Public Health & Safety': ['Stagnant Mosquito Pool', 'Stray Animal Pack', 'Chemical Odor Leak', 'Food Adulteration Alert', 'Open Hazard Pit'],
    };

    expect([...DEPARTMENTS].sort()).toEqual(Object.keys(expectedSubcategories).sort());
    for (const category of DEPARTMENTS) {
      const options = expectedSubcategories[category];
      fireEvent.change(categorySelect, { target: { value: category } });
      expect(
        within(subcategorySelect).getAllByRole('option').map((option) => option.textContent)
      ).toEqual(options);
      expect(options).toContain(subcategorySelect.value);
    }
  });

  it('resets an incompatible subcategory and retains one valid for the next category', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    fireEvent.change(subcategorySelect, { target: { value: 'Missing Manhole Cover' } });
    fireEvent.change(categorySelect, { target: { value: 'Electricity & Power' } });
    expect(subcategorySelect.value).toBe('Streetlight Out');

    fireEvent.change(subcategorySelect, { target: { value: 'Transformer Sparking' } });
    fireEvent.change(categorySelect, { target: { value: 'Electricity & Power' } });
    expect(subcategorySelect.value).toBe('Transformer Sparking');
  });

  it('maps legacy department names to their supported subcategories', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([
      { department_id: 1, name: 'Roads' },
      { department_id: 2, name: 'Water Works' },
      { department_id: 3, name: 'Electricity' },
      { department_id: 4, name: 'Sanitation' },
    ]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    expect(categorySelect.value).toBe('Roads');
    expect(subcategorySelect.value).toBe('Pothole');
    expect(within(subcategorySelect).getAllByRole('option')).toHaveLength(5);

    fireEvent.change(categorySelect, { target: { value: 'Water Works' } });
    expect(subcategorySelect.value).toBe('Water Contamination');
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.value)).toContain('Low Pressure');

    fireEvent.change(categorySelect, { target: { value: 'Electricity' } });
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.textContent)).toContain('Streetlight Out');

    fireEvent.change(categorySelect, { target: { value: 'Sanitation' } });
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.textContent)).toContain('Garbage Dump Overflow');
  });

  it('normalizes casing, spacing, and ampersands while preserving the category value', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([
      { department_id: 1, name: '  rOaDs  &  Infrastructure ' },
      { department_id: 2, name: 'WATER WORKS and DRAINAGE' },
    ]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    expect(categorySelect.value).toBe('  rOaDs  &  Infrastructure ');
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Pothole',
      'Damaged Footpath',
      'Missing Manhole Cover',
      'Traffic Sign Broken',
      'Road Cave-in',
    ]);

    fireEvent.change(categorySelect, { target: { value: 'WATER WORKS and DRAINAGE' } });
    expect(categorySelect.value).toBe('WATER WORKS and DRAINAGE');
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Water Contamination',
      'Low Pressure',
      'Main Pipeline Burst',
      'Open Sewage Drain',
      'Water Meter Leak',
    ]);
  });

  it('renders real API department values instead of the General Issue fallback', () => {
    const apiDepartments = [
      'Education',
      'Health Services',
      'Public Works',
      'Revenue',
      'Sanitation',
      'Water Supply',
    ];
    const expectedByDepartment = {
      Education: ['School Building Damage', 'Classroom Maintenance', 'School Sanitation', 'Drinking Water at School', 'School Safety Hazard'],
      'Health Services': ['Stagnant Mosquito Pool', 'Stray Animal Pack', 'Chemical Odor Leak', 'Food Adulteration Alert', 'Open Hazard Pit'],
      'Public Works': ['Pothole', 'Damaged Footpath', 'Missing Manhole Cover', 'Traffic Sign Broken', 'Road Cave-in'],
      Revenue: ['Property Tax Payment', 'Incorrect Tax Assessment', 'Property Record Correction', 'Duplicate Tax Demand', 'Revenue Office Service Delay'],
      Sanitation: ['Garbage Dump Overflow', 'Illegal Debris Dumping', 'Bio-waste Hazard', 'Uncleaned Public Toilet', 'Dead Animal Disposal'],
      'Water Supply': ['Water Contamination', 'Low Pressure', 'Main Pipeline Burst', 'Open Sewage Drain', 'Water Meter Leak'],
    };
    vi.spyOn(store, 'getDepartments').mockReturnValue(
      apiDepartments.map((name, index) => ({ department_id: index + 1, name }))
    );

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    for (const department of apiDepartments) {
      fireEvent.change(categorySelect, { target: { value: department } });
      const renderedLabels = within(subcategorySelect)
        .getAllByRole('option')
        .map((option) => option.textContent);
      expect(renderedLabels).toEqual(expectedByDepartment[department]);
      expect(renderedLabels).not.toEqual(['General Issue']);
      expect(renderedLabels).toContain(subcategorySelect.value);
    }
  });

  it('submits an Education grievance with a supported JPG image and selected coordinates', async () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([
      { department_id: 1, name: 'Education' },
    ]);
    const createComplaint = vi.spyOn(store, 'createComplaint').mockResolvedValue({ complaint_id: 19 });
    const onSuccess = vi.fn();

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Grievance Heading \/ Summary/), {
      target: { value: 'Broken school classroom roof' },
    });
    fireEvent.change(getSelects()[0], { target: { value: 'Education' } });
    fireEvent.change(getSelects()[1], { target: { value: 'School Building Damage' } });
    fireEvent.change(screen.getByLabelText(/Street Address \/ Landmark/), {
      target: { value: 'School entrance, North Ward' },
    });
    fireEvent.change(screen.getByLabelText(/Detailed Description & Impact/), {
      target: { value: 'Roof panels are damaged and leak during rainfall.' },
    });
    fireEvent.change(screen.getByLabelText(/Upload camera or device photo/), {
      target: {
        files: [new File(['jpg image data'], 'school-roof.jpg', { type: 'image/jpeg' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set map coordinates' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue to Review/ }));

    expect(await screen.findByText('Please verify your grievance details before submitting:')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Lodge Grievance/ }));

    await waitFor(() => expect(createComplaint).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Broken school classroom roof',
      description: 'Roof panels are damaged and leak during rainfall.',
      category: 'Education',
      sub_category: 'School Building Damage',
      location: 'School entrance, North Ward',
      latitude: 12.345678,
      longitude: 77.123456,
      imageFile: expect.objectContaining({ name: 'school-roof.jpg', type: 'image/jpeg' }),
    })));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('retains a selected subcategory when it is valid for the new department', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([
      { department_id: 1, name: 'Roads' },
      { department_id: 2, name: 'Roads & Infrastructure' },
    ]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [categorySelect, subcategorySelect] = getSelects();
    fireEvent.change(subcategorySelect, { target: { value: 'Damaged Footpath' } });
    fireEvent.change(categorySelect, { target: { value: 'Roads & Infrastructure' } });

    expect(subcategorySelect.value).toBe('Damaged Footpath');
  });

  it('uses General Issue only for an unrecognized department', () => {
    vi.spyOn(store, 'getDepartments').mockReturnValue([{ department_id: 10, name: 'Other Services' }]);

    render(<LodgeComplaintModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    const [, subcategorySelect] = getSelects();
    expect(subcategorySelect.value).toBe('General Issue');
    expect(within(subcategorySelect).getAllByRole('option').map((option) => option.value)).toEqual(['General Issue']);
  });
});
