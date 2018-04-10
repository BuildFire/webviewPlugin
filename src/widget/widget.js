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

  const handleWindow = (openWindow, displayIniFrame, displaySuccessMessage) => {
    if(openWindow){
      if(content.view === viewOptions.POPUP)
        buildfire.navigation.openWindow(content.url, "_blank");
      else
        buildfire.navigation.openWindow(content.url, "_system");

      setTimeout(() => buildfire.navigation.goBack(), 750);
      return;
    }
    if(displayIniFrame){
      renderiFrame({url: content.url, isIOS: flags.isIOS});
      return;
    }
    if(displaySuccessMessage){
      window.document.getElementById('successMessage').style.display = 'block';
      window.document.getElementById('targetUrl').href = content.url;
      return;
    }
  };

  setFlags(content);
  const displayIniFrame = flags.isNotCP && flags.shouldOpenInApp;  //on the device and open native
  const openWindow = flags.isNotCP && !flags.shouldOpenInApp;      //on the device and open in pop up or native brow
  const displaySuccessMessage = content.url && flags.isWeb && !flags.isLiveMode;

  if (flags.requiresSSO) {   //This is an SSO webview with an access token
    buildfire.auth.getCurrentUser((err, result) => {
      if (result && result.SSO && result.SSO.accessToken) {
        content.url = formatSSO(content.url, JSON.stringify(result.SSO));
        handleWindow(openWindow, displayIniFrame, displaySuccessMessage);
      }
    });
  } else {   //this is all other URLs, i.e. no SSO.
    handleWindow(openWindow, displayIniFrame, displaySuccessMessage);
  }

};

const renderiFrame = (props) =>{
  let currentIframe = window.document.getElementById('webviewIframe');
  if (currentIframe) {
    currentIframe.remove();
  }

  let scrollable = window.document.getElementById('scrollable');
  if (!scrollable && props.isIOS) {
    window.document.body.appendChild((() => {
      let div = document.createElement('div');
      div.id = 'scrollable';
      div.className = 'scrollable';
      scrollable = div;
      return div;
    })());
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

  let container = props.isIOS ? scrollable : window.document.body;

  container.appendChild((() => {
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

  try {
    buildfire.appearance.ready();
  } catch (err) {
    console.log('appearance.ready() failed. Is sdk up to date?');
  }
});
