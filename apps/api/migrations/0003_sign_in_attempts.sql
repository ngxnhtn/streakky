-- Sign-in steps per address and UTC day, across every client IP, so guessing a code stays capped
-- however many addresses an attacker has (see src/auth.ts, DAILY_LIMITS).
CREATE TABLE sign_in_attempts (
  email TEXT NOT NULL,
  path TEXT NOT NULL,
  day INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (email, path, day)
);
