angular.module('webContentPlugin').service('aiService', function() {
	const PROMPT_ID = 'pmpt_6938b78842888194b3b1401fee724f360e7139e8dfaae44f';
	let persistentConversation = null;

	this.init = function() {
		persistentConversation = new buildfire.ai.persistentConversation();
	};

	this.generateAiCode = function(options, callback) {
		persistentConversation.fetchTextResponse({
			message: options.message,
			promptId: PROMPT_ID,
			conversationId: options.conversationId || null,
			loadingMessage: 'Your code is being generated. This may take a couple minutes',
		}, (err, res) => {
			if (err) return callback(err);

			if (!res || !res.data || !res.data.response || !res.data.response.length ||
				!this._extractHtmlContent(res.data.response)
			) {
				return callback('No response from AI');
			}
			const aiResponse = this._extractHtmlContent(res.data.response);
			callback(null, {response: aiResponse, conversationId: res.data.conversationId});
		});
	};

	this.deleteConversation = function(conversationId, callback) {
		persistentConversation.deleteConversation({conversationId}, (err, res) => {
			if (err) {
				if (callback) callback(err);
				return;
			}
			if (callback) callback(null, res);
		});
	};

	this._extractHtmlContent = function(htmlString) {
		// Remove everything before <!DOCTYPE html> or <html>
		let result = htmlString.replace(/^[\s\S]*?(<!DOCTYPE html>|<html>)/i, '$1');
	
		// Remove everything after </html>
		result = result.replace(/(<\/html>)[\s\S]*$/i, '$1');
	
		return result;
	};

	this.init();
});