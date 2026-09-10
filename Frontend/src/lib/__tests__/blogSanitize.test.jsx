import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

describe('blog content sanitization (public post render pipeline)', () => {
  const renderBlog = (content) =>
    render(
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>,
    );

  it('strips <script> tags and keeps safe markdown', () => {
    const { container } = renderBlog('# Hello\n\n<script>window.pwned = true</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('h1')).toBeTruthy();
  });

  it('strips inline event handlers', () => {
    const { container } = renderBlog('<img src="x" onerror="alert(1)" />');
    expect(container.querySelector('[onerror]')).toBeNull();
  });

  it('keeps safe inline markup and links', () => {
    const { container } = renderBlog('**strong** and [link](https://pvabazaar.org)');
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('a')).toBeTruthy();
  });
});