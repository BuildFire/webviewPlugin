const buildfire = require('buildfire');
const { formatSSO, formatOAuth } = require('./formatSSO');

const viewOptions = {
  POPUP: 'In app popup',
  NATIVE: 'Native In App',
  EXTERNAL: 'External browser'
};

const flags = {};

const setFlags = (content) => {
  flags.isWeb = (buildfire.context.device.platform == 'web');
  flags.shouldOpenInApp = (content.view == viewOptions.NATIVE);
  flags.isLiveMode = buildfire.context.liveMode;
  flags.isNotCP = (flags.isLiveMode === 1 || !flags.isWeb);
  flags.requiresSSO = content.url && content.url.indexOf('{{SSO}}') > 0;
  flags.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const render = (content) => {

  const handleWindow = (openWindow, displayIniFrame, displaySuccessMessage) => {
    if(openWindow){
      setTimeout(() => buildfire.navigation.goBack(), 750);

      if(content.view === viewOptions.POPUP){
        if(flags.isWeb){
          renderiFrame({url: content.url, isIOS: flags.isIOS});
          return;
        } else {
          buildfire.navigation.openWindow(content.url, "_blank");
        }
      }
      else
        buildfire.navigation.openWindow(content.url, "_system");

      return;
    }
    if(displayIniFrame){
      renderiFrame({url: content.url, isIOS: flags.isIOS});
      return;
    }
    if(displaySuccessMessage){
      if(flags.isWeb){
        renderiFrame({url: content.url, isIOS: flags.isIOS});
        return;
      } else {
        window.document.getElementById('successMessage').style.display = 'block';
        window.document.getElementById('targetUrl').href = content.url;
        return;
      }
      
    }
  };

  window.document.getElementById('successMessage').style.display = 'none';

  setFlags(content);
  const displayIniFrame = flags.shouldOpenInApp;  //on the device and open native
  const openWindow = flags.isNotCP && !flags.shouldOpenInApp;      //on the device and open in pop up or native brow
  const displaySuccessMessage = content.url && flags.isWeb && !flags.isLiveMode;

  if (flags.requiresSSO) {   //This is an SSO webview with an access token
    buildfire.auth.getCurrentUser((err, result) => {
      if (result && result.SSO && result.SSO.accessToken) {
        content.url = formatSSO(content.url, JSON.stringify(result.SSO));
        handleWindow(openWindow, displayIniFrame, displaySuccessMessage);
      }
	  else{
		  if (result && result.oauthProfile && result.oauthProfile.accessToken) {
			  content.url = formatOAuth(content.url, result.oauthProfile.accessToken);
			  handleWindow(openWindow, displayIniFrame, displaySuccessMessage);
		  }
		  else{
			  handleWindow(openWindow, displayIniFrame, displaySuccessMessage);
		  }
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

  removeLoadingText();

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

    if (flags.isWeb) {
      let modal = (document.querySelectorAll('div[id^="confirm"]') || [])[0];
      if (modal) {
        let confirm = (modal.querySelectorAll('.approve-confirmation') || [])[0];
        if (confirm && confirm.click) confirm.click();
      }

      const targetProtocol = (/[a-z]{4,5}:/g.exec(props.url) || [])[0] || false;
      let url = (/(http|https):\/\/\S+\.[a-z]+/g.exec(props.url) || [])[0] || 'this site';

      if (window.location.protocol === 'https:' && targetProtocol === 'http:') {
        buildfire.messaging.sendMessageToControl({ tag: 'mixedContent', url: url });
      }
    }

    let iFrame = window.document.createElement('iframe');
    iFrame.id = 'webviewIframe';
    iFrame.src = props.url;
    iFrame.scrolling = props.isIOS ? 'yes' : 'auto';
    iFrame.style.height = '100%';
    iFrame.style.width = '1px';
    iFrame.style.minWidth = '100%';
    iFrame.onload = () => {
      removeLoadingText();
      buildfire.messaging.sendMessageToControl({ tag: 'displayWarning' });
    };
    setTimeout(() => {
      removeLoadingText();
    }, 3000);

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
buildfire.messaging.onReceivedMessage = message => {
  if (message.tag === 'mixedContent' && message.url) {
    return mixedContentWarning(message.url);
  }
  if (message.tag === 'displayWarning') {
    return showPopup();
  }
};

function removeLoadingText() {
  let loadingText = window.document.getElementById('loadingText');
  if (loadingText) loadingText.remove();
}

function showPopup() {
  if (localStorage.getItem('webview_modal-shown')) return;

  var options = {
    message: 'This view may vary based on device resolution',
    target: document.getElementById('warning-message'),
    buttonLabels: ['I understand']
  };

  buildfire.notifications.confirm(options, function() {
    localStorage.setItem('webview_modal-shown', '1');
  });
}

function mixedContentWarning(url) {
  var options = {
    message: `Can't render ${url}. Insecure resources (http) cannot be displayed in the control panel or PWAs, but may function on devices. Some operating systems also require https.`,
    target: document.getElementById('warning-message'),
    buttonLabels: ['I understand']
  };

  buildfire.notifications.confirm(options, () => { });
}
