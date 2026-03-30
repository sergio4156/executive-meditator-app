import React from 'react';
import {render} from '@testing-library/react-native';
import {AlarmCard} from '../../src/components/AlarmCard';

describe('AlarmCard', () => {
  it('renders nothing for level none', () => {
    const {toJSON} = render(<AlarmCard level="none" />);
    expect(toJSON()).toBeNull();
  });

  it('renders for subtle level', () => {
    const {getByText} = render(<AlarmCard level="subtle" />);
    expect(getByText('Gentle Reminder')).toBeTruthy();
  });

  it('renders for mild level', () => {
    const {getByText} = render(<AlarmCard level="mild" />);
    expect(getByText('Low Energy Notice')).toBeTruthy();
  });

  it('renders for disease level', () => {
    const {getByText} = render(<AlarmCard level="disease" />);
    expect(getByText('Rebalancing Needed')).toBeTruthy();
  });

  it('renders for critical level', () => {
    const {getByText} = render(<AlarmCard level="critical" />);
    expect(getByText('Immediate Attention')).toBeTruthy();
  });
});
