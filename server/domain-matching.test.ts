/**
 * Tests for email domain-based sponsor matching logic
 * Verifies that the GENERIC_EMAIL_DOMAINS exclusion and domain extraction work correctly
 */
import { describe, it, expect } from 'vitest';

// Mirror the logic from db.ts for unit testing
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk',
  'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'mac.com',
  'live.com', 'live.co.uk', 'msn.com', 'protonmail.com', 'proton.me'
]);

function getEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return null;
  return email.slice(atIndex + 1).toLowerCase();
}

function shouldMatchByDomain(userEmail: string): boolean {
  const domain = getEmailDomain(userEmail);
  if (!domain) return false;
  return !GENERIC_EMAIL_DOMAINS.has(domain);
}

function domainsMatch(userEmail: string, contactEmail: string): boolean {
  const userDomain = getEmailDomain(userEmail);
  const contactDomain = getEmailDomain(contactEmail);
  if (!userDomain || !contactDomain) return false;
  return userDomain === contactDomain;
}

describe('Email domain-based sponsor matching', () => {
  it('should allow corporate email domains to match', () => {
    expect(shouldMatchByDomain('kirsten.barnes@brightnetwork.co.uk')).toBe(true);
    expect(shouldMatchByDomain('adam.moore@brightnetwork.co.uk')).toBe(true);
    expect(shouldMatchByDomain('elliot.thompson@harver.com')).toBe(true);
    expect(shouldMatchByDomain('amber.harris@shl.com')).toBe(true);
    expect(shouldMatchByDomain('peter@udder.rocks')).toBe(true);
  });

  it('should block generic consumer email domains from domain matching', () => {
    expect(shouldMatchByDomain('melissa.ruggiero@gmail.com')).toBe(false);
    expect(shouldMatchByDomain('someone@hotmail.com')).toBe(false);
    expect(shouldMatchByDomain('user@outlook.com')).toBe(false);
    expect(shouldMatchByDomain('test@yahoo.co.uk')).toBe(false);
    expect(shouldMatchByDomain('user@icloud.com')).toBe(false);
    expect(shouldMatchByDomain('user@protonmail.com')).toBe(false);
  });

  it('should correctly match users to sponsors by domain', () => {
    // Kirsten should match Bright Apply (contactEmail: kirsten.barnes@brightnetwork.co.uk)
    expect(domainsMatch('kirsten.barnes@brightnetwork.co.uk', 'kirsten.barnes@brightnetwork.co.uk')).toBe(true);
    // Adam Moore should also match Bright Apply
    expect(domainsMatch('adam.moore@brightnetwork.co.uk', 'kirsten.barnes@brightnetwork.co.uk')).toBe(true);
    // Elliot Thompson should match Harver
    expect(domainsMatch('elliot.thompson@harver.com', 'kayleigh.nunn@harver.com')).toBe(true);
    // Someone from SHL should match SHL
    expect(domainsMatch('new.person@shl.com', 'amber.harris@shl.com')).toBe(true);
  });

  it('should not cross-match different corporate domains', () => {
    expect(domainsMatch('user@harver.com', 'contact@shl.com')).toBe(false);
    expect(domainsMatch('user@appcast.io', 'contact@radancy.com')).toBe(false);
    expect(domainsMatch('user@brightnetwork.co.uk', 'contact@brightapply.com')).toBe(false);
  });

  it('should handle malformed emails gracefully', () => {
    expect(shouldMatchByDomain('notanemail')).toBe(false);
    expect(shouldMatchByDomain('')).toBe(false);
    expect(domainsMatch('notanemail', 'contact@shl.com')).toBe(false);
  });
});
