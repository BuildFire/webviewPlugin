const buildfire = require('buildfire');
const { formatSSO } = require('./formatSSO');

const viewOptions = {
  POPUP: 'In app popup',
  NATIVE: 'Native In App',
  EXTERNAL: 'External browser'
};

const flags = {};

const setFlags = (content) => {
  flags.isWeb = (buildfire.context.device.platform == 'web');
  flags.shouldOpenInApp = (content.view == viewOptions.NATIVE);
  flags.isNotCP = (flags.isLiveMode || !flags.isWeb);
  flags.isLiveMode = buildfire.context.liveMode;
  flags.requiresSSO = content.url && content.url.indexOf('{{SSO}}') > 0;
  flags.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const render = (content) => {
  setFlags(content);
  const displayIniFrame = flags.isNotCP && flags.shouldOpenInApp;
  const openWindow = flags.isNotCP && !flags.shouldOpenInApp;
  const displaySuccessMessage = content.url && flags.isWeb && !flags.isLiveMode;

  if(displayIniFrame){
    renderiFrame({url: content.url, isIOS: flags.isIOS});
    return;
  }

  if (flags.requiresSSO) {
    const ssoLocalStorageItem = window.localStorage.getItem('SSO_USER');
    content.url = formatSSO(content.url, ssoLocalStorageItem);
  }

  if(openWindow){
    if(content.view === viewOptions.POPUP)
      buildfire.navigation.openWindow(content.url, "_blank");
    else
      buildfire.navigation.openWindow(content.url, "_system");
    return;
  }

  if(displaySuccessMessage){
    window.document.getElementById('successMessage').style.display = 'block';
    window.document.getElementById('targetUrl').href = content.url;
    return;
  }
};

const renderiFrame = (props) =>{
  let currentIframe = window.document.getElementById('webviewIframe');
  if (currentIframe) {
    currentIframe.remove();
  }
  window.document.body.appendChild((() => {
    let p = window.document.createElement('p');
    p.innerHTML = 'Loading...';
    p.className = 'bodyTextTheme backgroundColorTheme';
    p.style.position = 'absolute';
    p.style.top = 0;
    p.style.padding = '8px 0';
    p.style.display = 'inline-block';
    p.style.width = '100%';
    p.style.left= 0;
    p.style.background = '#eef0f0';
    p.style.textAlign = 'center';
    p.style.color = '#5f5f5f';
    p.id = 'loadingText';
    return p;
  })());

  window.document.body.appendChild((() => {
    let iFrame = window.document.createElement('iframe');
    iFrame.id = 'webviewIframe';
    iFrame.src = props.url;
    iFrame.scrolling = props.isIOS ? 'no' : 'auto';
    iFrame.style.height = '100%';
    iFrame.style.width = '1px';
    iFrame.style.minWidth = '100%';
    iFrame.onload = () => {
      window.document.getElementById('loadingText').remove();
    };
    return iFrame;
  })());
};

buildfire.spinner.show();
buildfire.datastore.onUpdate(event => render(event.data.content));
buildfire.datastore.get((err, result) => {
  if (err) {
    console.error("error: ", err);
    buildfire.spinner.hide();
    return;
  }

  if(!result.data || !result.data.content){
    buildfire.spinner.hide();
    return;
  }

  const { content } = result.data;

  render(content);

  buildfire.spinner.hide();
});
