window.dialogs = {
	showDisclaimerDialog: function (callback) {
		function closeDialog() {
			if (callback) callback();
			if (backdrop) {
				document.body.removeChild(backdrop);
			}
			if (dialogContainer) {
				document.body.removeChild(dialogContainer);
			}
		}

		const backdrop = document.createElement('div');
		backdrop.classList.add('dialog-backdrop');

		const dialogContainer = document.createElement('div');
		dialogContainer.classList.add('dialog-container');
		dialogContainer.innerHTML = `
                <div class="dialog">
                    <div class="dialog-header">
                        <div class="dialog-title">Create your own plugin</div>
                    </div>
                    <div class="dialog-body">
                        <p class="bold">&#9888;&#65039; Warning</p>
                        <p>
                            We don't review, test, or guarantee the performance or security of custom code. By using this plugin, you're taking ownership of how your custom code behaves in your app.
                        </p>
						<p>
							Any technical issues that may arise from custom code will not be covered by our support team.
						</p>
                        <div class="form-group">
                            <div class="checkbox checkbox-info">
                                <input type="checkbox" id="disclaimerCheckbox">
                                <label for="disclaimerCheckbox" class="italic">
                                    I understand and agree to the terms of use
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <span class="icon-check visibility-hidden"></span>
                        <button class="dialog-action" id="startCodingBtn" disabled>Start Coding</button>
                    </div>
                </div>
            `;

		document.body.appendChild(backdrop);
		document.body.appendChild(dialogContainer);

		const checkbox = dialogContainer.querySelector('#disclaimerCheckbox');
		const startBtn = dialogContainer.querySelector('#startCodingBtn');
		
		document.fonts.ready.then(() => {
			dialogContainer.style.opacity = '1';
		});
		if (checkbox && startBtn) {
			checkbox.addEventListener('change', function () {
				startBtn.disabled = !checkbox.checked;
			});
			startBtn.addEventListener('click', function () {
				closeDialog();
			});
		}
	},
	showAiDialog: function (options, callback) {
		const limit = 10000;
		showDialog();

		function closeDialog(result) {
			const backdrop = document.getElementById('aiDialogBackdrop');
			const dialogContainer = document.getElementById('aiDialogContainer');
			if (callback) callback(null, result);
			if (backdrop) {
				document.body.removeChild(backdrop);
			}
			if (dialogContainer) {
				document.body.removeChild(dialogContainer);
			}
		}

		function showDialog() {
			const backdrop = document.createElement('div');
			backdrop.classList.add('dialog-backdrop');
			backdrop.id = 'aiDialogBackdrop';

			const dialogContainer = document.createElement('div');
			dialogContainer.classList.add('dialog-container');
			dialogContainer.id = 'aiDialogContainer';
			dialogContainer.innerHTML = `
                    <div class="dialog ai-dialog">
                        <div class="dialog-header">
                            <div class="dialog-title">What are you looking to create?</div>
                            <span class="icon icon-cross2 close-icon" aria-label="Close dialog"></span>
                        </div>
                        <div class="dialog-body">
                            <textarea class="ai-prompt" rows="6" placeholder="Describe your plugin here..."></textarea>
                            <div class="create-assistant-container">
                                <button id="generateAiBtn" class="btn create-ai-btn">
                                    <img src="assets/images/ai_icon.svg" alt="">
                                    Create with AI
                                </button>
                            </div>
                            <div class="ai-examples-title">Examples of Prompts</div>
                            <ul class="ai-examples hide-scrollbar">
                                <li>Create a weather plugin that fetches data from a public API and displays current weather conditions.</li>
                                <li>Build a quiz plugin that presents multiple-choice questions and provides feedback on answers.</li>
                                <li>Design a testimonials plugin that displays user reviews in a carousel format.</li>
                            </ul>
                        </div>
                    </div>
                `;

			document.body.appendChild(backdrop);
			document.body.appendChild(dialogContainer);

			const generateAiBtn = dialogContainer.querySelector('#generateAiBtn');
			const aiPrompt = dialogContainer.querySelector('.ai-prompt');
			aiPrompt.focus();

			generateAiBtn.addEventListener('click', function () {
				if (!aiPrompt || !aiPrompt.value || !aiPrompt.value.trim().length) {
					buildfire.dialog.toast({
						message: 'Please enter a prompt for AI generation.',
					});
					return;
				}
				if (aiPrompt.value.length >= limit) {
					buildfire.dialog.alert({
						message: 'Prompt exceeds the character limit for AI generation. Please reduce size and try again.',
					});
					return;
				}
				buildfire.analytics.trackAction('webcontent-plugin-ai-generate');
				window.ai.generateAiCode({ message: aiPrompt.value }, (err, res) => {
					if (err || !res) {
						buildfire.dialog.alert({
							message: 'Error generating AI response.',
						});
						return;
					}
					if (options.conversationId) {
						window.ai.deleteConversation(options.conversationId);
					}
					closeDialog(res);
				});
			});

			document.fonts.ready.then(() => {
				dialogContainer.style.opacity = '1';
			});
			const closeIcon = dialogContainer.querySelector('.close-icon');
			if (closeIcon) {
				closeIcon.addEventListener('click', function () {
					closeDialog();
				});
			}

			// Add click listeners to all example <li> items
			const exampleItems = dialogContainer.querySelectorAll('.ai-examples li');
			exampleItems.forEach(function (item) {
				item.style.cursor = 'pointer';
				item.addEventListener('click', function () {
					aiPrompt.value = item.textContent;
					aiPrompt.focus();
				});
			});
		}
	}
};