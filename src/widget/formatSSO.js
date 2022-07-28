export const formatSSO = (url, ssoUserString) => {
    if (ssoUserString) {
        const ssoUserObj = JSON.parse(ssoUserString);
        const tokenExists = ssoUserObj.accessToken;
        return url.replace('{{SSO}}', tokenExists
            ? decodeURIComponent(ssoUserObj.accessToken)
            : '');
    }

    return url.replace('{{SSO}}', '');
};

export const formatOAuth = (url, accessToken) => {
	if (accessToken) {
		return url.replace('{{SSO}}',  encodeURIComponent(accessToken));
	}

	return url.replace('{{SSO}}', '');
};
