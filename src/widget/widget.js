const buildfire = require('buildfire');

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
  flags.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  flags.requiresSso = (content.url.indexOf('{{SSO}}') > 0);
};

//.view
//.url
const render = (content) => {
  const displayIniFrame = flags.isNotCP && flags.shouldOpenInApp;
  const openWindow = flags.isNotCP && !flags.shouldOpenInApp;
  const displaySucessMessage = flags.isWeb && !flags.isLiveMode && content.url;

  if(displayIniFrame){
    renderiFrame({url: content.url, isIOS: flags.isIOS});
    return;
  }

  if(openWindow){
    if(content.view === viewOptions.POPUP)
      buildfire.navigation.openWindow(content.url, "_blank");
    else
      buildfire.navigation.openWindow(content.url, "_system");
    return;
  }

  if(displaySucessMessage){
    window.document.getElementById('successMessage').style.display = 'block';
    return;
  }
};

const renderiFrame = (props) =>{
  let appArea = window.document.getElementById('appArea');
  appArea.style.display = 'block';

  let iFrame = window.document.createElement('iframe');
  iFrame.id = 'webviewIframe';
  iFrame.src = props.url;
  iFrame.scrolling = props.isIOS ? 'no' : 'auto';
  iFrame.style.height = '100%';
  iFrame.style.width = '1px';
  iFrame.style.minWidth = '100%';
  iFrame.onload = ()=>{};

  appArea.appenChild(iFrame);
};

buildfire.spinner.show();

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

  setFlags(content);
  render(content);

  buildfire.spinner.hide();
});
