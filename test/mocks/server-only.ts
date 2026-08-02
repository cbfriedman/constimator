// Stub for the "server-only" package (aliased in vitest.config.ts). The
// real package unconditionally throws unless resolved under React's
// "react-server" export condition, which Vitest doesn't set — several
// lib/ files import "server-only" purely to prevent an accidental client
// bundle import, which isn't a concern for a unit test importing the
// module directly in Node. This is a no-op replacement, nothing else.
export {}
