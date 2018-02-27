export const formatSSO = (url, ssoUserString) => {
  if (ssoUserString) {
    const ssoUserObj = JSON.parse(ssoUserString);
    const tokenExists = ssoUserObj.ssoUserToken;
    return url.replace('{{SSO}}', tokenExists
      ? decodeURIComponent(ssoUserObj.ssoUserToken)
      : '');
  }

  return url.replace('{{SSO}}', '');
};
