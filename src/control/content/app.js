(function(angular, buildfire) {
	var webContentPluginApp = angular.module('webContentPlugin', []);

	webContentPluginApp.controller('webContentPluginCtrl', ['$scope', '$log', '$timeout', 'aiService', 'dialogService', controller]);

	function controller($scope, $log, $timeout, aiService, dialogService) {
		var dataChanged = false;
		var modeChanged = false;
		var disclaimerAcknowledged = null;
		var savedHtml = '';
		var conversationId = null;
		var monacoEditorInstance = null;

		function getDefaultHTML() {
			return [
				'<!DOCTYPE html>',
				'<html>',
				'\t<head>',
				'\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0">',
				'\t\t<meta charset="utf-8" />',
				'\t\t<style>',
				'\t\t\tbody {',
				'\t\t\t\tdisplay: initial;',
				'\t\t\t}',
				'\t\t</style>',
				'\t</head>',
				'\t<body>',
				'\t\t<div>Add your content here</div>',
				'\t\t<script>',
				'\t\t\tconsole.log(\'Web Content Loaded\')',
				'\t\t</script>',
				'\t</body>',
				'</html>'
			].join('\n');
		}
		$scope.datastoreInitialized = false;
		$scope.urlValid = false;
		$scope.urlInValid = false;
		$scope.viewType = {
			NATIVE_IN_APP: 'Native In App',
			IN_APP_POPUP: 'In app popup',
			EXTERNAL_BROWSER: 'External browser'
		};

		$scope.viewSubtype = {
			IFRAME: 'iFrame',
			NATIVE_WEBVIEW: 'Native webview'
		};

        function initializeMonaco() {
            const editorElement = document.getElementById('monacoEditor');
            const baseUrl = window.location.origin + window.location.pathname.replace(/\\/g, '/').replace(/\/[^/]*$/, '/');
            
            if (typeof monaco === 'undefined') {
                const script = document.createElement('script');
                script.src = `${baseUrl}js/monaco-editor/min/vs/loader.js`;
                script.onload = () => setupMonaco();
                document.head.appendChild(script);
            } else {
                setupMonaco();
            }

            function setupMonaco() {
                require.config({ paths: { 'vs': `${baseUrl}js/monaco-editor/min/vs` } });
                require(['vs/editor/editor.main'], function () {
                    monacoEditorInstance = monaco.editor.create(editorElement, {
                        value: $scope.data.content.html || '',
                        language: 'html',
                        theme: 'vs-dark',
                        automaticLayout: true
                    });
					// check for disclaimer acknowledgment
					disclaimerAcknowledged = $scope.data && $scope.data.content && $scope.data.content.disclaimerAcknowledged;
					conversationId = ($scope.data && $scope.data.content && $scope.data.content.conversationId) || null;
					if (!disclaimerAcknowledged) {
						dialogService.showDisclaimerDialog(() => {
							dataChanged = true;
							disclaimerAcknowledged = true;
							$scope.saveData();
						});
					}
                    registerAutoSave(monacoEditorInstance);
                });
            }
        }
        // Always auto-save on editor change
		function registerAutoSave(editor, delay = 500) {
			let timer = null;
			function onChange() {
				if (timer) clearTimeout(timer);
				timer = setTimeout(function () {
					$scope.data.content.html = editor.getValue();
					dataChanged = true;
					$scope.saveData();
					$scope.$apply();
				}, delay);
			}
			editor.onDidChangeModelContent(onChange);
		}

		buildfire.datastore.get(function(err, result) {
			if (err) return console.error('Error: ', err);

			$scope.datastoreInitialized = true;

			if (isValidResult(result)) {
				$scope.data = result.data;
                // Ensure default for autoReload if it doesn't exist
                if (typeof $scope.data.content.autoReload === 'undefined') {
                    $scope.data.content.autoReload = true;
                }
                // Ensure isCustomContent is boolean
                $scope.data.content.isCustomContent = !!$scope.data.content.isCustomContent;
                // Add default HTML for old apps that don't have it
                if (!$scope.data.content.html) {
                    $scope.data.content.html = getDefaultHTML();
                }
                var autoReloadSwitch = document.getElementById('autoReloadSwitch');
                autoReloadSwitch.checked = $scope.data.content.autoReload;
			} else {
				$scope.data = {
					content: {
						url: '',
						html: getDefaultHTML(),
						isCustomContent: false, // Default to URL mode
						autoReload: true, // Default auto-reload to true
						view: $scope.viewType.IN_APP_POPUP // Default to popup
					},
				};
				var autoReloadSwitch = document.getElementById('autoReloadSwitch');
                autoReloadSwitch.checked = true;
			}

			$scope.$watch('data', watchFn, true);
			function watchFn(newObj, oldObj) {
				if (angular.equals(newObj, oldObj) || newObj == undefined) {
					dataChanged = false;
				} else {
					dataChanged = true;
				}
			}

			if (!$scope.$$phase && !$scope.$root.$$phase) {
				$scope.$apply();
			}

			// Only initialize Monaco if already in custom content mode
			if ($scope.data.content.isCustomContent) {
				initializeMonaco();
			}

			function isValidResult(res) {
				return res && res.data && !angular.equals({}, res.data) && res.id;
			}
		});

		buildfire.messaging.onReceivedMessage = function (message) {
			buildfire.messaging.sendMessageToWidget(message);
		};

		$scope.saveData = function() {
			if (!$scope.datastoreInitialized) {
				return console.error("Error with datastore didn't get called");
			}

			if (!dataChanged) {
				return console.warn("data didn't change");
			}

			// set url data invalid, when url is invalid and the mode is not custom content
			if ($scope.data.content.url && !$scope.isUrlValid($scope.data.content.url) && !$scope.data.content.isCustomContent) return setUrlDataInvalid();

			var data = $scope.data;
			dataChanged = false;

			// only set url data valid and prepend http when the mode is not custom content and the mode didn't change
			if (!data.content.isCustomContent && !modeChanged) {
				setUrlDataValid();

				if (!/^https?\:\/\//.test(data.content.url)) {
					data.content.url = 'http://' + data.content.url;
				}
			}

			if (data.content.isCustomContent) {
				if (typeof disclaimerAcknowledged == 'boolean') {
					data.content.disclaimerAcknowledged = disclaimerAcknowledged;
				}
				if (conversationId) {
					data.content.conversationId = conversationId;
				}
			}

			buildfire.datastore.save(data, function(err, result) {
				if (err || !result) {
					return $log.error('Error saving the widget details: ', err);
				}
				if ($scope.data.content.isCustomContent && $scope.data.content.autoReload) buildfire.messaging.sendMessageToWidget({ tag: 'reloadWebContent' });
				modeChanged = false;
				$log.info('Widget details saved');
			});

			function setUrlDataInvalid() {
				$log.warn('invalid data, details will not be saved');
				$scope.urlValid = false;
				$scope.urlInValid = true;
				$timeout(function() {
					$scope.urlInValid = false;
				}, 3000);
			}

			function setUrlDataValid() {
				$scope.urlValid = true;
				$scope.urlInValid = false;
				$timeout(function() {
					$scope.urlValid = false;
				}, 3000);
			}
		};

		$scope.validateUrl = function() {
			$scope.saveData();
		};

		$scope.isUrlValid = function(url) {
			return /[-a-zA-Z0-9@:%_\+.~#?&amp;//=]{2,256}\.[a-z]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?!?\/?\w\/?&amp;//=]*)?/.test(url);
		};
        
        $scope.onModeChange = function() {
			if (!$scope.datastoreInitialized) return;
			
			// Initialize Monaco if switching to custom content mode
			if ($scope.data.content.isCustomContent && !monacoEditorInstance) {
				initializeMonaco();
			}
			
			// Check if switching to custom content with iFrame view
			if ($scope.data.content.isCustomContent && 
				$scope.data.content.view === $scope.viewType.NATIVE_IN_APP && 
				($scope.data.content.viewSubtype === $scope.viewSubtype.IFRAME
					|| !$scope.data.content.viewSubtype
				)) {
				
				buildfire.dialog.show({
					title: 'Warning',
					message: "Some websites may not load or function properly in an iframe due to Apple security policies or site-level restrictions from platforms like Google or Amazon. If the page doesn't display as expected, try a different viewing option in the Settings tab.",
					isMessageHTML: false,
					showCancelButton: true,
					actionButtons: [
						{
							text: 'Go to Settings',
							type: 'success',
							action: () => {
								buildfire.navigation.navigateToTab({ tabTitle: 'Settings' });
							}
						}
					]
				});
			}
			
			dataChanged = true;
			modeChanged = true;
			$scope.saveData();
        };

		// switch "undo" button visibility
		function toggleUndoButtonVisibility(savedHtml) {
			const undoBtn = document.getElementById('undoBtn');
			if (undoBtn) {
				undoBtn.style.display = savedHtml ? 'block' : 'none';
			}
		}

		// continue AI conversation
		function continueAIConversation(prompt) {
			const limit = 50000;
			const html = monacoEditorInstance.getValue().trim();
			if (prompt) {
				const userMessage = html + '\n\n' + prompt;
				if (userMessage.length > limit) {
					buildfire.dialog.alert({
						message: 'The combined content and prompt exceed the character limit for AI generation. Please reduce size and try again.',
					});
					return;
				}
				const actionName = conversationId ? 'webcontent-plugin-ai-update' : 'webcontent-plugin-ai-generate';
				buildfire.analytics.trackAction(actionName);
				aiService.generateAiCode({ message: userMessage, conversationId: conversationId }, (err, result) => {
					if (err) {
						buildfire.dialog.alert({
							message: 'Error generating AI response.',
						});
						return;
					}
					savedHtml = html;
					if (result.conversationId) conversationId = result.conversationId;
					setEditorContent(monacoEditorInstance, result.response);
					toggleUndoButtonVisibility(savedHtml);
					toggleAssistantToastVisibility(true);
				});
			}
		}

		// toggle assistant toast visibility
		function toggleAssistantToastVisibility(visible) {
			const assistantToast = document.querySelector('.assistant-toast');
			if (assistantToast) {
				if (visible) {
					assistantToast.style.display = 'block';
					assistantToast.classList.add('visible');
					setTimeout(() => {
						assistantToast.classList.remove('visible');
						setTimeout(() => {
							assistantToast.style.display = 'none';
						}, 300);
					}, 3000);
				} else {
					assistantToast.classList.remove('visible');
					setTimeout(() => {
						assistantToast.style.display = 'none';
					}, 300);
				}
			}
		}

		// set editor content while maintaining undo behavior (command + z)
		function setEditorContent(editor, content) {
			const fullRange = editor.getModel().getFullModelRange();
			const edit = {
				range: fullRange,
				text: content 
			};

			editor.executeEdits('source-of-change', [edit]);
			editor.pushUndoStop();
		}
		(function() {
			const assistantPromptEl = document.getElementById('assistantPrompt');
			const undoBtnEl = document.getElementById('undoBtn');
			const createWithAiBtnEl = document.getElementById('createWithAiBtn');
			const reloadBtnEl = document.getElementById('reloadEditorBtn');
			const autoReloadSwitchEl = document.getElementById('autoReloadSwitch');
			const assistantToastDismissEl = document.querySelector('.dismiss-toast-icon');

			reloadBtnEl.addEventListener('click', function () {
				// send reload message to widget on button click
				buildfire.messaging.sendMessageToWidget({ tag: 'reloadWebContent' });
			});

			// Send message to widget and save when autoReloadSwitch value changes
			autoReloadSwitchEl.addEventListener('change', function () {
				$scope.data.content.autoReload = autoReloadSwitchEl.checked;
				dataChanged = true;
				$scope.saveData();
			});

			createWithAiBtnEl.addEventListener('click', function () {
				const html = monacoEditorInstance.getValue().trim();
				dialogService.showAiDialog({conversationId}, (err, result) => {
					if (err) {
						buildfire.dialog.toast({
							message: err,
						});
					} else {
						savedHtml = html;
						if (result) {
							setEditorContent(monacoEditorInstance, result.response);
							toggleUndoButtonVisibility(savedHtml);
							if (result.conversationId) {
								conversationId = result.conversationId;
							}
						}
					}
				});
			});

			undoBtnEl.addEventListener('click', function () {
				if (savedHtml && monacoEditorInstance) {
					monacoEditorInstance.setValue(savedHtml);
					savedHtml = '';
				}
				toggleUndoButtonVisibility(savedHtml);
			});

			if (assistantToastDismissEl) {
				assistantToastDismissEl.addEventListener('click', function () {
					toggleAssistantToastVisibility(false);
				});
			}

			assistantPromptEl.addEventListener('keydown', function(event) {
				// Check if the pressed key is Enter
				if (event.key === 'Enter') {

					// Check for SHIFT + ENTER
					if (event.shiftKey) {
						console.log('Shift + Enter pressed: Adding a new line (default action)');
					} else {
						// ENTER ONLY: used to submit
						event.preventDefault(); 
						console.log('Enter pressed: Submitting the message');
						if (assistantPromptEl.value.trim()) {
							continueAIConversation(assistantPromptEl.value.trim());
							this.value = '';
							this.style.height = '40px';
						}
					}
				}
			});
			assistantPromptEl.oninput = function () {
				this.style.height = '40px';
				const newHeight = Math.min(this.scrollHeight, 120);
				this.style.height = `${newHeight}px`;
			};
		})();
    }
})(window.angular, window.buildfire);
