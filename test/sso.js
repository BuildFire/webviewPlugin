require("@babel/register");
const { expect } = require('chai');
const { formatSSO } = require('../src/widget/formatSSO');

describe('SSO Format Function', () => {
  const URL = 'https://test.com/';

  it('should return url with token', () => {
      let ssoUser = '{ "ssoUserToken": "123" }';
      let url = formatSSO(`${URL}?token={{SSO}}`, ssoUser);
      expect(url).to.be.a('string');
      expect(url).to.equal(`${URL}?token=123`);
  });

  it('should return url without token', () => {
    let ssoUser = null;
    let url = formatSSO(`${URL}?token={{SSO}}`, ssoUser);
    expect(url).to.be.a('string');
    expect(url).to.equal(`${URL}?token=`);
  });

  it('should return url without token while local storage item exists', () => {
    let ssoUser = '{}';
    let url = formatSSO(`${URL}?token=`, ssoUser);
    expect(url).to.be.a('string');
    expect(url).to.equal(`${URL}?token=`);
  });
});
