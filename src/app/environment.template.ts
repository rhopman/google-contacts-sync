export const clientId = '${GOOGLE_CLIENT_ID}';
export const repositoryUrl =
  // @ts-expect-error TS2873: This kind of expression is always falsy
  // eslint-disable-next-line no-constant-binary-expression
  '${REPOSITORY_URL}' || 'https://github.com/rhopman/google-contacts-sync';
