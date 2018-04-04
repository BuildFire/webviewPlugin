export const formatSSO = (url, ssoUserString) => {
  let userToken = '';

  if (ssoUserString) {
    const ssoUserObj = JSON.parse(ssoUserString);
    const tokenExists = ssoUserObj.ssoUserToken;

    userToken  =  (tokenExists)
        ? decodeURIComponent(ssoUserObj.ssoUserToken)
        : '';
  }

  return url.replace('{{SSO}}', userToken);
};
