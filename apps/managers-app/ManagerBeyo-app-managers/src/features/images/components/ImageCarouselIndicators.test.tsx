import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImageCarouselIndicators } from './ImageCarouselIndicators';

describe('ImageCarouselIndicators', () => {
  it('renders one dot per image and marks the active dot', () => {
    render(<ImageCarouselIndicators count={3} activeIndex={1} />);

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByTestId('carousel-dot-1')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('carousel-dot-0')).toHaveAttribute('aria-selected', 'false');
  });

  it('returns null when there is only one image', () => {
    const { container } = render(<ImageCarouselIndicators count={1} activeIndex={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
