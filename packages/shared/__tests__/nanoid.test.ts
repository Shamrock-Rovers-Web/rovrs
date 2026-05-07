import { generateId, generateSlug } from '../src/nanoid';

describe('generateId', () => {
  it('should generate a 12-character ID', () => {
    const id = generateId();
    expect(id).toHaveLength(12);
  });

  it('should contain only alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]{12}$/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs on multiple calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateSlug', () => {
  it('should generate a 6-character slug', () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(6);
  });

  it('should contain only lowercase letters and numbers', () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^[a-z0-9]{6}$/);
  });

  it('should generate unique slugs', () => {
    const slug1 = generateSlug();
    const slug2 = generateSlug();
    expect(slug1).not.toBe(slug2);
  });

  it('should generate different slugs on multiple calls', () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      slugs.add(generateSlug());
    }
    expect(slugs.size).toBe(100);
  });
});