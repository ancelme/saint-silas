export function getInitializationErrorMessage(error: unknown): string {
  const isMissingDatabaseUrl = error instanceof Error && (
    error.message === 'SUPABASE_DB_URL is required to connect to Supabase.' ||
    error.message.startsWith('SUPABASE_DB_URL is required on Vercel')
  );

  return isMissingDatabaseUrl
    ? 'Production database configuration is missing. Add SUPABASE_DB_URL (your Supabase PostgreSQL connection pooler URL) to the Vercel project Production environment variables, then redeploy.'
    : 'The API could not initialize. Check the Vercel function logs.';
}
