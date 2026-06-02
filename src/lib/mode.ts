export const isCloudMode =
  process.env.FORCE_LOCAL_MODE !== 'true' &&
  !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET
  );
