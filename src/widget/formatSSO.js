export const formatSSO = (url, ssoUserString) => {
  let userToken = '';

  if (ssoUserString) {
    const ssoUserObj = JSON.parse(ssoUserString);

    userToken  =  (tokenExists)
        ? decodeURIComponent(ssoUserObj.accessToken)
        : '';
  }

  return url.replace('{{SSO}}', userToken);
};
