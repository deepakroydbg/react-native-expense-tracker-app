import { Redirect } from 'expo-router';

/**
 * Catch-all for unmatched deep links (e.g. mykhata:/// with a stray slash from
 * the OAuth redirect). Bounce to the app root instead of showing "Unmatched Route";
 * the root navigator then routes to Books or Login based on auth state.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
